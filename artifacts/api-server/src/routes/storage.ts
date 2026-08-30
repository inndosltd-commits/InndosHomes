import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { getUserPlanEntitlements } from "./subscriptions";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const execFileAsync = promisify(execFile);
const uploadGrantWindows = new Map<string, number[]>();
const UPLOAD_GRANT_WINDOW_MS = 15 * 60 * 1000;
const MAX_UPLOAD_GRANTS_PER_WINDOW = 30;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const VIDEO_FILE_EXTENSIONS = new Set([
  "3g2",
  "3gp",
  "asf",
  "avi",
  "flv",
  "m2ts",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "mpe",
  "mpeg",
  "mpg",
  "mts",
  "ogv",
  "qt",
  "ts",
  "vob",
  "webm",
  "wmv",
]);
const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf"]);
const MAX_WATERMARK_VIDEO_BYTES = 250 * 1024 * 1024;

function createWatermarkSvg(width: number, height: number): Buffer {
  const cx = width / 2;
  const cy = height / 2;
  const textLength = Math.round(width * 0.85);
  const fontSize = Math.round(Math.min(width, height) * 0.10);

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="${cx}"
        y="${cy}"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(-30, ${cx}, ${cy})"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="rgba(160,160,160,0.55)"
        textLength="${textLength}"
        lengthAdjust="spacingAndGlyphs"
      >inndos.com</text>
    </svg>
  `);
}

async function probeVideoDimensions(inputPath: string): Promise<{ width: number; height: number }> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "json",
      inputPath,
    ],
    { timeout: 90_000, maxBuffer: 2 * 1024 * 1024 },
  );
  const probe = JSON.parse(stdout) as {
    streams?: Array<{ width?: number; height?: number }>;
  };
  const width = Number(probe.streams?.[0]?.width);
  const height = Number(probe.streams?.[0]?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) {
    throw new Error("Video dimensions could not be read");
  }
  return { width, height };
}

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;
    const normalizedType = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    // Picker/browser MIME values are not authoritative. Native libraries often
    // report application/octet-stream or vendor-specific video/* values.
    // The property write boundary probes the stored bytes before accepting it.
    const isVideo = normalizedType.startsWith("video/") || VIDEO_FILE_EXTENSIONS.has(extension);
    const isImage = !isVideo && ALLOWED_IMAGE_TYPES.has(normalizedType);
    const isDocument = ALLOWED_DOCUMENT_TYPES.has(normalizedType);

    if (!isImage && !isVideo && !isDocument) {
      res.status(415).json({ error: "Unsupported file type" });
      return;
    }

    const maxBytes = isVideo
      ? MAX_VIDEO_BYTES
      : isImage
        ? MAX_IMAGE_BYTES
        : MAX_DOCUMENT_BYTES;
    if (size < 1) {
      res.status(400).json({ error: "The selected file is empty. Please choose it again." });
      return;
    }
    if (size > maxBytes) {
      res.status(413).json({
        error: `File is too large. Maximum size is ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
      });
      return;
    }

    const [caller] = await db
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, userId));
    if (!caller || caller.status !== "active") {
      res.status(403).json({ error: "This account cannot upload files" });
      return;
    }

    if (isVideo && caller.role !== "admin") {
      if (caller.role !== "owner" && caller.role !== "host") {
        res.status(403).json({ error: "Only owners and hosts can upload listing videos" });
        return;
      }
      const { plan, entitlements } = await getUserPlanEntitlements(userId);
      if (entitlements.videoLimit < 1) {
        res.status(403).json({
          error: `Your ${plan} plan does not include listing videos. Please upgrade your subscription.`,
          code: "VIDEO_LIMIT",
          plan,
          videoLimit: entitlements.videoLimit,
        });
        return;
      }
    }

    const now = Date.now();
    const recentGrants = (uploadGrantWindows.get(userId) ?? []).filter(
      (timestamp) => now - timestamp < UPLOAD_GRANT_WINDOW_MS
    );
    if (recentGrants.length >= MAX_UPLOAD_GRANTS_PER_WINDOW) {
      uploadGrantWindows.set(userId, recentGrants);
      res.status(429).json({ error: "Too many upload requests. Please try again later." });
      return;
    }
    recentGrants.push(now);
    uploadGrantWindows.set(userId, recentGrants);

    const uploadURL = await objectStorageService.getObjectEntityUploadURL(userId);
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(
      file,
      3600,
      req.headers.range,
    );

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    // --- Protected route example (uncomment when using replit-auth) ---
    // if (!req.isAuthenticated()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    // const canAccess = await objectStorageService.canAccessObjectEntity({
    //   userId: req.user.id,
    //   objectFile,
    //   requestedPermission: ObjectPermission.READ,
    // });
    // if (!canAccess) {
    //   res.status(403).json({ error: "Forbidden" });
    //   return;
    // }

    const response = await objectStorageService.downloadObject(
      objectFile,
      3600,
      req.headers.range,
    );

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    // Direct-upload metadata is untrusted. Never serve active content using an
    // attacker-selected MIME type from the same origin as the application.
    const storedType = response.headers.get("content-type")?.toLowerCase().split(";")[0]?.trim() ?? "";
    const safePrivateTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/3gpp",
      "video/3gpp2",
      "video/x-msvideo",
      "video/x-matroska",
      "video/mpeg",
      "video/ogg",
      "video/x-ms-wmv",
      "video/x-flv",
      "video/x-m4v",
      "application/pdf",
    ]);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!safePrivateTypes.has(storedType)) {
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", "attachment");
    }

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

/**
 * GET /storage/watermark/*
 *
 * Serve an image with an inndos.com watermark tiled diagonally.
 * Used for downloads so the watermark only appears on saved files.
 */
router.get("/storage/watermark/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    if (!response.body) {
      res.status(404).json({ error: "No content" });
      return;
    }

    // Buffer the image
    const chunks: Uint8Array[] = [];
    const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
    await new Promise<void>((resolve, reject) => {
      nodeStream.on("data", (chunk) => chunks.push(chunk));
      nodeStream.on("end", resolve);
      nodeStream.on("error", reject);
    });
    const inputBuffer = Buffer.concat(chunks);

    // Get image metadata
    const meta = await sharp(inputBuffer).metadata();
    const w = meta.width ?? 800;
    const h = meta.height ?? 600;

    const watermarked = await sharp(inputBuffer)
      .composite([{ input: createWatermarkSvg(w, h), blend: "over" }])
      .jpeg({ quality: 88 })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", 'attachment; filename="inndos-photo.jpg"');
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(watermarked);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log?.error({ err: error }, "Error serving watermarked object");
    res.status(500).json({ error: "Failed to serve watermarked object" });
  }
});

/**
 * GET /storage/watermark-video/*
 *
 * Return a downloadable MP4 with the same centered, diagonal inndos.com
 * watermark used by the photo download endpoint. Playback always uses the
 * original listing video; this route is only for saved copies.
 */
router.get("/storage/watermark-video/*path", async (req: Request, res: Response) => {
  const workDir = join(tmpdir(), `inndos-watermark-video-${randomUUID()}`);
  const inputPath = join(workDir, "source");
  const overlayPath = join(workDir, "watermark.png");
  const outputPath = join(workDir, "watermarked.mp4");

  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const [metadata] = await objectFile.getMetadata();
    const storedSize = Number(metadata.size ?? 0);
    if (Number.isFinite(storedSize) && (storedSize < 1 || storedSize > MAX_WATERMARK_VIDEO_BYTES)) {
      res.status(413).json({ error: "This video is too large to download." });
      return;
    }

    await mkdir(workDir, { recursive: true });
    await pipeline(objectFile.createReadStream(), createWriteStream(inputPath));
    const inputStats = await stat(inputPath);
    if (inputStats.size < 1 || inputStats.size > MAX_WATERMARK_VIDEO_BYTES) {
      res.status(413).json({ error: "This video is too large to download." });
      return;
    }

    const { width, height } = await probeVideoDimensions(inputPath);
    await sharp(createWatermarkSvg(width, height)).png().toFile(overlayPath);
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-i", inputPath,
        "-loop", "1",
        "-i", overlayPath,
        "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto",
        "-map", "0:v:0",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-movflags", "+faststart",
        "-shortest",
        outputPath,
      ],
      { timeout: 300_000, maxBuffer: 4 * 1024 * 1024 },
    );

    const outputStats = await stat(outputPath);
    if (outputStats.size < 1 || outputStats.size > MAX_WATERMARK_VIDEO_BYTES) {
      res.status(500).json({ error: "The watermarked video could not be created." });
      return;
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", 'attachment; filename="inndos-video.mp4"');
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(await readFile(outputPath));
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log?.error({ err: error }, "Error serving watermarked video");
    res.status(500).json({ error: "Failed to create watermarked video" });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});

export default router;

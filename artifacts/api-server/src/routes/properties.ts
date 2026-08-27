import { Router } from "express";
import { db } from "@workspace/db";
import { properties, users, bookings, propertyBlocks, propertyManagementCalendarEntries, insertPropertySchema, subscriptions, featuredListingUses } from "@workspace/db";
import { getVideoLimit, getImageLimit, getActiveSubscription, getPlanLimit, getPlanEntitlements, getUserPlanEntitlements } from "./subscriptions";
import { eq, and, ilike, or, inArray, count, gte, lte, desc, sql as drizzleSql, isNotNull } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { verifyToken } from "./auth";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deletePropertyTransactionally } from "../lib/propertyDeletion";
import {
  normalizePropertyCategory,
  normalizePropertySubtype,
  normalizePropertyType,
  propertyCategorySearchValues,
} from "@workspace/property-categories";

const router = Router();
const objectStorageService = new ObjectStorageService();
const execFileAsync = promisify(execFile);
const MAX_LISTING_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_LISTING_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_LISTING_VIDEO_SECONDS = 300;
const MEDIA_READY_RETRY_DELAYS_MS = [0, 500, 1_500, 3_000, 5_000, 10_000];

class MediaObjectSizeError extends Error {
  constructor(
    readonly actualBytes: number,
    readonly maxBytes: number,
  ) {
    super(`Stored media size ${actualBytes} exceeds ${maxBytes}`);
  }
}

async function inspectObjectEntityWhenReady(path: string) {
  let lastReadinessError: unknown;
  for (const delayMs of MEDIA_READY_RETRY_DELAYS_MS) {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      return await objectStorageService.inspectObjectEntity(path);
    } catch (error) {
      lastReadinessError = error;
    }
  }
  throw lastReadinessError;
}

async function downloadObjectEntityWhenReady(path: string, maxBytes: number): Promise<Buffer> {
  let lastReadinessError: unknown;
  for (const delayMs of MEDIA_READY_RETRY_DELAYS_MS) {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(path);
      const [metadata] = await objectFile.getMetadata();
      const storedSize = Number(metadata.size ?? 0);
      if (Number.isFinite(storedSize) && storedSize > maxBytes) {
        throw new MediaObjectSizeError(storedSize, maxBytes);
      }
      const chunks: Buffer[] = [];
      let bytesRead = 0;
      await new Promise<void>((resolve, reject) => {
        const stream = objectFile.createReadStream();
        stream.on("data", (chunk: Buffer | Uint8Array) => {
          const bytes = Buffer.from(chunk);
          bytesRead += bytes.length;
          if (bytesRead > maxBytes) {
            stream.destroy(new MediaObjectSizeError(bytesRead, maxBytes));
            return;
          }
          chunks.push(bytes);
        });
        stream.on("end", resolve);
        stream.on("error", reject);
      });
      return Buffer.concat(chunks, bytesRead);
    } catch (error) {
      if (error instanceof MediaObjectSizeError) throw error;
      lastReadinessError = error;
    }
  }
  throw lastReadinessError;
}

function normalizeSubtype(value: string | null | undefined): string {
  return normalizePropertySubtype(value) ?? "";
}

/**
 * Keep the required listing fields enforced at the write boundary. Clients
 * provide inline guidance, but direct API calls must not be able to publish
 * an incomplete listing.
 */
function getListingCompletenessErrors(body: Record<string, unknown>, imageList: string[]): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const type = String(body.type ?? "");
  const subtype = normalizeSubtype(typeof body.subtype === "string" ? body.subtype : undefined);
  const priceUnit = String(body.priceUnit ?? "").trim();

  if (imageList.length === 0) errors.images = ["At least one property photo is required."];
  if (["rent", "sale", "bnb", "hotel", "hostel"].includes(type) && !subtype) {
    errors.subtype = ["A property category is required."];
  }
  if (["rent", "bnb", "hotel", "hostel"].includes(type) && !priceUnit) {
    errors.priceUnit = ["A price period is required."];
  }

  const hasLat = body.lat !== undefined && body.lat !== null && String(body.lat).trim() !== "";
  const hasLng = body.lng !== undefined && body.lng !== null && String(body.lng).trim() !== "";
  if (hasLat !== hasLng) {
    errors.lat = ["Provide both latitude and longitude, or leave both blank."];
    errors.lng = ["Provide both latitude and longitude, or leave both blank."];
  }
  if (hasLat && hasLng) {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.lat = ["Location coordinates are invalid."];
      errors.lng = ["Location coordinates are invalid."];
    }
  }

  return errors;
}

function isCommercialSubtype(value: unknown): boolean {
  return ["office", "business", "godown", "stall", "shop"].includes(
    normalizeSubtype(typeof value === "string" ? value : undefined)
  );
}

async function validateNewListingMedia({
  paths,
  expectedKind,
  userId,
  existingPaths = new Set<string>(),
}: {
  paths: string[];
  expectedKind: "image" | "video";
  userId: string;
  existingPaths?: Set<string>;
}): Promise<string | null> {
  const allowedOwnerPrefixes = [
    `/objects/uploads/${userId}/`,
    `/objects/listing-videos/${userId}/`,
  ];
  const maxBytes =
    expectedKind === "image" ? MAX_LISTING_IMAGE_BYTES : MAX_LISTING_VIDEO_BYTES;

  for (const path of paths) {
    if (existingPaths.has(path)) continue;
    if (!allowedOwnerPrefixes.some((prefix) => path.startsWith(prefix))) {
      return `A ${expectedKind} is not owned by this account. Please upload it again.`;
    }

    try {
      if (expectedKind === "image") {
        const inspection = await inspectObjectEntityWhenReady(path);
        if (inspection.size < 1 || inspection.size > maxBytes) {
          return inspection.size < 1
            ? "An uploaded image is empty. Please choose the file again."
            : `An image exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit.`;
        }
        if (inspection.mediaKind !== "image") {
          return "A file in the image list is not a valid image.";
        }
        const objectFile = await objectStorageService.getObjectEntityFile(path);
        const [imageBytes] = await objectFile.download();
        const metadata = await sharp(imageBytes).metadata();
        if (!metadata.width || !metadata.height || !metadata.format) {
          return "An uploaded image could not be decoded.";
        }
      } else {
        const workDir = join(tmpdir(), `inndos-video-verify-${randomUUID()}`);
        try {
          // Validate the complete stored object. A preliminary ranged header read
          // is intentionally avoided because it can fail independently on valid
          // direct uploads from browsers and native devices.
          const videoBytes = await downloadObjectEntityWhenReady(path, maxBytes);
          if (videoBytes.length < 1 || videoBytes.length > maxBytes) {
            return videoBytes.length < 1
              ? "An uploaded video is empty. Please choose the file again."
              : `A video exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit.`;
          }
          await mkdir(workDir, { recursive: true });
          const inputPath = join(workDir, "source-video");
          await writeFile(inputPath, videoBytes);
          const { stdout } = await execFileAsync(
            "ffprobe",
            [
              "-v", "error",
              "-select_streams", "v:0",
              "-show_entries", "stream=codec_type,duration:format=format_name,duration",
              "-of", "json",
              inputPath,
            ],
            { timeout: 90_000, maxBuffer: 2 * 1024 * 1024 }
          );
          const probe = JSON.parse(stdout) as {
            streams?: Array<{ codec_type?: string; duration?: string }>;
            format?: { format_name?: string; duration?: string };
          };
          const hasVideoStream = probe.streams?.some((stream) => stream.codec_type === "video") ?? false;
          const durationCandidates = [
            Number(probe.format?.duration),
            ...(probe.streams ?? []).map((stream) => Number(stream.duration)),
          ].filter((value) => Number.isFinite(value) && value > 0);
          const duration = durationCandidates.length > 0 ? Math.max(...durationCandidates) : 0;
          if (!hasVideoStream || duration <= 0) {
            return "This video could not be decoded. Please choose a valid video file.";
          }
          if (duration > MAX_LISTING_VIDEO_SECONDS + 0.05) {
            return "Listing videos must be five minutes or shorter.";
          }
        } finally {
          await rm(workDir, { recursive: true, force: true });
        }
      }
    } catch (error) {
      if (error instanceof MediaObjectSizeError) {
        return `A ${expectedKind} exceeds the ${Math.floor(error.maxBytes / (1024 * 1024))} MB limit.`;
      }
      if (error instanceof ObjectNotFoundError) {
        return `An uploaded ${expectedKind} could not be found. Please upload it again.`;
      }
      console.error("Listing media verification failed", {
        expectedKind,
        path,
        error,
      });
      return expectedKind === "video"
        ? "This video could not be verified. Please choose a valid video file that is not damaged."
        : "An uploaded image could not be verified. Please upload it again.";
    }
  }

  return null;
}

async function createVideoPosters(videoPaths: string[], userId: string): Promise<string[]> {
  const posters: string[] = [];
  for (const videoPath of videoPaths) {
    const video = await objectStorageService.getObjectEntityFile(videoPath);
    const [videoBytes] = await video.download();
    const workDir = join(tmpdir(), `inndos-video-poster-${randomUUID()}`);
    const inputPath = join(workDir, "source");
    const outputPath = join(workDir, "poster.jpg");
    try {
      await mkdir(workDir, { recursive: true });
      await writeFile(inputPath, videoBytes);
      await execFileAsync(
        "ffmpeg",
        [
          "-y",
          "-ss",
          "0.1",
          "-i",
          inputPath,
          "-frames:v",
          "1",
          "-vf",
          "scale='min(1280,iw)':-2",
          "-q:v",
          "3",
          outputPath,
        ],
        { timeout: 60_000, maxBuffer: 1024 * 1024 }
      );
      const posterPath = `/objects/listing-posters/${userId}/${randomUUID()}.jpg`;
      await objectStorageService.saveObjectEntity(
        posterPath,
        await readFile(outputPath),
        "image/jpeg"
      );
      posters.push(posterPath);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
  return posters;
}

async function normalizeNewListingVideos(
  videoPaths: string[],
  existingVideoPaths: Set<string>,
  userId: string,
): Promise<string[]> {
  const normalizedPaths: string[] = [];
  for (const videoPath of videoPaths) {
    if (existingVideoPaths.has(videoPath)) {
      normalizedPaths.push(videoPath);
      continue;
    }

    const workDir = join(tmpdir(), `inndos-video-normalize-${randomUUID()}`);
    const inputPath = join(workDir, "source-video");
    const outputPath = join(workDir, "normalized.mp4");
    try {
      const videoBytes = await downloadObjectEntityWhenReady(
        videoPath,
        MAX_LISTING_VIDEO_BYTES,
      );
      await mkdir(workDir, { recursive: true });
      await writeFile(inputPath, videoBytes);
      await execFileAsync(
        "ffmpeg",
        [
          "-y",
          "-i", inputPath,
          "-map", "0:v:0",
          "-map", "0:a?",
          "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "25",
          "-c:a", "aac",
          "-b:a", "128k",
          "-movflags", "+faststart",
          "-shortest",
          outputPath,
        ],
        { timeout: 240_000, maxBuffer: 4 * 1024 * 1024 },
      );
      const outputStats = await stat(outputPath);
      if (outputStats.size < 1 || outputStats.size > MAX_LISTING_VIDEO_BYTES) {
        throw new MediaObjectSizeError(outputStats.size, MAX_LISTING_VIDEO_BYTES);
      }
      const normalizedPath = `/objects/listing-videos/${userId}/${randomUUID()}.mp4`;
      await objectStorageService.saveObjectEntity(
        normalizedPath,
        await readFile(outputPath),
        "video/mp4",
      );
      normalizedPaths.push(normalizedPath);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
  return normalizedPaths;
}

async function syncVideoPosters(
  nextVideos: string[],
  currentVideos: string[],
  currentPosters: string[],
  userId: string,
): Promise<string[]> {
  const newVideoPaths = nextVideos.filter((path) => !currentVideos.includes(path));
  const newPosters = await createVideoPosters(newVideoPaths, userId);
  const generatedByVideo = new Map(newVideoPaths.map((path, index) => [path, newPosters[index]]));
  return nextVideos.map((path) => {
    const currentIndex = currentVideos.indexOf(path);
    if (currentIndex >= 0 && currentPosters[currentIndex]) return currentPosters[currentIndex];
    const generated = generatedByVideo.get(path);
    if (!generated) throw new Error(`No poster was generated for ${path}`);
    return generated;
  });
}

const VIDEO_CROP_RATIOS = {
  original: null,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "9:16": 9 / 16,
} as const;

function buildVideoFilter({
  cropAspect,
  caption,
  captionPosition,
  captionFile,
}: {
  cropAspect: keyof typeof VIDEO_CROP_RATIOS;
  caption: string;
  captionPosition: "top" | "center" | "bottom";
  captionFile: string;
}): string {
  const filters: string[] = [];
  const ratio = VIDEO_CROP_RATIOS[cropAspect];
  if (ratio) {
    filters.push(
      `crop='if(gte(iw/ih,${ratio}),ih*${ratio},iw)':'if(gte(iw/ih,${ratio}),ih,iw/${ratio})':'(iw-ow)/2':'(ih-oh)/2'`
    );
  }
  if (caption.trim()) {
    const y = captionPosition === "top"
      ? "h*0.06"
      : captionPosition === "center"
        ? "(h-text_h)/2"
        : "h-text_h-h*0.06";
    filters.push(
      `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile='${captionFile.replace(/'/g, "\\'")}':fontcolor=white:fontsize=h*0.065:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.55:boxborderw=12`
    );
  }
  filters.push("format=yuv420p");
  return filters.join(",");
}

const PROPERTY_COLUMNS = {
  id: properties.id,
  ownerId: properties.ownerId,
  title: properties.title,
  type: properties.type,
  price: properties.price,
  address: properties.address,
  beds: properties.beds,
  baths: properties.baths,
  sqft: properties.sqft,
  guests: properties.guests,
  image: properties.image,
  images: properties.images,
  videos: properties.videos,
  videoPosters: properties.videoPosters,
  details: properties.details,
  description: properties.description,
  isVerified: properties.isVerified,
  propertyStatus: properties.propertyStatus,
  adminComment: properties.adminComment,
  tags: properties.tags,
  subtype: properties.subtype,
  hourlyRate: properties.hourlyRate,
  priceUnit: properties.priceUnit,
  totalUnits: properties.totalUnits,
  lat: properties.lat,
  lng: properties.lng,
  createdAt: properties.createdAt,
  ownerName: users.name,
  ownerAvatar: users.avatar,
  ownerBusinessName: users.businessName,
  isFeatured: properties.isFeatured,
  featuredUntil: properties.featuredUntil,
  avgRating: drizzleSql<string | null>`(SELECT ROUND(AVG(r.rating)::numeric,1)::text FROM reviews r WHERE r.property_id = ${properties.id})`,
  favoritesCount: drizzleSql<number>`(SELECT COUNT(*)::int FROM favorites f WHERE f.property_id = ${properties.id})`,
  activeBookingsCount: drizzleSql<number>`(SELECT COUNT(*)::int FROM bookings b WHERE b.property_id = ${properties.id} AND b.status = 'confirmed')`,
} as const;

const PROPERTY_DETAIL_COLUMNS = {
  ...PROPERTY_COLUMNS,
  ownerPhone: users.phone,
  ownerEmail: users.email,
} as const;

const PUBLIC_PROPERTY_CONDITIONS = [
  eq(properties.isVerified, true),
  eq(properties.propertyStatus, "approved"),
] as const;

async function getCallerInfo(req: Parameters<typeof requireAuth>[0]): Promise<{ userId: string | null; role: string | null }> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return { userId: null, role: null };
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return { userId: null, role: null };
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, payload.userId));
  return { userId: payload.userId, role: user?.role ?? null };
}

router.get("/", async (req, res) => {
  const { type, subtype, search, ownerId, minLat, maxLat, minLng, maxLng } = req.query as Record<string, string>;
  const caller = await getCallerInfo(req);

  const baseQuery = db
    .select(PROPERTY_COLUMNS)
    .from(properties)
    .leftJoin(users, eq(properties.ownerId, users.id));

  const conditions = [];
  const category = type ? normalizePropertyCategory(type, subtype) : null;
  if (type && !category) {
    // Invalid category filters must return no rows, never silently all rows.
    conditions.push(eq(properties.id, "__invalid_property_category__"));
  } else if (category) {
    conditions.push(eq(properties.type, category.type));
  }
  const requestedSubtype = category?.subtype ?? (!type ? normalizePropertySubtype(subtype) : null);
  if (requestedSubtype) {
    // Stored values are canonical kebab-case, but normalize older underscore
    // values too so all clients get the same category results.
    conditions.push(
      drizzleSql`LOWER(REPLACE(REPLACE(COALESCE(${properties.subtype}, ''), '_', '-'), ' ', '-')) = ${requestedSubtype}`
    );
  }
  if (ownerId) conditions.push(eq(properties.ownerId, ownerId));
  if (search?.trim()) {
    const searchText = search.trim();
    const searchCategory = normalizePropertyCategory(searchText);
    const categoryValues = searchCategory
      ? propertyCategorySearchValues(searchCategory.type, searchCategory.subtype ?? undefined)
      : [];
    conditions.push(
      or(
        ilike(properties.title, `%${searchText}%`),
        ilike(properties.address, `%${searchText}%`),
        ilike(properties.type, `%${searchText}%`),
        ilike(properties.subtype, `%${searchText}%`),
        ilike(users.name, `%${searchText}%`),
        ilike(users.businessName, `%${searchText}%`),
        ...categoryValues.map((value) =>
          or(
            drizzleSql`LOWER(${properties.type}) = ${value.toLowerCase()}`,
            drizzleSql`LOWER(REPLACE(REPLACE(COALESCE(${properties.subtype}, ''), '_', '-'), ' ', '-')) = ${value.toLowerCase().replace(/\s+/g, "-")}`
          )!
        ),
      )!
    );
  }

  const bboxRaw = [minLat, maxLat, minLng, maxLng];
  const bboxValues = bboxRaw.map(Number);
  const hasBBox = bboxRaw.every((v) => v !== undefined && v !== "") &&
    bboxValues.every((v) => !isNaN(v));
  if (hasBBox) {
    const [minLatN, maxLatN, minLngN, maxLngN] = bboxValues;
    conditions.push(
      and(
        isNotNull(properties.lat),
        isNotNull(properties.lng),
        gte(drizzleSql`CAST(${properties.lat} AS DOUBLE PRECISION)`, minLatN),
        lte(drizzleSql`CAST(${properties.lat} AS DOUBLE PRECISION)`, maxLatN),
        gte(drizzleSql`CAST(${properties.lng} AS DOUBLE PRECISION)`, minLngN),
        lte(drizzleSql`CAST(${properties.lng} AS DOUBLE PRECISION)`, maxLngN),
      )!
    );
  }

  const isOwnerQuery = ownerId && ownerId === caller.userId;
  const isAdmin = caller.role === "admin";
  if (!isAdmin && !isOwnerQuery) {
    conditions.push(...PUBLIC_PROPERTY_CONDITIONS);
  }

  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  res.json(rows);
});

// ── Lister search ─────────────────────────────────────────────────────────────
// Returns users who have an active paid subscription (non-free) AND at least
// one verified, non-sold property. Only these listers are searchable by name.
router.get("/listers", async (req, res) => {
  try {
    const q       = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const today   = new Date().toISOString().slice(0, 10);
    const pattern = `%${q}%`;

    const rows = await db.execute(drizzleSql`
       SELECT u.id, u.name, u.avatar, u.business_name AS "businessName",
             MAX(s.plan) AS plan,
             COUNT(DISTINCT p.id)::integer AS "propertyCount"
      FROM users u
      INNER JOIN subscriptions s
        ON  s.user_id = u.id
        AND s.status   = 'active'
        AND s.plan    != 'free'
        AND s.end_date >= ${today}
      INNER JOIN properties p
        ON  p.owner_id       = u.id
        AND p.is_verified    = true
        AND p.property_status = 'approved'
       WHERE (u.name ILIKE ${pattern} OR COALESCE(u.business_name, '') ILIKE ${pattern})
      GROUP BY u.id, u.name, u.avatar
      ORDER BY u.name
      LIMIT 20
    `);

    res.json((rows as any).rows ?? rows);
  } catch (err) {
    console.error("Lister search error:", err);
    res.status(500).json({ error: "Failed to load listers" });
  }
});

// Public profile for a paid lister. Only verified, non-sold listings are exposed.
router.get("/listers/:id", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [lister] = await db.execute(drizzleSql`
      SELECT u.id, u.name, u.avatar, u.business_name AS "businessName", s.plan
      FROM users u
      INNER JOIN subscriptions s ON s.user_id = u.id
        AND s.status = 'active' AND s.plan != 'free' AND s.end_date >= ${today}
      WHERE u.id = ${req.params.id}
      ORDER BY s.created_at DESC
      LIMIT 1
    `).then((result: any) => result.rows ?? result);
    if (!lister) {
      res.status(404).json({ error: "Lister profile not found" });
      return;
    }
    const entitlements = await getPlanEntitlements(String(lister.plan));
    if (!entitlements.discoveryEnabled) {
      res.status(404).json({ error: "Lister profile not found" });
      return;
    }
    const listingRows = await db
      .select(PROPERTY_COLUMNS)
      .from(properties)
      .leftJoin(users, eq(properties.ownerId, users.id))
      .where(and(
        eq(properties.ownerId, req.params.id),
        eq(properties.isVerified, true),
        eq(properties.propertyStatus, "approved"),
      ));
    res.json({ lister, properties: listingRows });
  } catch (err) {
    console.error("Lister profile error:", err);
    res.status(500).json({ error: "Failed to load lister profile" });
  }
});

// Featured listings are intentionally a separate feed so homepages can hide the
// section without affecting normal discovery.
router.get("/featured", async (_req, res) => {
  const rows = await db
    .select(PROPERTY_COLUMNS)
    .from(properties)
    .leftJoin(users, eq(properties.ownerId, users.id))
    .where(and(
      eq(properties.isVerified, true),
      eq(properties.isFeatured, true),
      eq(properties.propertyStatus, "approved"),
      drizzleSql`${properties.featuredUntil} > now()`,
    ))
    .orderBy(drizzleSql`${properties.featuredAt} DESC`)
    .limit(12);
  res.json(rows);
});

// Server-side video editing keeps high-resolution transcoding off Android and iOS
// while preserving the same trim, centered crop, and caption behavior as web.
router.post("/videos/process", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [caller] = await db
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, userId));
  if (!caller || caller.status !== "active") {
    res.status(403).json({ error: "This account cannot process listing videos." });
    return;
  }
  if (!["owner", "host", "admin"].includes(caller.role)) {
    res.status(403).json({ error: "Only owners and hosts can process listing videos." });
    return;
  }
  if (caller?.role !== "admin") {
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

  const {
    sourcePath,
    trimStart = 0,
    trimEnd,
    cropAspect = "original",
    caption = "",
    captionPosition = "bottom",
  } = req.body as {
    sourcePath?: string;
    trimStart?: number;
    trimEnd?: number;
    cropAspect?: keyof typeof VIDEO_CROP_RATIOS;
    caption?: string;
    captionPosition?: "top" | "center" | "bottom";
  };

  const ownedSourcePrefixes = [
    `/objects/uploads/${userId}/`,
    `/objects/listing-videos/${userId}/`,
  ];
  if (!sourcePath || !ownedSourcePrefixes.some((prefix) => sourcePath.startsWith(prefix))) {
    res.status(403).json({ error: "The selected video is not owned by this account." });
    return;
  }
  if (!(cropAspect in VIDEO_CROP_RATIOS) || !["top", "center", "bottom"].includes(captionPosition)) {
    res.status(400).json({ error: "The requested video edit is not supported." });
    return;
  }
  if (typeof caption !== "string" || caption.length > 160) {
    res.status(400).json({ error: "Captions must be 160 characters or fewer." });
    return;
  }

  const workDir = join(tmpdir(), `inndos-video-edit-${randomUUID()}`);
  const inputPath = join(workDir, "source");
  const outputPath = join(workDir, "edited.mp4");
  const captionPath = join(workDir, "caption.txt");
  try {
    const videoBytes = await downloadObjectEntityWhenReady(sourcePath, MAX_LISTING_VIDEO_BYTES);
    if (videoBytes.length < 1 || videoBytes.length > MAX_LISTING_VIDEO_BYTES) {
      res.status(400).json({
        error: videoBytes.length < 1
          ? "The selected video is empty. Please choose it again."
          : "Videos must be 250 MB or smaller.",
      });
      return;
    }
    await mkdir(workDir, { recursive: true });
    await writeFile(inputPath, videoBytes);
    await writeFile(captionPath, caption.trim());

    const { stdout } = await execFileAsync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nokey=1:noprint_wrappers=1", inputPath],
      { timeout: 30_000, maxBuffer: 1024 * 1024 },
    );
    const sourceDuration = Number(stdout.trim());
    if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) {
      res.status(400).json({ error: "This video could not be decoded. Please upload an MP4, MOV, or WebM file." });
      return;
    }
    if (sourceDuration > MAX_LISTING_VIDEO_SECONDS + 0.05) {
      res.status(400).json({ error: "Listing videos must be five minutes or shorter." });
      return;
    }
    const start = Number(trimStart);
    const requestedEnd = trimEnd === undefined ? Math.min(sourceDuration, start + 60) : Number(trimEnd);
    if (!Number.isFinite(start) || !Number.isFinite(requestedEnd) ||
      start < 0 || requestedEnd <= start || requestedEnd > sourceDuration + 0.05 || requestedEnd - start > 60.05) {
      res.status(400).json({ error: "Choose a valid clip between 1 second and 1 minute long." });
      return;
    }

    const duration = Math.min(60, requestedEnd - start);
    await execFileAsync(
      "ffmpeg",
      [
        "-y", "-ss", String(start), "-i", inputPath, "-t", String(duration),
        "-vf", buildVideoFilter({ cropAspect, caption, captionPosition, captionFile: captionPath }),
        "-map", "0:v:0", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-movflags", "+faststart", "-shortest", outputPath,
      ],
      { timeout: 180_000, maxBuffer: 2 * 1024 * 1024 },
    );

    const editedPath = `/objects/listing-videos/${userId}/${randomUUID()}.mp4`;
    await objectStorageService.saveObjectEntity(editedPath, await readFile(outputPath), "video/mp4");
    res.status(201).json({ objectPath: editedPath, duration });
  } catch (error) {
    req.log.error({ err: error }, "Video edit failed");
    res.status(500).json({ error: "We could not process this video. Please try again." });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});

router.get("/:id", async (req, res) => {
  const caller = await getCallerInfo(req);

  const [prop] = await db
    .select(PROPERTY_DETAIL_COLUMNS)
    .from(properties)
    .leftJoin(users, eq(properties.ownerId, users.id))
    .where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const isOwner = caller.userId && caller.userId === prop.ownerId;
  const isAdmin = caller.role === "admin";
  if ((!prop.isVerified || prop.propertyStatus !== "approved") && !isOwner && !isAdmin) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  let canViewContacts = Boolean(isOwner || isAdmin);
  if (!canViewContacts && caller.userId) {
    const [activeLinkUp] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(
        eq(bookings.propertyId, prop.id),
        eq(bookings.userId, caller.userId),
        inArray(bookings.status, ["pending", "confirmed"]),
      ))
      .limit(1);
    canViewContacts = Boolean(activeLinkUp);
  }

  res.json(canViewContacts
    ? prop
    : { ...prop, ownerPhone: null, ownerEmail: null }
  );
});

router.get("/:id/availability", async (req, res) => {
  const caller = await getCallerInfo(req);

  const [prop] = await db
    .select({ id: properties.id, propertyStatus: properties.propertyStatus, ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const isOwner = caller.userId && caller.userId === prop.ownerId;
  const isAdmin = caller.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Availability calendars are private." });
    return;
  }
  if (prop.propertyStatus === "sold" && !isOwner && !isAdmin) {
    res.status(410).json({ error: "This property has been sold", sold: true });
    return;
  }

  const [bookingRows, blockRows] = await Promise.all([
    db
      .select({
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, req.params.id),
          inArray(bookings.status, ["pending", "confirmed"])
        )
      ),
    db
      .select({
        startDate: propertyBlocks.startDate,
        endDate: propertyBlocks.endDate,
      })
      .from(propertyBlocks)
      .where(eq(propertyBlocks.propertyId, req.params.id)),
  ]);

  const blocks = blockRows.map(b => ({ ...b, status: "blocked" as const }));
  res.json([...bookingRows, ...blocks]);
});

router.get("/:id/management-calendar", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [prop] = await db.select().from(properties).where(eq(properties.id, req.params.id));
  if (!prop) return void res.status(404).json({ error: "Property not found" });
  if (prop.ownerId !== userId) {
    return void res.status(403).json({ error: "Only the property owner may view this calendar." });
  }
  if (prop.type === "sale") return void res.status(400).json({ error: "Management calendars are not available for sale listings." });
  const [entries, linkUps] = await Promise.all([
    db.select().from(propertyManagementCalendarEntries)
      .where(eq(propertyManagementCalendarEntries.propertyId, prop.id))
      .orderBy(propertyManagementCalendarEntries.startDate),
    db.select({
      id: bookings.id,
      propertyId: bookings.propertyId,
      userId: bookings.userId,
      guestName: users.name,
      status: bookings.status,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      totalPrice: bookings.totalPrice,
      createdAt: bookings.createdAt,
    })
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(eq(bookings.propertyId, prop.id))
      .orderBy(desc(bookings.createdAt)),
  ]);
  res.json({ property: prop, entries, linkUps });
});

router.post("/:id/management-calendar", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { startDate, endDate, note, bookingId } = req.body as {
    startDate?: string; endDate?: string; note?: string; bookingId?: string;
  };
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!startDate || !endDate || !datePattern.test(startDate) || !datePattern.test(endDate) || startDate > endDate) {
    return void res.status(400).json({ error: "Valid startDate and endDate values are required, and endDate cannot be before startDate." });
  }
  if (note !== undefined && (typeof note !== "string" || note.length > 2000)) {
    return void res.status(400).json({ error: "note must be 2,000 characters or fewer." });
  }
  const outcome = await db.transaction(async (tx) => {
    const [prop] = await tx.select().from(properties).where(eq(properties.id, req.params.id)).for("update");
    if (!prop) return { kind: "not-found" as const };
    if (prop.ownerId !== userId) return { kind: "forbidden" as const };
    if (prop.type === "sale") return { kind: "sale" as const };
    if (bookingId) {
      const [booking] = await tx.select({ id: bookings.id }).from(bookings)
        .where(and(eq(bookings.id, bookingId), eq(bookings.propertyId, prop.id)));
      if (!booking) return { kind: "bad-booking" as const };
    }
    const [entry] = await tx.insert(propertyManagementCalendarEntries)
      .values({ propertyId: prop.id, ownerId: userId, bookingId: bookingId || null, startDate, endDate, note: note?.trim() || null })
      .returning();
    return { kind: "created" as const, entry };
  });
  if (outcome.kind === "not-found") return void res.status(404).json({ error: "Property not found" });
  if (outcome.kind === "forbidden") return void res.status(403).json({ error: "Only the property owner may manage this calendar." });
  if (outcome.kind === "sale") return void res.status(400).json({ error: "Management calendars are not available for sale listings." });
  if (outcome.kind === "bad-booking") return void res.status(400).json({ error: "bookingId must belong to this property." });
  res.status(201).json(outcome.entry);
});

router.delete("/:id/management-calendar/:entryId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const outcome = await db.transaction(async (tx) => {
    const [prop] = await tx.select({ ownerId: properties.ownerId }).from(properties).where(eq(properties.id, req.params.id));
    if (!prop) return "not-found" as const;
    if (prop.ownerId !== userId) return "forbidden" as const;
    const [entry] = await tx.delete(propertyManagementCalendarEntries).where(and(
      eq(propertyManagementCalendarEntries.id, req.params.entryId),
      eq(propertyManagementCalendarEntries.propertyId, req.params.id),
      eq(propertyManagementCalendarEntries.ownerId, userId),
    )).returning({ id: propertyManagementCalendarEntries.id });
    return entry ? "deleted" as const : "entry-not-found" as const;
  });
  if (outcome === "not-found") return void res.status(404).json({ error: "Property not found" });
  if (outcome === "forbidden") return void res.status(403).json({ error: "Only the property owner may manage this calendar." });
  if (outcome === "entry-not-found") return void res.status(404).json({ error: "Calendar entry not found" });
  res.json({ success: true });
});

router.get("/:id/blocks", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [prop] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, req.params.id));

  if (!prop) { res.status(404).json({ error: "Property not found" }); return; }

  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (prop.ownerId !== userId && caller?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const blocks = await db
    .select()
    .from(propertyBlocks)
    .where(eq(propertyBlocks.propertyId, req.params.id))
    .orderBy(propertyBlocks.startDate);

  res.json(blocks);
});

router.post("/:id/blocks", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { startDate, endDate, reason } = req.body as {
    startDate?: string;
    endDate?: string;
    reason?: string;
  };

  if (!startDate || !endDate || startDate >= endDate) {
    res.status(400).json({ error: "The block end date must be after the start date" });
    return;
  }

  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  const outcome = await db.transaction(async (tx) => {
    // Use the same per-property lock as booking creation. Whichever operation
    // obtains the lock first is re-checked before the other can proceed.
    await tx.execute(
      drizzleSql`SELECT pg_advisory_xact_lock(hashtextextended(${req.params.id}, 0))`
    );

    const [prop] = await tx
      .select({ ownerId: properties.ownerId })
      .from(properties)
      .where(eq(properties.id, req.params.id));
    if (!prop) return { kind: "not-found" as const };
    if (prop.ownerId !== userId && caller?.role !== "admin") {
      return { kind: "forbidden" as const };
    }

    const [activeBooking] = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, req.params.id),
          inArray(bookings.status, ["pending", "confirmed"]),
          drizzleSql`${bookings.startDate} < ${endDate}`,
          drizzleSql`${bookings.endDate} > ${startDate}`
        )
      )
      .limit(1);
    if (activeBooking) return { kind: "booked" as const };

    const [block] = await tx
      .insert(propertyBlocks)
      .values({ propertyId: req.params.id, startDate, endDate, reason: reason ?? null })
      .returning();
    return { kind: "created" as const, block };
  });

  if (outcome.kind === "not-found") {
    res.status(404).json({ error: "Property not found" });
    return;
  }
  if (outcome.kind === "forbidden") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (outcome.kind === "booked") {
    res.status(409).json({ error: "These dates already contain an active booking." });
    return;
  }

  res.status(201).json(outcome.block);
});

router.post("/:id/feature", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!caller || !["owner", "host"].includes(caller.role)) {
    res.status(403).json({ error: "Only listers can feature properties" });
    return;
  }
  const outcome = await db.transaction(async (tx) => {
    // Serialize each lister's allocation decisions so two simultaneous selections
    // cannot both consume the same remaining monthly slot.
    await tx.execute(drizzleSql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
    const [prop] = await tx.select().from(properties).where(eq(properties.id, req.params.id));
    if (!prop) return { kind: "not-found" as const };
    if (prop.ownerId !== userId) return { kind: "forbidden" as const };
    if (!prop.isVerified || prop.propertyStatus !== "approved") return { kind: "ineligible" as const };
    if (prop.isFeatured && prop.featuredUntil && prop.featuredUntil > new Date()) return { kind: "already" as const, prop };
    const sub = await getActiveSubscription(userId);
    const plan = await getPlanEntitlements(sub?.plan ?? "free");
    const allowance = sub?.plan === "enterprise"
      ? (sub.featuredLimitOverride ?? plan.featuredLimit)
      : plan.featuredLimit;
    if (allowance <= 0) return { kind: "no-access" as const };
    const monthKey = new Date().toISOString().slice(0, 7);
    const [previousUse] = await tx
      .select({ id: featuredListingUses.id })
      .from(featuredListingUses)
      .where(and(
        eq(featuredListingUses.userId, userId),
        eq(featuredListingUses.propertyId, prop.id),
        eq(featuredListingUses.monthKey, monthKey),
      ))
      .limit(1);
    if (previousUse) return { kind: "already-used" as const };
    const used = await tx.execute(drizzleSql`
      SELECT COUNT(*)::int AS count FROM featured_listing_uses
      WHERE user_id = ${userId} AND month_key = ${monthKey}
    `);
    const usedCount = Number((used as any).rows?.[0]?.count ?? 0);
    if (usedCount >= allowance) return { kind: "exhausted" as const, allowance };
    const featuredUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await tx.insert(featuredListingUses).values({ userId, propertyId: prop.id, monthKey });
    const [updated] = await tx.update(properties).set({
      isFeatured: true,
      featuredAt: new Date(),
      featuredUntil,
    }).where(eq(properties.id, prop.id)).returning();
    return { kind: "featured" as const, prop: updated, allowance, used: usedCount + 1 };
  });
  if (outcome.kind === "not-found") return void res.status(404).json({ error: "Property not found" });
  if (outcome.kind === "forbidden") return void res.status(403).json({ error: "Not your property" });
  if (outcome.kind === "ineligible") return void res.status(400).json({ error: "Only verified, available listings can be featured.", code: "FEATURE_INELIGIBLE" });
  if (outcome.kind === "already") return void res.json(outcome.prop);
  if (outcome.kind === "already-used") return void res.status(409).json({
    error: "This listing has already used a featured allocation this month.",
    code: "FEATURE_ALREADY_USED",
  });
  if (outcome.kind === "no-access") return void res.status(403).json({ error: "Your plan does not include featured listings.", code: "FEATURE_NOT_INCLUDED" });
  if (outcome.kind === "exhausted") return void res.status(403).json({ error: `Your monthly featured allowance of ${outcome.allowance} has been used.`, code: "FEATURE_LIMIT", allowance: outcome.allowance });
  res.status(201).json({ ...outcome.prop, featuredAllowance: outcome.allowance, featuredUsed: outcome.used });
});

router.delete("/:id/feature", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [prop] = await db.select({ ownerId: properties.ownerId }).from(properties).where(eq(properties.id, req.params.id));
  if (!prop) return void res.status(404).json({ error: "Property not found" });
  if (prop.ownerId !== userId) return void res.status(403).json({ error: "Not your property" });
  const [updated] = await db.update(properties).set({ isFeatured: false, featuredUntil: null }).where(eq(properties.id, req.params.id)).returning();
  res.json(updated);
});

router.delete("/:id/blocks/:blockId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [prop] = await db
    .select({ ownerId: properties.ownerId })
    .from(properties)
    .where(eq(properties.id, req.params.id));

  if (!prop) { res.status(404).json({ error: "Property not found" }); return; }

  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (prop.ownerId !== userId && caller?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .delete(propertyBlocks)
    .where(
      and(
        eq(propertyBlocks.id, req.params.blockId),
        eq(propertyBlocks.propertyId, req.params.id)
      )
    );

  res.json({ success: true });
});

router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  const allowedRoles = ["owner", "host", "admin"];
  if (!caller || !allowedRoles.includes(caller.role)) {
    res.status(403).json({ error: "Only owners and hosts can create property listings" });
    return;
  }

  if (caller.role !== "admin") {
    const sub = await getActiveSubscription(userId);
    const plan = sub?.plan ?? "free";
    const limit = (await getPlanEntitlements(plan)).limit;
    const [{ listingCount }] = await db
      .select({ listingCount: count() })
      .from(properties)
      .where(eq(properties.ownerId, userId));
    if (Number(listingCount) >= limit) {
      res.status(403).json({
        error: `Your ${plan} plan allows a maximum of ${limit} listing${limit === 1 ? "" : "s"}. Please upgrade your subscription to add more.`,
        code: "SUBSCRIPTION_LIMIT",
        plan,
        limit,
      });
      return;
    }
  }

  const { isVerified: _ignored, ...body } = req.body;
  const imageList: string[] = Array.isArray(body.images) ? body.images : [];
  const videoList: string[] = Array.isArray(body.videos) ? body.videos : [];
  const primaryImage = imageList[0] || body.image || "/images/modern_apartment_exterior.png";
  const completenessErrors = getListingCompletenessErrors(body, imageList);
  if (Object.keys(completenessErrors).length > 0) {
    const firstError = Object.values(completenessErrors)[0]?.[0] ?? "The listing is incomplete.";
    res.status(400).json({ error: firstError, details: { fieldErrors: completenessErrors } });
    return;
  }

  if (caller.role !== "admin") {
    const sub = await getActiveSubscription(userId);
    const plan = sub?.plan ?? "free";

    const imageLimit = (await getPlanEntitlements(plan)).imageLimit;
    if (imageList.length > imageLimit) {
      res.status(403).json({
        error: `Your ${plan} plan allows a maximum of ${imageLimit} photo${imageLimit === 1 ? "" : "s"} per listing. Please remove some images or upgrade your subscription.`,
        code: "IMAGE_LIMIT",
        plan,
        imageLimit,
      });
      return;
    }

    const videoLimit = (await getPlanEntitlements(plan)).videoLimit;
    if (videoList.length > videoLimit) {
      res.status(403).json({
        error: `Your ${plan} plan allows a maximum of ${videoLimit} video${videoLimit === 1 ? "" : "s"} per listing. Please upgrade your subscription.`,
        code: "VIDEO_LIMIT",
        plan,
        videoLimit,
      });
      return;
    }
  }

  const imageValidationError = await validateNewListingMedia({
    paths: imageList.length > 0
      ? imageList
      : primaryImage.startsWith("/objects/")
        ? [primaryImage]
        : [],
    expectedKind: "image",
    userId,
  });
  if (imageValidationError) {
    res.status(400).json({ error: imageValidationError, code: "INVALID_MEDIA" });
    return;
  }
  const videoValidationError = await validateNewListingMedia({
    paths: videoList,
    expectedKind: "video",
    userId,
  });
  if (videoValidationError) {
    res.status(400).json({ error: videoValidationError, code: "INVALID_MEDIA" });
    return;
  }

  let normalizedVideoList: string[];
  try {
    normalizedVideoList = await normalizeNewListingVideos(
      videoList,
      new Set(),
      userId,
    );
  } catch (error) {
    req.log?.error({ err: error }, "Listing video normalization failed");
    res.status(400).json({
      error: "This video could not be converted for playback. Please choose a valid video file.",
      code: "INVALID_MEDIA",
    });
    return;
  }

  let videoPosters: string[] = [];
  try {
    videoPosters = await createVideoPosters(normalizedVideoList, userId);
  } catch (error) {
    req.log?.error({ err: error }, "Listing video poster generation failed");
    res.status(400).json({ error: "A video preview image could not be generated. Please upload a different video.", code: "INVALID_MEDIA" });
    return;
  }

  const normalizedSubtype = typeof body.subtype === "string"
    ? normalizeSubtype(body.subtype)
    : undefined;
  const commercialSpecs = isCommercialSubtype(normalizedSubtype);
  const result = insertPropertySchema.safeParse({
    ...body,
    subtype: normalizedSubtype,
    // Commercial spaces deliberately do not collect residential bed/bath/sqft
    // details. Keep the schema's numeric database contract without rejecting
    // a valid commercial listing submitted by the native form.
    ...(commercialSpecs ? {
      beds: body.beds ?? 0,
      baths: body.baths ?? 0,
      sqft: body.sqft ?? 0,
    } : {}),
    images: imageList,
    videos: normalizedVideoList,
    videoPosters,
    image: primaryImage,
    ownerId: userId,
  });
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const { propertyStatus: _ps, adminComment: _ac, ...insertData } = result.data;
  const [prop] = await db
    .insert(properties)
    .values({
      ...insertData,
      isVerified: false,
      propertyStatus: "pending",
      adminComment: null,
    })
    .returning();
  res.status(201).json(prop);
});

router.patch("/:id/status", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { action } = req.body as { action?: string };
  if (!["deactivate", "reactivate", "sold"].includes(action ?? "")) {
    return void res.status(400).json({ error: "action must be 'deactivate', 'reactivate', or 'sold'." });
  }
  const [caller] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  const outcome = await db.transaction(async (tx) => {
    const [prop] = await tx.select().from(properties).where(eq(properties.id, req.params.id)).for("update");
    if (!prop) return { kind: "not-found" as const };
    if (prop.ownerId !== userId && caller?.role !== "admin") {
      return { kind: "forbidden" as const };
    }
    if (!prop.isVerified && prop.propertyStatus === "pending") {
      return { kind: "pending-review" as const };
    }
    const soldSubtypes = new Set(["apartment", "home", "land"]);
    if (action === "sold" && (prop.type !== "sale" || !soldSubtypes.has(normalizeSubtype(prop.subtype)))) {
      return { kind: "ineligible" as const };
    }
    const nextStatus = action === "deactivate"
      ? "deactivated" as const
      : action === "reactivate"
        ? (prop.isVerified ? "approved" as const : "pending" as const)
        : "sold" as const;
    const [updated] = await tx.update(properties)
      .set({ propertyStatus: nextStatus, ...(action === "reactivate" ? { adminComment: null } : {}) })
      .where(eq(properties.id, prop.id))
      .returning();
    return { kind: "updated" as const, updated };
  });
  if (outcome.kind === "not-found") return void res.status(404).json({ error: "Property not found" });
  if (outcome.kind === "forbidden") {
    return void res.status(403).json({ error: "Only the property owner or an admin may change its status." });
  }
  if (outcome.kind === "pending-review") {
    return void res.status(409).json({
      error: "This property is pending admin review. An admin must activate it before lifecycle actions are available.",
      code: "PENDING_REVIEW",
    });
  }
  if (outcome.kind === "ineligible") {
    return void res.status(400).json({ error: "Only sale listings categorized as apartment, home, or land can be marked sold." });
  }
  res.json(outcome.updated);
});

router.patch("/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  if (Object.prototype.hasOwnProperty.call(req.body, "propertyStatus")) {
    res.status(400).json({
      error: "Use the property status action to deactivate, reactivate, or mark an eligible sale listing as sold.",
      code: "USE_STATUS_ACTION",
    });
    return;
  }

  const [prop] = await db.select().from(properties).where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const [callerUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  const isCallerAdmin = callerUser?.role === "admin";

  if (prop.ownerId !== userId && !isCallerAdmin) {
    res.status(403).json({ error: "Not your property" });
    return;
  }

  const sentKeys = new Set(Object.keys(req.body));
  const { isVerified: _ignored, adminComment: _adminCommentIgnored, ...body } = req.body;
  const imageList: string[] | undefined = Array.isArray(body.images) ? body.images : undefined;
  const videoList: string[] | undefined = Array.isArray(body.videos) ? body.videos : undefined;

  if ((imageList !== undefined || videoList !== undefined) && !isCallerAdmin) {
    const sub = await getActiveSubscription(userId);
    const plan = sub?.plan ?? "free";

    if (imageList !== undefined) {
      const imageLimit = (await getPlanEntitlements(plan)).imageLimit;
      if (imageList.length > imageLimit) {
        res.status(403).json({
          error: `Your ${plan} plan allows a maximum of ${imageLimit} photo${imageLimit === 1 ? "" : "s"} per listing. Please remove some images or upgrade your subscription.`,
          code: "IMAGE_LIMIT",
          plan,
          imageLimit,
        });
        return;
      }
    }

    if (videoList !== undefined) {
      const videoLimit = (await getPlanEntitlements(plan)).videoLimit;
      if (videoList.length > videoLimit) {
        res.status(403).json({
          error: `Your ${plan} plan allows a maximum of ${videoLimit} video${videoLimit === 1 ? "" : "s"} per listing. Please upgrade your subscription.`,
          code: "VIDEO_LIMIT",
          plan,
          videoLimit,
        });
        return;
      }
    }
  }

  const existingMediaPaths = new Set([
    prop.image,
    ...(prop.images ?? []),
    ...(prop.videos ?? []),
  ]);
  const imagePathsToValidate = imageList !== undefined
    ? imageList
    : typeof body.image === "string" && body.image.startsWith("/objects/")
      ? [body.image]
      : [];
  const imageValidationError = await validateNewListingMedia({
    paths: imagePathsToValidate,
    expectedKind: "image",
    userId,
    existingPaths: existingMediaPaths,
  });
  if (imageValidationError) {
    res.status(400).json({ error: imageValidationError, code: "INVALID_MEDIA" });
    return;
  }
  const videoValidationError = await validateNewListingMedia({
    paths: videoList ?? [],
    expectedKind: "video",
    userId,
    existingPaths: existingMediaPaths,
  });
  if (videoValidationError) {
    res.status(400).json({ error: videoValidationError, code: "INVALID_MEDIA" });
    return;
  }

  let normalizedVideoList = videoList;
  if (videoList !== undefined) {
    try {
      normalizedVideoList = await normalizeNewListingVideos(
        videoList,
        new Set(prop.videos ?? []),
        userId,
      );
    } catch (error) {
      req.log?.error({ err: error }, "Listing video normalization failed");
      res.status(400).json({
        error: "This video could not be converted for playback. Please choose a valid video file.",
        code: "INVALID_MEDIA",
      });
      return;
    }
  }

  let videoPosters = prop.videoPosters ?? [];
  if (normalizedVideoList !== undefined) {
    try {
      videoPosters = await syncVideoPosters(
        normalizedVideoList,
        prop.videos ?? [],
        prop.videoPosters ?? [],
        userId,
      );
    } catch (error) {
      req.log?.error({ err: error }, "Listing video poster generation failed");
      res.status(400).json({ error: "A video preview image could not be generated. Please upload a different video.", code: "INVALID_MEDIA" });
      return;
    }
  }

  const patchBody = {
    ...body,
    ...(typeof body.subtype === "string" ? { subtype: normalizeSubtype(body.subtype) } : {}),
    ...(imageList !== undefined ? { images: imageList, image: imageList[0] || body.image || "/images/modern_apartment_exterior.png" } : {}),
    ...(normalizedVideoList !== undefined ? { videos: normalizedVideoList, videoPosters } : {}),
  };
  const updateSchema = insertPropertySchema.omit({ ownerId: true, isVerified: true }).partial();
  const result = updateSchema.safeParse(patchBody);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.flatten() });
    return;
  }

  const effectiveImages = imageList ?? (
    prop.images?.length ? prop.images : prop.image ? [prop.image] : []
  );
  const completenessErrors = getListingCompletenessErrors(
    { ...prop, ...result.data, images: effectiveImages },
    effectiveImages
  );
  if (Object.keys(completenessErrors).length > 0) {
    const firstError = Object.values(completenessErrors)[0]?.[0] ?? "The listing is incomplete.";
    res.status(400).json({ error: firstError, details: { fieldErrors: completenessErrors } });
    return;
  }

  const updatePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result.data)) {
    if (!sentKeys.has(key) || value === undefined) continue;
    const currentValue = prop[key as keyof typeof prop];
    const changed = Array.isArray(value)
      ? JSON.stringify(value) !== JSON.stringify(currentValue)
      : value !== currentValue;
    if (changed) {
      updatePayload[key] = value;
    }
  }

  if (imageList !== undefined && 'images' in updatePayload) {
    const derivedImage = imageList[0] || prop.image || "/images/modern_apartment_exterior.png";
    if (derivedImage !== prop.image) {
      updatePayload.image = derivedImage;
    }
  }

  if (normalizedVideoList !== undefined) {
    const videosChanged = JSON.stringify(normalizedVideoList) !== JSON.stringify(prop.videos ?? []);
    const postersChanged = JSON.stringify(videoPosters) !== JSON.stringify(prop.videoPosters ?? []);
    if (videosChanged || postersChanged) {
      updatePayload.videos = normalizedVideoList;
      updatePayload.videoPosters = videoPosters;
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    res.json(prop);
    return;
  }

  const [updated] = await db
    .update(properties)
    .set(updatePayload)
    .where(eq(properties.id, req.params.id))
    .returning();

  res.json(updated);
});

router.post("/:id/resubmit", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [prop] = await db.select().from(properties).where(eq(properties.id, req.params.id));
  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }
  if (prop.ownerId !== userId) {
    res.status(403).json({ error: "Not your property" });
    return;
  }

  const [updated] = await db
    .update(properties)
    .set({ propertyStatus: "pending", adminComment: null, isVerified: false })
    .where(eq(properties.id, req.params.id))
    .returning();

  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [prop] = await db.select().from(properties).where(eq(properties.id, req.params.id));

  if (!prop) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  if (prop.ownerId !== userId) {
    res.status(403).json({ error: "Not your property" });
    return;
  }

  try {
    const deleted = await deletePropertyTransactionally(prop.id);
    if (!deleted) return void res.status(404).json({ error: "Property not found" });
    res.json({ success: true });
  } catch (error) {
    req.log.error({ err: error, propertyId: prop.id }, "Property deletion failed");
    res.status(500).json({ error: "Property could not be deleted. No data was removed." });
  }
});

export default router;

/**
 * VideoEditModal — in-browser video editor
 * Features: Trim (start/end), Crop (aspect ratio), Caption overlay
 * Processing: canvas + MediaRecorder (no external libraries needed)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Play, Pause, Scissors, Crop, Type,
  Loader2, Check, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "trim" | "crop" | "caption";
type CropAspect = "original" | "16:9" | "4:3" | "1:1" | "9:16";
type CaptionPos = "top" | "center" | "bottom";

const ASPECT_RATIOS: Record<CropAspect, number | null> = {
  original: null, "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1, "9:16": 9 / 16,
};

export interface VideoEditResult {
  file: File;
  previewUrl: string;
}

interface Props {
  videoSrc: string;        // playable URL of the original video
  onSave: (result: VideoEditResult) => void;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// ── Component ──────────────────────────────────────────────────────────────────
export function VideoEditModal({ videoSrc, onSave, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const rafRef    = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  // metadata
  const [duration,    setDuration]    = useState(0);
  const [videoW,      setVideoW]      = useState(0);
  const [videoH,      setVideoH]      = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);

  // editor state
  const [activeTab,   setActiveTab]   = useState<Tab>("trim");
  const [trimStart,   setTrimStart]   = useState(0);
  const [trimEnd,     setTrimEnd]     = useState(0);
  const [cropAspect,  setCropAspect]  = useState<CropAspect>("original");
  const [caption,     setCaption]     = useState("");
  const [captionPos,  setCaptionPos]  = useState<CaptionPos>("bottom");

  // processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [error,        setError]        = useState("");

  // ── Load metadata ────────────────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onMeta = () => {
      setDuration(vid.duration);
      setTrimEnd(Math.min(vid.duration, 60));
      setVideoW(vid.videoWidth);
      setVideoH(vid.videoHeight);
    };
    vid.addEventListener("loadedmetadata", onMeta);
    return () => vid.removeEventListener("loadedmetadata", onMeta);
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => setCurrentTime(vid.currentTime);
    vid.addEventListener("timeupdate", onTime);
    vid.addEventListener("play",  () => setIsPlaying(true));
    vid.addEventListener("pause", () => setIsPlaying(false));
    return () => {
      vid.removeEventListener("timeupdate", onTime);
      vid.removeEventListener("play",  () => setIsPlaying(true));
      vid.removeEventListener("pause", () => setIsPlaying(false));
    };
  }, []);

  // Enforce trim bounds during playback
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || isProcessing) return;
    if (vid.currentTime >= trimEnd) {
      vid.pause();
      vid.currentTime = trimStart;
    }
  }, [currentTime, trimStart, trimEnd, isProcessing]);

  // ── Playback toggle ──────────────────────────────────────────────────────────
  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      if (vid.currentTime < trimStart || vid.currentTime >= trimEnd) vid.currentTime = trimStart;
      vid.play();
    } else {
      vid.pause();
    }
  };

  // ── Crop rect (in video-pixel space) ────────────────────────────────────────
  const getCropRect = useCallback(() => {
    const ratio = ASPECT_RATIOS[cropAspect];
    if (!ratio || !videoW || !videoH) return { x: 0, y: 0, w: videoW, h: videoH };
    const vr = videoW / videoH;
    let w = videoW, h = videoH;
    if (ratio > vr) { h = videoW / ratio; } else { w = videoH * ratio; }
    return { x: (videoW - w) / 2, y: (videoH - h) / 2, w, h };
  }, [cropAspect, videoW, videoH]);

  // ── Draw caption helper ──────────────────────────────────────────────────────
  const drawCaption = useCallback((ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
    if (!caption.trim()) return;
    const fsize = Math.max(14, Math.round(ch * 0.065));
    ctx.save();
    ctx.font = `bold ${fsize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    // Measure for background box
    const metrics = ctx.measureText(caption);
    const textW = metrics.width;
    const pad = fsize * 0.4;
    const ty = captionPos === "top"
      ? fsize + pad + 8
      : captionPos === "center"
      ? ch / 2
      : ch - pad - 8;
    // Background pill
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(cw / 2 - textW / 2 - pad, ty - fsize - 2, textW + pad * 2, fsize + pad * 2, 6);
    ctx.fill();
    // Text
    ctx.fillStyle = "white";
    ctx.fillText(caption, cw / 2, ty);
    ctx.restore();
  }, [caption, captionPos]);

  // ── Process video ────────────────────────────────────────────────────────────
  const handleProcess = async () => {
    const vid = videoRef.current;
    if (!vid) return;

    if (!("captureStream" in HTMLCanvasElement.prototype)) {
      setError("Your browser doesn't support video processing. Please use Chrome or Edge.");
      return;
    }

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const mimeType = mimeTypes.find(m => MediaRecorder.isTypeSupported(m));
    if (!mimeType) {
      setError("Video recording is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setProgress(0);
    stoppedRef.current = false;

    const { x, y, w, h } = getCropRect();
    const outW = Math.round(w || videoW);
    const outH = Math.round(h || videoH);

    const canvas = document.createElement("canvas");
    canvas.width  = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { alpha: false })!;

    const trimDuration = Math.max(0.5, trimEnd - trimStart);

    try {
      // Capture canvas stream (video)
      const canvasStream = (canvas as any).captureStream(30) as MediaStream;

      // Try to add audio from the video element
      try {
        const vidStream = (vid as any).captureStream() as MediaStream;
        vidStream.getAudioTracks().forEach((t: MediaStreamTrack) => canvasStream.addTrack(t));
      } catch { /* audio capture not available — proceed without it */ }

      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 3_500_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      await new Promise<void>((resolve, reject) => {
        recorder.onerror = () => reject(new Error("MediaRecorder error"));
        recorder.onstop  = () => resolve();

        const drawFrame = () => {
          if (stoppedRef.current) { if (recorder.state === "recording") recorder.stop(); return; }

          const t = vid.currentTime;
          const elapsed = Math.max(0, t - trimStart);
          setProgress(Math.min(99, (elapsed / trimDuration) * 100));

          if (t >= trimEnd - 0.05 || vid.ended) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (recorder.state === "recording") recorder.stop();
            return;
          }

          ctx.drawImage(vid, x, y, w || videoW, h || videoH, 0, 0, outW, outH);
          drawCaption(ctx, outW, outH);
          rafRef.current = requestAnimationFrame(drawFrame);
        };

        vid.pause();
        vid.currentTime = trimStart;

        const onSeeked = () => {
          vid.removeEventListener("seeked", onSeeked);
          recorder.start(100);
          vid.play().catch(reject);
          rafRef.current = requestAnimationFrame(drawFrame);
        };
        vid.addEventListener("seeked", onSeeked);
      });

      setProgress(100);
      const ext = mimeType.includes("webm") ? "webm" : "mp4";
      const blob = new Blob(chunks, { type: mimeType });
      const file = new File([blob], `video_${Date.now()}.${ext}`, { type: mimeType });
      const previewUrl = URL.createObjectURL(blob);

      vid.pause();
      vid.currentTime = trimStart;
      setIsPlaying(false);

      onSave({ file, previewUrl });

    } catch (err: any) {
      setError(err?.message ?? "Processing failed. Please try again.");
    } finally {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stoppedRef.current = true;
      setIsProcessing(false);
    }
  };

  const handleStop = () => {
    stoppedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    videoRef.current?.pause();
    setIsProcessing(false);
    setProgress(0);
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isModified = trimStart > 0 || (trimEnd < duration && trimEnd < 60) || cropAspect !== "original" || caption.trim() !== "";

  // Crop overlay (as % of displayed video size)
  const { x: cx, y: cy, w: cw, h: ch } = getCropRect();
  const cropOverlay = videoW && videoH ? {
    left:   `${(cx / videoW) * 100}%`,
    top:    `${(cy / videoH) * 100}%`,
    width:  `${(cw / videoW) * 100}%`,
    height: `${(ch / videoH) * 100}%`,
  } : {};

  const TABS: { id: Tab; label: string; Icon: typeof Scissors }[] = [
    { id: "trim",    label: "Trim",    Icon: Scissors },
    { id: "crop",    label: "Crop",    Icon: Crop },
    { id: "caption", label: "Caption", Icon: Type },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[990] bg-black/85 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 className="font-bold text-sm">Edit Video</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors" disabled={isProcessing}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video preview */}
        <div className="relative bg-black flex items-center justify-center shrink-0" style={{ minHeight: 180 }}>
          <video
            ref={videoRef}
            src={videoSrc}
            className="max-h-[240px] max-w-full object-contain"
            preload="metadata"
            playsInline
          />
          {/* Crop dim overlay */}
          {activeTab === "crop" && cropAspect !== "original" && !!videoW && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute border-2 border-white shadow-lg" style={cropOverlay} />
              </div>
            </div>
          )}
          {/* Caption preview overlay */}
          {activeTab === "caption" && caption.trim() && (
            <div className={`absolute left-0 right-0 px-4 text-center pointer-events-none
              ${captionPos === "top" ? "top-3" : captionPos === "center" ? "top-1/2 -translate-y-1/2" : "bottom-3"}`}>
              <span className="bg-black/55 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                {caption}
              </span>
            </div>
          )}
          {/* Controls */}
          <button onClick={togglePlay} disabled={isProcessing}
            className="absolute bottom-2 left-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors">
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[11px] px-2 py-0.5 rounded font-mono">
            {fmt(currentTime)} / {fmt(Math.min(duration, 60))}
          </span>
        </div>

        {/* Processing progress */}
        {isProcessing && (
          <div className="shrink-0 bg-blue-50 px-4 py-2 flex items-center gap-3 border-b">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-700 font-medium">Processing video… {Math.round(progress)}%</span>
                <button onClick={handleStop} className="text-gray-500 hover:text-gray-800 text-[11px] underline">Cancel</button>
              </div>
              <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="shrink-0 bg-red-50 text-red-700 text-xs px-4 py-2.5 border-b">{error}</div>
        )}

        {/* Tabs */}
        <div className="flex border-b shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => !isProcessing && setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors
                ${activeTab === id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Tab content (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">

          {/* ── TRIM ── */}
          {activeTab === "trim" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Set where the video starts and ends. Maximum 1 minute (60 seconds).</p>

              {/* Timeline visualization */}
              {duration > 0 && (
                <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                  {/* Selected range */}
                  <div className="absolute top-0 bottom-0 bg-blue-200 rounded"
                    style={{ left: `${(trimStart / Math.min(duration, 60)) * 100}%`, width: `${((trimEnd - trimStart) / Math.min(duration, 60)) * 100}%` }} />
                  {/* Playhead */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-10 pointer-events-none"
                    style={{ left: `${(currentTime / Math.min(duration, 60)) * 100}%` }} />
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-400 pointer-events-none select-none">
                    Drag sliders below
                  </div>
                </div>
              )}

              {/* Start slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-gray-700">Start</label>
                  <span className="font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{fmt(trimStart)}</span>
                </div>
                <input type="range" min={0} max={Math.min(duration, 60)} step={0.1}
                  value={trimStart}
                  disabled={isProcessing}
                  onChange={e => {
                    const v = Math.min(+e.target.value, trimEnd - 0.5);
                    setTrimStart(v);
                    if (videoRef.current) videoRef.current.currentTime = v;
                  }}
                  className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* End slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-gray-700">End</label>
                  <span className="font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{fmt(trimEnd)}</span>
                </div>
                <input type="range" min={0} max={Math.min(duration, 60)} step={0.1}
                  value={trimEnd}
                  disabled={isProcessing}
                  onChange={e => {
                    const v = Math.max(+e.target.value, trimStart + 0.5);
                    setTrimEnd(Math.min(v, 60));
                    if (videoRef.current) videoRef.current.currentTime = Math.max(trimStart, v - 0.1);
                  }}
                  className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* Summary */}
              <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2.5">
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-600">Clip length: <strong>{fmt(Math.max(0, trimEnd - trimStart))}</strong></span>
                {trimStart > 0 && <span className="text-gray-400 ml-2">cuts first {fmt(trimStart)}</span>}
                {trimEnd < duration && <span className="text-gray-400 ml-1">· cuts last {fmt(duration - trimEnd)}</span>}
              </div>

              {/* Quick presets */}
              <div>
                <p className="text-[11px] text-gray-400 mb-2">Quick presets — keep from start:</p>
                <div className="flex gap-2 flex-wrap">
                  {[15, 30, 45, 60].filter(s => s < duration).map(s => (
                    <button key={s} disabled={isProcessing}
                      onClick={() => { setTrimStart(0); setTrimEnd(s); }}
                      className="px-2.5 py-1 text-xs rounded-full border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50">
                      {s}s
                    </button>
                  ))}
                  <button disabled={isProcessing}
                    onClick={() => { setTrimStart(0); setTrimEnd(Math.min(duration, 60)); }}
                    className="px-2.5 py-1 text-xs rounded-full border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    Full
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CROP ── */}
          {activeTab === "crop" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Choose an aspect ratio. The video will be cropped from the center to fill the frame.</p>
              <div className="grid grid-cols-5 gap-2">
                {(["original", "16:9", "4:3", "1:1", "9:16"] as CropAspect[]).map(ar => (
                  <button key={ar} onClick={() => !isProcessing && setCropAspect(ar)}
                    className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-colors disabled:opacity-50
                      ${cropAspect === ar ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}>
                    {/* Aspect ratio mini preview */}
                    <div className={`bg-gray-300 rounded-sm ${
                      ar === "original" ? "w-7 h-5"
                      : ar === "16:9"   ? "w-8 h-[18px]"
                      : ar === "4:3"    ? "w-7 h-[21px]"
                      : ar === "1:1"    ? "w-6 h-6"
                      : "w-4 h-7"}`}
                    />
                    <span className="text-[10px] leading-tight text-center">{ar === "original" ? "Orig" : ar}</span>
                  </button>
                ))}
              </div>
              {cropAspect !== "original" ? (
                <div className="bg-blue-50 text-blue-700 text-xs rounded-lg px-3 py-2.5">
                  Cropping to <strong>{cropAspect}</strong> from center. The overlay on the preview above shows the kept region.
                </div>
              ) : (
                <div className="bg-gray-50 text-gray-500 text-xs rounded-lg px-3 py-2.5">
                  Original aspect ratio will be kept — no cropping applied.
                </div>
              )}
            </div>
          )}

          {/* ── CAPTION ── */}
          {activeTab === "caption" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Add a text caption that overlays the video. Preview updates live above.</p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Caption text</label>
                <input type="text" maxLength={80} value={caption} disabled={isProcessing}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="e.g. Welcome to my cozy listing!"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                />
                <p className="text-[11px] text-gray-400">{caption.length}/80 characters</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Position</label>
                <div className="flex gap-2">
                  {(["top", "center", "bottom"] as CaptionPos[]).map(pos => (
                    <button key={pos} onClick={() => !isProcessing && setCaptionPos(pos)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border-2 capitalize transition-colors
                        ${captionPos === pos ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
              {!caption.trim() && (
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2.5">
                  Type a caption above — it will appear overlaid on your video.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs">
            {isModified
              ? <span className="text-amber-600 font-medium">Changes ready · processing plays video in real-time</span>
              : <span className="text-gray-400">No changes yet</span>}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing} className="text-xs h-8">
              Cancel
            </Button>
            <Button size="sm" onClick={handleProcess}
              disabled={isProcessing || !isModified}
              className="gap-1.5 bg-gray-900 hover:bg-gray-800 text-xs h-8">
              {isProcessing
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Processing…</>
                : <><Check className="h-3 w-3" /> Apply &amp; Save</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PropertyLikesPanel — Web owner view showing who saved each listing.
 * Matches detail level of the mobile Property Saves screen:
 *   - Saver name, coloured avatar / photo, relative date per liker
 *   - Collapsible per-property cards
 *   - Summary stat header (total saves across listings)
 */

import { useState, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Home,
} from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Saver {
  likerId: string;
  likerName: string | null;
  likerEmail: string | null;
  likerAvatar: string | null;
  savedAt: string;
}

export interface PropertyWithSaves {
  id: string;
  title: string;
  type: string;
  price: number;
  address: string | null;
  image: string | null;
  isVerified: boolean;
  propertyStatus: string | null;
  totalLikes: number;
  likedBy: Saver[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve object-storage paths to full API URLs */
function resolveUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("/objects/")) return `/api/storage${path}`;
  return path;
}

/** Image with React-state error tracking — avoids DOM-mutation blink loop */
const SafeImg = memo(function SafeImg({
  src, alt, className, fallback,
}: { src: string | null; alt: string; className?: string; fallback: React.ReactNode }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
});

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatExactTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ─── SaverRow ─────────────────────────────────────────────────────────────────

function SaverRow({ saver }: { saver: Saver }) {
  const color = avatarColor(saver.likerId);
  const initials = getInitials(saver.likerName);
  const relDate = formatRelativeDate(saver.savedAt);
  const exactTime = formatExactTime(saver.savedAt);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white text-sm font-semibold"
        style={{ backgroundColor: saver.likerAvatar ? undefined : color }}
      >
        <SafeImg
          src={resolveUrl(saver.likerAvatar)}
          alt={saver.likerName ?? "avatar"}
          className="w-full h-full object-cover"
          fallback={<span>{initials}</span>}
        />
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {saver.likerName ?? saver.likerEmail ?? "Guest"}
        </p>
        {saver.likerEmail && saver.likerName && (
          <p className="text-xs text-gray-400 truncate">{saver.likerEmail}</p>
        )}
      </div>

      {/* Date */}
      <div className="text-right flex-shrink-0 flex items-center gap-1.5">
        <Heart className="h-3 w-3 fill-gray-900 text-gray-900" />
        <div>
          <p className="text-xs text-gray-600 font-medium">{relDate}</p>
          {relDate !== "Today" && relDate !== "Yesterday" && (
            <p className="text-[10px] text-gray-400">{exactTime}</p>
          )}
          {(relDate === "Today" || relDate === "Yesterday") && (
            <p className="text-[10px] text-gray-400">{exactTime}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PropertySavesCard ────────────────────────────────────────────────────────

function PropertySavesCard({ property }: { property: PropertyWithSaves }) {
  const [expanded, setExpanded] = useState(property.totalLikes > 0);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header row — clicking expands/collapses savers */}
        <button
          className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
            <SafeImg
              src={resolveUrl(property.image)}
              alt={property.title}
              className="w-full h-full object-cover"
              fallback={<Home className="h-6 w-6 text-gray-400" />}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{property.title}</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{property.address ?? "—"}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded capitalize">
                {property.type}
              </span>
              {property.isVerified ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                  Pending
                </span>
              )}
            </div>
          </div>

          {/* Save count + view link + chevron */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1 text-gray-900 justify-end">
                <Heart className="h-4 w-4 fill-gray-900" />
                <span className="font-bold text-lg leading-none">{property.totalLikes}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {property.totalLikes === 1 ? "save" : "saves"}
              </p>
            </div>
            <Link
              href={`/properties/${property.id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              aria-label="View listing"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </button>

        {/* Saver list */}
        {expanded && (
          <div>
            {property.likedBy.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-400 text-center">No saves yet</p>
            ) : (
              property.likedBy.map((saver) => (
                <SaverRow key={saver.likerId} saver={saver} />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── PropertyLikesPanel ───────────────────────────────────────────────────────

interface Props {
  propertyLikes: PropertyWithSaves[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function PropertyLikesPanel({ propertyLikes, isLoading, onRefresh }: Props) {
  const totalSaves = propertyLikes.reduce((s, p) => s + p.totalLikes, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Likes</h2>
          {!isLoading && propertyLikes.length > 0 ? (
            <p className="text-sm text-gray-500 mt-1">
              {totalSaves} {totalSaves === 1 ? "save" : "saves"} across{" "}
              {propertyLikes.length} {propertyLikes.length === 1 ? "listing" : "listings"}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">See who saved your listings and when</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : propertyLikes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border rounded-xl bg-white gap-3">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <Heart className="h-10 w-10 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">No likes yet</p>
          <p className="text-sm text-gray-400">When guests save your listings, they'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {propertyLikes.map((prop) => (
            <PropertySavesCard key={prop.id} property={prop} />
          ))}
        </div>
      )}
    </div>
  );
}

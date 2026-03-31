"use client";

import { Eye, Heart, MessageCircle } from "lucide-react";
import type { TikTokVideo } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";

interface VideoCardProps {
  video: TikTokVideo;
  onClick: () => void;
  bookmarked?: boolean;
}

export default function VideoCard({ video, onClick, bookmarked }: VideoCardProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl animate-fadeIn"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${bookmarked ? "var(--accent-teal)" : "var(--border)"}`,
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: "200px",
          background: "linear-gradient(135deg, #1a1d2e 0%, #252840 100%)",
        }}
      >
        {video.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.cover}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-20">🎬</span>
          </div>
        )}

        {/* Duration badge */}
        {video.duration > 0 && (
          <span
            className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.75)", color: "var(--text-primary)" }}
          >
            {video.duration}s
          </span>
        )}

        {/* Bookmarked indicator */}
        {bookmarked && (
          <div
            className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "var(--accent-teal)" }}
          >
            <span className="text-xs font-bold text-black">✓</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p style={{ color: "var(--accent-pink)" }} className="text-xs font-medium truncate">
          @{video.author.uniqueId}
        </p>
        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {video.title || "No caption"}
        </p>
        <div className="flex items-center gap-3 pt-1">
          <StatBadge icon={<Eye size={11} />} value={formatNumber(video.stats.playCount)} />
          <StatBadge icon={<Heart size={11} />} value={formatNumber(video.stats.diggCount)} />
          <StatBadge icon={<MessageCircle size={11} />} value={formatNumber(video.stats.commentCount)} />
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {formatDate(video.createTime)}
        </p>
      </div>

      <div
        className="px-3 py-2 text-xs font-medium"
        style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}
      >
        Click to view details and analyze →
      </div>
    </div>
  );
}

function StatBadge({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
      {icon}
      {value}
    </span>
  );
}

"use client";

import { useState } from "react";
import { Bookmark, Trash2, Search } from "lucide-react";
import type { BookmarkedVideo } from "@/types";
import { getBookmarks, removeBookmark } from "@/lib/storage";
import VideoCard from "@/components/VideoCard";
import VideoModal from "@/components/VideoModal";
import type { TikTokVideo } from "@/types";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedVideo[]>(() => getBookmarks());
  const [selectedVideo, setSelectedVideo] = useState<TikTokVideo | null>(null);
  const [filter, setFilter] = useState("");

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeBookmark(id);
    setBookmarks(getBookmarks());
  };

  const filtered = bookmarks.filter(
    (b) =>
      !filter ||
      b.title.toLowerCase().includes(filter.toLowerCase()) ||
      b.author.uniqueId.toLowerCase().includes(filter.toLowerCase()) ||
      b.hashtags.some((h) => h.includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bookmark size={22} style={{ color: "var(--accent-teal)" }} />
            Bookmarks
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {bookmarks.length} saved video{bookmarks.length !== 1 ? "s" : ""}
          </p>
        </div>

        {bookmarks.length > 0 && (
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter bookmarks..."
              className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                width: "220px",
              }}
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {bookmarks.length === 0 && (
        <div
          className="rounded-2xl p-16 text-center space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <Bookmark size={40} style={{ color: "var(--text-muted)", margin: "0 auto" }} />
          <p className="font-medium">No bookmarks yet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Search for TikTok trends and bookmark videos you want to analyze or brief.
          </p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((video) => (
            <div key={video.id} className="relative group">
              <VideoCard
                video={video}
                onClick={() => setSelectedVideo(video)}
                bookmarked
              />
              {/* Remove button */}
              <button
                onClick={(e) => handleRemove(video.id, e)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(255,59,107,0.9)", color: "#fff" }}
                title="Remove bookmark"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && bookmarks.length > 0 && (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          No bookmarks match &ldquo;{filter}&rdquo;
        </p>
      )}

      {/* Modal */}
      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}

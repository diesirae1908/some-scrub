"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  Zap,
  Info,
} from "lucide-react";
import type { TikTokVideo } from "@/types";
import { formatNumber, calcEngagementRate, generateId } from "@/lib/utils";
import { saveSession, isBookmarked } from "@/lib/storage";
import VideoCard from "@/components/VideoCard";
import VideoModal from "@/components/VideoModal";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const range = searchParams.get("range") || "30";

  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<TikTokVideo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "views" | "engagement">("default");

  useEffect(() => {
    const raw = sessionStorage.getItem("search_results");
    if (raw) {
      const { videos: v, keyword } = JSON.parse(raw);
      setVideos(v);
      setLoaded(true);
      // Save session
      saveSession({
        id: generateId(),
        keyword,
        dateRange: range,
        videos: v,
        createdAt: new Date().toISOString(),
      });
    } else {
      router.push("/");
    }
  }, [range, router]);

  // Computed stats
  const totalViews = videos.reduce((s, v) => s + v.stats.playCount, 0);
  const totalLikes = videos.reduce((s, v) => s + v.stats.diggCount, 0);
  const avgEngagement =
    videos.length > 0
      ? (
          videos.reduce(
            (s, v) =>
              s +
              parseFloat(calcEngagementRate(v.stats).replace("%", "")),
            0
          ) / videos.length
        ).toFixed(1)
      : "0";

  // Top hook type (from most viewed video's hashtags as proxy)
  const topVideo = [...videos].sort((a, b) => b.stats.playCount - a.stats.playCount)[0];

  const sorted = [...videos].sort((a, b) => {
    if (sortBy === "views") return b.stats.playCount - a.stats.playCount;
    if (sortBy === "engagement") {
      const engA = (a.stats.diggCount + a.stats.commentCount + a.stats.shareCount) / (a.stats.playCount || 1);
      const engB = (b.stats.diggCount + b.stats.commentCount + b.stats.shareCount) / (b.stats.playCount || 1);
      return engB - engA;
    }
    return 0;
  });

  const handleExportCSV = () => {
    const header = "Author,Caption,Views,Likes,Comments,Shares,Engagement,Date,URL";
    const rows = videos.map((v) =>
      [
        `@${v.author.uniqueId}`,
        `"${v.title.replace(/"/g, '""')}"`,
        v.stats.playCount,
        v.stats.diggCount,
        v.stats.commentCount,
        v.stats.shareCount,
        calcEngagementRate(v.stats),
        new Date(v.createTime * 1000).toLocaleDateString(),
        v.webVideoUrl,
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tiktok-${query}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (!loaded) return null;

  const rangeLabelMap: Record<string, string> = {
    "7": "Last 7 days",
    "30": "Last 30 days",
    "90": "Last 90 days",
    "180": "Last 6 months",
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 className="text-lg font-bold">
              Results:{" "}
              <span style={{ color: "var(--accent-teal)" }}>&ldquo;{query}&rdquo;</span>
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {videos.length} videos found · {rangeLabelMap[range] || range}
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
          style={{ background: "var(--accent-teal)", color: "#000" }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Views" value={formatNumber(totalViews)} icon={<Eye size={16} />} />
        <StatCard label="Total Likes" value={formatNumber(totalLikes)} icon={<Heart size={16} />} />
        <StatCard label="Avg Engagement" value={`${avgEngagement}%`} icon={<TrendingUp size={16} />} />
        <StatCard
          label="Top Creator"
          value={topVideo ? `@${topVideo.author.uniqueId}` : "N/A"}
          icon={<Zap size={16} />}
          small
        />
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>Sort by:</span>
        {(["default", "views", "engagement"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={
              sortBy === s
                ? { background: "var(--accent-purple)", color: "#fff" }
                : { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
            }
          >
            {s === "default" ? "Relevance" : s === "views" ? "Most Viewed" : "Best Engagement"}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {videos.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <Info size={32} style={{ color: "var(--text-muted)", margin: "0 auto" }} />
          <p className="font-medium">No videos found</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Try a different keyword or date range.
          </p>
        </div>
      )}

      {/* Video grid */}
      {videos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sorted.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onClick={() => setSelectedVideo(video)}
              bookmarked={isBookmarked(video.id)}
            />
          ))}
        </div>
      )}

      {/* Video modal */}
      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  small,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 space-y-1"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`font-bold truncate ${small ? "text-base" : "text-xl"}`}>{value}</p>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}

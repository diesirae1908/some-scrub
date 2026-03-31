"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Play,
  BarChart3,
  Layers,
  AtSign,
  Globe,
  UserPlus,
  MousePointerClick,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  Target,
  Calendar,
  Camera,
  Film,
  Images,
  ChevronRight,
} from "lucide-react";
import type { MetaAnalyticsData, InstagramPost, AIAnalyticsInsight } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function pct(a: number | undefined, b: number | undefined): string {
  if (!a || !b) return "—";
  return ((a / b) * 100).toFixed(1) + "%";
}

function sumValues(arr: { value: number }[]): number {
  return arr.reduce((s, v) => s + (v.value ?? 0), 0);
}

function calcDelta(current: number, previous: number | undefined): number | null {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function avgEngagementRate(posts: InstagramPost[]): string {
  const withReach = posts.filter((p) => p.reach && p.reach > 0);
  if (!withReach.length) return "—";
  const avg =
    withReach.reduce((s, p) => {
      const eng = p.like_count + p.comments_count + (p.saved ?? 0) + (p.shares ?? 0);
      return s + eng / (p.reach ?? 1);
    }, 0) / withReach.length;
  return (avg * 100).toFixed(2) + "%";
}

function daysUntilExpiry(unixStr: string): number {
  const exp = parseInt(unixStr, 10);
  if (!exp) return 999;
  return Math.floor((exp * 1000 - Date.now()) / 86_400_000);
}

function buildWeeklyData(daily: { value: number; end_time?: string }[]) {
  const weeks: { label: string; value: number; startDate: string }[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, Math.min(i + 7, daily.length));
    const total = chunk.reduce((s, v) => s + v.value, 0);
    const firstEndTime = chunk[0]?.end_time;
    const lastEndTime = chunk[chunk.length - 1]?.end_time;
    const first = firstEndTime ? new Date(firstEndTime) : null;
    const last = lastEndTime ? new Date(lastEndTime) : null;
    const label =
      first && last
        ? `${first.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${last.toLocaleDateString("en-US", { day: "numeric" })}`
        : `Wk ${weeks.length + 1}`;
    weeks.push({ label, value: total, startDate: first?.toISOString() ?? "" });
  }
  return weeks;
}

function buildContentTypeStats(posts: InstagramPost[]) {
  const map: Record<string, { count: number; totalReach: number; totalLikes: number; totalSaved: number; totalEngagement: number }> = {};
  for (const p of posts) {
    const t = p.media_type === "VIDEO" ? "REELS" : p.media_type;
    if (!map[t]) map[t] = { count: 0, totalReach: 0, totalLikes: 0, totalSaved: 0, totalEngagement: 0 };
    map[t].count++;
    map[t].totalReach += p.reach ?? 0;
    map[t].totalLikes += p.like_count;
    map[t].totalSaved += p.saved ?? 0;
    map[t].totalEngagement += p.like_count + p.comments_count + (p.saved ?? 0) + (p.shares ?? 0);
  }
  return Object.entries(map).map(([type, s]) => ({
    type,
    count: s.count,
    avgReach: s.count ? Math.round(s.totalReach / s.count) : 0,
    avgLikes: s.count ? Math.round(s.totalLikes / s.count) : 0,
    avgSaved: s.count ? Math.round(s.totalSaved / s.count) : 0,
    avgEngagement: s.count ? Math.round(s.totalEngagement / s.count) : 0,
  })).sort((a, b) => b.avgReach - a.avgReach);
}

function buildDayOfWeekStats(posts: InstagramPost[]) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const stats: Record<number, { count: number; totalReach: number }> = {};
  for (const p of posts) {
    const d = new Date(p.timestamp).getDay();
    if (!stats[d]) stats[d] = { count: 0, totalReach: 0 };
    stats[d].count++;
    stats[d].totalReach += p.reach ?? p.like_count;
  }
  return dayNames.map((day, i) => ({
    day,
    count: stats[i]?.count ?? 0,
    avgReach: stats[i]?.count ? Math.round(stats[i].totalReach / stats[i].count) : 0,
  }));
}

// ── Delta badge ───────────────────────────────────────────────────────────────

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const pos = value >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md"
      style={{
        background: pos ? "#10b98120" : "#ef444420",
        color: pos ? "#10b981" : "#ef4444",
      }}
    >
      {pos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {pos ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

// ── Interactive bar chart (SVG + hover tooltip) ───────────────────────────────

function InteractiveBarChart({
  data,
  color = "#ff3b6b",
  height = 100,
  labelKey = "end_time",
}: {
  data: { value: number; end_time?: string; label?: string }[];
  color?: string;
  height?: number;
  labelKey?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data.length) return <div className="text-xs text-[var(--text-secondary)]">No data</div>;

  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 100 / data.length;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.floor((x / rect.width) * data.length);
    setHoveredIdx(Math.max(0, Math.min(data.length - 1, idx)));
  }

  function formatLabel(d: { value: number; end_time?: string; label?: string }) {
    if (d.label) return d.label;
    if (d.end_time) {
      return new Date(d.end_time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return "";
  }

  const tooltipLeft = hoveredIdx !== null ? ((hoveredIdx + 0.5) / data.length) * 100 : 50;

  return (
    <div
      className="relative select-none cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      {hoveredIdx !== null && (
        <div
          className="absolute z-10 pointer-events-none whitespace-nowrap text-xs rounded-lg px-3 py-2 shadow-xl"
          style={{
            left: `${Math.min(Math.max(tooltipLeft, 10), 90)}%`,
            top: "-48px",
            transform: "translateX(-50%)",
            background: "#1a1a2e",
            border: "1px solid #333",
          }}
        >
          <div className="text-gray-400 text-[10px] mb-0.5">{formatLabel(data[hoveredIdx])}</div>
          <div className="font-semibold" style={{ color }}>{data[hoveredIdx].value.toLocaleString()}</div>
        </div>
      )}
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {hoveredIdx !== null && (
          <line
            x1={(hoveredIdx + 0.5) * w}
            y1={2}
            x2={(hoveredIdx + 0.5) * w}
            y2={height}
            stroke={color}
            strokeWidth="0.4"
            opacity="0.5"
            strokeDasharray="2,2"
          />
        )}
        {data.map((d, i) => {
          const barH = Math.max((d.value / max) * (height - 4), 2);
          return (
            <rect
              key={i}
              x={i * w + w * 0.1}
              y={height - barH}
              width={w * 0.8}
              height={barH}
              rx="1"
              fill={color}
              opacity={hoveredIdx === null || hoveredIdx === i ? 0.85 : 0.25}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  color = "#ff3b6b",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  delta?: number | null;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-2"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: color + "22" }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
        </div>
        {delta !== undefined && <DeltaBadge value={delta ?? null} />}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-[var(--text-secondary)]">{sub}</div>}
    </div>
  );
}

// ── Reach breakdown (followers vs non-followers) ──────────────────────────────

function ReachBreakdown({
  followers,
  nonFollowers,
  total,
}: {
  followers: number | undefined;
  nonFollowers: number | undefined;
  total: number;
}) {
  if (followers === undefined || nonFollowers === undefined) {
    return (
      <div
        className="rounded-xl p-5 flex flex-col gap-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm font-medium text-white">Audience Reach Split</p>
        <p className="text-xs text-[var(--text-secondary)]">Breakdown data not available</p>
      </div>
    );
  }
  const fPct = total > 0 ? (followers / total) * 100 : 0;
  const nfPct = total > 0 ? (nonFollowers / total) * 100 : 0;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Audience Reach Split</p>
        <span className="text-xs text-[var(--text-secondary)]">{fmt(total)} total</span>
      </div>

      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "var(--bg-card-hover)" }}>
        <div
          className="h-full rounded-l-full transition-all duration-700"
          style={{ width: `${fPct}%`, background: "#E1306C" }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-700"
          style={{ width: `${nfPct}%`, background: "#9b5de5" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg p-3" style={{ background: "#E1306C11", border: "1px solid #E1306C33" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: "#E1306C" }} />
            <span className="text-xs text-[var(--text-secondary)]">Followers</span>
          </div>
          <p className="text-lg font-bold text-white">{fPct.toFixed(1)}%</p>
          <p className="text-xs text-[var(--text-secondary)]">{fmt(followers)} accounts</p>
        </div>
        <div className="rounded-lg p-3" style={{ background: "#9b5de511", border: "1px solid #9b5de533" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: "#9b5de5" }} />
            <span className="text-xs text-[var(--text-secondary)]">Non-Followers</span>
          </div>
          <p className="text-lg font-bold text-white">{nfPct.toFixed(1)}%</p>
          <p className="text-xs text-[var(--text-secondary)]">{fmt(nonFollowers)} accounts</p>
        </div>
      </div>
      {nfPct > 50 && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <TrendingUp size={11} /> Great discoverability — most reach comes from new audiences
        </p>
      )}
      {fPct > 70 && (
        <p className="text-xs text-amber-400 flex items-center gap-1">
          <AlertTriangle size={11} /> Most reach is followers — try Reels to boost discovery
        </p>
      )}
    </div>
  );
}

// ── Content type breakdown ────────────────────────────────────────────────────

function ContentTypeBreakdown({ posts }: { posts: InstagramPost[] }) {
  const stats = buildContentTypeStats(posts);
  const maxReach = Math.max(...stats.map((s) => s.avgReach), 1);

  const typeConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    REELS: { color: "#ff3b6b", icon: Film, label: "Reels" },
    IMAGE: { color: "#9b5de5", icon: Camera, label: "Photos" },
    CAROUSEL_ALBUM: { color: "#06b6d4", icon: Images, label: "Carousels" },
  };

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="text-sm font-medium text-white">Performance by Content Type</p>
      <div className="space-y-3">
        {stats.map((s) => {
          const cfg = typeConfig[s.type] ?? { color: "#64748b", icon: Layers, label: s.type };
          const barW = maxReach > 0 ? (s.avgReach / maxReach) * 100 : 0;
          return (
            <div key={s.type}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <cfg.icon size={13} style={{ color: cfg.color }} />
                  <span className="text-sm text-white font-medium">{cfg.label}</span>
                  <span className="text-xs text-[var(--text-secondary)]">({s.count} posts)</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1"><Eye size={10} />{fmt(s.avgReach)}</span>
                  <span className="flex items-center gap-1"><Heart size={10} />{fmt(s.avgLikes)}</span>
                  <span className="flex items-center gap-1"><Bookmark size={10} />{fmt(s.avgSaved)}</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-card-hover)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${barW}%`, background: cfg.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {stats.length > 0 && (
        <p className="text-xs text-[var(--text-secondary)]">
          Avg reach per post · Based on last {posts.length} posts
        </p>
      )}
    </div>
  );
}

// ── Best posting days ─────────────────────────────────────────────────────────

function PostingDaysChart({ posts }: { posts: InstagramPost[] }) {
  const dayStats = buildDayOfWeekStats(posts);
  const maxReach = Math.max(...dayStats.map((d) => d.avgReach), 1);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Best Posting Days</p>
        <span className="text-xs text-[var(--text-secondary)]">avg reach per post</span>
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {dayStats.map((d, i) => {
          const h = maxReach > 0 ? Math.max((d.avgReach / maxReach) * 100, d.count > 0 ? 8 : 0) : 0;
          const isTop = d.avgReach === maxReach && d.count > 0;
          return (
            <div
              key={d.day}
              className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === i && d.count > 0 && (
                <div
                  className="absolute z-10 pointer-events-none text-xs rounded-lg px-2 py-1.5 shadow-xl whitespace-nowrap"
                  style={{
                    background: "#1a1a2e",
                    border: "1px solid #333",
                    marginTop: "-52px",
                    color: "white",
                  }}
                >
                  <div>{fmt(d.avgReach)} avg reach</div>
                  <div className="text-gray-400">{d.count} post{d.count !== 1 ? "s" : ""}</div>
                </div>
              )}
              <div className="w-full rounded-t relative" style={{ height: `${h}%`, minHeight: d.count > 0 ? 4 : 0, background: isTop ? "#ff3b6b" : (hovered === i ? "#9b5de5" : "var(--bg-card-hover)"), transition: "background 0.2s" }} />
              <span className="text-[10px] text-[var(--text-secondary)]">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AI Insights panel ─────────────────────────────────────────────────────────

function InsightList({
  title,
  items,
  color,
  icon: Icon,
}: {
  title: string;
  items: string[];
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-card)", border: `1px solid ${color}33` }}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "22" }}>
          <Icon size={14} style={{ color }} />
        </div>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <ChevronRight size={13} className="mt-0.5 shrink-0" style={{ color }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AIInsightsPanel({ data }: { data: MetaAnalyticsData }) {
  const [insight, setInsight] = useState<AIAnalyticsInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setInsight(json as AIAnalyticsInsight);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-xl p-10 flex flex-col items-center gap-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "#ff3b6b" }}
        />
        <div className="text-center">
          <p className="text-white font-medium mb-1">Analyzing your content…</p>
          <p className="text-sm text-[var(--text-secondary)]">Claude is reviewing your last 30 days of data</p>
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #ff3b6b22, #9b5de522)", border: "1px solid #ff3b6b33" }}
        >
          <Sparkles size={24} className="text-[#ff3b6b]" />
        </div>
        <h3 className="text-base font-semibold text-white mb-2">AI Content Insights</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-2 max-w-sm mx-auto">
          Get Claude-powered analysis of what&apos;s working, what to improve, and specific content
          recommendations for Atome Bakery.
        </p>
        <p className="text-xs text-[var(--text-secondary)] mb-5">Uses your last 30 days of data + period comparison</p>
        {error && (
          <p className="text-red-400 text-xs mb-3 flex items-center justify-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}
        <button
          onClick={generate}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80 active:opacity-70"
          style={{ background: "linear-gradient(135deg, #ff3b6b, #9b5de5)" }}
        >
          Generate AI Insights
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Sparkles size={16} className="text-[#ff3b6b]" />
          AI Content Insights
        </h2>
        <button
          onClick={() => { setInsight(null); setError(null); }}
          className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          Regenerate
        </button>
      </div>

      {/* Summary banner */}
      <div
        className="rounded-xl p-5"
        style={{ background: "linear-gradient(135deg, #ff3b6b0d, #9b5de50d)", border: "1px solid #ff3b6b33" }}
      >
        <p className="text-sm text-white leading-relaxed">{insight.summary}</p>
      </div>

      {/* Best content type + theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">Top Content Format</p>
          <p className="text-sm text-white leading-relaxed">{insight.topContentType}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">Best Performing Theme</p>
          <p className="text-sm text-white leading-relaxed">{insight.bestPerformingTheme}</p>
        </div>
      </div>

      {/* 4-column insight grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightList title="What&apos;s Working" items={insight.whatsWorking} color="#10b981" icon={CheckCircle2} />
        <InsightList title="Areas to Improve" items={insight.areasToImprove} color="#f59e0b" icon={AlertTriangle} />
        <InsightList title="Content Ideas" items={insight.contentRecommendations} color="#9b5de5" icon={Lightbulb} />
        <InsightList title="Action Items This Week" items={insight.actionItems} color="#ff3b6b" icon={Target} />
      </div>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ post, rank }: { post: InstagramPost; rank?: number }) {
  const isVideo = post.media_type === "VIDEO" || post.media_type === "REELS";
  const thumb = post.thumbnail_url || post.media_url;

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-xl overflow-hidden flex flex-col transition-transform hover:-translate-y-0.5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="relative aspect-square bg-[var(--bg-card-hover)] overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={post.caption?.slice(0, 60) ?? "Post"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers size={32} className="text-[var(--text-secondary)]" />
          </div>
        )}
        {rank && rank <= 3 && (
          <div
            className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : "#cd7c2e" }}
          >
            {rank}
          </div>
        )}
        {isVideo && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5 text-xs text-white">
            <Play size={10} fill="white" />
            {post.media_type === "REELS" ? "Reel" : "Video"}
          </div>
        )}
        {post.reach && (
          <div className="absolute bottom-2 right-2 bg-black/60 rounded px-1.5 py-0.5 text-xs text-white">
            {fmt(post.reach)} reach
          </div>
        )}
      </div>
      <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1"><Heart size={11} />{fmt(post.like_count)}</span>
        <span className="flex items-center gap-1"><MessageCircle size={11} />{fmt(post.comments_count)}</span>
        {post.saved !== undefined && (
          <span className="flex items-center gap-1"><Bookmark size={11} />{fmt(post.saved)}</span>
        )}
        {post.shares !== undefined && (
          <span className="flex items-center gap-1"><Share2 size={11} />{fmt(post.shares)}</span>
        )}
        <ExternalLink size={11} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}

// ── Setup banner ──────────────────────────────────────────────────────────────

function SetupBanner() {
  return (
    <div
      className="rounded-2xl p-8 text-center max-w-xl mx-auto mt-16"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #4267B2, #E1306C)" }}
      >
        <BarChart3 size={28} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Connect Meta Analytics</h2>
      <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
        Add your Meta credentials to Render environment variables to unlock the dashboard.
      </p>
      <a
        href="https://dashboard.render.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-80 transition-opacity"
        style={{ background: "linear-gradient(135deg, #ff3b6b, #9b5de5)" }}
      >
        Open Render Dashboard <ExternalLink size={14} />
      </a>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<MetaAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState<"instagram" | "facebook">("instagram");
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meta");
      const json = await res.json();
      if (json.missingConfig) { setNotConfigured(true); return; }
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch analytics");
      setData(json as MetaAnalyticsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "#ff3b6b" }} />
        <p className="text-[var(--text-secondary)] text-sm">Fetching analytics from Meta…</p>
      </div>
    );
  }

  if (notConfigured) return <SetupBanner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-white font-medium">Could not load analytics</p>
        <p className="text-[var(--text-secondary)] text-sm max-w-md text-center">{error}</p>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white"
          style={{ background: "var(--bg-card-hover)" }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const ig = data.instagram;
  const fb = data.facebook;
  const daysLeft = daysUntilExpiry(data.tokenExpiresAt);
  const igReachTotal = sumValues(ig.insights.reach);
  const igFollowerGrowth = sumValues(ig.insights.follower_count);
  const prev = ig.insights.previousPeriod;

  // Deltas
  const reachDelta = calcDelta(igReachTotal, prev?.reach_total);
  const followerDelta = calcDelta(igFollowerGrowth, prev?.follower_growth);
  const engagedDelta = calcDelta(ig.insights.accounts_engaged, prev?.accounts_engaged);
  const profileViewsDelta = calcDelta(ig.insights.profile_views, prev?.profile_views);
  const interactionsDelta = calcDelta(ig.insights.total_interactions, prev?.total_interactions);

  // Weekly data
  const weeklyFollowers = buildWeeklyData(ig.insights.follower_count);
  const weeklyReach = buildWeeklyData(ig.insights.reach);

  return (
    <div className="space-y-8" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            Last 30 days vs previous period · Updated{" "}
            {new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {daysLeft <= 14 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-400"
              style={{ background: "#f59e0b22", border: "1px solid #f59e0b44" }}>
              <AlertTriangle size={12} />
              Token expires in {daysLeft} days
            </div>
          )}
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2">
        {(["instagram", "facebook"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={activeTab === tab ? {
              background: tab === "instagram" ? "#E1306C22" : "#4267B222",
              border: `1px solid ${tab === "instagram" ? "#E1306C55" : "#4267B255"}`,
              color: tab === "instagram" ? "#E1306C" : "#4267B2",
            } : {
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}>
            {tab === "instagram" ? <AtSign size={15} /> : <Globe size={15} />}
            {tab === "instagram" ? "Instagram" : "Facebook"}
          </button>
        ))}
      </div>

      {/* ── Instagram tab ── */}
      {activeTab === "instagram" && (
        <div className="space-y-8">

          {/* Profile strip */}
          <div className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {ig.profile.profile_picture_url && (
              <img src={ig.profile.profile_picture_url} alt={ig.profile.name}
                className="w-12 h-12 rounded-full object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{ig.profile.name}</p>
              <p className="text-[var(--text-secondary)] text-sm">@{ig.profile.username}</p>
            </div>
            <div className="hidden sm:flex gap-6 text-center">
              <div>
                <p className="text-lg font-bold text-white">{fmt(ig.profile.followers_count)}</p>
                <p className="text-xs text-[var(--text-secondary)]">Followers</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{fmt(ig.profile.media_count)}</p>
                <p className="text-xs text-[var(--text-secondary)]">Posts</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{avgEngagementRate(ig.recentPosts)}</p>
                <p className="text-xs text-[var(--text-secondary)]">Avg ER</p>
              </div>
              {prev && (
                <div>
                  <p className="text-lg font-bold text-white">
                    {igFollowerGrowth >= 0 ? "+" : ""}{fmt(igFollowerGrowth)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">New this month</p>
                </div>
              )}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard icon={Users} label="Followers" value={fmt(ig.profile.followers_count)} sub="Total audience" color="#E1306C" />
            <StatCard icon={UserPlus} label="New Followers" value={fmt(igFollowerGrowth)} sub="Last 30 days" delta={followerDelta} color="#10b981" />
            <StatCard icon={Eye} label="Reach" value={fmt(igReachTotal)} sub="Last 30 days" delta={reachDelta} color="#9b5de5" />
            <StatCard icon={Heart} label="Engaged" value={fmt(ig.insights.accounts_engaged)} sub={pct(ig.insights.accounts_engaged, igReachTotal) + " of reach"} delta={engagedDelta} color="#f59e0b" />
            <StatCard icon={MousePointerClick} label="Profile Views" value={fmt(ig.insights.profile_views)} sub="Last 30 days" delta={profileViewsDelta} color="#06b6d4" />
            <StatCard icon={TrendingUp} label="Interactions" value={fmt(ig.insights.total_interactions)} sub="Last 30 days" delta={interactionsDelta} color="#ff3b6b" />
          </div>

          {prev && (
            <p className="text-xs text-[var(--text-secondary)] -mt-4">
              % badges compare last 30 days vs the 30 days before that
            </p>
          )}

          {/* Daily charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-white">Daily Reach</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">{fmt(igReachTotal)} total</span>
                  <DeltaBadge value={reachDelta} />
                </div>
              </div>
              <InteractiveBarChart data={ig.insights.reach} color="#9b5de5" height={90} />
            </div>
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-white">New Followers per Day</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">+{fmt(igFollowerGrowth)} total</span>
                  <DeltaBadge value={followerDelta} />
                </div>
              </div>
              <InteractiveBarChart data={ig.insights.follower_count} color="#10b981" height={90} />
            </div>
          </div>

          {/* Weekly trend + follower breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-[#10b981]" />
                  <p className="text-sm font-medium text-white">Weekly Follower Gain</p>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">by week</span>
              </div>
              <InteractiveBarChart
                data={weeklyFollowers.map((w) => ({ value: w.value, label: w.label, end_time: w.startDate }))}
                color="#10b981"
                height={90}
              />
              {weeklyFollowers.length > 1 && (() => {
                const last = weeklyFollowers[weeklyFollowers.length - 1].value;
                const prev2 = weeklyFollowers[weeklyFollowers.length - 2].value;
                const wkDelta = prev2 > 0 ? ((last - prev2) / prev2) * 100 : null;
                return wkDelta !== null ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <DeltaBadge value={wkDelta} />
                    <span>vs previous week ({fmt(prev2)} → {fmt(last)})</span>
                  </div>
                ) : null;
              })()}
            </div>

            <ReachBreakdown
              followers={ig.insights.reachFollowers}
              nonFollowers={ig.insights.reachNonFollowers}
              total={igReachTotal}
            />
          </div>

          {/* Weekly reach */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-white">Weekly Reach</p>
              <span className="text-xs text-[var(--text-secondary)]">hover for details</span>
            </div>
            <InteractiveBarChart
              data={weeklyReach.map((w) => ({ value: w.value, label: w.label, end_time: w.startDate }))}
              color="#9b5de5"
              height={70}
            />
            <div className="flex justify-between mt-2">
              {weeklyReach.map((w) => (
                <span key={w.label} className="text-[10px] text-[var(--text-secondary)] flex-1 text-center truncate px-1">{w.label}</span>
              ))}
            </div>
          </div>

          {/* Content performance + posting days */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ContentTypeBreakdown posts={ig.recentPosts} />
            <PostingDaysChart posts={ig.recentPosts} />
          </div>

          {/* AI Insights */}
          <div>
            <AIInsightsPanel data={data} />
          </div>

          {/* Top posts */}
          {ig.topPosts.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#E1306C]" />
                Top Posts by Reach
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {ig.topPosts.map((post, i) => (
                  <PostCard key={post.id} post={post} rank={i + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Facebook tab ── */}
      {activeTab === "facebook" && (
        <div className="space-y-8">
          <div className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {fb.page.picture?.data?.url && (
              <img src={fb.page.picture.data.url} alt={fb.page.name}
                className="w-12 h-12 rounded-full object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{fb.page.name}</p>
              <p className="text-[var(--text-secondary)] text-sm">Facebook Page</p>
            </div>
            <div className="hidden sm:flex gap-6 text-center">
              <div>
                <p className="text-lg font-bold text-white">{fmt(fb.page.fan_count)}</p>
                <p className="text-xs text-[var(--text-secondary)]">Page Likes</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{fmt(fb.page.followers_count)}</p>
                <p className="text-xs text-[var(--text-secondary)]">Followers</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={Users} label="Page Likes" value={fmt(fb.page.fan_count)} sub="Total" color="#4267B2" />
            <StatCard icon={Users} label="Followers" value={fmt(fb.page.followers_count)} sub="Total" color="#10b981" />
          </div>

          <div className="rounded-xl p-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-[var(--text-secondary)] text-sm">
              Facebook Page time-series insights require elevated app permissions.<br />
              Instagram analytics above are your primary engagement source.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

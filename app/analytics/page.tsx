"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
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
} from "lucide-react";
import type { MetaAnalyticsData, InstagramPost } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function pct(a: number | undefined, b: number | undefined): string {
  if (!a || !b) return "—";
  return ((a / b) * 100).toFixed(2) + "%";
}

function sumValues(arr: { value: number }[]): number {
  return arr.reduce((s, v) => s + (v.value ?? 0), 0);
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

// ── Mini bar chart (pure SVG, no deps) ───────────────────────────────────────

function BarChart({
  data,
  color = "#ff3b6b",
  height = 80,
}: {
  data: { value: number }[];
  color?: string;
  height?: number;
}) {
  if (!data.length) return <div className="text-xs text-[var(--text-secondary)]">No data</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 100 / data.length;

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * (height - 4), 1);
        return (
          <rect
            key={i}
            x={i * w + w * 0.1}
            y={height - barH}
            width={w * 0.8}
            height={barH}
            rx="1"
            fill={color}
            opacity="0.85"
          />
        );
      })}
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "#ff3b6b",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-2"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: color + "22" }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-[var(--text-secondary)]">{sub}</div>}
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: InstagramPost }) {
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
        {isVideo && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5 text-xs text-white">
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
      <div
        className="text-left rounded-xl p-4 text-xs font-mono space-y-1.5 mb-6"
        style={{ background: "var(--bg-card-hover)" }}
      >
        <div><span className="text-[#E1306C]">META_PAGE_ACCESS_TOKEN</span><span className="text-[var(--text-secondary)]"> = &lt;page token&gt;</span></div>
        <div><span className="text-[#4267B2]">META_PAGE_ID</span><span className="text-[var(--text-secondary)]"> = 108727358385639</span></div>
        <div><span className="text-[#9b5de5]">META_INSTAGRAM_BUSINESS_ACCOUNT_ID</span><span className="text-[var(--text-secondary)]"> = 17841447920681761</span></div>
        <div><span className="text-[#f59e0b]">META_TOKEN_EXPIRES_AT</span><span className="text-[var(--text-secondary)]"> = &lt;unix timestamp&gt;</span></div>
      </div>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            Last 30 days · Updated {new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Followers" value={fmt(ig.profile.followers_count)} sub="Total audience" color="#E1306C" />
            <StatCard icon={UserPlus} label="New Followers" value={fmt(igFollowerGrowth)} sub="Last 30 days" color="#10b981" />
            <StatCard icon={Eye} label="Reach" value={fmt(igReachTotal)} sub="Last 30 days" color="#9b5de5" />
            <StatCard icon={TrendingUp} label="Interactions" value={fmt(ig.insights.total_interactions)} sub="Last 30 days" color="#ff3b6b" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">Daily Reach (30d)</p>
                <span className="text-xs text-[var(--text-secondary)]">{fmt(igReachTotal)} total</span>
              </div>
              <BarChart data={ig.insights.reach} color="#E1306C" height={80} />
            </div>
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">New Followers per Day (30d)</p>
                <span className="text-xs text-[var(--text-secondary)]">+{fmt(igFollowerGrowth)} total</span>
              </div>
              <BarChart data={ig.insights.follower_count} color="#10b981" height={80} />
            </div>
          </div>

          {/* Secondary KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Heart} label="Accts Engaged" value={fmt(ig.insights.accounts_engaged)} sub={pct(ig.insights.accounts_engaged, igReachTotal) + " of reach"} color="#f59e0b" />
            <StatCard icon={MousePointerClick} label="Profile Views" value={fmt(ig.insights.profile_views)} sub="Last 30 days" color="#06b6d4" />
            <StatCard icon={TrendingUp} label="Engagement Rate" value={avgEngagementRate(ig.recentPosts)} sub="Avg per post (reach)" color="#8b5cf6" />
            <StatCard icon={Users} label="Following" value={fmt(ig.profile.follows_count)} sub="Accounts followed" color="#64748b" />
          </div>

          {/* Top posts */}
          {ig.topPosts.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#E1306C]" />
                Top Posts by Reach
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {ig.topPosts.map((post) => <PostCard key={post.id} post={post} />)}
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
              Instagram data above is your primary engagement source.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

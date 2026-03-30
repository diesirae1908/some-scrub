"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { getSessions } from "@/lib/storage";
import { searchTikTok } from "@/lib/tiktok-client";
import type { SearchSession } from "@/types";

const DATE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
];

const COUNT_OPTIONS = [
  { value: 5, label: "5 videos" },
  { value: 10, label: "10 videos" },
  { value: 20, label: "20 videos" },
  { value: 30, label: "30 videos" },
  { value: 50, label: "50 videos" },
];

const SUGGESTED = [
  "french bakery", "croissant recipe", "sourdough bread", "bakery aesthetic",
  "morning pastry", "artisan bread", "pain au chocolat", "viennoiserie",
];

export default function HomePage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [dateRange, setDateRange] = useState("30");
  const [count, setCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SearchSession[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const videos = await searchTikTok(keyword.trim(), count);

      // Store results in sessionStorage for results page
      sessionStorage.setItem(
        "search_results",
        JSON.stringify({ keyword: keyword.trim(), dateRange, videos })
      );
      router.push(`/results?q=${encodeURIComponent(keyword.trim())}&range=${dateRange}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold"
            style={{ background: "linear-gradient(135deg, #ff3b6b, #9b5de5)" }}
          >
            S
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          TikTok Trend Research
        </h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-base max-w-md mx-auto">
          Find trending videos, analyze hooks, and generate creative briefs — in seconds.
        </p>
      </div>

      {/* Search card */}
      <form
        onSubmit={handleSearch}
        className="w-full max-w-2xl rounded-2xl p-6 space-y-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Keyword input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Search Keyword
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. french bakery, croissant, sourdough..."
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent-purple)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          {/* Suggested keywords */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setKeyword(s)}
                className="text-xs px-2.5 py-1 rounded-full transition-colors hover:opacity-80"
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Date + Count */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none cursor-pointer"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Number of Results
            </label>
            <select
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none cursor-pointer"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {COUNT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(255,59,107,0.1)", color: "var(--accent-pink)", border: "1px solid rgba(255,59,107,0.3)" }}
          >
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #ff3b6b, #9b5de5)", color: "#fff" }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="spinner" />
              Scraping TikTok for trending videos...
            </>
          ) : (
            <>
              <Search size={16} />
              Search TikTok
            </>
          )}
        </button>
      </form>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="w-full max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: "var(--text-muted)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              Recent Searches
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sessions.slice(0, 6).map((s) => (
              <button
                key={s.id}
                onClick={() => setKeyword(s.keyword)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:opacity-80"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                <TrendingUp size={11} />
                {s.keyword}
                <span style={{ color: "var(--text-muted)" }}>· {s.videos.length} videos</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

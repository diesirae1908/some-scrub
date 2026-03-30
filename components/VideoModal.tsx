"use client";

import { useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Zap,
  FileText,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Loader2,
} from "lucide-react";
import type { TikTokVideo, VideoAnalysis, BrandProfile, CreativeBrief } from "@/types";
import { formatNumber, formatDate, calcEngagementRate } from "@/lib/utils";
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
  updateBookmarkAnalysis,
  getBrandProfile,
  getApiKey,
} from "@/lib/storage";
import { analyzeVideo, generateBrief } from "@/lib/claude-client";
import BriefModal from "./BriefModal";
import LazyThumbnail from "./LazyThumbnail";

interface VideoModalProps {
  video: TikTokVideo | null;
  onClose: () => void;
}

export default function VideoModal({ video, onClose }: VideoModalProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [brief, setBrief] = useState<CreativeBrief | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);

  useEffect(() => {
    if (video) {
      setBookmarked(isBookmarked(video.id));
      setAnalysis(null);
      setAnalysisError(null);
      setBrief(null);
      setBrandProfile(getBrandProfile());
    }
  }, [video]);

  if (!video) return null;

  const handleBookmark = () => {
    if (bookmarked) {
      removeBookmark(video.id);
      setBookmarked(false);
    } else {
      addBookmark({ ...video, bookmarkedAt: new Date().toISOString() });
      setBookmarked(true);
    }
  };

  const handleAnalyze = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      alert("Please add your Anthropic API key in Brand Profile first.");
      return;
    }
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeVideo(video, apiKey, brandProfile ?? undefined);
      setAnalysis(result);
      updateBookmarkAnalysis(video.id, { analysis: result });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateBrief = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      alert("Please add your Anthropic API key in Brand Profile first.");
      return;
    }
    if (!brandProfile?.brandName) {
      alert("Please set up your Brand Profile first (top nav → Brand Profile)");
      return;
    }
    setGeneratingBrief(true);
    try {
      const result = await generateBrief(video, apiKey, brandProfile, analysis ?? undefined);
      setBrief(result);
      setShowBrief(true);
      updateBookmarkAnalysis(video.id, { brief: result });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate brief");
    } finally {
      setGeneratingBrief(false);
    }
  };

  const engRate = calcEngagementRate(video.stats);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl animate-slideUp"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={18} />
          </button>

          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="relative w-28 h-36 rounded-xl overflow-hidden flex-shrink-0">
                <LazyThumbnail
                  videoId={video.id}
                  authorId={video.author.uniqueId}
                  alt={video.title}
                  duration={0}
                />
              </div>

              {/* Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p style={{ color: "var(--accent-pink)" }} className="font-semibold text-base">
                      @{video.author.uniqueId}
                    </p>
                    <p style={{ color: "var(--text-muted)" }} className="text-xs">
                      {video.author.nickname} · {formatDate(video.createTime)}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {video.title}
                </p>

                {/* Stats pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { icon: <Eye size={12} />, val: formatNumber(video.stats.playCount), label: "Views" },
                    { icon: <Heart size={12} />, val: formatNumber(video.stats.diggCount), label: "Likes" },
                    { icon: <MessageCircle size={12} />, val: formatNumber(video.stats.commentCount), label: "Comments" },
                    { icon: <Share2 size={12} />, val: formatNumber(video.stats.shareCount), label: "Shares" },
                  ].map(({ icon, val, label }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                    >
                      {icon} {val} {label}
                    </span>
                  ))}
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: "rgba(0,212,160,0.1)", color: "var(--accent-teal)", border: "1px solid rgba(0,212,160,0.3)" }}
                  >
                    {engRate} engagement
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={video.webVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                    style={{ color: "var(--accent-pink)", background: "rgba(255,59,107,0.1)", border: "1px solid rgba(255,59,107,0.3)" }}
                  >
                    <ExternalLink size={12} /> Open on TikTok
                  </a>

                  <button
                    onClick={handleBookmark}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                    style={
                      bookmarked
                        ? { color: "var(--accent-teal)", background: "rgba(0,212,160,0.1)", border: "1px solid rgba(0,212,160,0.3)" }
                        : { color: "var(--text-secondary)", background: "var(--bg-input)", border: "1px solid var(--border)" }
                    }
                  >
                    {bookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                    {bookmarked ? "Saved" : "Bookmark"}
                  </button>

                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
                    style={{ color: "#fff", background: "var(--accent-purple)", border: "none" }}
                  >
                    {analyzing ? <Loader2 size={12} className="spinner" /> : <Zap size={12} />}
                    {analyzing ? "Analyzing..." : "Analyze Now"}
                  </button>

                  <button
                    onClick={handleGenerateBrief}
                    disabled={generatingBrief}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
                    style={{ color: "#000", background: "var(--accent-teal)", border: "none", fontWeight: 600 }}
                  >
                    {generatingBrief ? <Loader2 size={12} className="spinner" /> : <FileText size={12} />}
                    {generatingBrief ? "Generating..." : "Generate Brief"}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div
              className="rounded-xl p-4 space-y-4"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
            >
              <h3 className="font-semibold text-sm">AI Analysis</h3>

              {!analysis && !analyzing && !analysisError && (
                <p style={{ color: "var(--text-muted)" }} className="text-sm">
                  Click &ldquo;Analyze Now&rdquo; to get video and comment insights
                </p>
              )}

              {analyzing && (
                <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  <Loader2 size={14} className="spinner" />
                  <span className="text-sm">Analyzing with Claude AI...</span>
                </div>
              )}

              {analysisError && (
                <p className="text-sm" style={{ color: "var(--accent-pink)" }}>
                  {analysisError}
                </p>
              )}

              {analysis && <AnalysisDisplay analysis={analysis} />}
            </div>
          </div>
        </div>
      </div>

      {/* Brief Modal */}
      {showBrief && brief && (
        <BriefModal
          brief={brief}
          video={video}
          onClose={() => setShowBrief(false)}
        />
      )}
    </>
  );
}

function AnalysisDisplay({ analysis }: { analysis: VideoAnalysis }) {
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Video Analysis */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Video Analysis</h4>
        <AnalysisRow label="Visual Hook" value={analysis.visualHook} />
        <AnalysisRow label="Hook Type" value={analysis.hookType} />
        <AnalysisRow label="Undeniable Proof" value={analysis.undeniableProof} />
        <AnalysisRow label="Theme" value={analysis.theme} />
        <AnalysisRow label="Format" value={analysis.contentFormat} />
        <AnalysisRow label="Funnel Stage" value={analysis.funnelStage} />
        <AnalysisRow label="Why It Works" value={analysis.whyItWorks} />
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* Comment Insights */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Comment Insights</h4>
        <div>
          <span style={{ color: "var(--accent-pink)" }} className="text-xs font-semibold">
            Common Questions:
          </span>
          <ul className="mt-1 space-y-0.5">
            {analysis.commentInsights.commonQuestions.map((q, i) => (
              <li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                • {q}
              </li>
            ))}
          </ul>
        </div>
        <AnalysisRow label="Key Insights" value={analysis.commentInsights.keyInsights} />
        <AnalysisRow label="Sentiment" value={analysis.commentInsights.sentiment} />
      </div>
    </div>
  );
}

function AnalysisRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: "var(--accent-pink)" }} className="text-xs font-semibold">
        {label}:{" "}
      </span>
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function calcEngagementRate(stats: {
  playCount: number;
  diggCount: number;
  commentCount: number;
  shareCount: number;
}): string {
  if (!stats.playCount) return "0%";
  const rate =
    ((stats.diggCount + stats.commentCount + stats.shareCount) /
      stats.playCount) *
    100;
  return `${rate.toFixed(1)}%`;
}

export function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g);
  return matches ? matches.map((h) => h.toLowerCase()) : [];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

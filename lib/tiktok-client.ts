"use client";

import type { TikTokVideo } from "@/types";
import { extractHashtags } from "@/lib/utils";

const TIKWM_BASE = "https://www.tikwm.com";
const PROXY = "https://api.allorigins.win/raw?url=";

function proxied(url: string) {
  return `${PROXY}${encodeURIComponent(url)}`;
}

/** Resolve the real TikTok CDN cover URL for a single video */
async function fetchCoverUrl(video: TikTokVideo): Promise<string> {
  try {
    const apiUrl = `${TIKWM_BASE}/api/?url=${encodeURIComponent(video.webVideoUrl)}`;
    const res = await fetch(proxied(apiUrl), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return "";
    const data = await res.json();
    return data?.data?.cover || data?.data?.origin_cover || "";
  } catch {
    return "";
  }
}

/** Run async tasks with a max concurrency to avoid hammering the proxy */
async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function searchTikTok(
  keyword: string,
  count: number
): Promise<TikTokVideo[]> {
  const params = new URLSearchParams({
    keywords: keyword.trim(),
    count: String(Math.min(count, 50)),
    cursor: "0",
    web: "1",
    hd: "1",
  });

  const searchUrl = `${TIKWM_BASE}/api/feed/search?${params}`;
  const res = await fetch(proxied(searchUrl));

  if (!res.ok) throw new Error(`TikTok search failed (${res.status})`);

  const data = await res.json();
  if (!data?.data?.videos?.length) return [];

  // Build initial video objects (cover is empty — will be filled below)
  const videos: TikTokVideo[] = data.data.videos.map(
    (v: RawVideo): TikTokVideo => ({
      id: v.video_id ?? v.id ?? "",
      title: v.title || v.desc || "",
      cover: "", // resolved below
      play: "",
      author: {
        id: v.author?.id || "",
        uniqueId: v.author?.unique_id || v.author?.uniqueId || "",
        nickname: v.author?.nickname || "",
        avatarThumb: "",
      },
      stats: {
        playCount: v.play_count || v.statistics?.playCount || 0,
        diggCount: v.digg_count || v.statistics?.diggCount || 0,
        commentCount: v.comment_count || v.statistics?.commentCount || 0,
        shareCount: v.share_count || v.statistics?.shareCount || 0,
      },
      createTime: v.create_time ?? 0,
      hashtags: extractHashtags(v.title || v.desc || ""),
      duration: v.duration || 0,
      webVideoUrl: `https://www.tiktok.com/@${v.author?.unique_id ?? ""}/video/${v.video_id ?? v.id ?? ""}`,
    })
  );

  // Fetch CDN cover URLs with concurrency=4 to avoid proxy overload
  const covers = await withConcurrency(videos, 4, fetchCoverUrl);
  return videos.map((v, i) => ({ ...v, cover: covers[i] || "" }));
}

interface RawVideo {
  video_id?: string;
  id?: string;
  title?: string;
  desc?: string;
  cover?: string;
  origin_cover?: string;
  play?: string;
  author?: {
    id?: string;
    unique_id?: string;
    uniqueId?: string;
    nickname?: string;
    avatar?: string;
    avatarThumb?: string;
  };
  play_count?: number;
  digg_count?: number;
  comment_count?: number;
  share_count?: number;
  statistics?: {
    playCount?: number;
    diggCount?: number;
    commentCount?: number;
    shareCount?: number;
  };
  create_time?: number;
  duration?: number;
}

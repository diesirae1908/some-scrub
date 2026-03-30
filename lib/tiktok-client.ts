"use client";

import type { TikTokVideo } from "@/types";
import { extractHashtags } from "@/lib/utils";

const TIKWM_BASE = "https://www.tikwm.com";
const PROXY = "https://api.allorigins.win/raw?url=";

function absoluteUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${TIKWM_BASE}${path}`;
}

export async function searchTikTok(
  keyword: string,
  count: number,
): Promise<TikTokVideo[]> {
  const params = new URLSearchParams({
    keywords: keyword.trim(),
    count: String(Math.min(count, 50)),
    cursor: "0",
    web: "1",
    hd: "1",
  });

  const targetUrl = `${TIKWM_BASE}/api/feed/search?${params}`;
  const proxyUrl = `${PROXY}${encodeURIComponent(targetUrl)}`;

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch TikTok data (${response.status})`);
  }

  const data = await response.json();

  if (!data?.data?.videos?.length) {
    return [];
  }

  return data.data.videos.map(
    (v: RawVideo): TikTokVideo => ({
      id: v.video_id ?? v.id ?? "",
      title: v.title || v.desc || "",
      cover: absoluteUrl(v.cover || v.origin_cover || ""),
      play: absoluteUrl(v.play || ""),
      author: {
        id: v.author?.id || "",
        uniqueId: v.author?.unique_id || v.author?.uniqueId || "",
        nickname: v.author?.nickname || "",
        avatarThumb: absoluteUrl(v.author?.avatar || v.author?.avatarThumb || ""),
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

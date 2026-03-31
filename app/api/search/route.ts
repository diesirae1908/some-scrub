import { NextRequest, NextResponse } from "next/server";
import { extractHashtags } from "@/lib/utils";
import type { TikTokVideo } from "@/types";

const TIKWM_BASE = "https://www.tikwm.com";

async function fetchCoverUrl(video: TikTokVideo): Promise<string> {
  try {
    const res = await fetch(
      `${TIKWM_BASE}/api/?url=${encodeURIComponent(video.webVideoUrl)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return "";
    const data = await res.json();
    return data?.data?.cover || data?.data?.origin_cover || "";
  } catch {
    return "";
  }
}

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
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const { keyword, count = 20 } = await req.json();
    if (!keyword?.trim()) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    const params = new URLSearchParams({
      keywords: keyword.trim(),
      count: String(Math.min(count, 50)),
      cursor: "0",
      web: "1",
      hd: "1",
    });

    const res = await fetch(`${TIKWM_BASE}/api/feed/search?${params}`);
    if (!res.ok) throw new Error(`TikTok search failed (${res.status})`);

    const data = await res.json();
    if (!data?.data?.videos?.length) return NextResponse.json({ videos: [] });

    const videos: TikTokVideo[] = data.data.videos.map((v: RawVideo): TikTokVideo => ({
      id: v.video_id ?? v.id ?? "",
      title: v.title || v.desc || "",
      cover: "",
      play: "",
      author: {
        id: v.author?.id || "",
        uniqueId: v.author?.unique_id || v.author?.uniqueId || "",
        nickname: v.author?.nickname || "",
        avatarThumb: "",
      },
      stats: {
        playCount: v.play_count || 0,
        diggCount: v.digg_count || 0,
        commentCount: v.comment_count || 0,
        shareCount: v.share_count || 0,
      },
      createTime: v.create_time ?? 0,
      hashtags: extractHashtags(v.title || v.desc || ""),
      duration: v.duration || 0,
      webVideoUrl: `https://www.tiktok.com/@${v.author?.unique_id ?? ""}/video/${v.video_id ?? v.id ?? ""}`,
    }));

    // Fetch real CDN cover URLs server-side (no CORS issues here)
    const covers = await withConcurrency(videos, 6, fetchCoverUrl);
    const result = videos.map((v, i) => ({ ...v, cover: covers[i] || "" }));

    return NextResponse.json({ videos: result });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Failed to fetch TikTok data" }, { status: 500 });
  }
}

interface RawVideo {
  video_id?: string; id?: string; title?: string; desc?: string;
  author?: { id?: string; unique_id?: string; uniqueId?: string; nickname?: string; };
  play_count?: number; digg_count?: number; comment_count?: number; share_count?: number;
  create_time?: number; duration?: number;
}

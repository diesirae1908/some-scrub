import { NextResponse } from "next/server";
import type { MetaAnalyticsData, InstagramPost } from "@/types";

const GRAPH = "https://graph.facebook.com/v19.0";

function cfg() {
  return {
    pageToken: process.env.META_PAGE_ACCESS_TOKEN ?? "",
    pageId: process.env.META_PAGE_ID ?? "",
    igId: process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "",
    tokenExpiry: process.env.META_TOKEN_EXPIRES_AT ?? "",
  };
}

async function gql<T>(
  path: string,
  token: string,
  params?: Record<string, string>
): Promise<T> {
  const p = new URLSearchParams({ access_token: token, ...params });
  const res = await fetch(`${GRAPH}/${path}?${p}`, { next: { revalidate: 0 } });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error on /${path} (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
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

export async function GET() {
  const { pageToken, pageId, igId, tokenExpiry } = cfg();

  if (!pageToken || !pageId || !igId) {
    return NextResponse.json(
      { error: "Meta credentials not configured", missingConfig: true },
      { status: 503 }
    );
  }

  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const until = Math.floor(Date.now() / 1000);

  try {
    // ── Instagram Profile ──────────────────────────────────────────────────
    const igProfile = await gql<{
      id: string; name: string; username: string;
      profile_picture_url: string; followers_count: number;
      follows_count: number; media_count: number; biography: string;
    }>(igId, pageToken, {
      fields: "id,name,username,profile_picture_url,followers_count,follows_count,media_count,biography",
    });

    // ── Instagram daily reach + follower growth ────────────────────────────
    const igDailyRaw = await gql<{
      data: { name: string; values: { value: number; end_time: string }[] }[];
    }>(`${igId}/insights`, pageToken, {
      metric: "reach,follower_count",
      period: "day",
      since: String(since),
      until: String(until),
    });

    const igDailyMap: Record<string, { value: number; end_time: string }[]> = {};
    for (const m of igDailyRaw.data) igDailyMap[m.name] = m.values;

    // ── Instagram aggregate totals (30d) ──────────────────────────────────
    const igTotalRaw = await gql<{
      data: { name: string; total_value: { value: number } }[];
    }>(`${igId}/insights`, pageToken, {
      metric: "accounts_engaged,profile_views,total_interactions",
      metric_type: "total_value",
      period: "day",
      since: String(since),
      until: String(until),
    });

    const igTotals: Record<string, number> = {};
    for (const m of igTotalRaw.data) igTotals[m.name] = m.total_value?.value ?? 0;

    // ── Instagram Recent Posts ─────────────────────────────────────────────
    const postsRaw = await gql<{
      data: {
        id: string; caption?: string;
        media_type: InstagramPost["media_type"];
        media_url?: string; thumbnail_url?: string;
        permalink: string; timestamp: string;
        like_count: number; comments_count: number;
      }[];
    }>(`${igId}/media`, pageToken, {
      fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
      limit: "20",
    });

    // Fetch per-post insights concurrently
    const postsWithInsights = await withConcurrency(postsRaw.data, 6, async (post) => {
      try {
        const ins = await gql<{
          data: { name: string; values: { value: number }[] }[];
        }>(`${post.id}/insights`, pageToken, {
          metric: "reach,saved,shares",
        });
        const m: Record<string, number> = {};
        for (const d of ins.data) m[d.name] = d.values?.[0]?.value ?? 0;
        return {
          id: post.id,
          caption: post.caption ?? "",
          media_type: post.media_type,
          media_url: post.media_url ?? "",
          thumbnail_url: post.thumbnail_url,
          permalink: post.permalink,
          timestamp: post.timestamp,
          like_count: post.like_count,
          comments_count: post.comments_count,
          reach: m.reach,
          saved: m.saved,
          shares: m.shares,
        } satisfies InstagramPost;
      } catch {
        return {
          id: post.id,
          caption: post.caption ?? "",
          media_type: post.media_type,
          media_url: post.media_url ?? "",
          thumbnail_url: post.thumbnail_url,
          permalink: post.permalink,
          timestamp: post.timestamp,
          like_count: post.like_count,
          comments_count: post.comments_count,
        } satisfies InstagramPost;
      }
    });

    const topPosts = [...postsWithInsights]
      .sort((a, b) => (b.reach ?? b.like_count) - (a.reach ?? a.like_count))
      .slice(0, 9);

    // ── Facebook Page ──────────────────────────────────────────────────────
    const fbPage = await gql<{
      id: string; name: string; fan_count: number;
      followers_count: number; picture: { data: { url: string } };
    }>(pageId, pageToken, {
      fields: "id,name,fan_count,followers_count,picture{url}",
    });

    const payload: MetaAnalyticsData = {
      instagram: {
        profile: igProfile,
        insights: {
          reach: igDailyMap.reach ?? [],
          follower_count: igDailyMap.follower_count ?? [],
          accounts_engaged: igTotals.accounts_engaged ?? 0,
          profile_views: igTotals.profile_views ?? 0,
          total_interactions: igTotals.total_interactions ?? 0,
        },
        topPosts,
        recentPosts: postsWithInsights,
      },
      facebook: {
        page: fbPage,
      },
      tokenExpiresAt: tokenExpiry,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Meta API error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

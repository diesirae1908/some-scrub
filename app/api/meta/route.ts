import { NextResponse } from "next/server";
import type { MetaAnalyticsData, InstagramPost, InstagramInsightsPrev } from "@/types";

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

  const now = Math.floor(Date.now() / 1000);
  const since = now - 30 * 86400;
  const until = now;
  const prevSince = now - 60 * 86400;
  const prevUntil = now - 30 * 86400;

  try {
    // ── Phase 1: all parallel reads ────────────────────────────────────────
    const [
      igProfileRes,
      igDailyRes,
      igTotalRes,
      igPrevDailyRes,
      igPrevTotalRes,
      igReachBreakRes,
      postsRes,
      fbPageRes,
    ] = await Promise.allSettled([
      // Profile
      gql<{
        id: string; name: string; username: string;
        profile_picture_url: string; followers_count: number;
        follows_count: number; media_count: number; biography: string;
      }>(igId, pageToken, {
        fields: "id,name,username,profile_picture_url,followers_count,follows_count,media_count,biography",
      }),

      // Current period daily: reach + follower_count
      gql<{ data: { name: string; values: { value: number; end_time: string }[] }[] }>(
        `${igId}/insights`, pageToken, {
          metric: "reach,follower_count",
          period: "day",
          since: String(since),
          until: String(until),
        }
      ),

      // Current period aggregates
      gql<{ data: { name: string; total_value: { value: number } }[] }>(
        `${igId}/insights`, pageToken, {
          metric: "accounts_engaged,profile_views,total_interactions",
          metric_type: "total_value",
          period: "day",
          since: String(since),
          until: String(until),
        }
      ),

      // Previous period daily: reach + follower_count
      gql<{ data: { name: string; values: { value: number; end_time: string }[] }[] }>(
        `${igId}/insights`, pageToken, {
          metric: "reach,follower_count",
          period: "day",
          since: String(prevSince),
          until: String(prevUntil),
        }
      ),

      // Previous period aggregates
      gql<{ data: { name: string; total_value: { value: number } }[] }>(
        `${igId}/insights`, pageToken, {
          metric: "accounts_engaged,profile_views,total_interactions",
          metric_type: "total_value",
          period: "day",
          since: String(prevSince),
          until: String(prevUntil),
        }
      ),

      // Reach breakdown by follow_type (followers vs non-followers)
      gql<{
        data: {
          name: string;
          total_value: {
            value: number;
            breakdowns: {
              dimension_keys: string[];
              results: { dimension_values: string[]; value: number }[];
            }[];
          };
        }[];
      }>(`${igId}/insights`, pageToken, {
        metric: "reach",
        metric_type: "total_value",
        breakdown: "follow_type",
        period: "day",
        since: String(since),
        until: String(until),
      }),

      // Recent posts
      gql<{
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
      }),

      // Facebook Page
      gql<{
        id: string; name: string; fan_count: number;
        followers_count: number; picture: { data: { url: string } };
      }>(pageId, pageToken, {
        fields: "id,name,fan_count,followers_count,picture{url}",
      }),
    ]);

    // ── Throw if critical calls failed ────────────────────────────────────
    if (igProfileRes.status === "rejected") throw igProfileRes.reason;
    if (igDailyRes.status === "rejected") throw igDailyRes.reason;
    if (igTotalRes.status === "rejected") throw igTotalRes.reason;
    if (postsRes.status === "rejected") throw postsRes.reason;
    if (fbPageRes.status === "rejected") throw fbPageRes.reason;

    // ── Process current period ─────────────────────────────────────────────
    const igProfile = igProfileRes.value;
    const igDailyMap: Record<string, { value: number; end_time: string }[]> = {};
    for (const m of igDailyRes.value.data) igDailyMap[m.name] = m.values;

    const igTotals: Record<string, number> = {};
    for (const m of igTotalRes.value.data) igTotals[m.name] = m.total_value?.value ?? 0;

    // ── Process previous period ────────────────────────────────────────────
    let previousPeriod: InstagramInsightsPrev | undefined;
    if (igPrevDailyRes.status === "fulfilled" && igPrevTotalRes.status === "fulfilled") {
      const prevDailyMap: Record<string, { value: number; end_time: string }[]> = {};
      for (const m of igPrevDailyRes.value.data) prevDailyMap[m.name] = m.values;

      const prevTotals: Record<string, number> = {};
      for (const m of igPrevTotalRes.value.data) prevTotals[m.name] = m.total_value?.value ?? 0;

      previousPeriod = {
        reach_total: (prevDailyMap.reach ?? []).reduce((s, v) => s + v.value, 0),
        follower_growth: (prevDailyMap.follower_count ?? []).reduce((s, v) => s + v.value, 0),
        accounts_engaged: prevTotals.accounts_engaged ?? 0,
        profile_views: prevTotals.profile_views ?? 0,
        total_interactions: prevTotals.total_interactions ?? 0,
      };
    }

    // ── Process follower/non-follower reach breakdown ──────────────────────
    let reachFollowers: number | undefined;
    let reachNonFollowers: number | undefined;
    if (igReachBreakRes.status === "fulfilled") {
      const reachMetric = igReachBreakRes.value.data.find((d) => d.name === "reach");
      const breakdownResults = reachMetric?.total_value?.breakdowns?.[0]?.results ?? [];
      for (const r of breakdownResults) {
        if (r.dimension_values[0] === "FOLLOWER") reachFollowers = r.value;
        if (r.dimension_values[0] === "NON_FOLLOWER") reachNonFollowers = r.value;
      }
    }

    // ── Phase 2: per-post insights ─────────────────────────────────────────
    const postsWithInsights = await withConcurrency(postsRes.value.data, 6, async (post) => {
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

    const payload: MetaAnalyticsData = {
      instagram: {
        profile: igProfile,
        insights: {
          reach: igDailyMap.reach ?? [],
          follower_count: igDailyMap.follower_count ?? [],
          accounts_engaged: igTotals.accounts_engaged ?? 0,
          profile_views: igTotals.profile_views ?? 0,
          total_interactions: igTotals.total_interactions ?? 0,
          previousPeriod,
          reachFollowers,
          reachNonFollowers,
        },
        topPosts,
        recentPosts: postsWithInsights,
      },
      facebook: {
        page: fbPageRes.value,
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

import { NextRequest, NextResponse } from "next/server";
import type {
  MetaAnalyticsData,
  InstagramProfile,
  InstagramInsights,
  InstagramPost,
  FacebookPage,
  FacebookInsights,
} from "@/types";

const GRAPH = "https://graph.facebook.com/v19.0";

function cfg() {
  return {
    pageToken: process.env.META_PAGE_ACCESS_TOKEN ?? "",
    pageId: process.env.META_PAGE_ID ?? "",
    igId: process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "",
  };
}

async function gql<T>(path: string, token: string, params?: Record<string, string>): Promise<T> {
  const p = new URLSearchParams({ access_token: token, ...params });
  const res = await fetch(`${GRAPH}/${path}?${p}`, { next: { revalidate: 0 } });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

export async function GET(req: NextRequest) {
  const { pageToken, pageId, igId } = cfg();

  if (!pageToken || !pageId || !igId) {
    return NextResponse.json(
      { error: "Meta credentials not configured", missingConfig: true },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") as "day" | "week" | "month") ?? "day";
  const since = Math.floor(Date.now() / 1000) - 30 * 86400; // last 30 days

  try {
    // ── Instagram Profile ──────────────────────────────────────────────────
    const igProfile = await gql<InstagramProfile>(igId, pageToken, {
      fields: "id,name,username,profile_picture_url,followers_count,follows_count,media_count,biography",
    });

    // ── Instagram Insights ────────────────────────────────────────────────
    const igInsightsRaw = await gql<{ data: { name: string; values: { value: number; end_time: string }[] }[] }>(
      `${igId}/insights`,
      pageToken,
      {
        metric: "reach,impressions,profile_views,accounts_engaged",
        period,
        since: String(since),
        until: String(Math.floor(Date.now() / 1000)),
      }
    );

    const igInsights: InstagramInsights = {
      reach: [],
      impressions: [],
      profile_views: [],
      accounts_engaged: [],
    };
    for (const metric of igInsightsRaw.data) {
      const key = metric.name as keyof InstagramInsights;
      if (key in igInsights) igInsights[key] = metric.values;
    }

    // ── Instagram Recent Posts ─────────────────────────────────────────────
    const postsRaw = await gql<{
      data: {
        id: string;
        caption?: string;
        media_type: InstagramPost["media_type"];
        media_url?: string;
        thumbnail_url?: string;
        permalink: string;
        timestamp: string;
        like_count: number;
        comments_count: number;
      }[];
    }>(`${igId}/media`, pageToken, {
      fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
      limit: "24",
    });

    // Fetch post-level insights concurrently (capped at 6 parallel)
    const postsWithInsights = await withConcurrency(postsRaw.data, 6, async (post) => {
      try {
        const metrics =
          post.media_type === "REELS"
            ? "reach,impressions,saved,shares,plays"
            : post.media_type === "VIDEO"
            ? "reach,impressions,saved,shares"
            : "reach,impressions,saved,shares";

        const ins = await gql<{ data: { name: string; values?: { value: number }[]; value?: number }[] }>(
          `${post.id}/insights`,
          pageToken,
          { metric: metrics }
        );

        const m: Record<string, number> = {};
        for (const d of ins.data) {
          m[d.name] = d.value ?? d.values?.[0]?.value ?? 0;
        }

        return {
          ...post,
          caption: post.caption ?? "",
          media_url: post.media_url ?? "",
          reach: m.reach,
          impressions: m.impressions,
          saved: m.saved,
          shares: m.shares,
          plays: m.plays,
        } satisfies InstagramPost;
      } catch {
        return { ...post, caption: post.caption ?? "", media_url: post.media_url ?? "" } satisfies InstagramPost;
      }
    });

    const topPosts = [...postsWithInsights]
      .sort((a, b) => ((b as InstagramPost).reach ?? 0) - ((a as InstagramPost).reach ?? 0))
      .slice(0, 9);

    // ── Facebook Page ──────────────────────────────────────────────────────
    const fbPage = await gql<FacebookPage>(pageId, pageToken, {
      fields: "id,name,fan_count,followers_count,picture{url}",
    });

    // ── Facebook Page Insights ─────────────────────────────────────────────
    const fbInsightsRaw = await gql<{ data: { name: string; values: { value: number; end_time: string }[] }[] }>(
      `${pageId}/insights`,
      pageToken,
      {
        metric: "page_impressions,page_engaged_users,page_post_engagements,page_fan_adds",
        period: "day",
        since: String(since),
        until: String(Math.floor(Date.now() / 1000)),
      }
    );

    const fbInsights: FacebookInsights = {
      page_impressions: [],
      page_engaged_users: [],
      page_post_engagements: [],
      page_fan_adds: [],
    };
    for (const metric of fbInsightsRaw.data) {
      const key = metric.name as keyof FacebookInsights;
      if (key in fbInsights) fbInsights[key] = metric.values;
    }

    const payload: MetaAnalyticsData = {
      instagram: {
        profile: igProfile,
        insights: igInsights,
        topPosts,
        recentPosts: postsWithInsights,
      },
      facebook: {
        page: fbPage,
        insights: fbInsights,
      },
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Meta API error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
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

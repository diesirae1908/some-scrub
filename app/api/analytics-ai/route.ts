import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MetaAnalyticsData } from "@/types";

export async function POST(req: NextRequest) {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ?? process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 503 }
    );
  }

  const data: MetaAnalyticsData = await req.json();
  const ig = data.instagram;

  const reachTotal = ig.insights.reach.reduce((s, v) => s + v.value, 0);
  const followerGrowth = ig.insights.follower_count.reduce((s, v) => s + v.value, 0);
  const engagementRate =
    reachTotal > 0
      ? ((ig.insights.accounts_engaged / reachTotal) * 100).toFixed(2)
      : "N/A";

  const prev = ig.insights.previousPeriod;
  const delta = (cur: number, old: number) =>
    old > 0 ? ((cur - old) / old * 100).toFixed(1) : null;

  const reachDelta = prev ? delta(reachTotal, prev.reach_total) : null;
  const followerDelta = prev ? delta(followerGrowth, prev.follower_growth) : null;
  const engagedDelta = prev ? delta(ig.insights.accounts_engaged, prev.accounts_engaged) : null;

  // Content type breakdown
  const byType: Record<string, { count: number; totalReach: number; totalLikes: number; totalComments: number; totalSaved: number }> = {};
  for (const p of ig.recentPosts) {
    const t = p.media_type === "VIDEO" ? "REELS" : p.media_type;
    if (!byType[t]) byType[t] = { count: 0, totalReach: 0, totalLikes: 0, totalComments: 0, totalSaved: 0 };
    byType[t].count++;
    byType[t].totalReach += p.reach ?? 0;
    byType[t].totalLikes += p.like_count;
    byType[t].totalComments += p.comments_count;
    byType[t].totalSaved += p.saved ?? 0;
  }

  const contentTypeBreakdown = Object.entries(byType)
    .map(([type, s]) =>
      `${type}: ${s.count} posts | avg reach ${s.count ? Math.round(s.totalReach / s.count) : 0} | avg likes ${s.count ? Math.round(s.totalLikes / s.count) : 0} | avg saves ${s.count ? Math.round(s.totalSaved / s.count) : 0}`
    )
    .join("\n");

  const topPostsSummary = ig.topPosts
    .slice(0, 5)
    .map(
      (p, i) =>
        `${i + 1}. [${p.media_type}] Reach: ${p.reach ?? "?"} | Likes: ${p.like_count} | Comments: ${p.comments_count} | Saves: ${p.saved ?? "?"} | Caption: "${(p.caption ?? "").slice(0, 120)}"`
    )
    .join("\n");

  // Day-of-week performance
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayStats: Record<number, { count: number; totalReach: number }> = {};
  for (const p of ig.recentPosts) {
    const d = new Date(p.timestamp).getDay();
    if (!dayStats[d]) dayStats[d] = { count: 0, totalReach: 0 };
    dayStats[d].count++;
    dayStats[d].totalReach += p.reach ?? p.like_count;
  }
  const bestDaySummary = Object.entries(dayStats)
    .map(([d, s]) => `${dayNames[Number(d)]}: ${s.count} posts, avg reach ${Math.round(s.totalReach / s.count)}`)
    .join(" | ");

  const followerBreakdown =
    ig.insights.reachFollowers !== undefined
      ? `Reach from followers: ${ig.insights.reachFollowers?.toLocaleString()} | Reach from non-followers: ${ig.insights.reachNonFollowers?.toLocaleString()}`
      : "Follower/non-follower breakdown not available";

  const prompt = `You are a senior social media strategist analyzing Instagram performance for Atome Bakery — a premium artisan bakery brand. Be specific, actionable, and tailor advice to a food/bakery business.

ACCOUNT: @${ig.profile.username} | ${ig.profile.followers_count.toLocaleString()} followers | ${ig.profile.media_count} total posts | ${ig.profile.follows_count} following

LAST 30 DAYS:
- Total Reach: ${reachTotal.toLocaleString()}${reachDelta ? ` (${Number(reachDelta) >= 0 ? "+" : ""}${reachDelta}% vs prev period)` : ""}
- New Followers: ${followerGrowth.toLocaleString()}${followerDelta ? ` (${Number(followerDelta) >= 0 ? "+" : ""}${followerDelta}% vs prev period)` : ""}
- Accounts Engaged: ${ig.insights.accounts_engaged.toLocaleString()}${engagedDelta ? ` (${Number(engagedDelta) >= 0 ? "+" : ""}${engagedDelta}% vs prev period)` : ""}
- Profile Views: ${ig.insights.profile_views.toLocaleString()}
- Total Interactions: ${ig.insights.total_interactions.toLocaleString()}
- Engagement Rate: ${engagementRate}%
- ${followerBreakdown}

CONTENT TYPE PERFORMANCE (last 20 posts):
${contentTypeBreakdown}

POSTING DAY ANALYSIS:
${bestDaySummary}

TOP 5 POSTS BY REACH:
${topPostsSummary}

Based on all this data, provide a comprehensive but concise strategic analysis.

Return ONLY this JSON structure, no markdown:
{
  "summary": "2-3 sentence executive summary of the account's health and trajectory",
  "whatsWorking": [
    "Specific insight #1 — reference actual data",
    "Specific insight #2",
    "Specific insight #3"
  ],
  "areasToImprove": [
    "Specific gap or opportunity #1 with suggested fix",
    "Gap #2 with fix",
    "Gap #3 with fix"
  ],
  "contentRecommendations": [
    "Specific bakery content idea #1 with rationale",
    "Idea #2",
    "Idea #3",
    "Idea #4"
  ],
  "actionItems": [
    "Do this TODAY or this week: specific action",
    "Action #2",
    "Action #3"
  ],
  "topContentType": "Which format performs best and the specific reason based on the data",
  "bestPerformingTheme": "The topic or theme that drives the most engagement and why"
}`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

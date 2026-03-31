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
  const reachRate = ig.profile.followers_count > 0
    ? ((reachTotal / ig.profile.followers_count) * 100).toFixed(1)
    : "N/A";

  const prev = ig.insights.previousPeriod;
  const delta = (cur: number, old: number) =>
    old > 0 ? ((cur - old) / old * 100).toFixed(1) : null;
  const reachDelta = prev ? delta(reachTotal, prev.reach_total) : null;
  const followerDelta = prev ? delta(followerGrowth, prev.follower_growth) : null;
  const engagedDelta = prev ? delta(ig.insights.accounts_engaged, prev.accounts_engaged) : null;

  // Content type breakdown
  const byType: Record<string, { count: number; totalReach: number; totalLikes: number; totalSaved: number; totalShares: number }> = {};
  for (const p of ig.recentPosts) {
    const t = p.media_type === "VIDEO" ? "REELS" : p.media_type;
    if (!byType[t]) byType[t] = { count: 0, totalReach: 0, totalLikes: 0, totalSaved: 0, totalShares: 0 };
    byType[t].count++;
    byType[t].totalReach += p.reach ?? 0;
    byType[t].totalLikes += p.like_count;
    byType[t].totalSaved += p.saved ?? 0;
    byType[t].totalShares += p.shares ?? 0;
  }

  const contentTypeBreakdown = Object.entries(byType)
    .sort(([, a], [, b]) => (b.count > 0 ? b.totalReach / b.count : 0) - (a.count > 0 ? a.totalReach / a.count : 0))
    .map(([type, s]) => {
      const avgReach = s.count > 0 ? Math.round(s.totalReach / s.count) : 0;
      const avgSaved = s.count > 0 ? Math.round(s.totalSaved / s.count) : 0;
      const saveRate = avgReach > 0 ? ((avgSaved / avgReach) * 100).toFixed(2) : "0";
      return `${type}: ${s.count} posts | avg reach ${avgReach} | avg likes ${s.count > 0 ? Math.round(s.totalLikes / s.count) : 0} | avg saves ${avgSaved} | save rate ${saveRate}%`;
    })
    .join("\n");

  const topPostsSummary = ig.topPosts
    .slice(0, 5)
    .map((p, i) => {
      const saveRate = p.reach && p.saved ? ((p.saved / p.reach) * 100).toFixed(1) : "?";
      return `${i + 1}. [${p.media_type}] Reach: ${p.reach ?? "?"} | Likes: ${p.like_count} | Comments: ${p.comments_count} | Saves: ${p.saved ?? "?"} (save rate: ${saveRate}%) | Caption: "${(p.caption ?? "").slice(0, 120)}"`;
    })
    .join("\n");

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayStats: Record<number, { count: number; totalReach: number }> = {};
  for (const p of ig.recentPosts) {
    const d = new Date(p.timestamp).getDay();
    if (!dayStats[d]) dayStats[d] = { count: 0, totalReach: 0 };
    dayStats[d].count++;
    dayStats[d].totalReach += p.reach ?? p.like_count;
  }
  const bestDaySummary = Object.entries(dayStats)
    .sort(([, a], [, b]) => (b.count ? b.totalReach / b.count : 0) - (a.count ? a.totalReach / a.count : 0))
    .map(([d, s]) => `${dayNames[Number(d)]}: ${s.count} posts, avg reach ${Math.round(s.totalReach / s.count)}`)
    .join(" | ");

  const followerBreakdown =
    ig.insights.reachFollowers !== undefined
      ? `Reach from followers: ${ig.insights.reachFollowers?.toLocaleString()} (${ig.profile.followers_count > 0 ? ((ig.insights.reachFollowers! / reachTotal) * 100).toFixed(1) : "?"}%) | Non-followers: ${ig.insights.reachNonFollowers?.toLocaleString()}`
      : "Follower/non-follower breakdown not available";

  const prompt = `You are a senior social media strategist analyzing Instagram performance for Atome Bakery — a premium artisan bakery brand based in Montreal. Be highly specific, data-driven, and tailor every recommendation to a food/bakery business on Instagram.

ACCOUNT: @${ig.profile.username} | ${ig.profile.followers_count.toLocaleString()} followers | ${ig.profile.media_count} total posts

PERFORMANCE (last ${data.instagram.profile.media_count ? "30" : "?"} days):
- Total Reach: ${reachTotal.toLocaleString()}${reachDelta ? ` (${Number(reachDelta) >= 0 ? "+" : ""}${reachDelta}% vs prev period)` : ""}
- Reach Rate: ${reachRate}% (reach/followers — industry avg for food brands: 15-25%)
- New Followers: +${followerGrowth.toLocaleString()}${followerDelta ? ` (${Number(followerDelta) >= 0 ? "+" : ""}${followerDelta}% vs prev period)` : ""}
- Accounts Engaged: ${ig.insights.accounts_engaged.toLocaleString()}${engagedDelta ? ` (${Number(engagedDelta) >= 0 ? "+" : ""}${engagedDelta}% vs prev period)` : ""}
- Engagement Rate: ${engagementRate}% (industry avg for food brands: 1.5-3%)
- Profile Views: ${ig.insights.profile_views.toLocaleString()}
- ${followerBreakdown}

CONTENT TYPE BREAKDOWN (last 20 posts):
${contentTypeBreakdown}

BEST POSTING DAYS:
${bestDaySummary}

TOP 5 POSTS BY REACH:
${topPostsSummary}

Provide a comprehensive strategic analysis. The ACTION PLAN is the most important part — be very specific and immediately actionable.

Return ONLY this JSON structure (no markdown):
{
  "summary": "2-3 sentence executive summary referencing specific numbers",
  "whatsWorking": [
    "Specific data-backed observation #1",
    "Observation #2",
    "Observation #3"
  ],
  "areasToImprove": [
    "Specific gap with suggested fix #1",
    "Gap #2 with fix",
    "Gap #3 with fix"
  ],
  "topContentType": "Which format performs best and exact reason based on data",
  "bestPerformingTheme": "Theme/topic driving most engagement with explanation",
  "actionPlan": [
    {
      "title": "Short action title (max 8 words)",
      "description": "Specific, actionable description of exactly what to do",
      "priority": "high",
      "category": "content",
      "rationale": "Why this action — reference specific data point from the analysis",
      "estimatedImpact": "What specific improvement to expect (e.g. +15% reach, more followers)",
      "dueIn": "3 days"
    },
    {
      "title": "...",
      "description": "...",
      "priority": "high",
      "category": "growth",
      "rationale": "...",
      "estimatedImpact": "...",
      "dueIn": "7 days"
    },
    {
      "title": "...",
      "description": "...",
      "priority": "medium",
      "category": "content",
      "rationale": "...",
      "estimatedImpact": "...",
      "dueIn": "2 weeks"
    },
    {
      "title": "...",
      "description": "...",
      "priority": "medium",
      "category": "engagement",
      "rationale": "...",
      "estimatedImpact": "...",
      "dueIn": "2 weeks"
    },
    {
      "title": "...",
      "description": "...",
      "priority": "low",
      "category": "strategy",
      "rationale": "...",
      "estimatedImpact": "...",
      "dueIn": "1 month"
    },
    {
      "title": "...",
      "description": "...",
      "priority": "low",
      "category": "content",
      "rationale": "...",
      "estimatedImpact": "...",
      "dueIn": "1 month"
    }
  ]
}

Priority guide: high = do this week (high impact, low effort OR urgent), medium = do this month (high impact, more effort), low = do this quarter (nice to have).
Categories: content (what/how to post), growth (gain followers), engagement (increase interactions), strategy (planning/process).
Include at least 2 high, 2 medium, 2 low priority items. Be bakery-specific.`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 3000,
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

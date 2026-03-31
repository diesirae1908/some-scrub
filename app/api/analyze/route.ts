import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { TikTokVideo, VideoAnalysis, BrandProfile } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { video, brandProfile }: { video: TikTokVideo; brandProfile?: BrandProfile } = await req.json();

    const brandContext = brandProfile?.brandName ? `
Brand Context:
- Brand: ${brandProfile.brandName}
- Products: ${brandProfile.productDescription}
- Target Audience: ${brandProfile.targetAudience}
- Tone of Voice: ${brandProfile.toneOfVoice}
- Brand Values: ${brandProfile.brandValues}` : "";

    const prompt = `You are a senior social media strategist analyzing a TikTok video for creative inspiration.

Video Details:
- Creator: @${video.author.uniqueId} (${video.author.nickname})
- Caption: "${video.title}"
- Hashtags: ${video.hashtags.join(", ")}
- Views: ${video.stats.playCount.toLocaleString()}
- Likes: ${video.stats.diggCount.toLocaleString()}
- Comments: ${video.stats.commentCount.toLocaleString()}
- Shares: ${video.stats.shareCount.toLocaleString()}
- Duration: ${video.duration}s
${brandContext}

Return a JSON object:
{
  "visualHook": "Opening visual/action that grabs attention in first 3 seconds",
  "hookType": "Question | Shock | Secret | ASMR | Tutorial | Transformation | Controversy | Relatability | Humor | Trend",
  "undeniableProof": "What credibility or proof does the creator use?",
  "theme": "2-4 word theme (e.g. 'Morning Routine Hack')",
  "funnelStage": "TOF | MOF | BOF",
  "contentFormat": "Tutorial | GRWM | Day in Life | Review | Storytelling | Challenge | Trend Hijack",
  "whyItWorks": "2-3 sentences on the psychological reason this performs well",
  "commentInsights": {
    "commonQuestions": ["question 1", "question 2", "question 3"],
    "keyInsights": "Comment section sentiment and key takeaways",
    "sentiment": "Positive | Mixed | Polarizing | Neutral"
  }
}

Return ONLY valid JSON, no markdown.`;

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const analysis: VideoAnalysis = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}

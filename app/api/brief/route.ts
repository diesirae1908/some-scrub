import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { TikTokVideo, VideoAnalysis, BrandProfile, CreativeBrief } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { video, analysis, brandProfile }: {
      video: TikTokVideo; analysis?: VideoAnalysis; brandProfile: BrandProfile;
    } = await req.json();

    const prompt = `You are a creative director for ${brandProfile.brandName}.
Create a creative brief for a TikTok video inspired by the reference below.

Brand:
- Name: ${brandProfile.brandName}
- Products: ${brandProfile.productDescription}
- Audience: ${brandProfile.targetAudience}
- Values: ${brandProfile.brandValues}
- Tone: ${brandProfile.toneOfVoice}
${brandProfile.brandBible ? `\nBrand Bible:\n${brandProfile.brandBible}` : ""}

Reference Video:
- Creator: @${video.author.uniqueId}
- Caption: "${video.title}"
- Views: ${video.stats.playCount.toLocaleString()} | Likes: ${video.stats.diggCount.toLocaleString()}
${analysis ? `
Analysis:
- Hook: ${analysis.hookType} — ${analysis.visualHook}
- Theme: ${analysis.theme}
- Format: ${analysis.contentFormat}
- Why it works: ${analysis.whyItWorks}
- Audience questions: ${analysis.commentInsights.commonQuestions.join("; ")}` : ""}
${brandProfile.briefTemplate ? `\nBrief Template:\n${brandProfile.briefTemplate}` : ""}

Return a JSON object:
{
  "campaignName": "Creative name for this content",
  "objective": "What this video achieves",
  "targetAudience": "Specific audience",
  "keyMessage": "The one main takeaway",
  "hookIdea": "Exactly how to open the first 3 seconds — be very specific",
  "visualStyle": "Aesthetic, setting, lighting, framing",
  "contentFormat": "Video format/structure",
  "callToAction": "What viewers should do after watching",
  "inspiredBy": "Which element from the reference this adapts",
  "additionalNotes": "Creative direction, props, music, posting tips"
}

Return ONLY valid JSON, no markdown.`;

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const brief: CreativeBrief = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    return NextResponse.json({ brief });
  } catch (err) {
    console.error("Brief error:", err);
    return NextResponse.json({ error: "Brief generation failed. Please try again." }, { status: 500 });
  }
}

"use client";

import Anthropic from "@anthropic-ai/sdk";
import type { TikTokVideo, VideoAnalysis, BrandProfile, CreativeBrief } from "@/types";

function getClient(apiKey: string) {
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

export async function analyzeVideo(
  video: TikTokVideo,
  apiKey: string,
  brandProfile?: BrandProfile
): Promise<VideoAnalysis> {
  const client = getClient(apiKey);

  const brandContext = brandProfile?.brandName
    ? `
Brand Context (use this to assess relevance):
- Brand: ${brandProfile.brandName}
- Products: ${brandProfile.productDescription}
- Target Audience: ${brandProfile.targetAudience}
- Tone of Voice: ${brandProfile.toneOfVoice}
- Brand Values: ${brandProfile.brandValues}
`
    : "";

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
- Posted: ${new Date(video.createTime * 1000).toLocaleDateString()}
${brandContext}

Analyze this video deeply and return a JSON object with exactly this structure:
{
  "visualHook": "Describe the opening visual/action that grabs attention in the first 3 seconds",
  "hookType": "One of: Question | Shock | Secret | ASMR | Tutorial | Transformation | Controversy | Relatability | Humor | Trend",
  "undeniableProof": "What credibility or proof does the creator use to make viewers believe the content?",
  "theme": "2-4 word theme summary (e.g. 'Morning Routine Hack', 'Behind The Scenes', 'Secret Recipe')",
  "funnelStage": "TOF (awareness) | MOF (consideration) | BOF (conversion)",
  "contentFormat": "e.g. Tutorial, GRWM, Day in Life, Review, Storytelling, Challenge, Trend Hijack",
  "whyItWorks": "2-3 sentences explaining the psychological reason this content performs well",
  "commentInsights": {
    "commonQuestions": ["question 1 people likely ask", "question 2", "question 3"],
    "keyInsights": "What the comment section sentiment likely looks like and key takeaways",
    "sentiment": "Positive | Mixed | Polarizing | Neutral"
  }
}

Return ONLY valid JSON, no markdown or explanation.`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as VideoAnalysis;
}

export async function generateBrief(
  video: TikTokVideo,
  apiKey: string,
  brandProfile: BrandProfile,
  analysis?: VideoAnalysis
): Promise<CreativeBrief> {
  const client = getClient(apiKey);

  const templateSection = brandProfile.briefTemplate
    ? `\nUse this brief template structure:\n${brandProfile.briefTemplate}`
    : "";

  const bibleSection = brandProfile.brandBible
    ? `\nBrand Bible / Guidelines:\n${brandProfile.brandBible}`
    : "";

  const analysisSection = analysis
    ? `
Inspiration Video Analysis:
- Hook Type: ${analysis.hookType}
- Visual Hook: ${analysis.visualHook}
- Theme: ${analysis.theme}
- Content Format: ${analysis.contentFormat}
- Funnel Stage: ${analysis.funnelStage}
- Why It Works: ${analysis.whyItWorks}
- Common Audience Questions: ${analysis.commentInsights.commonQuestions.join("; ")}
`
    : "";

  const prompt = `You are a creative director for ${brandProfile.brandName}, a bakery brand. 
Create a detailed creative brief for a TikTok video inspired by the reference video below.

Brand Information:
- Brand Name: ${brandProfile.brandName}
- Products/Description: ${brandProfile.productDescription}
- Target Audience: ${brandProfile.targetAudience}
- Brand Values: ${brandProfile.brandValues}
- Tone of Voice: ${brandProfile.toneOfVoice}
${bibleSection}

Reference Video:
- Creator: @${video.author.uniqueId}
- Caption: "${video.title}"
- Views: ${video.stats.playCount.toLocaleString()}
- Engagement: ${video.stats.diggCount.toLocaleString()} likes, ${video.stats.commentCount.toLocaleString()} comments
${analysisSection}
${templateSection}

Generate a complete creative brief that adapts the inspiration video's successful formula to ${brandProfile.brandName}'s brand identity. 
The brief should be immediately actionable for a content creator.

Return a JSON object with exactly this structure:
{
  "campaignName": "Creative name for this content piece",
  "objective": "What this video should achieve (awareness/engagement/conversion)",
  "targetAudience": "Specific audience for this video",
  "keyMessage": "The one main message the viewer should take away",
  "hookIdea": "Exactly how to open the first 3 seconds to grab attention - be very specific",
  "visualStyle": "Describe the visual aesthetic, setting, lighting, framing",
  "contentFormat": "The video format/structure (e.g. Tutorial, Behind the scenes, etc.)",
  "callToAction": "What you want viewers to do after watching",
  "inspiredBy": "Brief note on which element from the reference video this adapts",
  "additionalNotes": "Any extra creative direction, props, music suggestions, posting tips"
}

Return ONLY valid JSON, no markdown or explanation.`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as CreativeBrief;
}

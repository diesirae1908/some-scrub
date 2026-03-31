export interface TikTokVideo {
  id: string;
  title: string; // caption
  cover: string; // thumbnail URL
  play: string; // video URL
  author: {
    id: string;
    uniqueId: string;
    nickname: string;
    avatarThumb: string;
  };
  stats: {
    playCount: number;
    diggCount: number;
    commentCount: number;
    shareCount: number;
  };
  createTime: number; // unix timestamp
  hashtags: string[];
  duration: number; // seconds
  webVideoUrl: string;
}

export interface VideoAnalysis {
  visualHook: string;
  hookType: string; // "Question", "Shock", "Secret", "ASMR", etc.
  undeniableProof: string;
  theme: string;
  funnelStage: string; // TOF, MOF, BOF
  contentFormat: string;
  whyItWorks: string;
  commentInsights: {
    commonQuestions: string[];
    keyInsights: string;
    sentiment: string;
  };
}

export interface CreativeBrief {
  campaignName: string;
  objective: string;
  targetAudience: string;
  keyMessage: string;
  hookIdea: string;
  visualStyle: string;
  callToAction: string;
  contentFormat: string;
  inspiredBy: string;
  additionalNotes: string;
}

export interface BrandProfile {
  brandName: string;
  website: string;
  instagramHandle: string;
  tiktokHandle: string;
  productDescription: string;
  targetAudience: string;
  brandValues: string;
  toneOfVoice: string;
  brandBible: string;
  briefTemplate: string;
  competitorAccounts: string; // comma-separated TikTok handles
}

export interface SearchParams {
  keyword: string;
  dateRange: "7" | "30" | "90" | "180";
  count: number;
}

export interface SearchSession {
  id: string;
  keyword: string;
  dateRange: string;
  videos: TikTokVideo[];
  createdAt: string;
}

export interface BookmarkedVideo extends TikTokVideo {
  bookmarkedAt: string;
  analysis?: VideoAnalysis;
  brief?: CreativeBrief;
}

export type BriefStatus = "draft" | "planned" | "in_production" | "posted" | "archived";

export interface SavedBrief {
  id: string;
  brief: CreativeBrief;
  analysis?: VideoAnalysis;
  video: {
    id: string;
    title: string;
    cover: string;
    author: { uniqueId: string; nickname: string };
    stats: { playCount: number; diggCount: number };
    webVideoUrl: string;
  };
  status: BriefStatus;
  notes: string;
  plannedDate: string; // ISO date string or ""
  createdAt: string;
  updatedAt: string;
}

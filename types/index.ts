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

// ── Meta / Instagram Analytics ──────────────────────────────────────────────

export interface MetaInsightValue {
  value: number;
  end_time: string;
}

export interface InstagramProfile {
  id: string;
  name: string;
  username: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  biography: string;
}

export interface InstagramInsights {
  reach: MetaInsightValue[];
  impressions: MetaInsightValue[];
  profile_views: MetaInsightValue[];
  accounts_engaged: MetaInsightValue[];
}

export interface InstagramPost {
  id: string;
  caption: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS";
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  reach?: number;
  impressions?: number;
  saved?: number;
  shares?: number;
  plays?: number;
}

export interface FacebookPage {
  id: string;
  name: string;
  fan_count: number;
  followers_count: number;
  picture: { data: { url: string } };
}

export interface FacebookInsights {
  page_impressions: MetaInsightValue[];
  page_engaged_users: MetaInsightValue[];
  page_post_engagements: MetaInsightValue[];
  page_fan_adds: MetaInsightValue[];
}

export interface MetaAnalyticsData {
  instagram: {
    profile: InstagramProfile;
    insights: InstagramInsights;
    topPosts: InstagramPost[];
    recentPosts: InstagramPost[];
  };
  facebook: {
    page: FacebookPage;
    insights: FacebookInsights;
  };
  fetchedAt: string;
}

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

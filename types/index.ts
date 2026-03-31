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

export interface InstagramInsightsPrev {
  reach_total: number;
  follower_growth: number;
  accounts_engaged: number;
  profile_views: number;
  total_interactions: number;
}

export interface InstagramInsights {
  reach: MetaInsightValue[];          // per-day values
  follower_count: MetaInsightValue[]; // per-day new followers
  accounts_engaged: number;           // 30d total
  profile_views: number;              // 30d total
  total_interactions: number;         // 30d total
  previousPeriod?: InstagramInsightsPrev;
  reachFollowers?: number;            // 30d reach from followers
  reachNonFollowers?: number;         // 30d reach from non-followers
}

export type ActionPriority = "high" | "medium" | "low";
export type ActionStatus = "todo" | "in_progress" | "done" | "skipped";
export type ActionCategory = "content" | "growth" | "engagement" | "strategy";
export type ActionOutcome = "excellent" | "good" | "no_change" | "negative" | null;

export interface MetricsSnapshot {
  followers: number;
  reach: number;
  followerGrowth: number;
  engagementRate: number;
  snapshotAt: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: ActionPriority;
  category: ActionCategory;
  status: ActionStatus;
  rationale: string;
  estimatedImpact: string;
  dueIn?: string;
  createdAt: string;
  completedAt?: string;
  notes: string;
  outcome?: ActionOutcome;
  metricsAtCreation?: MetricsSnapshot;
  metricsAtCompletion?: MetricsSnapshot;
}

export interface AIActionItem {
  title: string;
  description: string;
  priority: ActionPriority;
  category: ActionCategory;
  rationale: string;
  estimatedImpact: string;
  dueIn: string;
}

export interface AIAnalyticsInsight {
  summary: string;
  whatsWorking: string[];
  areasToImprove: string[];
  topContentType: string;
  bestPerformingTheme: string;
  actionPlan: AIActionItem[];
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

export interface MetaAnalyticsData {
  instagram: {
    profile: InstagramProfile;
    insights: InstagramInsights;
    topPosts: InstagramPost[];
    recentPosts: InstagramPost[];
  };
  facebook: {
    page: FacebookPage;
  };
  tokenExpiresAt: string; // Unix timestamp string
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

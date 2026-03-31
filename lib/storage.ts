"use client";

import type { BrandProfile, BookmarkedVideo, SearchSession, SavedBrief, BriefStatus, ActionItem, ActionStatus, ActionOutcome, MetricsSnapshot } from "@/types";

const KEYS = {
  BRAND_PROFILE: "atome_brand_profile",
  BOOKMARKS: "atome_bookmarks",
  SESSIONS: "atome_sessions",
  API_KEY: "atome_anthropic_key",
  BRIEFS: "atome_briefs",
  ACTION_PLAN: "atome_action_plan",
};

// API Key — prefers build-time env var, falls back to localStorage
export function getApiKey(): string {
  // Injected at build time via GitHub Actions secret
  const envKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  if (envKey) return envKey;
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEYS.API_KEY) || "";
}

export function saveApiKey(key: string): void {
  localStorage.setItem(KEYS.API_KEY, key);
}

export function hasEnvApiKey(): boolean {
  return !!process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
}

// Brand Profile
export function getBrandProfile(): BrandProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.BRAND_PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export function saveBrandProfile(profile: BrandProfile): void {
  localStorage.setItem(KEYS.BRAND_PROFILE, JSON.stringify(profile));
}

// Bookmarks
export function getBookmarks(): BookmarkedVideo[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.BOOKMARKS);
  return raw ? JSON.parse(raw) : [];
}

export function addBookmark(video: BookmarkedVideo): void {
  const bookmarks = getBookmarks();
  const exists = bookmarks.find((b) => b.id === video.id);
  if (!exists) {
    bookmarks.unshift(video);
    localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  }
}

export function removeBookmark(videoId: string): void {
  const bookmarks = getBookmarks().filter((b) => b.id !== videoId);
  localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(bookmarks));
}

export function isBookmarked(videoId: string): boolean {
  return getBookmarks().some((b) => b.id === videoId);
}

export function updateBookmarkAnalysis(
  videoId: string,
  data: Partial<BookmarkedVideo>
): void {
  const bookmarks = getBookmarks().map((b) =>
    b.id === videoId ? { ...b, ...data } : b
  );
  localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(bookmarks));
}

// Sessions
export function getSessions(): SearchSession[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.SESSIONS);
  return raw ? JSON.parse(raw) : [];
}

export function saveSession(session: SearchSession): void {
  const sessions = getSessions();
  sessions.unshift(session);
  // Keep last 10 sessions
  const trimmed = sessions.slice(0, 10);
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify(trimmed));
}

// Saved Briefs
export function getSavedBriefs(): SavedBrief[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.BRIEFS);
  return raw ? JSON.parse(raw) : [];
}

export function saveBrief(brief: SavedBrief): void {
  const briefs = getSavedBriefs().filter((b) => b.id !== brief.id);
  briefs.unshift(brief);
  localStorage.setItem(KEYS.BRIEFS, JSON.stringify(briefs));
}

export function updateBriefStatus(
  id: string,
  status: BriefStatus,
  extra?: Partial<SavedBrief>
): void {
  const briefs = getSavedBriefs().map((b) =>
    b.id === id
      ? { ...b, ...extra, status, updatedAt: new Date().toISOString() }
      : b
  );
  localStorage.setItem(KEYS.BRIEFS, JSON.stringify(briefs));
}

export function deleteSavedBrief(id: string): void {
  const briefs = getSavedBriefs().filter((b) => b.id !== id);
  localStorage.setItem(KEYS.BRIEFS, JSON.stringify(briefs));
}

// Action Plan
export function getActionItems(): ActionItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.ACTION_PLAN);
  return raw ? JSON.parse(raw) : [];
}

export function saveActionItems(items: ActionItem[]): void {
  localStorage.setItem(KEYS.ACTION_PLAN, JSON.stringify(items));
}

export function addActionItems(items: ActionItem[]): void {
  const existing = getActionItems();
  // Avoid duplicates by title
  const newTitles = new Set(items.map((i) => i.title.toLowerCase()));
  const merged = [...items, ...existing.filter((e) => !newTitles.has(e.title.toLowerCase()))];
  saveActionItems(merged);
}

export function updateActionItem(id: string, patch: Partial<ActionItem>): void {
  const items = getActionItems().map((item) =>
    item.id === id ? { ...item, ...patch } : item
  );
  saveActionItems(items);
}

export function updateActionStatus(
  id: string,
  status: ActionStatus,
  outcome?: ActionOutcome,
  metricsAtCompletion?: MetricsSnapshot
): void {
  const patch: Partial<ActionItem> = { status };
  if (status === "done") patch.completedAt = new Date().toISOString();
  if (outcome !== undefined) patch.outcome = outcome;
  if (metricsAtCompletion) patch.metricsAtCompletion = metricsAtCompletion;
  updateActionItem(id, patch);
}

export function deleteActionItem(id: string): void {
  saveActionItems(getActionItems().filter((i) => i.id !== id));
}

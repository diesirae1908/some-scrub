"use client";

import { useState, useEffect } from "react";
import { Save, CheckCircle, Globe, AtSign, Video, AlertCircle, ShieldCheck } from "lucide-react";
import type { BrandProfile } from "@/types";
import { getBrandProfile, saveBrandProfile } from "@/lib/storage";

const DEFAULT_BRIEF_TEMPLATE = `Campaign Name:
Objective:
Target Audience:
Key Message:
Hook (First 3 Seconds):
Visual Style:
Content Format:
Call to Action:
Deliverables:
Timeline:
Budget Notes:`;

const DEFAULT_BRAND_BIBLE = `Brand Name: Atome Bakery
Founded: 
Location: 
Mission: 
Products: Artisan breads, croissants, viennoiseries, pastries
Target Audience: 
Brand Values: 
Tone of Voice: 
What We Stand For: 
What We Don't Do: 
Visual Aesthetic: `;

const EMPTY_PROFILE: BrandProfile = {
  brandName: "Atome Bakery",
  website: "",
  instagramHandle: "",
  tiktokHandle: "",
  productDescription: "",
  targetAudience: "",
  brandValues: "",
  toneOfVoice: "",
  brandBible: DEFAULT_BRAND_BIBLE,
  briefTemplate: DEFAULT_BRIEF_TEMPLATE,
  competitorAccounts: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<BrandProfile>(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const existing = getBrandProfile();
    if (existing) setProfile(existing);
  }, []);

  const update = (key: keyof BrandProfile, value: string) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = () => {
    saveBrandProfile(profile);
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brand Profile</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            This information is used by Claude to generate relevant briefs and assess content relevance.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
          style={
            saved
              ? { background: "rgba(0,212,160,0.15)", color: "var(--accent-teal)", border: "1px solid rgba(0,212,160,0.3)" }
              : { background: "var(--accent-teal)", color: "#000" }
          }
        >
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? "Saved!" : "Save Profile"}
        </button>
      </div>

      {/* Unsaved changes warning */}
      {hasChanges && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
          style={{ background: "rgba(155,93,229,0.08)", color: "var(--accent-purple)", border: "1px solid rgba(155,93,229,0.3)" }}
        >
          <AlertCircle size={14} />
          You have unsaved changes
        </div>
      )}

      {/* Section: API Key */}
      <Section title="Anthropic API Key">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(0,212,160,0.08)", border: "1px solid rgba(0,212,160,0.25)" }}
        >
          <ShieldCheck size={18} style={{ color: "var(--accent-teal)", flexShrink: 0 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--accent-teal)" }}>
              API key secured server-side
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Stored as a Render environment variable — never exposed to the browser.
            </p>
          </div>
        </div>
      </Section>

      {/* Section: Basic Info */}
      <Section title="Brand Basics">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Brand Name"
            value={profile.brandName}
            onChange={(v) => update("brandName", v)}
            placeholder="Atome Bakery"
          />
          <Field
            label="Website"
            value={profile.website}
            onChange={(v) => update("website", v)}
            placeholder="https://atomebakery.com"
            icon={<Globe size={13} />}
          />
          <Field
            label="Instagram Handle"
            value={profile.instagramHandle}
            onChange={(v) => update("instagramHandle", v)}
            placeholder="@atomebakery"
            icon={<AtSign size={13} />}
          />
          <Field
            label="TikTok Handle"
            value={profile.tiktokHandle}
            onChange={(v) => update("tiktokHandle", v)}
            placeholder="@atomebakery"
            icon={<Video size={13} />}
          />
        </div>
      </Section>

      {/* Section: Brand Identity */}
      <Section title="Brand Identity">
        <TextArea
          label="Product / Service Description"
          value={profile.productDescription}
          onChange={(v) => update("productDescription", v)}
          placeholder="What do you sell? What makes it special? e.g. Hand-crafted French pastries, sourdough breads, and viennoiseries made fresh daily..."
          rows={3}
        />
        <TextArea
          label="Target Audience"
          value={profile.targetAudience}
          onChange={(v) => update("targetAudience", v)}
          placeholder="Who is your customer? Demographics, interests, lifestyle... e.g. Urban foodies 25-40, people who appreciate quality artisan food, brunch enthusiasts..."
          rows={3}
        />
        <TextArea
          label="Brand Values"
          value={profile.brandValues}
          onChange={(v) => update("brandValues", v)}
          placeholder="What does your brand stand for? e.g. Craftsmanship, authenticity, French technique, local ingredients, slow food culture..."
          rows={2}
        />
        <TextArea
          label="Tone of Voice"
          value={profile.toneOfVoice}
          onChange={(v) => update("toneOfVoice", v)}
          placeholder="How does your brand speak? e.g. Warm and approachable, a little playful, knowledgeable but never pretentious. Like a passionate baker sharing their love of food..."
          rows={2}
        />
      </Section>

      {/* Section: Competitor tracking */}
      <Section title="Competitor & Inspiration Accounts">
        <TextArea
          label="TikTok Accounts to Track"
          value={profile.competitorAccounts}
          onChange={(v) => update("competitorAccounts", v)}
          placeholder="Comma-separated TikTok handles to use as research inspiration. e.g. @tartine, @bourdiembakery, @du_pain_et_des_idees, @croissantparis..."
          rows={3}
        />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Search these account names directly in the search bar to pull their videos.
        </p>
      </Section>

      {/* Section: Brief Template */}
      <Section title="Creative Brief Template">
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          This template is used when generating creative briefs. Include section headers and any specific format you want Claude to follow.
        </p>
        <TextArea
          label="Brief Template"
          value={profile.briefTemplate}
          onChange={(v) => update("briefTemplate", v)}
          placeholder={DEFAULT_BRIEF_TEMPLATE}
          rows={10}
          mono
        />
      </Section>

      {/* Section: Brand Bible */}
      <Section title="Brand Bible / Creative Direction">
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Paste your full brand guidelines, creative direction, do&apos;s and don&apos;ts, or any context Claude should know when creating briefs.
        </p>
        <TextArea
          label="Brand Bible"
          value={profile.brandBible}
          onChange={(v) => update("brandBible", v)}
          placeholder={DEFAULT_BRAND_BIBLE}
          rows={14}
          mono
        />
      </Section>

      {/* Save button (bottom) */}
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
        style={
          saved
            ? { background: "rgba(0,212,160,0.15)", color: "var(--accent-teal)", border: "1px solid rgba(0,212,160,0.3)" }
            : { background: "var(--accent-teal)", color: "#000" }
        }
      >
        {saved ? <CheckCircle size={16} /> : <Save size={16} />}
        {saved ? "Profile Saved!" : "Save Brand Profile"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <h2 className="font-semibold text-sm uppercase tracking-wider" style={{ color: "var(--accent-pink)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          >
            {icon}
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full py-2.5 pr-3 rounded-lg text-sm outline-none transition-all"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            paddingLeft: icon ? "2rem" : "0.75rem",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent-purple)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      </div>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all resize-y leading-relaxed"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          fontFamily: mono ? "monospace" : "inherit",
          fontSize: mono ? "12px" : "14px",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent-purple)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

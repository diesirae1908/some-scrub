"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Trash2,
  ExternalLink,
  Calendar,
  ChevronDown,
  Eye,
  Heart,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { SavedBrief, BriefStatus } from "@/types";
import { getSavedBriefs, updateBriefStatus, deleteSavedBrief } from "@/lib/storage";
import { formatNumber } from "@/lib/utils";

const STATUSES: { key: BriefStatus; label: string; color: string; bg: string }[] = [
  { key: "draft",         label: "Draft",         color: "#8b92b3", bg: "rgba(139,146,179,0.1)" },
  { key: "planned",       label: "Planned",       color: "#9b5de5", bg: "rgba(155,93,229,0.12)" },
  { key: "in_production", label: "In Production", color: "#f4a93d", bg: "rgba(244,169,61,0.12)" },
  { key: "posted",        label: "Posted",        color: "#00d4a0", bg: "rgba(0,212,160,0.12)" },
  { key: "archived",      label: "Archived",      color: "#4a5178", bg: "rgba(74,81,120,0.1)" },
];

function StatusBadge({ status, onChange }: { status: BriefStatus; onChange: (s: BriefStatus) => void }) {
  const [open, setOpen] = useState(false);
  const current = STATUSES.find((s) => s.key === status)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
        style={{ background: current.bg, color: current.color }}
      >
        {current.label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-20 rounded-xl overflow-hidden min-w-[140px]"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => { onChange(s.key); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:opacity-80 flex items-center gap-2"
              style={{ color: s.color }}
            >
              {s.key === status && <Check size={11} />}
              {s.key !== status && <span className="w-3" />}
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BriefCard({
  saved,
  onStatusChange,
  onDelete,
}: {
  saved: SavedBrief;
  onStatusChange: (id: string, s: BriefStatus, extra?: Partial<SavedBrief>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [notes, setNotes] = useState(saved.notes);
  const [plannedDate, setPlannedDate] = useState(saved.plannedDate);

  const saveNotes = () => {
    onStatusChange(saved.id, saved.status, { notes });
    setEditingNotes(false);
  };

  const saveDate = () => {
    onStatusChange(saved.id, saved.status, { plannedDate });
    setEditingDate(false);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden animate-fadeIn"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Card header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{saved.brief.campaignName}</h3>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--accent-pink)" }}>
              @{saved.video.author.uniqueId}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge
              status={saved.status}
              onChange={(s) => onStatusChange(saved.id, s)}
            />
            <button
              onClick={() => onDelete(saved.id)}
              className="p-1 rounded-lg transition-colors hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Thumbnail + key info */}
        <div className="flex gap-3">
          {saved.video.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={saved.video.cover}
              alt={saved.video.title}
              className="w-14 h-18 rounded-lg object-cover flex-shrink-0"
              style={{ height: "72px", width: "54px" }}
            />
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>
              {saved.brief.keyMessage}
            </p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <Eye size={10} /> {formatNumber(saved.video.stats.playCount)}
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <Heart size={10} /> {formatNumber(saved.video.stats.diggCount)}
              </span>
            </div>
          </div>
        </div>

        {/* Planned date */}
        <div className="flex items-center gap-2">
          <Calendar size={12} style={{ color: "var(--text-muted)" }} />
          {editingDate ? (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="text-xs px-2 py-0.5 rounded-lg outline-none"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <button onClick={saveDate} className="p-0.5" style={{ color: "var(--accent-teal)" }}><Check size={12} /></button>
              <button onClick={() => setEditingDate(false)} className="p-0.5" style={{ color: "var(--text-muted)" }}><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => setEditingDate(true)}
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: plannedDate ? "var(--text-secondary)" : "var(--text-muted)" }}
            >
              {plannedDate
                ? new Date(plannedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Set planned date"}
            </button>
          )}
        </div>

        {/* Notes */}
        <div>
          {editingNotes ? (
            <div className="space-y-1.5">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add notes, reminders, or ideas..."
                className="w-full px-2.5 py-2 rounded-lg text-xs outline-none resize-none"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNotes}
                  className="text-xs px-3 py-1 rounded-lg font-medium"
                  style={{ background: "var(--accent-teal)", color: "#000" }}
                >
                  Save
                </button>
                <button onClick={() => { setNotes(saved.notes); setEditingNotes(false); }}
                  className="text-xs px-3 py-1 rounded-lg"
                  style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingNotes(true)}
              className="flex items-start gap-1.5 w-full text-left transition-colors hover:opacity-80"
            >
              <Pencil size={11} className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <span className="text-xs" style={{ color: notes ? "var(--text-secondary)" : "var(--text-muted)" }}>
                {notes || "Add notes..."}
              </span>
            </button>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs transition-colors hover:opacity-80 w-full"
          style={{ color: "var(--text-muted)" }}
        >
          <ChevronDown
            size={13}
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          />
          {expanded ? "Hide brief" : "View full brief"}
        </button>
      </div>

      {/* Full brief */}
      {expanded && (
        <div
          className="px-4 pb-4 space-y-2 animate-fadeIn"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="pt-3 space-y-2">
            {([
              ["Objective", saved.brief.objective],
              ["Target Audience", saved.brief.targetAudience],
              ["Hook — First 3s", saved.brief.hookIdea],
              ["Visual Style", saved.brief.visualStyle],
              ["Format", saved.brief.contentFormat],
              ["Call to Action", saved.brief.callToAction],
              ["Inspired By", saved.brief.inspiredBy],
              ["Additional Notes", saved.brief.additionalNotes],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <span className="text-xs font-semibold" style={{ color: "var(--accent-pink)" }}>{label}: </span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{value}</span>
              </div>
            ))}
          </div>
          <a
            href={saved.video.webVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80 pt-1"
            style={{ color: "var(--accent-pink)" }}
          >
            <ExternalLink size={12} />
            Open reference video on TikTok
          </a>
        </div>
      )}
    </div>
  );
}

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<SavedBrief[]>(() => getSavedBriefs());
  const [filterStatus, setFilterStatus] = useState<BriefStatus | "all">("all");

  const handleStatusChange = (id: string, status: BriefStatus, extra?: Partial<SavedBrief>) => {
    updateBriefStatus(id, status, extra);
    setBriefs(getSavedBriefs());
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this brief?")) return;
    deleteSavedBrief(id);
    setBriefs(getSavedBriefs());
  };

  const filtered = filterStatus === "all"
    ? briefs
    : briefs.filter((b) => b.status === filterStatus);

  const countByStatus = (s: BriefStatus) => briefs.filter((b) => b.status === s).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText size={22} style={{ color: "var(--accent-purple)" }} />
          Creative Briefs
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {briefs.length} brief{briefs.length !== 1 ? "s" : ""} saved — track what&apos;s in the pipeline
        </p>
      </div>

      {/* Status summary pills */}
      {briefs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={
              filterStatus === "all"
                ? { background: "var(--accent-purple)", color: "#fff" }
                : { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
            }
          >
            All ({briefs.length})
          </button>
          {STATUSES.map((s) => {
            const count = countByStatus(s.key);
            if (count === 0) return null;
            return (
              <button
                key={s.key}
                onClick={() => setFilterStatus(s.key)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={
                  filterStatus === s.key
                    ? { background: s.color, color: "#fff" }
                    : { background: s.bg, color: s.color }
                }
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {briefs.length === 0 && (
        <div
          className="rounded-2xl p-16 text-center space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <FileText size={40} style={{ color: "var(--text-muted)", margin: "0 auto" }} />
          <p className="font-medium">No briefs yet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Search for TikTok trends, analyze a video, and click &ldquo;Generate Brief&rdquo; — it will appear here automatically.
          </p>
        </div>
      )}

      {/* Kanban-style columns */}
      {briefs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUSES.filter((s) => s.key !== "archived").map((s) => {
            const colBriefs = filtered === briefs
              ? briefs.filter((b) => b.status === s.key)
              : filtered.filter((b) => b.status === s.key);

            if (filterStatus !== "all" && filterStatus !== s.key) return null;

            return (
              <div key={s.key} className="space-y-3">
                {/* Column header */}
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: s.color }}>
                    {s.label}
                  </span>
                  <span
                    className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {colBriefs.length}
                  </span>
                </div>

                {/* Cards */}
                {colBriefs.map((b) => (
                  <BriefCard
                    key={b.id}
                    saved={b}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}

                {colBriefs.length === 0 && (
                  <div
                    className="rounded-xl p-4 text-center text-xs"
                    style={{ border: "1px dashed var(--border)", color: "var(--text-muted)" }}
                  >
                    Empty
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Archived section */}
      {briefs.filter((b) => b.status === "archived").length > 0 && filterStatus !== "all" && filterStatus !== "archived" ? null : (
        <>
          {briefs.filter((b) => b.status === "archived").length > 0 && (
            <details className="group">
              <summary
                className="cursor-pointer text-xs font-medium list-none flex items-center gap-2"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                Archived ({briefs.filter((b) => b.status === "archived").length})
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {briefs.filter((b) => b.status === "archived").map((b) => (
                  <BriefCard
                    key={b.id}
                    saved={b}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

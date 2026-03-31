"use client";

import { useState } from "react";
import {
  Target,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  Edit3,
  Save,
  X,
  Zap,
  AlertTriangle,
} from "lucide-react";
import type { ActionItem, ActionPriority, ActionStatus, ActionCategory, ActionOutcome, MetricsSnapshot } from "@/types";
import {
  getActionItems,
  updateActionStatus,
  updateActionItem,
  deleteActionItem,
} from "@/lib/storage";

// ── Config ────────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; color: string; bg: string; border: string }> = {
  high: { label: "High Priority", color: "#ef4444", bg: "#ef444415", border: "#ef444440" },
  medium: { label: "Medium Priority", color: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b40" },
  low: { label: "Low Priority", color: "#06b6d4", bg: "#06b6d415", border: "#06b6d440" },
};

const CATEGORY_CONFIG: Record<ActionCategory, { label: string; color: string }> = {
  content: { label: "Content", color: "#9b5de5" },
  growth: { label: "Growth", color: "#10b981" },
  engagement: { label: "Engagement", color: "#E1306C" },
  strategy: { label: "Strategy", color: "#f59e0b" },
};

const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string; icon: React.ElementType }> = {
  todo: { label: "To Do", color: "#64748b", icon: Clock },
  in_progress: { label: "In Progress", color: "#f59e0b", icon: Zap },
  done: { label: "Done", color: "#10b981", icon: CheckCircle2 },
  skipped: { label: "Skipped", color: "#ef4444", icon: XCircle },
};

const OUTCOME_CONFIG: Record<NonNullable<ActionOutcome>, { label: string; color: string; emoji: string }> = {
  excellent: { label: "Excellent", color: "#10b981", emoji: "🚀" },
  good: { label: "Good", color: "#06b6d4", emoji: "✅" },
  no_change: { label: "No Change", color: "#64748b", emoji: "➡️" },
  negative: { label: "Made Things Worse", color: "#ef4444", emoji: "⚠️" },
};

function fmt(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function calcDelta(a: number, b: number): number | null {
  if (!b) return null;
  return ((a - b) / b) * 100;
}

// ── Metrics comparison card ───────────────────────────────────────────────────

function MetricsDelta({ before, after }: { before: MetricsSnapshot; after: MetricsSnapshot }) {
  const rows = [
    { label: "Followers", before: before.followers, after: after.followers },
    { label: "Reach", before: before.reach, after: after.reach },
    { label: "New Followers", before: before.followerGrowth, after: after.followerGrowth },
    { label: "Engagement Rate", before: before.engagementRate, after: after.engagementRate, isPercent: true },
  ];

  return (
    <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: "var(--bg-card-hover)" }}>
        <BarChart3 size={12} className="text-[var(--text-secondary)]" />
        <span className="text-xs font-medium text-[var(--text-secondary)]">Performance Impact</span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {rows.map((row) => {
          const delta = calcDelta(row.after, row.before);
          const pos = delta !== null && delta >= 0;
          return (
            <div key={row.label} className="px-3 py-2 flex items-center justify-between" style={{ background: "var(--bg-card)" }}>
              <span className="text-xs text-[var(--text-secondary)]">{row.label}</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--text-secondary)]">{row.isPercent ? `${row.before.toFixed(2)}%` : fmt(row.before)}</span>
                <span className="text-[var(--text-secondary)]">→</span>
                <span className="text-white font-medium">{row.isPercent ? `${row.after.toFixed(2)}%` : fmt(row.after)}</span>
                {delta !== null && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-medium"
                    style={{ background: pos ? "#10b98120" : "#ef444420", color: pos ? "#10b981" : "#ef4444" }}>
                    {pos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {pos ? "+" : ""}{delta.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Outcome dialog ────────────────────────────────────────────────────────────

function OutcomeDialog({ item, onClose, onSave }: {
  item: ActionItem;
  onClose: () => void;
  onSave: (outcome: ActionOutcome, notes: string) => void;
}) {
  const [outcome, setOutcome] = useState<ActionOutcome>(item.outcome ?? null);
  const [notes, setNotes] = useState(item.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="rounded-2xl p-6 max-w-md w-full space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Mark as Done</h3>
          <button onClick={onClose}><X size={18} className="text-[var(--text-secondary)]" /></button>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">How did implementing <strong className="text-white">&ldquo;{item.title}&rdquo;</strong> go?</p>

        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(OUTCOME_CONFIG) as [NonNullable<ActionOutcome>, typeof OUTCOME_CONFIG[keyof typeof OUTCOME_CONFIG]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => setOutcome(key)}
              className="px-3 py-2.5 rounded-xl text-sm text-left transition-all"
              style={outcome === key
                ? { background: cfg.color + "22", border: `1px solid ${cfg.color}66`, color: cfg.color }
                : { background: "var(--bg-card-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {cfg.emoji} {cfg.label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What worked? What did you learn? Any metrics you noticed?"
            rows={3}
            className="w-full rounded-xl px-3 py-2 text-sm text-white resize-none outline-none"
            style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border)" }}
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-sm text-[var(--text-secondary)]" style={{ background: "var(--bg-card-hover)" }}>Cancel</button>
          <button
            onClick={() => onSave(outcome, notes)}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #ff3b6b, #9b5de5)" }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action card ───────────────────────────────────────────────────────────────

function ActionCard({ item, onUpdate }: { item: ActionItem; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);

  const pc = PRIORITY_CONFIG[item.priority];
  const cc = CATEGORY_CONFIG[item.category];
  const sc = STATUS_CONFIG[item.status];
  const StatusIcon = sc.icon;

  const STATUS_CYCLE: ActionStatus[] = ["todo", "in_progress", "done", "skipped"];

  function advanceStatus() {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(item.status) + 1) % STATUS_CYCLE.length];
    if (next === "done") {
      setShowOutcomeDialog(true);
    } else {
      updateActionStatus(item.id, next);
      onUpdate();
    }
  }

  function handleOutcomeSave(outcome: ActionOutcome, newNotes: string) {
    updateActionStatus(item.id, "done", outcome ?? undefined);
    updateActionItem(item.id, { notes: newNotes });
    setNotes(newNotes);
    setShowOutcomeDialog(false);
    onUpdate();
  }

  function saveNotes() {
    updateActionItem(item.id, { notes });
    setEditing(false);
    onUpdate();
  }

  const isDone = item.status === "done";
  const createdDate = new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const completedDate = item.completedAt ? new Date(item.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

  return (
    <>
      {showOutcomeDialog && (
        <OutcomeDialog item={item} onClose={() => setShowOutcomeDialog(false)} onSave={handleOutcomeSave} />
      )}
      <div
        className="rounded-xl overflow-hidden transition-all"
        style={{
          background: "var(--bg-card)",
          border: `1px solid ${isDone ? "#10b98133" : "var(--border)"}`,
          opacity: item.status === "skipped" ? 0.55 : 1,
        }}
      >
        {/* Card header */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Status toggle */}
            <button
              onClick={advanceStatus}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all hover:scale-105"
              style={{ background: sc.color + "20", border: `1px solid ${sc.color}44` }}
              title={`Current: ${sc.label} — click to advance`}
            >
              <StatusIcon size={15} style={{ color: sc.color }} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium leading-snug ${isDone ? "text-[var(--text-secondary)] line-through" : "text-white"}`}>
                  {item.title}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpanded(!expanded)} className="text-[var(--text-secondary)] hover:text-white transition-colors p-1">
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => { deleteActionItem(item.id); onUpdate(); }}
                    className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Tags row */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: pc.bg, color: pc.color }}>{item.priority.toUpperCase()}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: cc.color + "22", color: cc.color }}>{cc.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: sc.color + "20", color: sc.color }}>{sc.label}</span>
                {item.dueIn && !isDone && (
                  <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-0.5">
                    <Clock size={9} /> Due in {item.dueIn}
                  </span>
                )}
                {isDone && item.outcome && (
                  <span className="text-[10px] font-medium" style={{ color: OUTCOME_CONFIG[item.outcome].color }}>
                    {OUTCOME_CONFIG[item.outcome].emoji} {OUTCOME_CONFIG[item.outcome].label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description always visible */}
          <p className="text-xs text-[var(--text-secondary)] mt-2 ml-11 leading-relaxed">{item.description}</p>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t px-4 pb-4 space-y-3" style={{ borderColor: "var(--border)" }}>
            {/* Rationale */}
            {item.rationale && (
              <div className="pt-3">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Why this action</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.rationale}</p>
              </div>
            )}

            {/* Estimated impact */}
            {item.estimatedImpact && (
              <div>
                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Expected impact</p>
                <p className="text-xs text-emerald-400 leading-relaxed">{item.estimatedImpact}</p>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Notes</p>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                    <Edit3 size={11} />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={saveNotes} className="text-emerald-400 hover:text-emerald-300"><Save size={11} /></button>
                    <button onClick={() => { setNotes(item.notes ?? ""); setEditing(false); }} className="text-[var(--text-secondary)]"><X size={11} /></button>
                  </div>
                )}
              </div>
              {editing ? (
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Add notes…"
                  className="w-full rounded-lg px-2 py-1.5 text-xs text-white resize-none outline-none"
                  style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border)" }} />
              ) : (
                <p className="text-xs text-[var(--text-secondary)]">{item.notes || "No notes yet"}</p>
              )}
            </div>

            {/* Timestamps */}
            <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)]">
              <span>Created {createdDate}</span>
              {completedDate && <span className="text-emerald-400">Completed {completedDate}</span>}
            </div>

            {/* Performance comparison */}
            {isDone && item.metricsAtCreation && item.metricsAtCompletion && (
              <MetricsDelta before={item.metricsAtCreation} after={item.metricsAtCompletion} />
            )}
            {isDone && item.metricsAtCreation && !item.metricsAtCompletion && (
              <div className="rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)]" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border)" }}>
                <p className="mb-1 text-white text-xs font-medium">Track performance impact</p>
                <p>Metrics at creation: {fmt(item.metricsAtCreation.followers)} followers · {fmt(item.metricsAtCreation.reach)} reach · ER {item.metricsAtCreation.engagementRate.toFixed(2)}%</p>
                <p className="mt-1 text-amber-400/80">Re-generate AI insights from Analytics → the next snapshot will compare against this baseline.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Priority section ──────────────────────────────────────────────────────────

function PrioritySection({
  priority,
  items,
  onUpdate,
  filter,
}: {
  priority: ActionPriority;
  items: ActionItem[];
  onUpdate: () => void;
  filter: ActionStatus | "all";
}) {
  const pc = PRIORITY_CONFIG[priority];
  const visible = filter === "all" ? items : items.filter((i) => i.status === filter);
  if (visible.length === 0) return null;

  const done = items.filter((i) => i.status === "done").length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1" style={{ background: pc.color + "33" }} />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: pc.color }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: pc.color }}>{pc.label}</span>
          <span className="text-xs text-[var(--text-secondary)]">{done}/{items.length} done</span>
        </div>
        <div className="h-px flex-1" style={{ background: pc.color + "33" }} />
      </div>
      <div className="space-y-3">
        {visible.map((item) => <ActionCard key={item.id} item={item} onUpdate={onUpdate} />)}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ActionPlanPage() {
  const [items, setItems] = useState<ActionItem[]>(() => getActionItems());
  const [filter, setFilter] = useState<ActionStatus | "all">("all");
  const [showEmpty, setShowEmpty] = useState(false);

  function refresh() {
    setItems(getActionItems());
  }

  const byPriority = {
    high: items.filter((i) => i.priority === "high"),
    medium: items.filter((i) => i.priority === "medium"),
    low: items.filter((i) => i.priority === "low"),
  };

  const counts = {
    all: items.length,
    todo: items.filter((i) => i.status === "todo").length,
    in_progress: items.filter((i) => i.status === "in_progress").length,
    done: items.filter((i) => i.status === "done").length,
    skipped: items.filter((i) => i.status === "skipped").length,
  };

  const completionPct = items.length > 0 ? Math.round((counts.done / items.length) * 100) : 0;
  const hasAny = items.length > 0;

  const FILTERS: { key: ActionStatus | "all"; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "todo", label: "To Do", count: counts.todo },
    { key: "in_progress", label: "In Progress", count: counts.in_progress },
    { key: "done", label: "Done", count: counts.done },
    { key: "skipped", label: "Skipped", count: counts.skipped },
  ];

  if (!hasAny && !showEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #ff3b6b22, #9b5de522)", border: "1px solid #ff3b6b33" }}>
          <Target size={28} className="text-[#ff3b6b]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Your Action Plan</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
            Generate AI insights on the <strong className="text-white">Analytics</strong> page — Claude will build a prioritised action plan and save it here automatically.
          </p>
        </div>
        <div className="rounded-xl p-4 text-left max-w-sm w-full space-y-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {[
            { color: "#ef4444", text: "High priority — do this week" },
            { color: "#f59e0b", text: "Medium priority — do this month" },
            { color: "#06b6d4", text: "Low priority — do this quarter" },
          ].map((row) => (
            <div key={row.color} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: row.color }} />
              {row.text}
            </div>
          ))}
        </div>
        <a href="/analytics"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: "linear-gradient(135deg, #ff3b6b, #9b5de5)" }}>
          <Zap size={15} /> Go to Analytics → Generate Insights
        </a>
        <button onClick={() => setShowEmpty(true)} className="text-xs text-[var(--text-secondary)] hover:text-white">
          or add items manually
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={22} className="text-[#ff3b6b]" /> Action Plan
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">Track your AI-recommended actions and see if they improve performance</p>
        </div>
        {hasAny && (
          <div className="flex items-center gap-3">
            {/* Completion bar */}
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-card-hover)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, background: "linear-gradient(90deg, #ff3b6b, #9b5de5)" }} />
              </div>
              <span className="text-xs text-[var(--text-secondary)]">{completionPct}% done</span>
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {hasAny && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "High Priority", value: byPriority.high.length, done: byPriority.high.filter(i => i.status === "done").length, color: "#ef4444" },
            { label: "Medium Priority", value: byPriority.medium.length, done: byPriority.medium.filter(i => i.status === "done").length, color: "#f59e0b" },
            { label: "Low Priority", value: byPriority.low.length, done: byPriority.low.filter(i => i.status === "done").length, color: "#06b6d4" },
            { label: "Total Done", value: counts.done, done: counts.done, color: "#10b981" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-xs text-[var(--text-secondary)]">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-[var(--text-secondary)]">{s.done} completed</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {hasAny && (
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={filter === f.key
                ? { background: "#ff3b6b22", border: "1px solid #ff3b6b55", color: "#ff3b6b" }
                : { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {f.label}
              <span className="text-[10px] opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Priority sections */}
      {hasAny ? (
        <div className="space-y-8">
          {(["high", "medium", "low"] as ActionPriority[]).map((p) => (
            <PrioritySection key={p} priority={p} items={byPriority[p]} onUpdate={refresh} filter={filter} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <Plus size={24} className="text-[var(--text-secondary)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">No items yet. Go to Analytics and generate AI insights to populate your action plan.</p>
          <a href="/analytics" className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#ff3b6b] hover:opacity-80">
            <Zap size={13} /> Generate AI Insights
          </a>
        </div>
      )}

      {/* Performance note */}
      {items.some((i) => i.status === "done" && i.metricsAtCreation) && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-[var(--text-secondary)]"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <span>Performance comparison shows metrics at creation vs completion. Generate new AI insights regularly to keep the baseline fresh and track if actions actually moved the needle.</span>
        </div>
      )}
    </div>
  );
}

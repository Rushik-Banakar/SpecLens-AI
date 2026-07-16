import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Zap,
  Lock,
  Activity,
  FileText,
  BookOpen,
  CheckSquare,
  Database,
  Cpu,
  Users,
  Briefcase,
} from 'lucide-react';

// ─── Category config: icon + colour ────────────────────────────────────────
const CATEGORY_CONFIG = {
  'Functional':          { icon: Zap,           color: 'text-indigo-400',  bg: 'bg-indigo-950/30  border-indigo-500/20'  },
  'Non-Functional':      { icon: Activity,       color: 'text-purple-400',  bg: 'bg-purple-950/30  border-purple-500/20'  },
  'Business Rule':       { icon: Briefcase,      color: 'text-amber-400',   bg: 'bg-amber-950/30   border-amber-500/20'   },
  'Security':            { icon: Lock,           color: 'text-rose-400',    bg: 'bg-rose-950/30    border-rose-500/20'    },
  'Performance':         { icon: Activity,       color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-500/20' },
  'Compliance':          { icon: ShieldAlert,    color: 'text-orange-400',  bg: 'bg-orange-950/30  border-orange-500/20'  },
  'API':                 { icon: Cpu,            color: 'text-cyan-400',    bg: 'bg-cyan-950/30    border-cyan-500/20'    },
  'User Story':          { icon: Users,          color: 'text-sky-400',     bg: 'bg-sky-950/30     border-sky-500/20'     },
  'Acceptance Criteria': { icon: CheckSquare,    color: 'text-teal-400',    bg: 'bg-teal-950/30    border-teal-500/20'    },
  'Data Constraint':     { icon: Database,       color: 'text-violet-400',  bg: 'bg-violet-950/30  border-violet-500/20'  },
  'Technical Constraint':{ icon: FileText,       color: 'text-slate-400',   bg: 'bg-slate-900/40   border-slate-700/30'   },
};

// ─── Priority badge config ──────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  Critical: 'text-rose-400   bg-rose-950/30   border-rose-500/25',
  High:     'text-amber-400  bg-amber-950/30  border-amber-500/25',
  Medium:   'text-sky-400    bg-sky-950/30    border-sky-500/25',
  Low:      'text-slate-400  bg-slate-900/30  border-slate-700/30',
};

// ─── Confidence bar ─────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90 ? 'bg-emerald-500' :
    pct >= 70 ? 'bg-indigo-500'  :
    pct >= 50 ? 'bg-amber-500'   : 'bg-rose-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── Single requirement card ────────────────────────────────────────────────
function RequirementCard({ req }) {
  const cfg = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG['Functional'];
  const Icon = cfg.icon;

  return (
    <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/10 hover:bg-slate-900/30 hover:border-slate-800 transition-all duration-200 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black tracking-wider ${cfg.bg} ${cfg.color}`}>
            <Icon size={10} />
            {req.category}
          </span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.Low}`}>
            {req.priority}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
            {req.id}
          </span>
        </div>
      </div>

      {/* Statement */}
      <p className="text-sm text-slate-300 leading-relaxed">{req.statement}</p>

      {/* Footer: source doc + confidence */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
          <FileText size={10} />
          <span className="truncate">{req.document}</span>
        </div>
        <ConfidenceBar value={req.confidence} />
      </div>
    </div>
  );
}

// ─── Category group (collapsible) ──────────────────────────────────────────
function CategoryGroup({ category, requirements }) {
  const [open, setOpen] = useState(true);
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Functional'];
  const Icon = cfg.icon;

  return (
    <div className="rounded-2xl border border-slate-900 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className={`p-1.5 rounded-lg border ${cfg.bg} ${cfg.color}`}>
            <Icon size={13} />
          </span>
          <span className="text-sm font-bold text-slate-200">{category}</span>
          <span className="text-xs font-semibold text-slate-500 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full">
            {requirements.length}
          </span>
        </div>
        {open
          ? <ChevronDown size={16} className="text-slate-500" />
          : <ChevronRight size={16} className="text-slate-500" />
        }
      </button>

      {open && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4 bg-slate-950/20">
          {requirements.map(req => (
            <RequirementCard key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ─────────────────────────────────────────────────────────────
export default function RequirementsPanel({ requirements = [], stats = null, isLoading = false, error = null }) {
  const [panelOpen, setPanelOpen] = useState(true);

  // Group by category
  const grouped = requirements.reduce((acc, req) => {
    if (!acc[req.category]) acc[req.category] = [];
    acc[req.category].push(req);
    return acc;
  }, {});

  // Sort categories by count descending
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => grouped[b].length - grouped[a].length
  );

  return (
    <div className="rounded-2xl border border-indigo-500/15 bg-slate-950/30 overflow-hidden">
      {/* Panel header — always visible */}
      <button
        onClick={() => setPanelOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-950/30 to-slate-950/0 hover:from-indigo-950/50 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
            <Sparkles size={16} className="text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-100">Extracted Requirements</p>
            <p className="text-[11px] text-slate-500">
              {isLoading
                ? 'AI extraction in progress...'
                : error
                  ? 'Extraction failed — see details below'
                  : requirements.length > 0
                    ? `${requirements.length} requirements across ${sortedCategories.length} categories`
                    : 'No requirements extracted yet'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats pills */}
          {stats && !isLoading && !error && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                {stats.documents_processed} docs
              </span>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/30 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                {stats.elapsed_seconds}s
              </span>
            </div>
          )}
          {panelOpen
            ? <ChevronDown size={18} className="text-slate-500" />
            : <ChevronRight size={18} className="text-slate-500" />
          }
        </div>
      </button>

      {/* Panel body */}
      {panelOpen && (
        <div className="p-5 space-y-4">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles size={18} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-slate-300">Gemini Flash is extracting requirements...</p>
                <p className="text-xs text-slate-600">Analysing document semantics and classifying engineering requirements</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 space-y-2">
              <p className="text-sm font-bold text-rose-400">AI Extraction Failed</p>
              <p className="text-xs text-slate-400 font-mono break-all">{error}</p>
            </div>
          )}

          {/* Summary stats row */}
          {!isLoading && !error && requirements.length > 0 && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Requirements', value: stats.total_requirements, color: 'text-indigo-400' },
                { label: 'Documents', value: stats.documents_processed, color: 'text-emerald-400' },
                { label: 'Categories', value: sortedCategories.length, color: 'text-purple-400' },
                { label: 'AI Time', value: `${stats.elapsed_seconds}s`, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-xl border border-slate-900 bg-slate-900/20 text-center">
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Per-document breakdown */}
          {!isLoading && !error && stats?.per_document?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {stats.per_document.map(d => (
                <span
                  key={d.name}
                  className="text-[10px] font-semibold text-slate-400 bg-slate-900/50 border border-slate-800 px-2.5 py-1 rounded-full"
                >
                  {d.name} → {d.count} req{d.count !== 1 ? 's' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Category groups */}
          {!isLoading && !error && sortedCategories.length > 0 && (
            <div className="space-y-3">
              {sortedCategories.map(cat => (
                <CategoryGroup
                  key={cat}
                  category={cat}
                  requirements={grouped[cat]}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && requirements.length === 0 && (
            <div className="text-center py-10 text-slate-600 space-y-2">
              <BookOpen size={32} className="mx-auto opacity-30" />
              <p className="text-sm">No requirements extracted. Upload documents and click Analyze.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

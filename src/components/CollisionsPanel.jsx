import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, ShieldAlert, AlertTriangle,
  Lightbulb, ChevronUp,
} from 'lucide-react';
import {
  buildFindingTitle,
  getConfidencePresentation,
  formatReasonForDisplay,
  formatRecommendationForDisplay,
} from '../utils/presentationHelpers';

// ── Severity config ──────────────────────────────────────────────────────────
const SEV_CONFIG = {
  Critical: {
    badge: 'text-rose-400   bg-rose-950/30   border-rose-500/25',
    bar:   'bg-rose-500',
    glow:  'border-rose-500/20',
    dot:   'bg-rose-500',
  },
  High: {
    badge: 'text-amber-400  bg-amber-950/30  border-amber-500/25',
    bar:   'bg-amber-500',
    glow:  'border-amber-500/20',
    dot:   'bg-amber-500',
  },
  Medium: {
    badge: 'text-sky-400    bg-sky-950/30    border-sky-500/25',
    bar:   'bg-sky-500',
    glow:  'border-sky-500/20',
    dot:   'bg-sky-500',
  },
  Low: {
    badge: 'text-slate-400  bg-slate-900/30  border-slate-700/30',
    bar:   'bg-slate-500',
    glow:  'border-slate-700/30',
    dot:   'bg-slate-500',
  },
};

// ── Confidence display ─────────────────────────────────────────────────────
function ConfidenceDisplay({ value }) {
  const { pct, label } = getConfidencePresentation(value);
  const color = pct >= 95 ? 'bg-emerald-500' : pct >= 85 ? 'bg-indigo-500' : pct >= 70 ? 'bg-amber-500' : 'bg-slate-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm font-extrabold text-slate-200">{pct}%</span>
        <span className="text-[9px] font-semibold text-slate-400">{label}</span>
      </div>
      <div className="w-24 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] font-medium text-slate-500 block text-right">{label} Confidence</span>
    </div>
  );
}

// ── Single collision card (expandable) ────────────────────────────────────
export function CollisionCard({ collision, index }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEV_CONFIG[collision.severity] || SEV_CONFIG.Low;
  const title = buildFindingTitle(collision);
  const reason = formatReasonForDisplay(collision);
  const recommendation = formatRecommendationForDisplay(collision);

  return (
    <div className={`rounded-xl border ${expanded ? sev.glow : 'border-slate-900'} bg-slate-950/20 overflow-hidden transition-all duration-200`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-4 hover:bg-slate-900/20 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${sev.dot}`} />

            <div className="min-w-0 space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                  {collision.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.badge}`}>
                  {collision.severity}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-900/50 border border-slate-800 px-2 py-0.5 rounded">
                  {collision.type}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-100 leading-snug pr-2">{title}</h4>

              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{reason}</p>

              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-500">
                <span>{collision.requirement_a}</span>
                <span className="text-rose-500">⟷</span>
                <span>{collision.requirement_b}</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {(collision.documents || []).map((doc, i) => (
                  <span key={i} className="text-[9px] text-slate-500 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded truncate max-w-[160px]" title={doc}>
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <ConfidenceDisplay value={collision.confidence} />
            {expanded
              ? <ChevronUp size={14} className="text-slate-500" />
              : <ChevronDown size={14} className="text-slate-500" />
            }
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-900/60">
          <div className="pt-3 space-y-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Reasoning &amp; Impact</span>
            <p className="text-xs text-slate-300 leading-relaxed">{reason}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-900 bg-slate-950/60 space-y-1">
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest block">
                Evidence — {collision.requirement_a}
              </span>
              <span className="text-[9px] text-slate-600 block truncate" title={(collision.documents || [])[0]}>{(collision.documents || [])[0] || 'Document A'}</span>
              <p className="text-xs text-slate-300 italic leading-relaxed break-words">
                {collision.statement_a || '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-slate-900 bg-slate-950/60 space-y-1">
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest block">
                Evidence — {collision.requirement_b}
              </span>
              <span className="text-[9px] text-slate-600 block truncate" title={(collision.documents || [])[1]}>{(collision.documents || [])[1] || 'Document B'}</span>
              <p className="text-xs text-slate-300 italic leading-relaxed break-words">
                {collision.statement_b || '—'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-indigo-500/10 bg-indigo-950/10 flex gap-2">
            <Lightbulb size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest block">Suggested Fix</span>
              <p className="text-xs text-slate-300 leading-relaxed">{recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main CollisionsPanel ──────────────────────────────────────────────────
export default function CollisionsPanel({ collisions = [], stats = null, isLoading = false, error = null }) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [filterSev, setFilterSev] = useState('All');

  const severities = ['All', 'Critical', 'High', 'Medium', 'Low'];

  const filtered = filterSev === 'All'
    ? collisions
    : collisions.filter(c => c.severity === filterSev);

  return (
    <div className="rounded-2xl border border-rose-500/15 bg-slate-950/30 overflow-hidden">
      {/* Panel header */}
      <button
        onClick={() => setPanelOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rose-950/20 to-slate-950/0 hover:from-rose-950/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-500/15">
            <ShieldAlert size={16} className="text-rose-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-100">Detected Contradictions</p>
            <p className="text-[11px] text-slate-500">
              {isLoading
                ? 'AI collision detection in progress...'
                : error
                  ? 'Collision detection failed'
                  : collisions.length > 0
                    ? `${collisions.length} collision${collisions.length !== 1 ? 's' : ''} found`
                    : 'No collisions detected'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {stats && !isLoading && !error && (
            <div className="hidden sm:flex gap-2">
              {stats.critical_count > 0 && (
                <span className="text-[10px] font-bold text-rose-400 bg-rose-950/30 border border-rose-500/20 px-2.5 py-1 rounded-full">
                  {stats.critical_count} critical
                </span>
              )}
              {stats.high_count > 0 && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/30 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  {stats.high_count} high
                </span>
              )}
            </div>
          )}
          {panelOpen ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
        </div>
      </button>

      {panelOpen && (
        <div className="p-5 space-y-4">
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
                <ShieldAlert size={18} className="absolute inset-0 m-auto text-rose-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-300">Groq Llama 3.3 detecting collisions...</p>
                <p className="text-xs text-slate-600">Comparing {stats?.requirements_compared || 0} requirements across all document pairs</p>
              </div>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 space-y-1">
              <p className="text-sm font-bold text-rose-400">Collision Detection Failed</p>
              <p className="text-xs text-slate-400 font-mono break-all">{error}</p>
            </div>
          )}

          {/* Stats row */}
          {!isLoading && !error && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Collisions', value: stats.collisions_found, color: 'text-rose-400' },
                { label: 'Critical', value: stats.critical_count, color: 'text-rose-400' },
                { label: 'High', value: stats.high_count, color: 'text-amber-400' },
                { label: 'AI Time', value: `${stats.elapsed_seconds}s`, color: 'text-indigo-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-xl border border-slate-900 bg-slate-900/20 text-center">
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Severity filter */}
          {!isLoading && !error && collisions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {severities.map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSev(sev)}
                  className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${
                    filterSev === sev
                      ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
                      : 'border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                  }`}
                >
                  {sev}
                  {sev !== 'All' && (
                    <span className="ml-1 opacity-70">
                      ({collisions.filter(c => c.severity === sev).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Collision cards */}
          {!isLoading && !error && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((col, i) => (
                <CollisionCard key={col.id} collision={col} index={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && collisions.length === 0 && (
            <div className="text-center py-10 text-slate-600 space-y-2">
              <ShieldAlert size={32} className="mx-auto opacity-30" />
              <p className="text-sm">No collisions found — excellent requirement consistency!</p>
            </div>
          )}

          {/* Filtered empty */}
          {!isLoading && !error && collisions.length > 0 && filtered.length === 0 && (
            <div className="text-center py-6 text-slate-600 text-sm">
              No {filterSev.toLowerCase()} collisions detected.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

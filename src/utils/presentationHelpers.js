/**
 * Presentation helpers — UI-only formatting derived from existing API data.
 * Does not modify backend values, calculations, or detection logic.
 */

const TYPE_SUFFIX = {
  Contradiction: 'Conflict',
  Ambiguity: 'Ambiguity',
  'Capacity Mismatch': 'Capacity Mismatch',
  'Potential Conflict': 'Conflict',
  Recommendation: 'Recommendation',
  'Authentication Conflict': 'Authentication Conflict',
  'Authorization Conflict': 'Authorization Conflict',
  'API Contract Conflict': 'API Contract Conflict',
  'Business Rule Conflict': 'Business Rule Conflict',
  'Performance Conflict': 'Performance Conflict',
  'Compliance Conflict': 'Compliance Conflict',
  'Data Constraint Conflict': 'Data Constraint Conflict',
  'Workflow Conflict': 'Workflow Conflict',
  'Feature Logic Conflict': 'Feature Conflict',
  'Security Policy Conflict': 'Security Policy Conflict',
  'Technical Constraint Conflict': 'Technical Constraint Conflict',
};

const TOPIC_PATTERNS = [
  { pattern: /google\s+login|google\s+oauth|google\s+sign[- ]?in/i, label: 'Google Login Authentication' },
  { pattern: /oauth2?|oauth\s+authentication/i, label: 'OAuth Security Policy' },
  { pattern: /password|email\/password|credential/i, label: 'Authentication Policy' },
  { pattern: /payment|stripe|adyen|billing/i, label: 'Payment Processing' },
  { pattern: /response\s+time|latency|timeout|sla/i, label: 'API Timeout' },
  { pattern: /capacity|throughput|users|concurrent|scale/i, label: 'System Capacity' },
  { pattern: /encrypt|security\s+policy|compliance|gdpr/i, label: 'Security Policy' },
  { pattern: /api\s+contract|endpoint|payload|rest/i, label: 'API Contract' },
  { pattern: /workflow|state\s+machine|process\s+flow/i, label: 'Workflow' },
];

function extractTopic(statementA = '', statementB = '') {
  const combined = `${statementA} ${statementB}`;
  for (const { pattern, label } of TOPIC_PATTERNS) {
    if (pattern.test(combined)) return label;
  }

  const source = (statementA || statementB).replace(/^(the\s+)?system\s+(shall|must|should|will)\s+/i, '');
  const words = source.split(/\s+/).filter(Boolean).slice(0, 5);
  if (words.length >= 2) {
    const title = words.join(' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  return '';
}

export function buildFindingTitle(collision = {}) {
  const type = collision.type || 'Conflict';
  const suffix = TYPE_SUFFIX[type] || type;
  const topic = extractTopic(collision.statement_a, collision.statement_b);
  if (topic) return `${topic} ${suffix}`.replace(/\s+/g, ' ').trim();
  if (collision.requirement_a && collision.requirement_b) {
    return `${collision.requirement_a} ↔ ${collision.requirement_b} ${suffix}`;
  }
  return collision.id || 'Cross-Document Finding';
}

export function getConfidencePresentation(value = 0) {
  const pct = Math.round((value > 1 ? value : value * 100));
  let label = 'Low';
  if (pct >= 95) label = 'Very High';
  else if (pct >= 85) label = 'High';
  else if (pct >= 70) label = 'Medium';
  return { pct, label };
}

const IMPLEMENTATION_RISK = {
  Critical: 'This creates immediate implementation risk and may block delivery or cause production failures if unresolved before build.',
  High: 'This poses significant implementation risk and is likely to cause integration defects or incorrect system behaviour.',
  Medium: 'This may create ambiguity during implementation and should be clarified before detailed design.',
  Low: 'This is a lower-priority consistency issue, but resolving it will reduce rework during delivery.',
};

export function formatReasonForDisplay(collision = {}) {
  const reason = (collision.reason || '').trim();
  if (!reason) return 'No detailed reasoning was provided for this finding.';

  const risk = IMPLEMENTATION_RISK[collision.severity] || IMPLEMENTATION_RISK.Medium;
  if (reason.toLowerCase().includes('implementation risk')) return reason;
  return `${reason} ${risk}`;
}

export function formatRecommendationForDisplay(collision = {}) {
  const rec = (collision.recommendation || '').trim();
  const docs = Array.isArray(collision.documents) ? collision.documents.filter(Boolean) : [];

  if (rec && rec.length >= 40 && !/^(resolve|clarify|fix)\s+(the\s+)?(policy\s+)?conflict\.?$/i.test(rec)) {
    return rec;
  }

  if (docs.length >= 2) {
    const base = rec || 'Align the conflicting specifications.';
    return `${base} Review and reconcile ${docs[0]} and ${docs[1]} to establish a single source of truth.`;
  }

  if (docs.length === 1) {
    return rec
      ? `${rec} Update ${docs[0]} to remove the inconsistency.`
      : `Update ${docs[0]} to align with the related requirement and remove the inconsistency.`;
  }

  return rec || 'Review the cited requirements and align documentation between affected sources.';
}

function assessProject(healthScore) {
  if (healthScore >= 85) return 'The specification set is largely coherent with isolated issues to address.';
  if (healthScore >= 70) return 'The project has moderate specification risk and would benefit from targeted alignment before development.';
  if (healthScore >= 50) return 'The project carries notable cross-document risk that should be resolved before engineering kickoff.';
  return 'The project has critical specification conflicts that require immediate stakeholder review.';
}

export function buildExecutiveSummary({
  extractedRequirements,
  detectedCollisions,
  documentsList = [],
  liveCollisions = [],
}) {
  if (!extractedRequirements || !detectedCollisions) {
    return 'No audit summary available. Please upload files and run the extraction engine.';
  }

  const docsReviewed = extractedRequirements?.stats?.documents_processed ?? documentsList.length;
  const totalReqs = extractedRequirements?.stats?.total_requirements ?? 0;
  const findings = detectedCollisions?.stats?.collisions_found ?? 0;
  const critical = detectedCollisions?.stats?.critical_count ?? 0;
  const high = detectedCollisions?.stats?.high_count ?? 0;
  const medium = detectedCollisions?.stats?.medium_count ?? 0;
  const health = detectedCollisions?.stats?.health_score ?? 100;

  const ranked = [...liveCollisions].sort((a, b) => {
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });
  const topFinding = ranked[0];
  const primaryRisk = topFinding
    ? buildFindingTitle(topFinding)
    : 'No material cross-document conflicts identified';
  const topRecommendation = topFinding
    ? formatRecommendationForDisplay(topFinding)
    : 'Maintain a single source of truth across PRD, API, and policy documents as specifications evolve.';

  const docNames = documentsList.map((d) => d.name).filter(Boolean).slice(0, 4);
  const docLabel = docNames.length > 0 ? docNames.join(', ') : `${docsReviewed} document(s)`;

  return [
    `SpecLens AI reviewed ${docsReviewed} document(s) (${docLabel}) and extracted ${totalReqs} structured requirements for cross-document analysis.`,
    `The audit identified ${findings} cross-document finding${findings === 1 ? '' : 's'}, including ${critical} critical, ${high} high, and ${medium} medium-severity issue${(high + medium) === 1 ? '' : 's'}.`,
    `Overall project health is ${health}/100. ${assessProject(health)}`,
    `Primary risk area: ${primaryRisk}.`,
    `Top recommendation: ${topRecommendation}`,
  ].join(' ');
}

export function buildAnalysisMetadata({
  extractedRequirements,
  detectedCollisions,
  documentsList = [],
}) {
  const extractStats = extractedRequirements?.stats || {};
  const collisionStats = detectedCollisions?.stats || {};
  const totalAnalysisSeconds = (
    (extractStats.elapsed_seconds || 0) + (collisionStats.elapsed_seconds || 0)
  ).toFixed(1);

  return [
    { label: 'Documents Processed', value: extractStats.documents_processed ?? documentsList.length },
    { label: 'Requirements Extracted', value: extractStats.total_requirements ?? 0 },
    { label: 'Findings Detected', value: collisionStats.collisions_found ?? 0 },
    { label: 'Extraction Time', value: extractStats.elapsed_seconds != null ? `${extractStats.elapsed_seconds}s` : '—' },
    { label: 'Collision Analysis Time', value: collisionStats.elapsed_seconds != null ? `${collisionStats.elapsed_seconds}s` : '—' },
    { label: 'Total Analysis Time', value: totalAnalysisSeconds !== '0.0' ? `${totalAnalysisSeconds}s` : '—' },
    { label: 'Requirements Compared', value: collisionStats.requirements_compared ?? '—' },
    { label: 'AI LLM Calls', value: collisionStats.llm_calls ?? '—' },
  ];
}

export function mapCollisionToFinding(col, idx) {
  const safeCol = col || {};
  return {
    id: safeCol.id || `ISS-${idx + 1}`,
    severity: safeCol.severity || 'Medium',
    type: safeCol.type || 'Conflict',
    confidence: safeCol.confidence ?? 0.75,
    category: 'Contradictions',
    title: buildFindingTitle(safeCol),
    summary: formatReasonForDisplay(safeCol),
    documents: Array.isArray(safeCol.documents) ? safeCol.documents : [],
    description: formatReasonForDisplay(safeCol),
    location: 'Cross-document correlation',
    excerptA: safeCol.statement_a || '',
    excerptB: safeCol.statement_b || '',
    remedy: formatRecommendationForDisplay(safeCol),
    requirement_a: safeCol.requirement_a || '',
    requirement_b: safeCol.requirement_b || '',
    rawCollision: safeCol,
  };
}

export function openPdfReport({
  documentsList = [],
  extractedRequirements,
  detectedCollisions,
  liveCollisions = [],
  executiveSummary,
  displayHealthScore,
}) {
  const findings = liveCollisions.map((col, i) => {
    const title = buildFindingTitle(col);
    return `
      <div class="finding">
        <h3>${col.id}: ${title}</h3>
        <p><strong>Severity:</strong> ${col.severity} &nbsp;|&nbsp; <strong>Type:</strong> ${col.type || '—'} &nbsp;|&nbsp; <strong>Confidence:</strong> ${getConfidencePresentation(col.confidence).pct}% (${getConfidencePresentation(col.confidence).label})</p>
        <p><strong>Requirements:</strong> ${col.requirement_a} ↔ ${col.requirement_b}</p>
        <p><strong>Documents:</strong> ${(col.documents || []).join(', ') || '—'}</p>
        <p><strong>Reason:</strong> ${formatReasonForDisplay(col)}</p>
        <p><strong>Evidence A:</strong> ${col.statement_a || '—'}</p>
        <p><strong>Evidence B:</strong> ${col.statement_b || '—'}</p>
        <p><strong>Recommendation:</strong> ${formatRecommendationForDisplay(col)}</p>
      </div>`;
  }).join('');

  const stats = detectedCollisions?.stats || {};
  const extractStats = extractedRequirements?.stats || {};
  const metadata = buildAnalysisMetadata({ extractedRequirements, detectedCollisions, documentsList });

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>SpecLens AI — Project Review Report</title>
<style>
  body { font-family: Inter, Arial, sans-serif; color: #111; margin: 40px; line-height: 1.5; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin-top: 28px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
  .summary { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }
  .finding { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 12px 0; page-break-inside: avoid; }
  .health { font-size: 32px; font-weight: 800; color: #4f46e5; }
  @media print { body { margin: 24px; } }
</style></head><body>
  <h1>SpecLens AI — Project Review Report</h1>
  <p style="color:#64748b">Generated ${new Date().toLocaleString()}</p>

  <h2>Project Summary</h2>
  <p class="health">Health Score: ${displayHealthScore}/100</p>
  <div class="meta">
    <div>Documents Reviewed: ${extractStats.documents_processed ?? documentsList.length}</div>
    <div>Requirements Extracted: ${extractStats.total_requirements ?? 0}</div>
    <div>Findings Detected: ${stats.collisions_found ?? 0}</div>
    <div>Critical / High / Medium: ${stats.critical_count ?? 0} / ${stats.high_count ?? 0} / ${stats.medium_count ?? 0}</div>
  </div>

  <h2>Executive Summary</h2>
  <div class="summary"><p>${executiveSummary}</p></div>

  <h2>Documents Reviewed</h2>
  <ul>${documentsList.map((d) => `<li>${d.name} (${d.size || '—'})</li>`).join('') || '<li>No documents listed</li>'}</ul>

  <h2>Analysis Statistics</h2>
  <div class="meta">${metadata.map((m) => `<div><strong>${m.label}:</strong> ${m.value}</div>`).join('')}</div>

  <h2>Key Findings &amp; Contradictions</h2>
  ${findings || '<p>No cross-document findings detected.</p>'}

  <h2>Recommendations</h2>
  <ul>${liveCollisions.slice(0, 5).map((col) => `<li>${formatRecommendationForDisplay(col)}</li>`).join('') || '<li>No recommendations — specification set is consistent.</li>'}</ul>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups to download the PDF report.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

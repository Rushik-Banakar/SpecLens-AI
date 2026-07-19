import React, { useState } from 'react';
import RequirementsPanel from '../components/RequirementsPanel';
import CollisionsPanel from '../components/CollisionsPanel';
import AppLogo from '../components/AppLogo';
import {
  buildExecutiveSummary,
  buildAnalysisMetadata,
  mapCollisionToFinding,
  openPdfReport,
  getConfidencePresentation,
} from '../utils/presentationHelpers';
import { 
  ShieldAlert, 
  AlertTriangle, 
  HelpCircle, 
  GitFork, 
  FileText, 
  Download, 
  ChevronRight, 
  ArrowLeft, 
  Check, 
  Copy, 
  ExternalLink,
  BookOpen,
  Layers,
  Activity,
  Menu,
  X
} from 'lucide-react';

export default function ReviewDashboard({ onBackToUpload, uploadedDocs = [], extractedRequirements = null, detectedCollisions = null }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [resolvedIssues, setResolvedIssues] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const reviewData = {
    uploadedDocs: uploadedDocs || [],
    extractedRequirements,
    detectedCollisions
  };
  console.log("Review data", reviewData);

  const isRateLimited = detectedCollisions?.success === false && detectedCollisions?.reason === 'RATE_LIMIT';

  // 1. Initialize liveCollisions and dynamicFindings first
  const liveCollisions = Array.isArray(detectedCollisions?.collisions) ? detectedCollisions.collisions : [];

  const dynamicFindings = liveCollisions.map((col, idx) => mapCollisionToFinding(col, idx));

  // 2. useEffect placed after dynamicFindings is declared
  React.useEffect(() => {
    if (dynamicFindings.length > 0 && !selectedFinding) {
      setSelectedFinding(dynamicFindings[0]);
    }
  }, [dynamicFindings, selectedFinding]);

  // 3. Any derived state (healthScore, stats, cards, findings, etc.) is computed AFTER dynamicFindings is initialized.
  const liveCritical = detectedCollisions?.stats?.critical_count ?? 0;
  const liveHigh     = detectedCollisions?.stats?.high_count     ?? 0;
  const liveMedium   = detectedCollisions?.stats?.medium_count   ?? 0;
  const liveHealthScore = detectedCollisions?.stats?.health_score ?? 100;
  const liveCollisionCount = dynamicFindings.length;
  const hasRealCollisions = liveCollisionCount > 0 || detectedCollisions !== null;

  // Sidebar contradiction badge: use real count if available
  const contradictionBadgeCount = liveCollisionCount;

  // Dashboard metric cards
  const displayHealthScore   = isRateLimited ? "Pending AI Analysis" : liveHealthScore;
  const displayCriticalCount = liveCritical;
  const displayMediumCount   = liveHigh + liveMedium;
  const displayReqCount      = extractedRequirements?.stats?.total_requirements ?? 0;

  // documentsList
  const safeUploadedDocs = Array.isArray(uploadedDocs) ? uploadedDocs : [];
  const documentsList = safeUploadedDocs.map((doc, idx) => {
    const safeDoc = doc || {};
    return {
      id: safeDoc.id || `uploaded-doc-${idx}`,
      name: safeDoc.name || 'Unnamed Document',
      size: safeDoc.size || "Unknown size",
      type: (safeDoc.type || safeDoc.name?.split('.').pop() || "TXT").toUpperCase()
    };
  });

  const executiveSummary = buildExecutiveSummary({
    extractedRequirements,
    detectedCollisions,
    documentsList,
    liveCollisions,
  });

  const analysisMetadata = buildAnalysisMetadata({
    extractedRequirements,
    detectedCollisions,
    documentsList,
  });

  const handleDownloadReport = () => {
    openPdfReport({
      documentsList,
      extractedRequirements,
      detectedCollisions,
      liveCollisions,
      executiveSummary,
      displayHealthScore: isRateLimited ? 'Pending' : liveHealthScore,
    });
  };

  const graphNodes = [];
  const graphLinks = [];

  // Add document nodes
  documentsList.forEach((doc, idx) => {
    graphNodes.push({
      id: doc.name || `doc-${idx}`,
      type: 'document',
      radius: 30,
      color: '#6366f1',
      label: doc.name || `doc-${idx}`,
      x: 180 + idx * 180,
      y: 180 + (idx % 2) * 80
    });
  });

  // Add collision nodes and links
  liveCollisions.forEach((col, idx) => {
    const safeCol = col || {};
    const colNodeId = safeCol.id || `ISS-${idx + 1}`;
    graphNodes.push({
      id: colNodeId,
      type: 'issue',
      radius: 15,
      color: safeCol.severity === 'Critical' ? '#ef4444' : '#f59e0b',
      label: colNodeId,
      x: 220 + idx * 120,
      y: 360 + (idx % 2) * 60
    });

    // Connect collision to its documents
    const safeDocs = Array.isArray(safeCol.documents) ? safeCol.documents : [];
    safeDocs.forEach(docName => {
      if (docName) {
        graphLinks.push({
          source: docName,
          target: colNodeId,
          color: safeCol.severity === 'Critical' ? '#ef4444' : '#f59e0b',
          text: safeCol.type || "Conflict"
        });
      }
    });
  });

  const graphData = {
    nodes: graphNodes,
    links: graphLinks
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'Critical': return 'text-rose-400 bg-rose-950/30 border-rose-500/25';
      case 'Medium': return 'text-amber-400 bg-amber-950/30 border-amber-500/25';
      case 'Low': return 'text-sky-400 bg-sky-950/30 border-sky-500/25';
      default: return 'text-slate-400 bg-slate-900/30 border-slate-800';
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Contradictions': return <ShieldAlert className="text-rose-400" size={16} />;
      case 'Ambiguities': return <HelpCircle className="text-amber-400" size={16} />;
      case 'Missing Requirements': return <Layers className="text-emerald-400" size={16} />;
      case 'Dependencies': return <GitFork className="text-sky-400" size={16} />;
      default: return <FileText className="text-slate-400" size={16} />;
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleResolve = (id) => {
    setResolvedIssues(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filter findings based on active tab
  const filteredFindings = dynamicFindings.filter(f => {
    if (activeTab === 'summary' || activeTab === 'graph') return true;
    if (activeTab === 'contradictions') return f.category === 'Contradictions';
    if (activeTab === 'ambiguities') return f.category === 'Ambiguities';
    if (activeTab === 'missing') return f.category === 'Missing Requirements';
    if (activeTab === 'dependencies') return f.category === 'Dependencies';
    return true;
  });

  const activeCategoryTitle = () => {
    switch (activeTab) {
      case 'summary': return 'Recent Findings';
      case 'contradictions': return 'Contradictions Detected';
      case 'ambiguities': return 'Ambiguities & Vaguenesses';
      case 'missing': return 'Missing Requirements & Gaps';
      case 'dependencies': return 'Dependencies & Timelines';
      case 'graph': return 'Conflict Relationship Graph';
      default: return 'Findings';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-900/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-900/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Mobile Top Navbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900/80 border-b border-slate-800 z-30 w-full sticky top-0 backdrop-blur-md">
        <AppLogo
          onClick={() => setIsMobileMenuOpen(false)}
          showIcon={false}
          textClassName="font-black text-lg text-white"
        />
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-slate-400 hover:text-white rounded-lg"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Left Navigation Sidebar */}
      <aside className={`w-full md:w-64 border-r border-slate-900 bg-slate-900/30 flex flex-col justify-between fixed md:sticky top-0 h-[calc(100vh-57px)] md:h-screen z-20 transition-all duration-300 ${
        isMobileMenuOpen ? 'left-0 translate-x-0 pointer-events-auto' : '-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto'
      }`}>
        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          {/* Logo */}
          <AppLogo
            className="hidden md:inline-flex"
            showIcon={false}
            textClassName="font-extrabold text-xl tracking-tight text-white"
          />

          {/* Nav Items */}
          <nav className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3 px-2">Analysis views</span>
            <button
              onClick={() => { setActiveTab('summary'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'summary' 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <BookOpen size={16} />
              <span>Executive Summary</span>
            </button>

            <button
              onClick={() => { setActiveTab('contradictions'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'contradictions' 
                  ? 'bg-rose-600/10 text-rose-400 border border-rose-500/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShieldAlert size={16} />
                <span>Contradictions</span>
              </div>
              <span className="text-xs bg-rose-950/40 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full font-bold">
                {contradictionBadgeCount}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('ambiguities'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'ambiguities' 
                  ? 'bg-amber-600/10 text-amber-400 border border-amber-500/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <HelpCircle size={16} />
                <span>Ambiguities</span>
              </div>
              <span className="text-xs bg-amber-950/40 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
                0
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('missing'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'missing' 
                  ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Layers size={16} />
                <span>Missing Requirements</span>
              </div>
              <span className="text-xs bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                0
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('dependencies'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'dependencies' 
                  ? 'bg-sky-600/10 text-sky-400 border border-sky-500/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <GitFork size={16} />
                <span>Dependencies</span>
              </div>
              <span className="text-xs bg-sky-950/40 border border-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded-full font-bold">
                0
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('graph'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'graph' 
                  ? 'bg-violet-600/10 text-violet-400 border border-violet-500/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <Activity size={16} />
              <span>Graph View</span>
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-900 space-y-3 bg-slate-950/40">
          <button 
            onClick={handleDownloadReport}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-lg transition"
          >
            <Download size={14} />
            <span>Download PDF Report</span>
          </button>
          
          <button 
            onClick={onBackToUpload}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-slate-500 hover:text-slate-300 text-xs font-medium transition"
          >
            <ArrowLeft size={12} />
            <span>Re-upload Specs</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto px-6 py-8 md:p-8 space-y-8 pb-24">
        {/* Header Title Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-6">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">PROJECT REVIEW REPORT</span>
            <h1 className="text-xl md:text-2xl font-black mt-1 break-words">
              {documentsList.length > 0 
                ? `Audit Report: ${documentsList.map(d => d.name).join(', ')}` 
                : 'SpecLens Audit Workspace'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/40 border border-emerald-500/20 text-emerald-400">
              Audit Complete
            </span>
            <button 
              onClick={onBackToUpload}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
            >
              Analyze New Specs
            </button>
          </div>
        </div>

        {/* Metrics Overview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Health Score Card */}
          <div className="p-5 rounded-2xl border border-slate-900 bg-slate-900/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Health Score</span>
              {isRateLimited ? (
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-lg md:text-xl font-extrabold text-indigo-300">Pending AI Analysis</span>
                </div>
              ) : (
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-4xl font-extrabold text-white">{displayHealthScore}</span>
                  <span className="text-slate-500 text-sm">/100</span>
                </div>
              )}
              <p className={`text-[10px] mt-2 font-medium ${isRateLimited ? 'text-indigo-400' : displayHealthScore >= 80 ? 'text-emerald-400' : (displayHealthScore >= 60 ? 'text-amber-400' : 'text-rose-400')}`}>
                {isRateLimited ? 'Analysis Pending' : (displayHealthScore >= 80 ? 'Healthy' : (displayHealthScore >= 60 ? 'Needs Attention' : 'Critical Risk'))}
              </p>
            </div>
            
            {/* Circular dial tracker indicator */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="32" cy="32" r="26" 
                  fill="transparent" 
                  stroke="rgba(255, 255, 255, 0.05)" 
                  strokeWidth="4" 
                />
                <circle 
                  cx="32" cy="32" r="26" 
                  fill="transparent" 
                  stroke={isRateLimited ? '#6366f1' : (displayHealthScore >= 80 ? '#10b981' : (displayHealthScore >= 60 ? '#f59e0b' : '#ef4444'))}
                  strokeWidth="4" 
                  strokeDasharray="163.3"
                  strokeDashoffset={isRateLimited ? 0 : 163.3 - (163.3 * displayHealthScore) / 100}
                />
              </svg>
              <span className="absolute text-xs font-bold text-indigo-300">{isRateLimited ? 'N/A' : `${displayHealthScore}%`}</span>
            </div>
          </div>

          {/* Critical Issues Card */}
          <div className="p-5 rounded-2xl border border-slate-900 bg-slate-900/10">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-rose-400" />
              Critical Issues
            </span>
            <div className="text-4xl font-extrabold text-rose-400 mt-2">{displayCriticalCount}</div>
            <p className="text-[10px] text-slate-500 mt-2">{liveCollisionCount !== null ? 'AI-detected contradictions' : 'Requires immediate alignment'}</p>
          </div>

          {/* Medium Issues Card */}
          <div className="p-5 rounded-2xl border border-slate-900 bg-slate-900/10">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-400" />
              High + Medium Issues
            </span>
            <div className="text-4xl font-extrabold text-amber-400 mt-2">{displayMediumCount}</div>
            <p className="text-[10px] text-slate-500 mt-2">Refinement recommended</p>
          </div>

          {/* Requirements Checked Card */}
          <div className="p-5 rounded-2xl border border-slate-900 bg-slate-900/10">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-400" />
              Checked Specs
            </span>
            <div className="text-4xl font-extrabold text-slate-100 mt-2">{displayReqCount}</div>
            <p className="text-[10px] text-slate-500 mt-2">Parsed sentences &amp; clauses</p>
          </div>
        </div>

        {/* Analysis metadata */}
        {activeTab === 'summary' && extractedRequirements && detectedCollisions && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {analysisMetadata.map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl border border-slate-900 bg-slate-900/10 text-center">
                <p className="text-sm font-bold text-slate-200 truncate" title={String(value)}>{value}</p>
                <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab panel and Left side content listing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            
            {/* Executive summary block (displayed at top of Summary View) */}
            {activeTab === 'summary' && (
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Executive Review Summary</h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {executiveSummary}
                </p>
                
                 {/* Uploaded Documents List */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Reviewed Assets ({documentsList.length})</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {documentsList.map(doc => (
                      <div key={doc.id} className="p-3 rounded-xl border border-slate-900 bg-slate-950/80 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900/40 text-slate-400">{doc.type}</span>
                          <span className="font-semibold text-slate-300 truncate max-w-[180px] sm:max-w-[220px]" title={doc.name}>{doc.name}</span>
                        </div>
                        <span className="text-slate-500">{doc.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AI Extracted Requirements Panel — shown in summary tab */}
            {activeTab === 'summary' && (
              <RequirementsPanel
                requirements={extractedRequirements?.requirements || []}
                stats={extractedRequirements?.stats || null}
                isLoading={false}
                error={extractedRequirements?.error || null}
              />
            )}

            {/* AI Collision Detection Panel — Contradictions tab */}
            {activeTab === 'contradictions' && (
              <div className="space-y-6">
                {isRateLimited && (
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/20 text-amber-400 text-sm font-semibold flex items-start gap-3">
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Collision Detection Pending</p>
                      <p className="text-xs text-slate-400 mt-1">
                        AI collision detection could not be completed because the LLM daily quota has been exhausted.
                        {detectedCollisions?.retry_after_seconds ? ` Please retry after ${detectedCollisions.retry_after_seconds} seconds.` : ''}
                      </p>
                    </div>
                  </div>
                )}
                <CollisionsPanel
                  collisions={liveCollisions}
                  stats={detectedCollisions?.stats || null}
                  isLoading={false}
                  error={isRateLimited ? null : (detectedCollisions?.error || (detectedCollisions?.success === false ? detectedCollisions?.message : null))}
                />
              </div>
            )}

            {/* Findings list header — hidden in contradictions tab when we have real data */}
            {!(activeTab === 'contradictions' && detectedCollisions !== null) && (
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-base tracking-tight">{activeCategoryTitle()}</h3>
                <span className="text-xs text-slate-500 font-semibold">{filteredFindings.length} items found</span>
              </div>
            )}

            {/* Graph view selector */}
            {activeTab === 'graph' ? (
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-4 text-center">
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Interactive visual map correlating design assets and detected friction. Hover over nodes to review connections; click issue nodes (red/amber) to inspect discrepancies in detail.
                </p>

                {/* SVG Graph rendering */}
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[620px] max-w-3xl mx-auto border border-slate-900 rounded-xl bg-slate-950 p-4 relative shadow-inner">
                    <svg viewBox="0 0 800 550" className="w-full h-auto select-none">
                      <defs>
                        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </radialGradient>
                      </defs>

                      {/* Render Links */}
                      {graphData.links.map((link, idx) => {
                        const sourceNode = graphData.nodes.find(n => n.id === link.source);
                        const targetNode = graphData.nodes.find(n => n.id === link.target);
                        if (!sourceNode || !targetNode) return null;

                        const isHovered = hoveredNodeId === link.source || hoveredNodeId === link.target;
                        const isMainConflict = link.color === '#ef4444';

                        return (
                          <g key={idx} className="transition-opacity duration-300">
                            {/* Glow edge highlight */}
                            <line 
                              x1={sourceNode.x} y1={sourceNode.y} 
                              x2={targetNode.x} y2={targetNode.y} 
                              stroke={isMainConflict ? '#f43f5e' : '#f59e0b'}
                              strokeWidth={isHovered ? 4 : 1.5}
                              strokeOpacity={isHovered ? 0.8 : 0.25}
                              className={isMainConflict && isHovered ? "animate-dash" : ""}
                            />
                            {/* Center link label when hovered */}
                            {isHovered && (
                              <g transform={`translate(${(sourceNode.x + targetNode.x) / 2}, ${(sourceNode.y + targetNode.y) / 2 - 8})`}>
                                <rect 
                                  x="-70" y="-12" width="140" height="20" rx="4"
                                  fill="#0b0f19" stroke="#1f2937" strokeWidth="1"
                                />
                                <text 
                                  textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="semibold"
                                  dy="1"
                                >
                                  {link.text}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Render Nodes */}
                      {graphData.nodes.map(node => {
                        const isDocument = node.type === 'document';
                        const isHovered = hoveredNodeId === node.id;
                        const correspondingFinding = !isDocument 
                          ? dynamicFindings.find(f => f.id === node.id)
                          : null;

                        return (
                          <g 
                            key={node.id} 
                            transform={`translate(${node.x}, ${node.y})`}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredNodeId(node.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            onClick={() => {
                              if (correspondingFinding) {
                                setSelectedFinding(correspondingFinding);
                              }
                            }}
                          >
                            {/* Radial Glow for documents on hover */}
                            {isDocument && isHovered && (
                              <circle r={node.radius + 20} fill="url(#nodeGlow)" />
                            )}

                            {/* Outer Circle */}
                            <circle 
                              r={node.radius} 
                              fill={isDocument ? "#0b0f19" : node.color} 
                              stroke={node.color} 
                              strokeWidth={isHovered ? 3 : 1.5}
                              strokeOpacity={isDocument ? 0.8 : 1}
                              className="transition-all duration-200"
                            />
                            
                            {/* Inside Node labels */}
                            {isDocument ? (
                              <g>
                                <text 
                                  textAnchor="middle" 
                                  fill="#e2e8f0" 
                                  fontSize="9" 
                                  fontWeight="bold"
                                  dy="-4"
                                >
                                  {node.label.length > 18 ? node.label.substring(0, 16) + "..." : node.label}
                                </text>
                                <text 
                                  textAnchor="middle" 
                                  fill="#6366f1" 
                                  fontSize="8"
                                  fontWeight="semibold"
                                  dy="8"
                                >
                                  DOCUMENT
                                </text>
                              </g>
                            ) : (
                              <g>
                                <text 
                                  textAnchor="middle" 
                                  fill="#ffffff" 
                                  fontSize="8" 
                                  fontWeight="extrabold"
                                  dy="3"
                                >
                                  {node.id}
                                </text>
                              </g>
                            )}

                            {/* Floating labels for issue nodes */}
                            {!isDocument && isHovered && (
                              <g transform="translate(0, -28)">
                                <rect 
                                  x="-60" y="-12" width="120" height="20" rx="4"
                                  fill="#0f172a" stroke={node.color} strokeWidth="1"
                                />
                                <text 
                                  textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="bold"
                                  dy="1"
                                >
                                  {node.label}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                <div className="flex justify-center space-x-6 text-xs font-semibold text-slate-500 pt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-indigo-500 bg-indigo-950/40" />
                    PRD / Spec Files
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Critical Contradiction
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Medium Conflict
                  </span>
                </div>
              </div>
            ) : activeTab === 'contradictions' && detectedCollisions !== null ? (
              /* CollisionsPanel already rendered above — nothing to show in the right split */
              null
            ) : (
              /* Standard findings list representation */
              <div className="space-y-4">
                {filteredFindings.length === 0 ? (
                  <div className="p-8 text-center border border-slate-900 rounded-2xl bg-slate-900/10">
                    <p className="text-slate-500 text-sm">No issues detected in this category.</p>
                  </div>
                ) : (
                  filteredFindings.map(finding => {
                    const isSelected = selectedFinding?.id === finding.id;
                    const isResolved = resolvedIssues[finding.id];

                    return (
                      <div
                        key={finding.id}
                        onClick={() => setSelectedFinding(finding)}
                        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left relative overflow-hidden ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-950/10' 
                            : 'border-slate-900 hover:border-slate-800 bg-slate-900/5 hover:bg-slate-900/10'
                        } ${isResolved ? 'opacity-50' : ''}`}
                      >
                        {/* Selected Indicator Glow */}
                        {isSelected && (
                          <div className="absolute top-0 left-0 h-full w-1 bg-indigo-500" />
                        )}

                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-500 font-mono">{finding.id}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityColor(finding.severity)}`}>
                                {finding.severity}
                              </span>
                              {isResolved && (
                                <span className="text-[10px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check size={10} />
                                  Resolved
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-slate-200 text-sm md:text-base flex items-center gap-2">
                              {getCategoryIcon(finding.category)}
                              {finding.title}
                            </h4>

                            <p className="text-xs md:text-sm text-slate-400 line-clamp-2">
                              {finding.summary}
                            </p>

                            {/* Impact Documents */}
                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                              {finding.documents.map((doc, dIdx) => (
                                <span key={dIdx} className="text-[10px] font-medium text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                                  {doc}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="self-center text-slate-600 group-hover:text-slate-400">
                            <ChevronRight size={18} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Right Detail Inspection Sidebar */}
          <div className="lg:col-span-5">
            {selectedFinding ? (
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/10 sticky top-8 space-y-6 text-left">
                {/* ID & Category */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500 font-mono">{selectedFinding?.id}</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getSeverityColor(selectedFinding?.severity)}`}>
                      {selectedFinding?.severity}
                    </span>
                  </div>
                  
                  {/* Mark as resolved toggle */}
                  <button
                    onClick={() => toggleResolve(selectedFinding?.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      resolvedIssues[selectedFinding?.id]
                        ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Check size={12} />
                    <span>{resolvedIssues[selectedFinding?.id] ? 'Mark Unresolved' : 'Mark Resolved'}</span>
                  </button>
                </div>

                {/* Title & classification */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    {getCategoryIcon(selectedFinding?.category)}
                    {selectedFinding?.category}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-100 leading-snug">{selectedFinding?.title}</h3>
                  {selectedFinding?.type && (
                    <span className="inline-flex text-[10px] font-semibold text-slate-400 bg-slate-900/50 border border-slate-800 px-2 py-0.5 rounded">
                      {selectedFinding.type}
                    </span>
                  )}
                  {(selectedFinding?.requirement_a || selectedFinding?.requirement_b) && (
                    <p className="text-[11px] font-mono text-slate-500">
                      {selectedFinding.requirement_a} ⟷ {selectedFinding.requirement_b}
                    </p>
                  )}
                </div>

                {/* Confidence */}
                {selectedFinding?.confidence != null && (
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confidence</h5>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-extrabold text-slate-200">
                        {getConfidencePresentation(selectedFinding.confidence).pct}%
                      </span>
                      <span className="text-xs font-semibold text-indigo-300 bg-indigo-950/30 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        {getConfidencePresentation(selectedFinding.confidence).label} Confidence
                      </span>
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis &amp; Impact</h5>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                    {selectedFinding?.description}
                  </p>
                </div>

                {/* Affected Documents Excerpts */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Excerpts</h5>
                    <span className="text-[10px] text-slate-500 font-mono">{selectedFinding?.location}</span>
                  </div>

                  <div className="space-y-2 font-mono text-xs text-left">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-900/60 relative group">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1 truncate">{selectedFinding?.documents?.[0] || "Reference standard"}</span>
                      <p className="text-slate-300 leading-relaxed italic">
                        {selectedFinding?.excerptA}
                      </p>
                      <button 
                        onClick={() => handleCopy(selectedFinding?.excerptA, 'a')}
                        className="absolute right-2 top-2 p-1.5 text-slate-600 hover:text-indigo-400 bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        {copiedId === 'a' ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>

                    {selectedFinding?.excerptB && selectedFinding?.excerptB !== 'N/A' && (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-900/60 relative group">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1 truncate">{selectedFinding?.documents?.[1] || "Reference standard"}</span>
                        <p className="text-slate-300 leading-relaxed italic">
                          {selectedFinding?.excerptB}
                        </p>
                        <button 
                          onClick={() => handleCopy(selectedFinding?.excerptB, 'b')}
                          className="absolute right-2 top-2 p-1.5 text-slate-600 hover:text-indigo-400 bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          {copiedId === 'b' ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommended remedy */}
                <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-950/10 space-y-2">
                  <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Suggested Fix</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedFinding?.remedy}
                  </p>
                </div>

                {/* Source documents */}
                {selectedFinding?.documents?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFinding.documents.map((doc, dIdx) => (
                      <span key={dIdx} className="text-[10px] font-medium text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-900 truncate max-w-full" title={doc}>
                        {doc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center border border-slate-900 rounded-2xl bg-slate-900/10 text-slate-500 text-sm">
                Select an issue from the list or node to inspect code traces and resolution options.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

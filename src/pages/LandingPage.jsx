import React from 'react';
import { ArrowRight, ShieldAlert, Zap, Cpu, GitFork, LayoutGrid, CheckCircle, FileText, Sparkles } from 'lucide-react';

export default function LandingPage({ onStartReview, onViewDashboard }) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 max-w-7xl mx-auto px-6 text-center">
        {/* Glow badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-950/40 text-indigo-300 text-xs font-medium mb-6 animate-pulse-slow">
          <Sparkles size={12} className="text-indigo-400" />
          <span>AI Design Review Engineer</span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
          Review your project <br />
          <span className="text-gradient-indigo">before your developers do.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base md:text-xl text-slate-400 leading-relaxed mb-10">
          Upload your PRD, API specifications, meeting notes, architecture documents, user stories, and technical documentation. SpecLens AI automatically discovers contradictions, missing requirements, dependency gaps, ambiguities, and design inconsistencies before development begins.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-10">
          <button
            onClick={onStartReview}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/40 hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02] group cursor-pointer"
          >
            <span>Start Review</span>
            <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={onViewDashboard}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02] font-semibold rounded-xl cursor-pointer"
          >
            <span>Explore AI Demo</span>
          </button>
        </div>

        {/* Supported Formats Row */}
        <div className="flex flex-col items-center gap-3 mb-12 text-slate-500 text-xs">
          <span className="font-semibold uppercase tracking-widest text-[9px] text-slate-650">Supported Formats</span>
          <div className="flex flex-wrap justify-center items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-900/45 border border-slate-850 text-slate-400 font-medium">PDF</span>
            <span className="px-3 py-1 rounded-full bg-slate-900/45 border border-slate-850 text-slate-400 font-medium">DOCX</span>
            <span className="px-3 py-1 rounded-full bg-slate-900/45 border border-slate-850 text-slate-400 font-medium">Markdown</span>
            <span className="px-3 py-1 rounded-full bg-slate-900/45 border border-slate-850 text-slate-400 font-medium">TXT</span>
            <span className="px-3 py-1 rounded-full bg-slate-900/45 border border-slate-850 text-slate-400 font-medium">OpenAPI</span>
            <span className="px-3 py-1 rounded-full bg-slate-900/45 border border-slate-850 text-slate-400 font-medium">Jira Export</span>
          </div>
        </div>

        {/* Simple AI Workflow Animation */}
        <div className="max-w-4xl mx-auto mb-16 p-5 rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-sm">
          <span className="font-semibold uppercase tracking-widest text-[9px] text-slate-650 block mb-5 text-center">SpecLens AI Analysis Pipeline</span>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-2">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-950/40 border border-slate-900 w-full md:w-1/5 animate-pulse" style={{ animationDuration: '3s', animationDelay: '0s' }}>
              <span className="text-[10px] font-bold text-slate-500 font-mono mb-1">01. UPLOAD</span>
              <span className="text-xs font-semibold text-slate-300">Upload Documents</span>
              <span className="text-[9px] text-slate-500 mt-1">PRD, API Specs, MD</span>
            </div>

            {/* Connector */}
            <div className="text-slate-750/60 font-bold rotate-90 md:rotate-0">
              <ArrowRight size={14} />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-950/40 border border-slate-900 w-full md:w-1/5 animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.6s' }}>
              <span className="text-[10px] font-bold text-indigo-400 font-mono mb-1">02. PARSE</span>
              <span className="text-xs font-semibold text-indigo-300">AI Analysis</span>
              <span className="text-[9px] text-slate-500 mt-1">Natural Language Parse</span>
            </div>

            {/* Connector */}
            <div className="text-slate-750/60 font-bold rotate-90 md:rotate-0">
              <ArrowRight size={14} />
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-950/40 border border-slate-900 w-full md:w-1/5 animate-pulse" style={{ animationDuration: '3s', animationDelay: '1.2s' }}>
              <span className="text-[10px] font-bold text-rose-400 font-mono mb-1">03. DETECT</span>
              <span className="text-xs font-semibold text-rose-300">Detect Contradictions</span>
              <span className="text-[9px] text-slate-500 mt-1">Specs Conflicts Check</span>
            </div>

            {/* Connector */}
            <div className="text-slate-750/60 font-bold rotate-90 md:rotate-0">
              <ArrowRight size={14} />
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-950/40 border border-slate-900 w-full md:w-1/5 animate-pulse" style={{ animationDuration: '3s', animationDelay: '1.8s' }}>
              <span className="text-[10px] font-bold text-emerald-400 font-mono mb-1">04. REPORT</span>
              <span className="text-xs font-semibold text-emerald-300">Generate Report</span>
              <span className="text-[9px] text-slate-500 mt-1">Health Score card</span>
            </div>

            {/* Connector */}
            <div className="text-slate-750/60 font-bold rotate-90 md:rotate-0">
              <ArrowRight size={14} />
            </div>

            {/* Step 5 */}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-950/40 border border-slate-900 w-full md:w-1/5 animate-pulse" style={{ animationDuration: '3s', animationDelay: '2.4s' }}>
              <span className="text-[10px] font-bold text-violet-400 font-mono mb-1">05. TRACE</span>
              <span className="text-xs font-semibold text-violet-300">Interactive Graph</span>
              <span className="text-[9px] text-slate-500 mt-1">Visual conflict nodes</span>
            </div>

          </div>
        </div>

        {/* Simulated Product Screenshot / Interactive Hero Mockup */}
        <div className="relative mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-950/60 p-2 md:p-3 shadow-2xl backdrop-blur-md">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent rounded-2xl pointer-events-none" />
          
          {/* Mock Window Chrome */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 rounded-t-xl border-b border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
            </div>
            <div className="text-xs text-slate-500 font-mono">speclens-ai-engine://platform-review</div>
            <div className="w-12" /> {/* spacer */}
          </div>

          {/* Mock Window Content */}
          <div className="p-4 md:p-6 bg-slate-950/90 rounded-b-xl grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="md:col-span-2 space-y-4">
              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/20">
                <div className="flex items-start space-x-3">
                  <ShieldAlert className="text-rose-400 mt-1 flex-shrink-0" size={18} />
                  <div>
                    <h4 className="text-sm font-semibold text-rose-300">Conflict Detected: Authenticate Method Exemption</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>PRD Section 3.2</strong> mandates single-click anonymous login, while <strong>Compliance_V2.pdf Page 14</strong> enforces multi-factor login (MFA).
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10">
                <div className="flex items-start space-x-3">
                  <Cpu className="text-indigo-400 mt-1 flex-shrink-0" size={18} />
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-300">Dependency Alignment Conflict</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Payment APIs (Phase 2)</strong> are required by <strong>Onboarding Profile Setup (Phase 1)</strong>. Core payment gateway mockups are recommended.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Left Scorecard */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Review Health Score</span>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-5xl font-black text-indigo-400">74</span>
                  <span className="text-slate-500">/ 100</span>
                </div>
                <div className="mt-4 text-xs text-slate-400 leading-relaxed">
                  Project health is compromised by <strong className="text-rose-400">3 Critical conflicts</strong>. Resolve these prior to sprint planning to avoid code churn.
                </div>
              </div>
              <button onClick={onViewDashboard} className="mt-6 w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-lg transition">
                Open Full Report
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 max-w-7xl mx-auto px-6 border-t border-slate-900 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Powerful Spec Analysis Engine</h2>
          <p className="text-slate-400">
            SpecLens AI parses project files in seconds, running multi-doc cross-references to identify engineering friction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950 hover:border-slate-800 hover:bg-slate-900/20 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-rose-950/50 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
              <ShieldAlert size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Contradiction Scans</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Catches logical friction and conflicting specs across multiple documents, such as contrasting auth rules or payment vendors.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950 hover:border-slate-800 hover:bg-slate-900/20 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-amber-950/50 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
              <Zap size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Ambiguity Resolution</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Detects vague goals (e.g. "must respond fast") and highlights them to demand concrete metric limits or SLAs.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950 hover:border-slate-800 hover:bg-slate-900/20 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <LayoutGrid size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Requirement Coverage</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Reviews specs for standard architecture omissions, security gaps, error-state guidelines, and GDPR regulations.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-950 hover:border-slate-800 hover:bg-slate-900/20 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/50 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
              <GitFork size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Dependency Mapping</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automatically builds logical graphs of your project modules and highlights order-of-delivery scheduling clashes.
            </p>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-20 md:py-28 bg-slate-950/30 border-t border-slate-900 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 font-sans">Three steps to alignment</h2>
            <p className="text-slate-400">
              Run reviews before development. Align product owners, architects, and engineers from day one.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
            {/* Step 1 */}
            <div className="p-8 rounded-2xl border border-slate-900/60 bg-slate-900/20 relative">
              <div className="absolute top-6 right-6 text-7xl font-black text-slate-900 select-none">1</div>
              <div className="flex items-center space-x-3 mb-6">
                <span className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                  <FileText size={18} />
                </span>
                <span className="font-bold text-slate-200">Upload Specs</span>
              </div>
              <h4 className="text-lg font-semibold text-slate-100 mb-2">Submit drafts & templates</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Drag and drop your project documents (PDF, DOCX, TXT, MD, YAML). Submit everything together.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-2xl border border-slate-900/60 bg-slate-900/20 relative">
              <div className="absolute top-6 right-6 text-7xl font-black text-slate-900 select-none">2</div>
              <div className="flex items-center space-x-3 mb-6">
                <span className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                  <Cpu size={18} />
                </span>
                <span className="font-bold text-slate-200">Deep AI Parse</span>
              </div>
              <h4 className="text-lg font-semibold text-slate-100 mb-2">Automatic Cross-Audit</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                The engine correlates sentences, data models, APIs, and business statements to reveal contradictions and discrepancies.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-2xl border border-slate-900/60 bg-slate-900/20 relative">
              <div className="absolute top-6 right-6 text-7xl font-black text-slate-900 select-none">3</div>
              <div className="flex items-center space-x-3 mb-6">
                <span className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                  <CheckCircle size={18} />
                </span>
                <span className="font-bold text-slate-200">Resolve & Build</span>
              </div>
              <h4 className="text-lg font-semibold text-slate-100 mb-2">Fix issues early</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Review findings grouped by impact. Toggle details, review recommendations, print reports, and correct specs before starting sprints.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="relative p-8 md:p-14 rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-950 via-indigo-950/20 to-slate-950 text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px]" />
          <h2 className="text-3xl md:text-5xl font-black mb-4">Build right the first time.</h2>
          <p className="max-w-xl mx-auto text-slate-400 text-sm md:text-base leading-relaxed mb-8">
            Ensure architectural agreement, avoid re-work cycles, and save hundreds of engineering engineering hours.
          </p>
          <button
            onClick={onStartReview}
            className="flex items-center justify-center space-x-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg mx-auto hover:shadow-indigo-600/30 transition duration-200 group"
          >
            <span>Start Review Now</span>
            <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-white">SpecLens <span className="text-indigo-400">AI</span></span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The AI-Powered Design Review Engineer checking requirements, architectures, and contracts for engineering clarity.
            </p>
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} SpecLens AI. All rights reserved.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-slate-300 text-sm mb-4">Product</h5>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="#" className="hover:text-indigo-400 transition">Features</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">Security Rules</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">SLA Benchmarks</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">Integrations</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-slate-300 text-sm mb-4">Company</h5>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="#" className="hover:text-indigo-400 transition">About Us</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">Blog</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">Careers</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">Contact</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-slate-300 text-sm mb-4">Compliance</h5>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="#" className="hover:text-indigo-400 transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">GDPR Audit</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">SOC 2 Portal</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

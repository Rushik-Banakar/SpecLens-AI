import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ShieldAlert,
  Zap,
  Cpu,
  GitFork,
  LayoutGrid,
  CheckCircle,
  FileText,
  Sparkles,
  Upload,
  Brain,
  GitCompare,
  LayoutDashboard,
  Wrench,
  ShieldCheck,
  Rocket,
  Users,
  FileType,
  Server,
  Layers,
  FileDown,
  Boxes,
} from 'lucide-react';

const STATS = [
  { value: 4, label: 'Document Formats', detail: 'PDF, DOCX, TXT, Markdown' },
  { value: 3, label: 'AI Providers', detail: 'Gemini, Groq, OpenRouter' },
  { value: 11, label: 'Requirement Categories', detail: 'Functional through Compliance' },
  { value: 5, label: 'Conflict Types', detail: 'Contradiction through Recommendation' },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Upload Documents',
    description: 'PRD, API specs, architecture notes, and meeting docs',
    icon: Upload,
    accent: 'text-sky-400',
    border: 'border-sky-500/25',
    bg: 'bg-sky-950/30',
  },
  {
    step: '02',
    title: 'AI Requirement Extraction',
    description: 'Structured requirements with categories and confidence',
    icon: Brain,
    accent: 'text-indigo-400',
    border: 'border-indigo-500/25',
    bg: 'bg-indigo-950/30',
  },
  {
    step: '03',
    title: 'Cross-document Analysis',
    description: 'Contradictions, ambiguities, and conflicts across files',
    icon: GitCompare,
    accent: 'text-rose-400',
    border: 'border-rose-500/25',
    bg: 'bg-rose-950/30',
  },
  {
    step: '04',
    title: 'Executive Dashboard',
    description: 'Health score, findings, and exportable reports',
    icon: LayoutDashboard,
    accent: 'text-emerald-400',
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-950/30',
  },
];

const VALUE_CARDS = [
  {
    icon: Wrench,
    title: 'Reduce Engineering Rework',
    description: 'Surface spec conflicts before code is written, not after sprint reviews.',
    accent: 'text-amber-400',
    iconBg: 'bg-amber-950/50 border-amber-500/20',
  },
  {
    icon: ShieldCheck,
    title: 'Prevent Requirement Defects',
    description: 'Catch contradictions, ambiguities, and gaps across your document set.',
    accent: 'text-rose-400',
    iconBg: 'bg-rose-950/50 border-rose-500/20',
  },
  {
    icon: Rocket,
    title: 'Accelerate Project Delivery',
    description: 'Align product, architecture, and engineering teams from day one.',
    accent: 'text-emerald-400',
    iconBg: 'bg-emerald-950/50 border-emerald-500/20',
  },
  {
    icon: Users,
    title: 'Improve Cross-team Alignment',
    description: 'Give every stakeholder a shared, evidence-backed view of spec health.',
    accent: 'text-indigo-400',
    iconBg: 'bg-indigo-950/50 border-indigo-500/20',
  },
];

const TRUST_ITEMS = [
  { icon: FileType, label: 'Supports PDF, DOCX, TXT, Markdown' },
  { icon: Layers, label: 'Multi-LLM Failover' },
  { icon: Server, label: 'FastAPI Backend' },
  { icon: Boxes, label: 'React Frontend' },
  { icon: FileDown, label: 'Exportable Reports' },
  { icon: ShieldCheck, label: 'Production-ready Architecture' },
];

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

function FadeInSection({ children, className = '', delay = 0 }) {
  const { ref, isVisible } = useInView();

  return (
    <div
      ref={ref}
      className={`landing-fade-in ${isVisible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function AnimatedCounter({ value, isActive }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isActive) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(value);
      return undefined;
    }

    const duration = 900;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };

    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, isActive]);

  return <span>{display}</span>;
}

function LandingBackground() {
  const particles = [
    { top: '12%', left: '8%', delay: '0s' },
    { top: '22%', left: '78%', delay: '1.2s' },
    { top: '48%', left: '15%', delay: '2.4s' },
    { top: '62%', left: '88%', delay: '0.8s' },
    { top: '78%', left: '42%', delay: '1.8s' },
    { top: '35%', left: '55%', delay: '3s' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 landing-grid opacity-60" />
      <div
        className="landing-glow-orb w-[520px] h-[520px] bg-indigo-600/20 top-0 left-1/4 -translate-x-1/2"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="landing-glow-orb w-[420px] h-[420px] bg-purple-600/15 top-1/3 right-0"
        style={{ animationDelay: '3s' }}
      />
      <div
        className="landing-glow-orb w-[560px] h-[560px] bg-emerald-600/10 bottom-0 left-1/3"
        style={{ animationDelay: '6s' }}
      />
      {particles.map((particle) => (
        <span
          key={`${particle.top}-${particle.left}`}
          className="landing-particle"
          style={{ top: particle.top, left: particle.left, animationDelay: particle.delay }}
        />
      ))}
    </div>
  );
}

function FeatureCard({ icon: Icon, iconStyles, title, description }) {
  return (
    <article className="landing-card p-6 rounded-2xl h-full">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-5 ${iconStyles}`}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </article>
  );
}

export default function LandingPage({ onStartReview, onViewDashboard }) {
  const statsSection = useInView(0.2);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      <LandingBackground />

      <section
        className="relative pt-28 pb-16 md:pt-36 md:pb-24 max-w-7xl mx-auto px-4 sm:px-6 text-center"
        aria-labelledby="hero-heading"
      >
        <FadeInSection>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/50 text-indigo-300 text-xs font-semibold mb-8 tracking-wide">
            <Sparkles size={13} className="text-indigo-400" aria-hidden="true" />
            <span>AI Design Review Engineer</span>
          </div>

          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]"
          >
            Review your project <br className="hidden sm:block" />
            <span className="text-gradient-indigo">before your developers do.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-400 leading-relaxed mb-10 px-2">
            SpecLens AI reads your PRDs, API specs, and architecture docs — then finds contradictions,
            ambiguities, and gaps across documents before a single line of code is written.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4 mb-12 px-2">
            <button
              type="button"
              onClick={onStartReview}
              className="btn-landing-primary w-full sm:w-auto group cursor-pointer"
              aria-label="Start a new specification review"
            >
              <span>Start Review</span>
              <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform duration-200" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onViewDashboard}
              className="btn-landing-secondary w-full sm:w-auto cursor-pointer"
              aria-label="Explore the AI demo dashboard"
            >
              <span>Explore AI Demo</span>
            </button>
          </div>

          <div className="flex flex-col items-center gap-3 mb-14 text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-widest text-[10px] text-slate-500">Supported Formats</span>
            <div className="flex flex-wrap justify-center items-center gap-2 max-w-xl">
              {['PDF', 'DOCX', 'Markdown', 'TXT', 'OpenAPI', 'Jira Export'].map((format) => (
                <span
                  key={format}
                  className="px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800 text-slate-400 font-medium"
                >
                  {format}
                </span>
              ))}
            </div>
          </div>
        </FadeInSection>

        <FadeInSection className="max-w-5xl mx-auto mb-16" delay={80}>
          <div aria-labelledby="workflow-heading">
            <span
              id="workflow-heading"
              className="font-semibold uppercase tracking-widest text-[10px] text-slate-500 block mb-6 text-center"
            >
              SpecLens AI Analysis Pipeline
            </span>
            <ol className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-3 md:gap-2 items-stretch">
              {WORKFLOW_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <React.Fragment key={step.step}>
                    <li className={`landing-card flex flex-col items-center text-center p-4 rounded-xl ${step.bg} ${step.border} list-none`}>
                      <span className={`text-[10px] font-bold font-mono mb-2 ${step.accent}`}>{step.step}</span>
                      <StepIcon size={20} className={`${step.accent} mb-2`} aria-hidden="true" />
                      <span className="text-sm font-semibold text-slate-200">{step.title}</span>
                      <span className="text-[11px] text-slate-500 mt-1 leading-snug">{step.description}</span>
                    </li>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <li className="hidden md:flex items-center justify-center text-slate-600 list-none" aria-hidden="true">
                        <ArrowRight size={16} />
                      </li>
                    )}
                  </React.Fragment>
                );
              })}
            </ol>
          </div>
        </FadeInSection>

        <FadeInSection delay={120}>
          <div className="text-center mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-slate-200 mb-2 tracking-tight">
              Sample Analysis Preview
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              An example of the executive dashboard generated after analyzing specification documents.
            </p>
          </div>
          <div
            className="relative mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-950/70 p-2 md:p-3 shadow-2xl backdrop-blur-md"
            role="img"
            aria-label="Preview of SpecLens AI dashboard showing conflict detection and health score"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent rounded-2xl pointer-events-none" />

            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 rounded-t-xl border-b border-slate-800/80">
              <div className="flex items-center gap-2" aria-hidden="true">
                <span className="w-3 h-3 rounded-full bg-rose-500/70" />
                <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              </div>
              <div className="text-xs text-slate-500 font-mono truncate">speclens-ai-engine://platform-review</div>
              <div className="w-12 shrink-0" aria-hidden="true" />
            </div>

            <div className="p-4 md:p-6 bg-slate-950/90 rounded-b-xl grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="md:col-span-2 space-y-4">
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/20">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="text-rose-400 mt-1 shrink-0" size={18} aria-hidden="true" />
                    <div>
                      <h4 className="text-sm font-semibold text-rose-300">Conflict Detected: Authenticate Method Exemption</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        <strong>PRD Section 3.2</strong> mandates single-click anonymous login, while{' '}
                        <strong>Compliance_V2.pdf Page 14</strong> enforces multi-factor login (MFA).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10">
                  <div className="flex items-start gap-3">
                    <Cpu className="text-indigo-400 mt-1 shrink-0" size={18} aria-hidden="true" />
                    <div>
                      <h4 className="text-sm font-semibold text-indigo-300">Dependency Alignment Conflict</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        <strong>Payment APIs (Phase 2)</strong> are required by{' '}
                        <strong>Onboarding Profile Setup (Phase 1)</strong>. Core payment gateway mockups are recommended.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Review Health Score</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-black text-indigo-400">74</span>
                    <span className="text-slate-500">/ 100</span>
                  </div>
                  <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                    Project health is compromised by <strong className="text-rose-400">3 Critical conflicts</strong>.
                    Resolve these prior to sprint planning to avoid code churn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onViewDashboard}
                  className="mt-6 w-full py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-lg transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 focus-visible:outline-offset-2"
                >
                  Open Full Report
                </button>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      <section className="py-14 md:py-16 border-t border-slate-900/80 relative" aria-labelledby="stats-heading">
        <div ref={statsSection.ref} className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 id="stats-heading" className="sr-only">Platform capabilities at a glance</h2>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {STATS.map((stat) => (
              <li key={stat.label} className="landing-card rounded-2xl p-5 md:p-6 text-center list-none">
                <p className="text-3xl md:text-4xl font-black text-indigo-400 tabular-nums">
                  <AnimatedCounter value={stat.value} isActive={statsSection.isVisible} />
                </p>
                <p className="text-sm font-semibold text-slate-200 mt-2">{stat.label}</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">{stat.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="features" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 border-t border-slate-900 relative" aria-labelledby="features-heading">
        <FadeInSection className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
          <h2 id="features-heading" className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
            Powerful Spec Analysis Engine
          </h2>
          <p className="text-slate-400 text-base md:text-lg">
            SpecLens AI parses project files in seconds, running multi-doc cross-references to identify engineering friction.
          </p>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          <FadeInSection delay={0}>
            <FeatureCard
              icon={ShieldAlert}
              iconStyles="bg-rose-950/50 border-rose-500/20 text-rose-400"
              title="Contradiction Scans"
              description="Catches logical friction and conflicting specs across multiple documents, such as contrasting auth rules or payment vendors."
            />
          </FadeInSection>
          <FadeInSection delay={60}>
            <FeatureCard
              icon={Zap}
              iconStyles="bg-amber-950/50 border-amber-500/20 text-amber-400"
              title="Ambiguity Resolution"
              description='Detects vague goals (e.g. "must respond fast") and highlights them to demand concrete metric limits or SLAs.'
            />
          </FadeInSection>
          <FadeInSection delay={120}>
            <FeatureCard
              icon={LayoutGrid}
              iconStyles="bg-emerald-950/50 border-emerald-500/20 text-emerald-400"
              title="Requirement Coverage"
              description="Reviews specs for standard architecture omissions, security gaps, error-state guidelines, and GDPR regulations."
            />
          </FadeInSection>
          <FadeInSection delay={180}>
            <FeatureCard
              icon={GitFork}
              iconStyles="bg-indigo-950/50 border-indigo-500/20 text-indigo-400"
              title="Dependency Mapping"
              description="Automatically builds logical graphs of your project modules and highlights order-of-delivery scheduling clashes."
            />
          </FadeInSection>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-slate-950/40 border-t border-slate-900 relative" aria-labelledby="value-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeInSection className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
            <h2 id="value-heading" className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
              Why SpecLens AI matters
            </h2>
            <p className="text-slate-400 text-base md:text-lg">
              Turn scattered documents into a single source of truth — before development starts.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {VALUE_CARDS.map((card, index) => {
              const CardIcon = card.icon;
              return (
                <FadeInSection key={card.title} delay={index * 60}>
                  <article className="landing-card h-full p-6 rounded-2xl">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-5 ${card.iconBg}`}>
                      <CardIcon size={22} className={card.accent} aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 mb-2">{card.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{card.description}</p>
                  </article>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 border-t border-slate-900 relative" aria-labelledby="how-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeInSection className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
            <h2 id="how-heading" className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
              Three steps to alignment
            </h2>
            <p className="text-slate-400 text-base md:text-lg">
              Run reviews before development. Align product owners, architects, and engineers from day one.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 text-left">
            <FadeInSection delay={0}>
              <article className="landing-card h-full p-8 rounded-2xl relative">
                <div className="absolute top-6 right-6 text-7xl font-black text-slate-900 select-none" aria-hidden="true">1</div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                    <FileText size={18} aria-hidden="true" />
                  </span>
                  <span className="font-bold text-slate-200">Upload Specs</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Submit drafts &amp; templates</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Drag and drop your project documents (PDF, DOCX, TXT, MD, YAML). Submit everything together.
                </p>
              </article>
            </FadeInSection>

            <FadeInSection delay={80}>
              <article className="landing-card h-full p-8 rounded-2xl relative">
                <div className="absolute top-6 right-6 text-7xl font-black text-slate-900 select-none" aria-hidden="true">2</div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                    <Cpu size={18} aria-hidden="true" />
                  </span>
                  <span className="font-bold text-slate-200">Deep AI Parse</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Automatic Cross-Audit</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The engine correlates sentences, data models, APIs, and business statements to reveal contradictions and discrepancies.
                </p>
              </article>
            </FadeInSection>

            <FadeInSection delay={160}>
              <article className="landing-card h-full p-8 rounded-2xl relative">
                <div className="absolute top-6 right-6 text-7xl font-black text-slate-900 select-none" aria-hidden="true">3</div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                    <CheckCircle size={18} aria-hidden="true" />
                  </span>
                  <span className="font-bold text-slate-200">Resolve &amp; Build</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Fix issues early</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Review findings grouped by impact. Toggle details, review recommendations, print reports, and correct specs before starting sprints.
                </p>
              </article>
            </FadeInSection>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 border-t border-slate-900 bg-slate-950/30" aria-labelledby="trust-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeInSection className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <h2 id="trust-heading" className="text-2xl md:text-3xl font-extrabold mb-3 tracking-tight">
              Built for real engineering teams
            </h2>
            <p className="text-slate-400 text-sm md:text-base">
              A production-minded stack designed for reliability, transparency, and hackathon-grade polish.
            </p>
          </FadeInSection>

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {TRUST_ITEMS.map((item, index) => {
              const TrustIcon = item.icon;
              return (
                <FadeInSection key={item.label} delay={index * 40}>
                  <li className="landing-card flex items-center gap-3 p-4 rounded-xl list-none">
                    <span className="p-2 rounded-lg bg-indigo-950/50 border border-indigo-500/20 text-indigo-400 shrink-0">
                      <TrustIcon size={18} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-slate-300">{item.label}</span>
                  </li>
                </FadeInSection>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6" aria-labelledby="cta-heading">
        <FadeInSection>
          <div className="relative p-8 md:p-14 rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-950 via-indigo-950/25 to-slate-950 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" aria-hidden="true" />
            <h2 id="cta-heading" className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
              Build right the first time.
            </h2>
            <p className="max-w-xl mx-auto text-slate-400 text-sm md:text-base leading-relaxed mb-8">
              Ensure architectural agreement, avoid re-work cycles, and save hundreds of engineering hours.
            </p>
            <button
              type="button"
              onClick={onStartReview}
              className="btn-landing-primary mx-auto group cursor-pointer"
              aria-label="Start your specification review now"
            >
              <span>Start Review Now</span>
              <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform duration-200" aria-hidden="true" />
            </button>
          </div>
        </FadeInSection>
      </section>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white">
                SpecLens <span className="text-indigo-400">AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The AI-Powered Design Review Engineer checking requirements, architectures, and contracts for engineering clarity.
            </p>
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} SpecLens AI. All rights reserved.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-300 text-sm mb-4">Product</h3>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="#features" className="hover:text-indigo-400 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 rounded">Features</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">Security Rules</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">SLA Benchmarks</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">Integrations</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-300 text-sm mb-4">Company</h3>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">About Us</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">Blog</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">Careers</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">Contact</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-300 text-sm mb-4">Compliance</h3>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">Terms of Service</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">GDPR Audit</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition duration-200">SOC 2 Portal</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

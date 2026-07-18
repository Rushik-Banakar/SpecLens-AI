import React, { useState, Suspense, lazy } from 'react';
import LandingPage from './pages/LandingPage';

const UploadPage = lazy(() => import('./pages/UploadPage'));
const ReviewDashboard = lazy(() => import('./pages/ReviewDashboard'));

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [extractedRequirements, setExtractedRequirements] = useState(null);
  const [detectedCollisions, setDetectedCollisions] = useState(null); // { collisions, stats, error }

  const handleStartReview = () => {
    setCurrentPage('upload');
    setDetectedCollisions(null);  // reset on new review
    setExtractedRequirements(null);
  };

  const handleViewDashboard = () => {
    // If exploring the demo directly, clear uploadedDocs so it displays the high-fidelity mock list
    setUploadedDocs([]);
    setCurrentPage('dashboard');
  };

  const handleAnalysisComplete = (docs, extractionResult, collisionResult) => {
    console.log("Navigating...");
    setUploadedDocs(docs);
    setExtractedRequirements(extractionResult || null);
    setDetectedCollisions(collisionResult || null);
    setCurrentPage('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header Navigation - Hidden on Dashboard for app-like workspace feel */}
      {currentPage !== 'dashboard' && (
        <header className="fixed top-0 left-0 w-full z-50 border-b border-white/[0.06] bg-slate-950/75 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-[4.25rem] flex items-center justify-between gap-4">
            <button
              type="button"
              className="flex items-center gap-2.5 cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 focus-visible:outline-offset-2"
              onClick={() => setCurrentPage('landing')}
              aria-label="Go to SpecLens AI home"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                S
              </div>
              <span className="font-semibold text-lg tracking-tight text-white">
                SpecLens <span className="text-indigo-400">AI</span>
              </span>
            </button>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium" aria-label="Primary">
              <button
                type="button"
                onClick={() => setCurrentPage('landing')}
                className={`nav-link px-3 py-2 rounded-md ${currentPage === 'landing' ? 'nav-link-active bg-white/[0.04]' : ''}`}
              >
                Features
              </button>
              <a
                href="#features"
                onClick={(e) => {
                  if (currentPage !== 'landing') {
                    e.preventDefault();
                    setCurrentPage('landing');
                    setTimeout(() => {
                      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }
                }}
                className="nav-link px-3 py-2 rounded-md"
              >
                How It Works
              </a>
              <button
                type="button"
                onClick={() => setCurrentPage('dashboard')}
                className="nav-link px-3 py-2 rounded-md"
              >
                Demo Dashboard
              </button>
            </nav>

            <div className="flex items-center shrink-0">
              {currentPage === 'landing' ? (
                <button
                  type="button"
                  onClick={handleStartReview}
                  className="btn-nav-primary"
                >
                  Start Review
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentPage('landing')}
                  className="btn-nav-secondary"
                >
                  Back to Home
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Page Layout Routing */}
      <main className="flex-1 flex flex-col">
        {currentPage === 'landing' && (
          <LandingPage
            onStartReview={handleStartReview}
            onViewDashboard={handleViewDashboard}
          />
        )}

        {currentPage === 'upload' && (
          <Suspense fallback={null}>
            <UploadPage
              onAnalyzeStart={() => {}}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </Suspense>
        )}

        {currentPage === 'dashboard' && (
          <Suspense fallback={null}>
            <ReviewDashboard
              uploadedDocs={uploadedDocs}
              extractedRequirements={extractedRequirements}
              detectedCollisions={detectedCollisions}
              onBackToUpload={handleStartReview}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}

export default App;

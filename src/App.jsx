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
        <header className="fixed top-0 left-0 w-full z-50 glass-panel border-b border-slate-900 bg-slate-950/70 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <div 
              className="flex items-center space-x-2.5 cursor-pointer"
              onClick={() => setCurrentPage('landing')}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/20">
                S
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                SpecLens <span className="text-indigo-400">AI</span>
              </span>
            </div>

            {/* Nav links */}
            <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-400">
              <button 
                onClick={() => setCurrentPage('landing')}
                className={`hover:text-slate-100 transition ${currentPage === 'landing' ? 'text-indigo-400 hover:text-indigo-400' : ''}`}
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
                className="hover:text-slate-100 transition"
              >
                How It Works
              </a>
              <button 
                onClick={() => setCurrentPage('dashboard')}
                className="hover:text-slate-100 transition"
              >
                Demo Dashboard
              </button>
            </nav>

            {/* CTA action buttons */}
            <div className="flex items-center space-x-4">
              {currentPage === 'landing' ? (
                <button
                  onClick={handleStartReview}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-semibold rounded-lg shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition duration-200"
                >
                  Start Review
                </button>
              ) : (
                <button
                  onClick={() => setCurrentPage('landing')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 text-xs md:text-sm font-semibold rounded-lg transition duration-200"
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

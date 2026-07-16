import React, { useState, useEffect } from 'react';
import { UploadCloud, File, Trash2, ShieldCheck, Loader2, Sparkles } from 'lucide-react';

export default function UploadPage({ onAnalyzeStart, onAnalysisComplete }) {
  const [files, setFiles] = useState([
    { id: 'mock-1', name: "PRD_v1.0_Horizon.docx", size: "2.4 MB", type: "docx", status: "success", parsedStatus: "Parsed Successfully", text_length: 12450 },
    { id: 'mock-2', name: "Corporate_Security_Requirements.pdf", size: "4.1 MB", type: "pdf", status: "success", parsedStatus: "Parsed Successfully", text_length: 31024 }
  ]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [extractionResult, setExtractionResult] = useState(null);
  const [collisionResult, setCollisionResult] = useState(null); // { collisions, stats, error }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
  const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'markdown'];

  const analysisSteps = [
    "Parsing uploaded files & extracting semantic tokens...",
    "Validating requirements for logical coherence...",
    "Cross-referencing authentication models with corporate security specifications...",
    "Analyzing endpoint schemas in API definitions against PRD payment flows...",
    "Tracing modular dependencies and detecting pipeline bottlenecks...",
    "Generating interaction conflict graph and final project report..."
  ];

  useEffect(() => {
    let interval;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setAnalysisStep((prev) => {
          if (prev < analysisSteps.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            setTimeout(() => {
              setIsAnalyzing(false);
              // Read both results via setState callbacks to avoid stale closures
              setExtractionResult(latestExtraction => {
                setCollisionResult(latestCollision => {
                  setTimeout(() => {
                    onAnalysisComplete(
                      files.filter(f => f.status === 'success'),
                      latestExtraction,
                      latestCollision
                    );
                  }, 0);
                  return latestCollision;
                });
                return latestExtraction;
              });
            }, 1000);
            return prev;
          }
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  };

  const getReadableSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    else return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processFiles = (rawFiles) => {
    rawFiles.forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const id = generateUniqueId();
      const initialFileState = {
        id,
        name: file.name,
        size: getReadableSize(file.size),
        type: ext,
        status: 'idle',
        progress: 0,
        error: null
      };

      // Validation
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        initialFileState.status = 'error';
        initialFileState.error = `Unsupported format '.${ext}'. Supported: PDF, DOCX, TXT, MD`;
        setFiles(prev => [...prev, initialFileState]);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        initialFileState.status = 'error';
        initialFileState.error = `Exceeds 25MB limit.`;
        setFiles(prev => [...prev, initialFileState]);
        return;
      }

      // Add to files state and trigger upload
      setFiles(prev => [...prev, { ...initialFileState, status: 'uploading' }]);
      uploadFile(file, id);
    });
  };

  const uploadFile = (file, id) => {
    const formData = new FormData();
    formData.append('files', file);

    const xhr = new XMLHttpRequest();
    xhr.timeout = 120000; // 2 minute timeout for large files

    // Progress updates
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setFiles(prev =>
          prev.map(f => f.id === id ? { ...f, progress: percent } : f)
        );
      }
    };

    // Load completed (any HTTP status — including 4xx/5xx)
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.documents && res.documents.length > 0) {
            const parsedDoc = res.documents[0];
            setFiles(prev =>
              prev.map(f => f.id === id ? {
                ...f,
                status: 'success',
                parsedStatus: parsedDoc.status,
                text_length: parsedDoc.text_length,
                size: parsedDoc.size
              } : f)
            );
          } else {
            setFiles(prev =>
              prev.map(f => f.id === id ? { ...f, status: 'error', error: 'Server returned no documents.' } : f)
            );
          }
        } catch (e) {
          setFiles(prev =>
            prev.map(f => f.id === id ? { ...f, status: 'error', error: 'Invalid JSON in server response.' } : f)
          );
        }
      } else {
        // Parse structured error from backend
        let errorMsg = `Server error (HTTP ${xhr.status})`;
        try {
          const errorJson = JSON.parse(xhr.responseText);
          if (errorJson.detail) {
            // detail can be a string or an object (structured error)
            errorMsg = typeof errorJson.detail === 'string'
              ? errorJson.detail
              : errorJson.detail.error || JSON.stringify(errorJson.detail);
          }
        } catch (e) {
          // Non-JSON error body
          if (xhr.responseText) errorMsg = xhr.responseText.slice(0, 200);
        }
        setFiles(prev =>
          prev.map(f => f.id === id ? { ...f, status: 'error', error: errorMsg } : f)
        );
      }
    };

    // Timeout handler
    xhr.ontimeout = () => {
      setFiles(prev =>
        prev.map(f => f.id === id ? {
          ...f,
          status: 'error',
          error: 'Upload timed out after 2 minutes. File may be too large or the server is unresponsive.'
        } : f)
      );
    };

    // Network-level error (CORS block, connection refused, DNS failure)
    xhr.onerror = () => {
      // Diagnose the likely cause
      const apiBase = API_URL;
      let diagMsg = `Cannot reach server at ${apiBase}.`;
      if (window.location.origin !== apiBase && !apiBase.includes('localhost')) {
        diagMsg = `CORS error: Browser blocked request to ${apiBase}. Check backend CORS settings.`;
      } else {
        diagMsg = `Connection failed to ${apiBase}. Ensure the backend is running (python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 inside /backend).`;
      }
      setFiles(prev =>
        prev.map(f => f.id === id ? { ...f, status: 'error', error: diagMsg } : f)
      );
    };

    xhr.open('POST', `${API_URL}/api/upload`);
    xhr.withCredentials = false; // Must match backend allow_credentials=False
    xhr.send(formData);
  };

  const handleMockUploadExe = () => {
    const file = new File(["dummy executable data"], "unsupported_format.exe", { type: "application/octet-stream" });
    processFiles([file]);
  };

  const handleMockUploadMd = () => {
    const mdContent = `# Horizon Project Geocoding Architecture\n\nThis document details the reverse geocoding microservice integration.\n\n## Module Details\n- Depends on Google Maps API client libraries.\n- Requires standard API token setup on server initialization.\n- Maximum requests per client are restricted under SLA definitions.`;
    const file = new File([mdContent], "architecture_v2.md", { type: "text/markdown" });
    processFiles([file]);
  };

  const simulateAddMockFiles = () => {
    const mockFilesToAdd = [
      { id: 'mock-3', name: "Payment_API_Spec_v1.1.yaml", size: "842 KB", type: "yaml", status: "success", parsedStatus: "Parsed Successfully", text_length: 8420 },
      { id: 'mock-4', name: "Cloud_Arch_Draft.md", size: "120 KB", type: "md", status: "success", parsedStatus: "Parsed Successfully", text_length: 4210 }
    ];
    // Avoid duplicates
    setFiles(prev => {
      const existingNames = prev.map(f => f.name);
      const toAdd = mockFilesToAdd.filter(f => !existingNames.includes(f.name));
      return [...prev, ...toAdd];
    });
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleAnalyze = async () => {
    const parsedFiles = files.filter(f => f.status === 'success');
    if (parsedFiles.length === 0) return;

    setExtractionResult(null);
    setCollisionResult(null);
    setIsAnalyzing(true);
    setAnalysisStep(0);
    if (onAnalyzeStart) onAnalyzeStart();

    // Build document payloads for the extraction API
    const docsForExtraction = parsedFiles.map(f => ({
      name: f.name,
      text: f.extractedText || `[Document: ${f.name} | Size: ${f.size} | ${f.text_length || 0} characters extracted by parser]`
    }));

    // ── Phase 1: Extract Requirements ────────────────────────────────────
    let extractionData = null;
    try {
      const res = await fetch(`${API_URL}/api/extract-requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: docsForExtraction }),
        signal: AbortSignal.timeout(180000),
      });
      const data = await res.json();
      if (data.success) {
        extractionData = { requirements: data.requirements, stats: data.stats, error: null };
      } else {
        extractionData = { requirements: [], stats: null, error: data.error || 'AI extraction failed' };
      }
    } catch (err) {
      extractionData = { requirements: [], stats: null, error: `AI extraction failed: ${err.message}` };
    }
    setExtractionResult(extractionData);

    // ── Phase 2: Detect Collisions (only if we have requirements) ────────
    if (extractionData?.requirements?.length > 0) {
      try {
        const colRes = await fetch(`${API_URL}/api/detect-collisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requirements: extractionData.requirements }),
          signal: AbortSignal.timeout(180000),
        });
        const colData = await colRes.json();
        if (colData.success) {
          setCollisionResult({ collisions: colData.collisions, stats: colData.stats, error: null });
        } else {
          setCollisionResult({ collisions: [], stats: null, error: colData.error || 'Collision detection failed' });
        }
      } catch (err) {
        setCollisionResult({ collisions: [], stats: null, error: `Collision detection failed: ${err.message}` });
      }
    } else {
      setCollisionResult({ collisions: [], stats: null, error: extractionData?.error ? 'Skipped — extraction failed' : null });
    }
  };

  // Helper for file type icons
  const getFileIconColor = (type) => {
    switch (type) {
      case 'pdf': return 'text-red-400 bg-red-950/30 border-red-500/25';
      case 'docx': return 'text-blue-400 bg-blue-950/30 border-blue-500/25';
      case 'md': case 'markdown': case 'txt': return 'text-emerald-400 bg-emerald-950/30 border-emerald-500/25';
      case 'yaml': case 'yml': return 'text-amber-400 bg-amber-950/30 border-amber-500/25';
      default: return 'text-slate-400 bg-slate-900/30 border-slate-800';
    }
  };

  const successfullyParsedCount = files.filter(f => f.status === 'success').length;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center py-24 px-6 overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Upload Content */}
      {!isAnalyzing ? (
        <div className="w-full max-w-3xl z-10 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">Upload Specifications</h1>
            <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-base">
              Submit your project files to scan for architectural contradictions, ambiguities, and requirement gaps.
            </p>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`w-full p-8 md:p-12 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer relative glass-panel ${
              isDragActive 
                ? 'border-indigo-500 bg-indigo-950/10 scale-[1.01]' 
                : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/10'
            }`}
          >
            <input
              type="file"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files) {
                  processFiles(Array.from(e.target.files));
                }
              }}
            />
            
            <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 shadow-inner">
              <UploadCloud size={32} />
            </div>
            
            <h3 className="text-lg font-semibold text-slate-200 mb-1">Drag and drop files here</h3>
            <p className="text-xs text-slate-500 mb-4">Supported formats: PDF, DOCX, TXT, Markdown (Max 25MB)</p>
            <span className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 transition">
              Browse Files
            </span>
          </div>

          {/* Simulated File upload assist helper */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/30 border border-slate-900 p-4 rounded-xl">
            <span className="text-xs text-slate-400 flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-400 flex-shrink-0" />
              <span>Need sample data? Load typical project blueprints or run test files.</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="mock-upload-exe"
                onClick={handleMockUploadExe}
                className="px-2.5 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-300 text-xs font-semibold rounded-lg transition"
              >
                Test EXE
              </button>
              <button
                id="mock-upload-md"
                onClick={handleMockUploadMd}
                className="px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-lg transition"
              >
                Test MD
              </button>
              <button
                onClick={simulateAddMockFiles}
                className="px-2.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-lg transition"
              >
                Load Demo Files
              </button>
            </div>
          </div>

          {/* List of Files */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted Documents ({files.length})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex flex-col p-4 rounded-xl border border-slate-900 bg-slate-900/20 hover:border-slate-800 hover:bg-slate-900/40 transition group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2.5 rounded-lg border ${getFileIconColor(file.type)} flex items-center justify-center font-bold text-xs uppercase`}>
                          {file.type}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{file.name}</p>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                            <span>{file.size}</span>
                            {file.text_length !== undefined && (
                              <>
                                <span>•</span>
                                <span>{file.text_length.toLocaleString()} chars</span>
                              </>
                            )}
                            {file.parsedStatus && file.status === 'success' && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400 font-semibold">{file.parsedStatus}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {file.status === 'uploading' && (
                          <span className="text-xs text-indigo-400 font-semibold animate-pulse">{file.progress}%</span>
                        )}
                        {file.status === 'error' && (
                          <span className="text-xs text-rose-400 font-bold bg-rose-950/20 border border-rose-500/20 px-2 py-0.5 rounded-full" title={file.error}>{file.error}</span>
                        )}
                        {file.status === 'success' && (
                          <span className="text-xs text-emerald-400 font-bold border border-emerald-500/20 bg-emerald-950/20 px-2 py-0.5 rounded-full">Success</span>
                        )}
                        
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition flex items-center justify-center"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar for Uploading */}
                    {file.status === 'uploading' && (
                      <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-3 border border-slate-900">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-150"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyze Button */}
          <div className="pt-4">
            <button
              onClick={handleAnalyze}
              disabled={successfullyParsedCount === 0}
              className={`w-full py-4 font-bold rounded-xl flex items-center justify-center space-x-2 transition ${
                successfullyParsedCount > 0 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15 cursor-pointer' 
                  : 'bg-slate-900 text-slate-600 border border-slate-900 cursor-not-allowed'
              }`}
            >
              <ShieldCheck size={18} />
              <span>Analyze Project Files</span>
            </button>
          </div>
        </div>
      ) : (
        /* Analysis Loading Screen */
        <div className="w-full max-w-xl z-10 text-center space-y-8 p-10 rounded-2xl glass-panel relative flex flex-col items-center">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent rounded-2xl pointer-events-none" />
          
          {/* Animated Spinner Icon */}
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full border border-indigo-500/20 bg-indigo-950/20">
            <Loader2 className="text-indigo-500 animate-spin" size={48} />
            <div className="absolute inset-0 rounded-full border-t border-indigo-400 animate-spin-slow" />
          </div>

          <div className="space-y-3">
            <h3 className="text-xl md:text-2xl font-black text-slate-100">SpecLens Analysis Engine Running</h3>
            <p className="text-xs text-slate-500 font-mono tracking-widest uppercase">Executing Cross-Document Semantic Audit</p>
          </div>

          {/* Dynamic Loading Step Message */}
          <div className="w-full bg-slate-950 border border-slate-900/60 p-4 rounded-xl min-h-[76px] flex items-center justify-center text-center">
            <p className="text-sm font-medium text-slate-300 animate-pulse">
              {analysisSteps[analysisStep]}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>PROGRESS</span>
              <span>{Math.round(((analysisStep + 1) / analysisSteps.length) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-900">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${((analysisStep + 1) / analysisSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

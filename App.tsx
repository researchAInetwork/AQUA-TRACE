import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { ReportView } from './components/ReportView';
import { CameraCapture } from './components/CameraCapture';
import { AboutModal } from './components/AboutModal';
import { analyzeWaterImage } from './services/geminiService';
import { AnalysisState } from './types';

type InputMode = 'upload' | 'camera';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
    data: null,
    resources: null,
    sources: [],
    error: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [showAbout, setShowAbout] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setAnalysisState(prev => ({
        ...prev,
        status: 'error',
        error: "Invalid format. Use JPG, PNG, or MP4."
      }));
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setAnalysisState({ status: 'idle', data: null, resources: null, sources: [], error: null });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!file) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (preview) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalysisState(prev => ({ ...prev, status: 'analyzing', error: null }));
    try {
      const result = await analyzeWaterImage(file, context);
      setAnalysisState({ 
        status: 'complete', 
        data: result.report, 
        sources: result.sources,
        resources: null,
        error: null 
      });
    } catch (err: any) {
      setAnalysisState(prev => ({ 
        ...prev,
        status: 'error', 
        error: err.message || "Sensor analysis failed." 
      }));
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setContext('');
    setAnalysisState({ status: 'idle', data: null, resources: null, sources: [], error: null });
  };

  const isVideo = file?.type.startsWith('video/');

  return (
    <div className="h-screen flex flex-col bg-slate-950 font-sans selection:bg-cyan-500/30 overflow-hidden">
      <Header onOpenAbout={() => setShowAbout(true)} />
      
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Main Workspace: Perfectly fits the remaining height */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Control Sidebar */}
        <aside className="w-full lg:w-96 flex-shrink-0 bg-slate-900/50 border-r border-slate-800 flex flex-col p-5 gap-5">
          <div className="flex-shrink-0">
             <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                Input Terminal
             </h2>
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-1">Ready for telemetry</p>
          </div>

          <div className="flex-1 flex flex-col min-h-0 gap-5 overflow-hidden">
            {!preview ? (
              <div className="flex-1 flex flex-col min-h-0 gap-3">
                <div className="flex p-1 bg-slate-950/50 rounded-lg border border-slate-800 shrink-0">
                  <button onClick={() => setInputMode('upload')} className={`flex-1 py-1.5 text-[10px] font-black rounded transition-all ${inputMode === 'upload' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                    IMPORT
                  </button>
                  <button onClick={() => setInputMode('camera')} className={`flex-1 py-1.5 text-[10px] font-black rounded transition-all ${inputMode === 'camera' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                    OPTICS
                  </button>
                </div>

                <div className="flex-1 min-h-0">
                  {inputMode === 'upload' ? (
                    <div 
                      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} 
                      className={`h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/30'}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg className="w-8 h-8 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <p className="text-xs font-semibold text-slate-400">Drop Imagery</p>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                    </div>
                  ) : (
                    <div className="h-full">
                      <CameraCapture onCapture={validateAndSetFile} onError={(err) => setAnalysisState(s => ({...s, error: err}))} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative group rounded-xl border border-slate-800 overflow-hidden bg-black flex-1 min-h-0">
                {isVideo ? (
                  <video src={preview} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={preview} alt="Sample" className="w-full h-full object-cover" />
                )}
                <button onClick={reset} className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full transition-all border border-white/10">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            <div className="flex-shrink-0 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Field Metadata</label>
                <textarea 
                  value={context} 
                  onChange={(e) => setContext(e.target.value)} 
                  placeholder="Location context..." 
                  className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-cyan-500/50 focus:ring-0 transition-all resize-none placeholder:text-slate-800"
                />
              </div>
              <button 
                onClick={handleAnalyze} 
                disabled={!file || analysisState.status === 'analyzing'} 
                className={`w-full py-3.5 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] transition-all ${!file ? 'bg-slate-800 text-slate-600' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl shadow-cyan-900/10'}`}
              >
                {analysisState.status === 'analyzing' ? 'Processing...' : 'Analyze Data'}
              </button>
            </div>
          </div>
        </aside>

        {/* Results Workspace */}
        <section className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
          <div className="flex-1 overflow-y-auto custom-scroll p-6 lg:p-10 relative z-10">
            {analysisState.status === 'complete' && analysisState.data ? (
              <ReportView report={analysisState.data} sources={analysisState.sources} onBack={reset} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6">
                {analysisState.status === 'analyzing' ? (
                  <div className="space-y-6">
                    <div className="w-12 h-12 mx-auto border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                    <p className="text-xs text-slate-500 font-mono tracking-widest uppercase animate-pulse">Running Neural Inference...</p>
                  </div>
                ) : (
                  <div className="space-y-4 opacity-30">
                    <svg className="w-12 h-12 mx-auto text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    <div className="space-y-1">
                       <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Workspace Idle</h3>
                       <p className="text-[10px] text-slate-600 uppercase tracking-tight font-mono">Input Required for Assessment</p>
                    </div>
                  </div>
                )}
                {analysisState.error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] uppercase font-bold">{analysisState.error}</div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer: Fixed h-8 (32px) */}
      <footer className="h-8 shrink-0 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse"></span> ONLINE</span>
          <span className="opacity-30">|</span>
          <span className="hidden sm:inline">DATASET: GLOBAL_V4</span>
        </div>
        <div className="text-center font-sans opacity-40 truncate px-4">
          VISUAL ESTIMATE PROTOCOL ENABLED // BETA SYSTEM
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">SECURE</span>
          <span className="text-slate-700">©2024 ENV-AI</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
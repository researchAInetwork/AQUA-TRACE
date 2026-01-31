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
        error: "Invalid file type. Please upload a valid image (JPG, PNG) or video (MP4, WebM)."
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
        error: err.message || "Analysis failed. Please try a different angle or lighting." 
      }));
    }
  };

  const handleCameraError = (errorMsg: string) => {
    setAnalysisState(prev => ({ ...prev, status: 'error', error: errorMsg }));
    setInputMode('upload');
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setContext('');
    setAnalysisState({ status: 'idle', data: null, resources: null, sources: [], error: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isVideo = file?.type.startsWith('video/');

  return (
    <div className="h-screen flex flex-col bg-slate-950 font-sans selection:bg-cyan-500/30 overflow-hidden">
      <Header onOpenAbout={() => setShowAbout(true)} />
      
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <main className="flex-1 dashboard-height flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Sensor & Input (Fixed Control) */}
        <aside className="w-full lg:w-[420px] flex-shrink-0 bg-slate-900/40 border-r border-slate-800 flex flex-col overflow-y-auto lg:overflow-hidden p-6 gap-6">
          
          <div className="space-y-1">
             <h2 className="text-xl font-bold text-white tracking-tight">Data Acquisition</h2>
             <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Status: {analysisState.status === 'analyzing' ? 'Processing Stream...' : 'Ready'}</p>
          </div>

          <div className="flex-1 flex flex-col gap-6">
            {!preview ? (
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex p-1 bg-slate-800/50 rounded-lg border border-slate-700">
                  <button onClick={() => setInputMode('upload')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${inputMode === 'upload' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    IMPORT FILE
                  </button>
                  <button onClick={() => setInputMode('camera')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${inputMode === 'camera' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    LIVE OPTICS
                  </button>
                </div>

                {inputMode === 'upload' ? (
                  <div 
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} 
                    className={`relative flex-1 min-h-[250px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-cyan-400 bg-cyan-500/5 scale-[1.01]' : 'border-slate-700 hover:border-slate-500 bg-slate-900/20'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="p-6 text-center space-y-4">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                         <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-200">Drop Surface Data</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tight">Imagery or Video (.mp4, .jpg, .png)</p>
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                  </div>
                ) : (
                  <div className="flex-1 min-h-[300px]">
                    <CameraCapture onCapture={validateAndSetFile} onError={handleCameraError} />
                  </div>
                )}
              </div>
            ) : (
              <div className="relative group rounded-xl border border-slate-700 overflow-hidden bg-black flex-1 min-h-[250px]">
                {isVideo ? (
                  <video src={preview} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={preview} alt="Water sample" className="w-full h-full object-cover" />
                )}
                <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-2 py-1 rounded border border-cyan-800/50">Capture Locked</span>
                  <button onClick={reset} className="p-1.5 bg-red-500/20 hover:bg-red-500 border border-red-500/50 rounded-full transition-all text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Environment Metadata</label>
                <textarea 
                  value={context} 
                  onChange={(e) => setContext(e.target.value)} 
                  placeholder="Describe location, weather, or visible odors..." 
                  className="w-full h-24 bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-cyan-500/50 focus:ring-0 transition-all resize-none placeholder:text-slate-700"
                />
              </div>
              <button 
                onClick={handleAnalyze} 
                disabled={!file || analysisState.status === 'analyzing'} 
                className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden group ${!file ? 'bg-slate-800 text-slate-600' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20'}`}
              >
                {analysisState.status === 'analyzing' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Synthesizing...
                  </span>
                ) : `Initiate Analysis`}
              </button>
              {analysisState.error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] uppercase font-bold animate-fade-in-up">{analysisState.error}</div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Side: Analytics & Reports (Scrollable Output) */}
        <section className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
          
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
             <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[120px] rounded-full"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full"></div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll p-8 relative z-10">
            {analysisState.status === 'complete' && analysisState.data ? (
              <ReportView report={analysisState.data} sources={analysisState.sources} onBack={reset} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-8 animate-fade-in-up">
                {analysisState.status === 'analyzing' ? (
                  <div className="space-y-6">
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-4 border-2 border-blue-500/10 rounded-full animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white">Quantum Inference</h3>
                      <p className="text-sm text-slate-500">Cross-referencing multimodal datasets with environmental toxicity patterns...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 opacity-60">
                    <div className="w-16 h-16 mx-auto bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-700">
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-lg font-bold text-slate-400">Waiting for Input</h3>
                       <p className="text-sm text-slate-600 leading-relaxed">Provide visual surface data to generate a comprehensive Impact & Risk Intelligence report.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-8 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[10px] text-slate-500 font-mono tracking-wider">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></span>
            SYSTEM: NOMINAL
          </span>
          <span className="hidden sm:inline opacity-50">LATENCY: 142MS</span>
        </div>
        <div className="text-center font-sans opacity-60">
          AQUA-TRACE // BETA - VISUAL ESTIMATES ONLY. NOT A REPLACEMENT FOR LABORATORY ANALYSIS.
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">SECURE CHANNEL</span>
          <span>©2024 ENV-AI</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
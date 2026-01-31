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
  const [inputMode, setInputMode] = useState('upload');
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

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Control Sidebar */}
        <aside className="w-full lg:w-96 flex-shrink-0 bg-slate-900/50 border-r border-slate-800 flex flex-col p-5 gap-6 custom-scroll overflow-y-auto lg:overflow-hidden">
          <div className="flex-shrink-0">
             <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>
                Sensor Input
             </h2>
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-1">Ready for Telemetry</p>
          </div>

          <div className="flex-1 flex flex-col gap-6">
            {!preview ? (
              <div className="space-y-4">
                <div className="flex p-1 bg-slate-950/50 rounded-lg border border-slate-800 shrink-0">
                  <button onClick={() => setInputMode('upload')} className={`flex-1 py-1.5 text-[10px] font-black rounded transition-all ${inputMode === 'upload' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                    IMPORT IMAGE
                  </button>
                  <button onClick={() => setInputMode('camera')} className={`flex-1 py-1.5 text-[10px] font-black rounded transition-all ${inputMode === 'camera' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                    LIVE OPTICS
                  </button>
                </div>

                <div className="h-60">
                  {inputMode === 'upload' ? (
                    <div 
                      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} 
                      className={`h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/30'}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg className="w-8 h-8 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <p className="text-xs font-semibold text-slate-500">Drop Surface Data</p>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                    </div>
                  ) : (
                    <div className="h-full">
                      <CameraCapture onCapture={validateAndSetFile} onError={(err) => setAnalysisState(s => ({...s, error: err}))} />
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                  <h4 className="text-[9px] font-bold text-cyan-400 uppercase tracking-[0.15em] mb-2">Capture Protocol</h4>
                  <ul className="text-[10px] text-slate-400 space-y-1.5">
                    <li className="flex items-start gap-2">• <span className="flex-1">Avoid direct glare or reflections.</span></li>
                    <li className="flex items-start gap-2">• <span className="flex-1">Include shoreline if possible for scale.</span></li>
                    <li className="flex items-start gap-2">• <span className="flex-1">Wait for water ripples to settle.</span></li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="relative group rounded-xl border border-slate-800 overflow-hidden bg-black h-60">
                {isVideo ? (
                  <video src={preview} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={preview} alt="Sample" className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <button onClick={reset} className="p-1.5 bg-red-500/20 hover:bg-red-500 border border-red-500/50 rounded-full transition-all text-white backdrop-blur-md">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[9px] text-white font-mono truncate">{file?.name}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 flex justify-between">
                  <span>In-situ Metadata</span>
                  <span className="text-cyan-600">Optional</span>
                </label>
                <textarea 
                  value={context} 
                  onChange={(e) => setContext(e.target.value)} 
                  placeholder="e.g. Downstream from drain pipe, heavy odor detected..." 
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-cyan-500/50 focus:ring-0 transition-all resize-none placeholder:text-slate-800"
                />
              </div>
              <button 
                onClick={handleAnalyze} 
                disabled={!file || analysisState.status === 'analyzing'} 
                className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all relative overflow-hidden group ${!file ? 'bg-slate-800 text-slate-600' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl shadow-cyan-900/10'}`}
              >
                {analysisState.status === 'analyzing' ? (
                   <span className="flex items-center justify-center gap-2">
                     <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                     Processing...
                   </span>
                ) : 'Run Impact Logic'}
              </button>
            </div>
          </div>
        </aside>

        {/* Results Workspace / Knowledge Hub */}
        <section className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
          <div className="flex-1 overflow-y-auto custom-scroll p-6 lg:p-10 relative z-10">
            {analysisState.status === 'complete' && analysisState.data ? (
              <ReportView report={analysisState.data} sources={analysisState.sources} onBack={reset} />
            ) : (
              <div className="h-full flex flex-col animate-fade-in-up">
                {analysisState.status === 'analyzing' ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 border-2 border-cyan-500/10 rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-4 border border-blue-500/10 rounded-full animate-pulse"></div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-white tracking-tight">Synthesizing Report</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">Cross-referencing multimodal optical data with established toxicological patterns and environmental markers.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12">
                    <div className="space-y-4">
                      <h2 className="text-3xl font-black text-white leading-tight max-w-2xl">
                        AI-Driven Surface Water <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Impact Intelligence</span>
                      </h2>
                      <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
                        AQUA-TRACE uses high-resolution neural networks to detect, classify, and model the ecological risks of visible water pollution. Start by providing a still image or video clip for rapid screening.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4 hover:border-slate-700 transition-colors">
                        <div className="w-10 h-10 bg-cyan-900/20 border border-cyan-800/50 rounded-xl flex items-center justify-center text-cyan-400">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </div>
                        <h4 className="text-white font-bold">Optical Signatures</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">Detection of sheen, discoloration, turbidity, and foaming patterns indicative of chemical or organic runoff.</p>
                      </div>

                      <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4 hover:border-slate-700 transition-colors">
                        <div className="w-10 h-10 bg-emerald-900/20 border border-emerald-800/50 rounded-xl flex items-center justify-center text-emerald-400">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                        </div>
                        <h4 className="text-white font-bold">Biological Modeling</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">Automated risk calculation for aquatic ecosystems and surrounding human populations based on visible severity.</p>
                      </div>

                      <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4 hover:border-slate-700 transition-colors">
                        <div className="w-10 h-10 bg-blue-900/20 border border-blue-800/50 rounded-xl flex items-center justify-center text-blue-400">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <h4 className="text-white font-bold">Grounding Data</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">Integration of Google Maps and Search data to identify nearby environmental labs and specialized water authorities.</p>
                      </div>
                    </div>

                    <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                       <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       </div>
                       <div className="space-y-1">
                         <p className="text-sm font-bold text-white">System Advisory</p>
                         <p className="text-xs text-slate-400">AQUA-TRACE provides rapid visual screening. It cannot detect odorless or clear dissolved contaminants like Heavy Metals, PFAS, or nitrates. Laboratory verification is always recommended for legal compliance.</p>
                       </div>
                    </div>
                  </div>
                )}
                {analysisState.error && (
                  <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] uppercase font-bold flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {analysisState.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="h-8 shrink-0 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse"></span> SYSTEM_ONLINE</span>
          <span className="opacity-30">|</span>
          <span className="hidden sm:inline">MULTIMODAL_PROTOCOL: G_2.5_F</span>
        </div>
        <div className="text-center font-sans opacity-40 truncate px-4 tracking-tight">
          ENVIRONMENTAL RISK SCREENING PROTOCOL // ADVISORY ONLY
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">DATA_ENCRYPTION_ACTIVE</span>
          <span className="text-slate-700">©2024 ENV-AI</span>
        </div>
      </footer>
    </div>
  );
}

export default App;

import React, { useState, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { ReportView } from './components/ReportView.tsx';
import { CameraCapture } from './components/CameraCapture.tsx';
import { AboutModal } from './components/AboutModal.tsx';
import { analyzeWaterImage } from './services/geminiService.ts';
import { AnalysisState } from './types.ts';

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
        error: err.message || "Failed to analyze data. Please try again." 
      }));
    }
  };

  const handleCameraError = (errorMsg: string) => {
    setAnalysisState(prev => ({
      ...prev,
      status: 'error',
      error: errorMsg
    }));
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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-cyan-500/30">
      <Header onOpenAbout={() => setShowAbout(true)} />
      
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!preview && (
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Rapid Environmental Impact Assessment
            </h2>
            <p className="text-slate-400 mb-8">
              Upload imagery or scan surface water bodies to generate instant, AI-driven pollution risk assessments. 
              Designed for environmental monitors, NGOs, and compliance reporting.
            </p>
            <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg text-sm text-blue-200 inline-block">
              <strong>Beta System:</strong> Assessments are visual estimates only and do not replace laboratory chemical analysis.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className={`lg:col-span-5 space-y-6 ${analysisState.status === 'complete' ? 'hidden lg:block' : ''}`}>
            {!preview && (
              <div className="flex p-1 bg-slate-800 rounded-lg">
                <button onClick={() => setInputMode('upload')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${inputMode === 'upload' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                  Upload File
                </button>
                <button onClick={() => setInputMode('camera')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${inputMode === 'camera' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                  Live Scan
                </button>
              </div>
            )}

            {preview ? (
              <div className="relative w-full h-64 lg:h-auto overflow-hidden rounded-lg border border-slate-600 shadow-lg bg-black">
                {isVideo ? (
                  <video src={preview} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={preview} alt="Water sample" className="w-full h-full object-cover" />
                )}
                <button onClick={(e) => { e.stopPropagation(); reset(); }} className="absolute top-2 right-2 p-2 bg-slate-900/80 hover:bg-red-900/80 text-white rounded-full backdrop-blur-sm transition-colors z-10">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                {inputMode === 'upload' ? (
                  <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative group border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out ${isDragging ? 'border-cyan-400 bg-slate-800/80 scale-[1.02] shadow-xl shadow-cyan-900/20' : 'border-cyan-800/50 hover:border-cyan-500/50 bg-slate-800/30 hover:bg-slate-800/60'} h-64 lg:h-[400px] flex flex-col items-center justify-center cursor-pointer`} onClick={() => fileInputRef.current?.click()}>
                    <div className="text-center p-6 pointer-events-none"> 
                      <p className={`text-lg font-medium ${isDragging ? 'text-white' : 'text-slate-200'}`}>Drop water image or video here</p>
                      <p className="text-sm text-slate-500 mt-2">or click to browse</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                  </div>
                ) : (
                  <CameraCapture onCapture={validateAndSetFile} onError={handleCameraError} />
                )}
              </>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Location Context (Optional)</label>
                <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="e.g., Downstream from factory..." className="w-full h-24 bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-cyan-500/50 transition-all resize-none" />
              </div>
              <button onClick={handleAnalyze} disabled={!file || analysisState.status === 'analyzing'} className={`w-full py-4 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${!file ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : analysisState.status === 'analyzing' ? 'bg-cyan-900/50 text-cyan-300 cursor-wait' : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/20'}`}>
                {analysisState.status === 'analyzing' ? 'Analyzing...' : `Analyze ${isVideo ? 'Video' : 'Impact'}`}
              </button>
              {analysisState.error && (
                <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm animate-fade-in-up">{analysisState.error}</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            {analysisState.status === 'complete' && analysisState.data ? (
              <ReportView report={analysisState.data} sources={analysisState.sources} onBack={reset} />
            ) : (
              <div className={`h-full border border-slate-800 rounded-xl bg-slate-900/30 flex items-center justify-center ${analysisState.status === 'analyzing' ? 'opacity-50' : 'opacity-100'}`}>
                <div className="text-center p-8 max-w-sm">
                  {analysisState.status === 'analyzing' ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                      <p className="text-slate-400 text-sm">Processing environmental data...</p>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Assessment report will appear here after analysis.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

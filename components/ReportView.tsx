import React, { useState, useEffect, useRef } from 'react';
import { AnalysisReport, GroundingSource } from '../types';
import { RiskBadge } from './RiskBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { generateAudioReport, decodeBase64, decodeAudioData } from '../services/geminiService';

interface ReportViewProps {
  report: AnalysisReport;
  sources?: GroundingSource[];
  onBack: () => void;
}

const ReportSkeleton = () => (
  <div className="w-full space-y-6 animate-pulse">
    <div className="flex justify-between mb-8">
       <div className="h-10 w-32 bg-slate-800 rounded"></div>
       <div className="h-10 w-40 bg-slate-800 rounded"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-40 bg-slate-800/50 rounded-lg border border-slate-700/50"></div>
      <div className="h-40 bg-slate-800/50 rounded-lg border border-slate-700/50"></div>
    </div>
  </div>
);

export const ReportView: React.FC<ReportViewProps> = ({ report, sources = [], onBack }) => {
  const [rendering, setRendering] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setRendering(false), 800);
    return () => {
      clearTimeout(timer);
      if (activeSourceRef.current) activeSourceRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handlePlayAudio = async () => {
    if (isPlaying) {
      if (activeSourceRef.current) {
        activeSourceRef.current.stop();
        activeSourceRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    setIsAudioLoading(true);
    try {
      const base64Audio = await generateAudioReport(report);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        ctx,
        24000,
        1
      );

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        activeSourceRef.current = null;
      };

      activeSourceRef.current = source;
      source.start();
      setIsPlaying(true);
    } catch (err) {
      console.error("Audio playback failed:", err);
      alert("Failed to generate audio report.");
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handleDownload = () => {
    const timestamp = new Date().toLocaleString();
    const text = `
==================================================
AQUA-TRACE | ENVIRONMENTAL IMPACT REPORT
Generated: ${timestamp}
==================================================

Pollution Category: ${report.likelyPollutionCategory}
Risk Level: ${report.environmentalRiskLevel}
Confidence: ${report.confidenceLevel}

Recommendations:
${report.recommendedImmediateActions.map((a, i) => `${i+1}. ${a}`).join('\n')}
`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AQUA-TRACE-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (rendering) return <ReportSkeleton />;

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 animate-fade-in-up">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium text-slate-400 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handlePlayAudio}
            disabled={isAudioLoading}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
              isPlaying ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {isAudioLoading ? 'Synthesizing...' : isPlaying ? 'Stop Audio' : 'Listen'}
          </button>
          <button onClick={handleDownload} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium text-slate-300">
            Download
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up delay-100">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Likely Category</h3>
          <p className="text-2xl font-semibold text-white">{report.likelyPollutionCategory}</p>
          <div className="mt-4"><RiskBadge level={report.environmentalRiskLevel} /></div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Confidence</h3>
            <ConfidenceBadge level={report.confidenceLevel} />
          </div>
          <p className="text-sm text-slate-300 italic mb-4">"{report.riskJustification}"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-6 animate-fade-in-up delay-200">
          <h3 className="text-lg font-medium text-white mb-4">Environmental Impact</h3>
          <p className="text-slate-300 leading-relaxed text-sm">{report.environmentalImpactExplanation}</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-6 animate-fade-in-up delay-200">
          <h3 className="text-lg font-medium text-white mb-4">Human Health</h3>
          <p className="text-slate-300 leading-relaxed text-sm">{report.humanHealthImplications}</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6 animate-fade-in-up delay-300">
        <h3 className="text-lg font-medium text-white mb-4">Action Plan</h3>
        <ul className="space-y-3">
          {report.recommendedImmediateActions.map((action, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="min-w-6 h-6 rounded-full bg-cyan-900 text-cyan-400 flex items-center justify-center text-xs font-bold mt-0.5">{idx + 1}</div>
              <span className="text-slate-300 text-sm">{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {sources.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-800 animate-fade-in-up delay-400">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Nearby Resources & Verified Sources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.map((source, i) => (
              <a 
                key={i} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-700 rounded-lg group transition-all"
              >
                <span className="text-xs text-slate-300 font-medium truncate pr-2">{source.title || 'Nearby Resource'}</span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
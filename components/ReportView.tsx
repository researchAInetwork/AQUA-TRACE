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

export const ReportView: React.FC<ReportViewProps> = ({ report, sources = [], onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
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
      alert("Audio synthesis unavailable.");
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handleDownload = () => {
    const timestamp = new Date().toISOString();
    const text = `AQUA-TRACE ENVIRONMENTAL REPORT\nID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}\nTIMESTAMP: ${timestamp}\n\nRISK ASSESSMENT: ${report.environmentalRiskLevel}\nCATEGORY: ${report.likelyPollutionCategory}\n\nIMPACT SUMMARY:\n${report.environmentalImpactExplanation}\n\nRECOMMENDED ACTIONS:\n${report.recommendedImmediateActions.join('\n- ')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AQUA-TRACE-REPORT-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in-up">
      
      {/* Summary Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <h2 className="text-3xl font-black text-white tracking-tight">Impact Profile</h2>
             <RiskBadge level={report.environmentalRiskLevel} />
          </div>
          <p className="text-slate-400 text-sm max-w-md">Comprehensive visual analysis of surface water quality and associated biological risks.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handlePlayAudio}
            disabled={isAudioLoading}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              isPlaying ? 'bg-cyan-500 text-white' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            {isAudioLoading ? 'Synthesizing...' : isPlaying ? 'Stop Audio' : 'Audio Brief'}
          </button>
          <button onClick={handleDownload} className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:border-slate-700">
            Export Data
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Classification</h3>
            <ConfidenceBadge level={report.confidenceLevel} />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">{report.likelyPollutionCategory}</p>
            <p className="text-xs text-slate-400 italic">"{report.riskJustification}"</p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Observable Indicators</h3>
          <div className="flex flex-wrap gap-2">
            {report.observedIndicators.map((indicator, i) => (
              <span key={i} className="text-[10px] font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-900/50 px-2 py-1 rounded capitalize">
                {indicator}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Narrative Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-3 bg-cyan-500"></span>
            Ecological Projection
          </h3>
          <div className="bg-slate-900/20 border border-slate-800/50 p-5 rounded-xl">
             <p className="text-slate-300 leading-relaxed text-sm">{report.environmentalImpactExplanation}</p>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-3 bg-red-500"></span>
            Human Health Risk
          </h3>
          <div className="bg-slate-900/20 border border-slate-800/50 p-5 rounded-xl">
             <p className="text-slate-300 leading-relaxed text-sm">{report.humanHealthImplications}</p>
          </div>
        </div>
      </div>

      {/* Actionable Recommendations */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-8 rounded-2xl space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Recommended Response Protocol</h3>
          <p className="text-xs text-slate-500">Immediate containment and monitoring steps derived from observed severity.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.recommendedImmediateActions.map((action, idx) => (
            <div key={idx} className="flex items-start gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-xl group hover:border-cyan-900/50 transition-all">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-cyan-500 flex items-center justify-center text-[10px] font-bold border border-slate-800 group-hover:bg-cyan-950 transition-all">{idx + 1}</div>
              <span className="text-slate-300 text-xs leading-normal">{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Field Resources */}
      {sources.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Grounding Context & Local Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map((source, i) => (
              <a 
                key={i} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl group hover:border-slate-700 transition-all overflow-hidden"
              >
                <div className="flex flex-col gap-1 overflow-hidden">
                  <span className="text-[10px] text-slate-500 font-bold uppercase truncate">{source.title || 'Resource'}</span>
                  <span className="text-[9px] text-cyan-600 font-mono truncate">{source.uri}</span>
                </div>
                <svg className="w-4 h-4 text-slate-700 group-hover:text-cyan-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
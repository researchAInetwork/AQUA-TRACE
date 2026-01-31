import React from 'react';

interface HeaderProps {
  onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAbout }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950 flex-shrink-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-[0.2em] text-white uppercase leading-none">AQUA-TRACE</h1>
            <p className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase mt-1">Impact Intelligence v1.2</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2">
            <div className="h-4 w-px bg-slate-800 mx-2"></div>
            <div className="flex items-center gap-3">
              <span className="flex flex-col items-end">
                <span className="text-[9px] text-slate-500 uppercase tracking-tighter">Model Protocol</span>
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Gemini 2.5 Flash</span>
              </span>
            </div>
          </div>
          
          <button 
            onClick={onOpenAbout}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            System Info
          </button>
        </nav>
      </div>
    </header>
  );
};
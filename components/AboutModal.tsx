import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up">
        
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur border-b border-slate-700 p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-800">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </div>
             <h2 className="text-xl font-bold text-white">About AQUA-TRACE</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 space-y-8">
          
          <section>
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-3">System Overview</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              AQUA-TRACE is an advanced environmental intelligence system designed to democratize water pollution monitoring. By leveraging <strong>Gemini 3's multimodal reasoning capabilities</strong>, the system analyzes visual evidence of surface water contamination to produce rapid, structured risk assessments for NGOs, environmental agencies, and community monitors.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Capabilities
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>• Visual pattern recognition of pollutants</li>
                <li>• Ecological impact projection</li>
                <li>• Human health risk estimation</li>
                <li>• Audio synthesis of technical reports</li>
              </ul>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
               <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Limitations
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>• Cannot detect invisible chemical agents</li>
                <li>• Estimates based on surface appearance only</li>
                <li>• Subject to image quality and lighting</li>
                <li>• Not a substitute for lab analysis</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-3">Responsible AI Usage</h3>
            <div className="bg-blue-900/10 border-l-4 border-blue-500 p-4 rounded-r">
               <p className="text-slate-300 text-sm leading-relaxed">
                 This tool is intended for <strong>triage and screening purposes only</strong>. The AI-generated assessments should be used to prioritize locations for professional on-site inspection and chemical verification. Do not use AQUA-TRACE results as the sole basis for legal enforcement, public health alerts, or regulatory compliance without corroborating data.
               </p>
            </div>
          </section>

          <section className="text-center pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              Powered by Google Gemini 3 (Pro & Flash Audio Models)
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

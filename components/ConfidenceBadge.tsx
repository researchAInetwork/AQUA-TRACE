
import React from 'react';
import { ConfidenceLevel } from '../types.ts';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ level }) => {
  const getStyles = () => {
    switch (level) {
      case ConfidenceLevel.HIGH:
        return 'bg-emerald-900/30 text-emerald-400 border-emerald-800';
      case ConfidenceLevel.MODERATE:
        return 'bg-blue-900/30 text-blue-400 border-blue-800';
      case ConfidenceLevel.LOW:
        return 'bg-amber-900/30 text-amber-400 border-amber-800';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStyles()}`}>
      {level}
    </span>
  );
};

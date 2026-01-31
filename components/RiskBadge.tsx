
import React from 'react';
import { RiskLevel } from '../types.ts';

interface RiskBadgeProps {
  level: RiskLevel;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const getStyles = () => {
    switch (level) {
      case RiskLevel.HIGH:
        return 'bg-red-900/30 text-red-400 border-red-800';
      case RiskLevel.MEDIUM:
        return 'bg-amber-900/30 text-amber-400 border-amber-800';
      case RiskLevel.LOW:
        return 'bg-emerald-900/30 text-emerald-400 border-emerald-800';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStyles()}`}>
      {level} Risk
    </span>
  );
};

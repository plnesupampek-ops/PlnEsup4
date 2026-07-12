import React from 'react';
import { ClipboardList, Camera, Percent, TrendingUp } from 'lucide-react';
import { formatNumber } from '../lib/utils';

interface WOUP3CardProps {
  totalWo: number;
  totalWoCctv: number;
  onDetailClick?: (isCctv: boolean) => void;
  title?: string;
}

export const WOUP3Card: React.FC<WOUP3CardProps> = ({ totalWo, totalWoCctv, onDetailClick, title = "TOTAL WO UP3" }) => {
  const percent = totalWo === 0 ? 100 : Math.round((totalWoCctv / totalWo) * 100);

  return (
    <div className="dashboard-card flex flex-col shrink-0">
      <div className="bg-gradient-to-r from-[#06b6d4] to-[#1b3d5d] p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-brand-secondary p-1 rounded text-white">
            <ClipboardList size={12} />
          </div>
          <h3 className="text-[10px] font-black text-white tracking-widest uppercase">{title}</h3>
        </div>
        <TrendingUp size={12} className="text-brand-accent" />
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Row 1: Total WO & WO CCTV */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 rounded transition-colors"
            onClick={() => onDetailClick?.(false)}
          >
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <ClipboardList size={18} />
            </div>
            <div>
              <h4 className="text-[8px] font-black text-gray-400 tracking-widest uppercase mb-0.5">TOTAL WO</h4>
              <p className="text-xl font-black text-brand-primary leading-none">{formatNumber(totalWo)}</p>
            </div>
          </div>

          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 rounded transition-colors"
            onClick={() => onDetailClick?.(true)}
          >
            <div className="bg-brand-primary/5 p-2 rounded-lg text-brand-primary">
              <Camera size={18} />
            </div>
            <div>
              <h4 className="text-[8px] font-black text-gray-400 tracking-widest uppercase mb-0.5">WO CCTV</h4>
              <p className="text-xl font-black text-brand-primary leading-none">{formatNumber(totalWoCctv)}</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 w-full" />

        {/* Row 2: Percent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-accent/10 p-2 rounded-lg text-brand-primary">
              <Percent size={18} />
            </div>
            <div>
              <h4 className="text-[8px] font-black text-gray-400 tracking-widest uppercase mb-0.5">PERSENTASE</h4>
              <div className="flex items-baseline gap-0.5">
                <p className="text-2xl font-black text-brand-primary leading-none">{percent}</p>
                <span className="text-xs font-black text-brand-secondary">%</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 max-w-[100px] ml-4">
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-brand-secondary h-full transition-all duration-1000 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

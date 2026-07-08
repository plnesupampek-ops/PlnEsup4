import React from 'react';
import { Building2, Camera, Percent } from 'lucide-react';
import { ULPPerformance } from '../types';
import { formatNumber } from '../lib/utils';

interface ULPStatsCardProps {
  ulpData: ULPPerformance[];
  allUlps?: string[];
  onDetailClick?: (ulp: string, isCctv: boolean) => void;
  title?: string;
}

export const ULPStatsCard: React.FC<ULPStatsCardProps> = ({ ulpData, allUlps, onDetailClick, title = "TOTAL WO PER ULP" }) => {
  // If we only have 1 ULP in ulpData, we only show that selected ULP
  const ulpNames = ulpData.length === 1
    ? [ulpData[0].ulp]
    : (allUlps && allUlps.length > 0 ? allUlps : [
        "BUKITTINGGI",
        "PADANG PANJANG",
        "LUBUK SIKAPING",
        "LUBUK BASUNG",
        "SIMPANG EMPAT",
        "BASO",
        "KOTO TUO"
      ]);

  // Map data to the order of ULPs, handling potential missing data
  const sortedData = ulpNames.map(name => {
    const found = ulpData.find(d => d.ulp.toUpperCase() === name.toUpperCase() || d.ulp.toUpperCase().includes(name.toUpperCase()));
    return found || {
      ulp: name,
      jumlahWoTotal: 0,
      totalWoPakaiCctv: 0,
      persenWo: "100%",
      jumlahPoTotal: 0,
      totalPoPakaiCctv: 0,
      persenPo: "100%",
      persenPenggunaanCctv: "100%"
    };
  });

  return (
    <div className="dashboard-card flex flex-col mt-6 flex-1">
      <div className="bg-emerald-500 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-brand-accent p-1.5 rounded text-brand-primary">
            <Building2 size={14} />
          </div>
          <h3 className="text-[11px] font-black text-white tracking-widest uppercase">{title}</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {sortedData.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-brand-accent/30 transition-all group">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-[10px] font-black text-brand-primary tracking-wider uppercase">{item.ulp}</h4>
              <div className="flex items-center gap-1 bg-brand-primary/5 px-2 py-0.5 rounded text-brand-primary">
                <Percent size={10} />
                <span className="text-[10px] font-black">{item.persenWo}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div 
                className="flex flex-col cursor-pointer hover:bg-black/5 p-1 rounded transition-colors"
                onClick={() => onDetailClick?.(item.ulp, false)}
              >
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">WO TOTAL</span>
                <span className="text-lg font-black text-gray-700 leading-none">{formatNumber(item.jumlahWoTotal)}</span>
              </div>
              <div 
                className="flex flex-col cursor-pointer hover:bg-black/5 p-1 rounded transition-colors"
                onClick={() => onDetailClick?.(item.ulp, true)}
              >
                <span className="text-[8px] font-bold text-brand-primary uppercase tracking-tighter">WO CCTV</span>
                <div className="flex items-center gap-1">
                  <Camera size={10} className="text-brand-primary" />
                  <span className="text-lg font-black text-brand-primary leading-none">{formatNumber(item.totalWoPakaiCctv)}</span>
                </div>
              </div>
            </div>

            <div className="mt-2 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-brand-accent h-full transition-all duration-1000"
                style={{ width: item.persenWo }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

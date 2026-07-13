import React from 'react';
import { Filter, Calendar, ChevronDown, Search, RotateCcw, RefreshCw } from 'lucide-react';

interface SubHeaderProps {
  lastSync: string;
  summary: {
    totalWo: number;
    latestWoDate: string;
    totalCctv: number;
    latestCctvDate: string;
    totalPo: number;
    latestPoDate: string;
    totalAnomali: number;
    latestAnomaliDate: string;
  };
  selectedUlp: string;
  onUlpChange: (ulp: string) => void;
  ulpList: string[];
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  activeTab: 'CCTV' | 'ANOMALI' | 'OVER_SLA' | 'RATING' | 'YANTEK_OPTIMITATION' | 'ADMIN';
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  selectedUp3?: string;
  onUp3Change?: (up3: string) => void;
  up3List?: string[];
  onRefresh?: () => void;
}

export const SubHeader: React.FC<SubHeaderProps> = ({ 
  lastSync, 
  summary, 
  selectedUlp, 
  onUlpChange,
  ulpList,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  activeTab,
  selectedMonth,
  onMonthChange,
  selectedUp3 = "UP3 BUKITTINGGI",
  onUp3Change,
  up3List = [],
  onRefresh
}) => {
  const defaultUp3List = ["UP3 BUKITTINGGI", "UP3 PADANG", "UP3 SOLOK", "UP3 PAYAKUMBUH", "UP4 SUMBAR"];
  const finalUp3List = (up3List && up3List.length > 0) ? up3List : defaultUp3List;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-brand-secondary rounded-full" />
          <h2 className="text-2xl font-black italic tracking-tighter text-brand-primary">
            {activeTab === 'CCTV' ? (
              <>MONITORING <span className="text-brand-secondary">CCTV</span></>
            ) : activeTab === 'ANOMALI' ? (
              <>MONITORING <span className="text-brand-secondary">ANOMALI DATA YANDAL</span></>
            ) : activeTab === 'OVER_SLA' ? (
              <>MONITORING <span className="text-brand-secondary">OVER SLA RPT DAN RCT</span></>
            ) : activeTab === 'YANTEK_OPTIMITATION' ? (
              <>OPTIMASI <span className="text-brand-secondary">KINERJA YANTEK</span></>
            ) : activeTab === 'ADMIN' ? (
              <>HALAMAN <span className="text-brand-secondary">ADMIN PANEL</span></>
            ) : (
              <>MONITORING <span className="text-brand-secondary">RATING</span></>
            )}
          </h2>
        </div>
        
         <div className="flex flex-wrap items-center gap-3">
          {/* WO Badge */}
          <div className="bg-blue-50 border border-blue-200 text-blue-950 rounded-xl px-3 py-1 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black tracking-wider text-blue-800 uppercase">DATA WO</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xs font-black tracking-tight text-blue-900">{summary.totalWo}</span>
              <span className="text-[8px] font-semibold text-blue-700 whitespace-nowrap">
                Last: {summary.latestWoDate}
              </span>
            </div>
          </div>

          {/* CCTV Badge */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl px-3 py-1 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black tracking-wider text-emerald-800 uppercase">DATA CCTV</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xs font-black tracking-tight text-emerald-900">{summary.totalCctv}</span>
              <span className="text-[8px] font-semibold text-emerald-700 whitespace-nowrap">
                Last: {summary.latestCctvDate}
              </span>
            </div>
          </div>

          {/* PO Badge */}
          <div className="bg-purple-50 border border-purple-200 text-purple-950 rounded-xl px-3 py-1 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black tracking-wider text-purple-800 uppercase">DATA PO</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xs font-black tracking-tight text-purple-900">{summary.totalPo}</span>
              <span className="text-[8px] font-semibold text-purple-700 whitespace-nowrap">
                Last: {summary.latestPoDate}
              </span>
            </div>
          </div>

          {/* ANOMALI Badge */}
          <div className="bg-amber-50 border border-amber-200 text-amber-905 rounded-xl px-3 py-1 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black tracking-wider text-amber-800 uppercase">DATA ANOMALI</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xs font-black tracking-tight text-amber-900">{summary.totalAnomali}</span>
              <span className="text-[8px] font-semibold text-amber-700 whitespace-nowrap">
                Last: {summary.latestAnomaliDate}
              </span>
            </div>
          </div>

          {/* Synchronized date info */}
          <div className="hidden xl:flex items-center gap-1.5 text-gray-400 pl-2">
            <RefreshCw size={10} className="animate-spin-slow animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-wider">SYNC: {lastSync}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 gap-4">
          <div className="flex items-center gap-2 text-gray-400 border-r border-gray-200 pr-4">
            <Filter size={16} />
          </div>

          {/* Filter UP3 - Posisi sebelum Filter Tanggal */}
          <div className="relative group border-r border-gray-200 pr-4">
            <button className="flex items-center gap-2 text-[10px] font-black text-brand-primary tracking-wider hover:opacity-70 transition-opacity uppercase">
              <span className="text-[9px] font-black text-gray-400">UP3:</span>
              {selectedUp3 || "UP SUMBAR"}
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] py-2">
              <button 
                onClick={() => onUp3Change?.("UP SUMBAR")}
                className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-600 hover:bg-gray-50 hover:text-brand-primary uppercase"
              >
                UP SUMBAR
              </button>
              {finalUp3List.map((up3) => (
                <button 
                  key={up3}
                  onClick={() => onUp3Change?.(up3)}
                  className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-600 hover:bg-gray-50 hover:text-brand-primary uppercase"
                >
                  {up3}
                </button>
              ))}
            </div>
          </div>
          
          {activeTab === 'YANTEK_OPTIMITATION' ? (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-gray-400 uppercase">PILIH BULAN:</span>
              <input 
                type="month" 
                value={selectedMonth || ""}
                onChange={(e) => onMonthChange?.(e.target.value)}
                className="bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-bold text-brand-primary outline-none focus:border-brand-secondary transition-colors"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-gray-400 uppercase">MULAI:</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-bold text-brand-primary outline-none focus:border-brand-secondary transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-gray-400 uppercase">AKHIR:</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="bg-white border border-gray-200 rounded px-2 py-1 text-[10px] font-bold text-brand-primary outline-none focus:border-brand-secondary transition-colors"
                />
              </div>
            </div>
          )}
          
          <div className="h-6 w-px bg-gray-200" />
          
          <div className="relative group">
            <button className="flex items-center gap-2 text-[10px] font-black text-brand-primary tracking-wider hover:opacity-70 transition-opacity uppercase">
              {selectedUlp || "SEMUA KANTOR UNIT"}
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] py-2">
              <button 
                onClick={() => onUlpChange("")}
                className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-600 hover:bg-gray-50 hover:text-brand-primary uppercase"
              >
                SEMUA KANTOR UNIT
              </button>
              {ulpList.map(ulp => (
                <button 
                  key={ulp}
                  onClick={() => onUlpChange(ulp)}
                  className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-600 hover:bg-gray-50 hover:text-brand-primary uppercase"
                >
                  {ulp}
                </button>
              ))}
            </div>
          </div>
          
        </div>

        <button 
          onClick={() => {
            onUlpChange("");
            onStartDateChange("");
            onEndDateChange("");
            onUp3Change?.("UP3 BUKITTINGGI");
          }}
          className="bg-brand-secondary/10 text-brand-secondary p-2.5 rounded-xl hover:bg-brand-secondary/20 transition-colors"
        >
          <RotateCcw size={18} />
        </button>

        <button 
          onClick={onRefresh}
          className="bg-brand-secondary text-white px-6 py-2.5 rounded-xl font-black text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-brand-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <RefreshCw size={14} />
          SINKRON PAKSA
        </button>
      </div>
    </div>
  );
};

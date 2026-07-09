import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, TrendingUp, Users, Zap, ShieldCheck, ChevronLeft, ChevronRight, RotateCcw, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DashboardData } from '../types.ts';

interface RatingPageProps {
  data: DashboardData;
  selectedUp3?: string;
  ulpToUp3Map?: Record<string, string>;
  isUpSumbar?: boolean;
}

export const RatingPage: React.FC<RatingPageProps> = ({ data, selectedUp3, ulpToUp3Map = {}, isUpSumbar: isUpSumbarProp }) => {
  const { rating } = data;
  const isUpSumbar = isUpSumbarProp !== undefined ? isUpSumbarProp : (!selectedUp3 || selectedUp3 === "UP SUMBAR");

  const up3Ratings = React.useMemo(() => {
    const up3s = ["UP3 PADANG", "UP3 SOLOK", "UP3 BUKITTINGGI", "UP3 PAYAKUMBUH"];
    return up3s.map(up3Name => {
      const targetUp3Clean = up3Name.toUpperCase().replace(/^UP3\s+/i, "").replace(/[^A-Z0-9]/g, "").trim();
      const ulpsForThisUp3 = rating.ulpRatings.filter(u => {
        const uName = u.namaUlp.toUpperCase();
        const mappedUp3 = ulpToUp3Map[uName] || "";
        const mappedUp3Clean = mappedUp3.toUpperCase().replace(/^UP3\s+/i, "").replace(/[^A-Z0-9]/g, "").trim();
        return mappedUp3Clean === targetUp3Clean;
      });

      const totalWoPlnMobile = ulpsForThisUp3.reduce((sum, u) => sum + u.totalWoPlnMobile, 0);
      const rating5 = ulpsForThisUp3.reduce((sum, u) => sum + u.rating5, 0);
      const rating34 = ulpsForThisUp3.reduce((sum, u) => sum + u.rating34, 0);
      const rating12 = ulpsForThisUp3.reduce((sum, u) => sum + u.rating12, 0);
      const noRating = ulpsForThisUp3.reduce((sum, u) => sum + u.noRating, 0);
      const cumPct = totalWoPlnMobile > 0 ? Math.round((rating5 / totalWoPlnMobile) * 100) : 100;

      return {
        namaUlp: up3Name,
        totalWoPlnMobile,
        rating5,
        rating34,
        rating12,
        noRating,
        percentageKomulatif: cumPct + "%"
      };
    }).sort((a, b) => b.totalWoPlnMobile - a.totalWoPlnMobile);
  }, [rating.ulpRatings, ulpToUp3Map]);

  const [currentPage, setCurrentPage] = useState(1);
  const [currentKPPage, setCurrentKPPage] = useState(1);
  const [selectedRegu, setSelectedRegu] = useState('Semua Regu');
  const [selectedUnit, setSelectedUnit] = useState('Semua Unit');
  const rowsPerPage = 33;
  const [selectedKPRegu, setSelectedKPRegu] = useState('Semua Regu');
  const [selectedKPUnit, setSelectedKPUnit] = useState('Semua Unit');

  const totalPct = rating.totalWoPlnMobile > 0 
    ? Math.round((rating.rating5 / rating.totalWoPlnMobile) * 100)
    : 100;

  const [modalData, setModalData] = useState<{ isOpen: boolean; title: string; data: any[][] }>({
    isOpen: false,
    title: "",
    data: []
  });

  const [modalPage, setModalPage] = useState(1);
  const modalItemsPerPage = 30;

  useEffect(() => {
    setModalPage(1);
  }, [modalData.data]);

  const modalTotalPages = Math.ceil(modalData.data.length / modalItemsPerPage) || 1;
  const paginatedModalData = modalData.data.slice(
    (modalPage - 1) * modalItemsPerPage,
    modalPage * modalItemsPerPage
  );

  const sidebarCards = [
    { label: "% KOMULATIF", value: `${totalPct}%`, color: totalPct === 100 ? "bg-emerald-500" : "bg-red-500", textColor: "text-white", clickable: false },
    { label: "TOTAL WO", value: rating.totalWoPlnMobile.toLocaleString(), color: "bg-blue-600", textColor: "text-white", clickable: true, detail: rating.totalWoPlnMobileList },
    { label: "RATING 5", value: rating.rating5.toLocaleString(), color: "bg-emerald-600", textColor: "text-white", clickable: true, detail: rating.rating5List },
    { label: "RATING 3-4", value: rating.rating34.toLocaleString(), color: "bg-amber-400", textColor: "text-slate-900", clickable: true, detail: rating.rating34List },
    { label: "RATING 1-2", value: rating.rating12.toLocaleString(), color: "bg-rose-600", textColor: "text-white", clickable: true, detail: rating.rating12List },
    { label: "NO RATING", value: rating.noRating.toLocaleString(), color: "bg-slate-800", textColor: "text-white", clickable: true, detail: rating.noRatingList },
  ];

  const handleCardClick = (card: typeof sidebarCards[0]) => {
    if (!card.clickable || !card.detail) return;
    setModalData({
      isOpen: true,
      title: card.label,
      data: card.detail
    });
  };

  const handleOfficerCellClick = (officerName: string, label: string, list: any[][]) => {
    // Filter rows where the officer's name is in row[2] (officersStr)
    const filtered = list.filter(row => {
      const officersStr = String(row[2] || "").toLowerCase();
      return officersStr.includes(officerName.toLowerCase());
    });
    
    setModalData({
      isOpen: true,
      title: `${officerName.toUpperCase()} - ${label}`,
      data: filtered
    });
  };

  const handleKPCellClick = (ulpName: string, reguName: string, label: string, list: any[][]) => {
    // Filter rows where:
    // row[3] (ULP) matches ulpName
    // row[6] (REGU) matches reguName
    const filtered = list.filter(row => {
      const u = String(row[3] || "").trim().toUpperCase();
      const r = String(row[6] || "").trim().toUpperCase();
      return u === ulpName.toUpperCase() && r === reguName.toUpperCase();
    });

    setModalData({
      isOpen: true,
      title: `${ulpName.toUpperCase()} (${reguName.toUpperCase()}) - ${label}`,
      data: filtered
    });
  };

  const uniqueRegus = ['Semua Regu', ...[...new Set(rating.officerRatings.map(officer => officer.regu).filter(Boolean))].sort()];
  const uniqueUnits = ['Semua Unit', ...[...new Set(rating.officerRatings.map(officer => officer.ulp).filter(Boolean))].sort()];
  const uniqueKPRegus = ['Semua Regu', ...[...new Set(rating.kpRatings.map(kp => kp.regu).filter(Boolean))].sort()];
  const uniqueKPUnits = ['Semua Unit', ...[...new Set(rating.kpRatings.map(kp => kp.ulp).filter(Boolean))].sort()];

  const filteredOfficers = rating.officerRatings.filter(officer => {
    const matchRegu = selectedRegu === 'Semua Regu' || officer.regu === selectedRegu;
    const matchUnit = selectedUnit === 'Semua Unit' || officer.ulp === selectedUnit;
    return matchRegu && matchUnit;
  });

  const totalPages = Math.ceil(filteredOfficers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredOfficers.slice(startIndex, startIndex + rowsPerPage);

  const filteredKPs = rating.kpRatings.filter(kp => {
    const matchUnit = selectedKPUnit === 'Semua Unit' || kp.ulp === selectedKPUnit;
    const matchRegu = selectedKPRegu === 'Semua Regu' || kp.regu === selectedKPRegu;
    return matchUnit && matchRegu;
  });

  return (
    <div className="flex flex-col gap-8 relative px-2 pb-12">
      {modalData.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20"
          >
            <div className="bg-brand-primary p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-brand-secondary" size={24} />
                <h3 className="text-xl font-black italic tracking-tighter uppercase">DETAIL DATA: {modalData.title}</h3>
              </div>
              <button 
                onClick={() => setModalData(prev => ({ ...prev, isOpen: false }))}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <ChevronLeft size={24} className="rotate-90 md:rotate-0" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#1b3d5d] text-white">
                    <tr className="text-[11px] font-black uppercase italic tracking-tighter">
                      <th className="p-4 border-b border-white/10 whitespace-nowrap">NO LAPORAN</th>
                      <th className="p-4 border-b border-white/10 whitespace-nowrap">TANGGAL</th>
                      <th className="p-4 border-b border-white/10 whitespace-nowrap">NAMA PETUGAS</th>
                      <th className="p-4 border-b border-white/10 whitespace-nowrap">ULP</th>
                      <th className="p-4 border-b border-white/10 whitespace-nowrap">RATING</th>
                      <th className="p-4 border-b border-white/10 whitespace-nowrap">SUMBER LAPOR</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-black italic uppercase text-brand-primary">
                      {paginatedModalData.length > 0 ? (
                        paginatedModalData.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                            {row.slice(0, 6).map((cell, j) => (
                              <td key={j} className="p-4 whitespace-nowrap">{cell}</td>
                            ))}
                          </tr>
                        ))
                      ) : (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-gray-400">TIDAK ADA DATA DITEMUKAN</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[10px] font-black text-gray-400 uppercase">
                MENAMPILKAN {Math.min(modalPage * modalItemsPerPage, modalData.data.length)} DARI {modalData.data.length} DATA
              </span>
              
              {modalTotalPages > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm font-sans">
                  <button
                    onClick={() => setModalPage(prev => Math.max(prev - 1, 1))}
                    disabled={modalPage === 1}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] text-brand-primary font-black disabled:opacity-35 disabled:cursor-not-allowed transition-all hover:bg-slate-50"
                  >
                    PREV
                  </button>
                  <span className="text-[10px] font-black tracking-tight text-slate-600 px-2 min-w-[75px] text-center">
                    HLM {modalPage} / {modalTotalPages}
                  </span>
                  <button
                    onClick={() => setModalPage(prev => Math.min(modalTotalPages, prev + 1))}
                    disabled={modalPage === modalTotalPages}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] text-brand-primary font-black disabled:opacity-35 disabled:cursor-not-allowed transition-all hover:bg-slate-50"
                  >
                    NEXT
                  </button>
                </div>
              )}

              <button 
                onClick={() => setModalData(prev => ({ ...prev, isOpen: false }))}
                className="bg-brand-primary text-white px-6 py-2 rounded-xl text-xs font-black uppercase italic tracking-widest hover:bg-brand-primary/90 transition-all active:scale-95 shadow-lg shadow-brand-primary/20"
              >
                TUTUP
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* TOP METRICS: RINGKASAN DATA UP3 (Horizontal) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {sidebarCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => handleCardClick(card)}
            className={`${card.color} p-4 rounded-xl shadow-md border border-white/10 flex flex-col items-center justify-center text-center ${card.clickable ? 'cursor-pointer hover:scale-105 hover:shadow-lg transition-all active:scale-95' : ''} relative overflow-hidden h-24`}
          >
            <div className="absolute top-0 right-0 p-1 opacity-20 text-white">
              <Zap size={20} />
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${card.textColor} opacity-80 mb-1 z-10`}>{card.label}</p>
            <h3 className={`text-xl font-black italic ${card.textColor} z-10 tracking-tighter`}>{card.value}</h3>
            {card.clickable && (
              <div className={`mt-1 text-[7.5px] font-black uppercase tracking-widest ${card.textColor} opacity-50 border-t border-current/20 pt-1 w-full z-10`}>
                Lihat Detail
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* COLUMN 1: RINGKASAN DATA ULP (LEFT) - Reduced width and matched height */}
        <div className="lg:w-56 xl:w-64 flex flex-col min-w-0">
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full">
            <div className="px-5 py-4 bg-[#1b3d5d] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl text-brand-secondary">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black italic tracking-tighter uppercase leading-none">
                    {isUpSumbar ? "RINGKASAN DATA UP3" : "RINGKASAN DATA ULP"}
                  </h3>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-h-[1200px] scrollbar-thin scrollbar-thumb-gray-200 bg-slate-50/30">
              {(isUpSumbar ? up3Ratings : rating.ulpRatings).map((ulp, idx) => (
                <ULPSummaryCard key={idx} ulp={ulp} delay={idx * 0.05} />
              ))}
            </div>

            <div className="bg-slate-50 px-4 py-3 border-t border-gray-100 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">
                {isUpSumbar ? `TOTAL ${up3Ratings.length} UP3` : `TOTAL ${rating.ulpRatings.length} ULP`}
              </span>
            </div>
          </div>
        </div>

        {/* COLUMN 2: RATING PLN MOBILE PER PETUGAS (MIDDLE) - Equal weight */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full">
            <div className="px-5 py-4 bg-gradient-to-r from-[#06b6d4] to-[#1b3d5d] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl text-brand-secondary">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black italic tracking-tighter uppercase leading-none">RATING PER PETUGAS</h3>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 justify-end max-w-[50%]">
                <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl border border-white/20">
                  <span className="text-[8px] font-black uppercase text-white/60 shrink-0">UNIT:</span>
                  <select 
                    value={selectedUnit}
                    onChange={(e) => {
                      setSelectedUnit(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-white text-[8px] font-black uppercase outline-none cursor-pointer min-w-0"
                  >
                    {uniqueUnits.map(unit => (
                      <option key={unit} value={unit} className="text-brand-primary">{unit}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl border border-white/20">
                  <span className="text-[8px] font-black uppercase text-white/60 shrink-0">REGU:</span>
                  <select 
                    value={selectedRegu}
                    onChange={(e) => {
                      setSelectedRegu(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-white text-[8px] font-black uppercase outline-none cursor-pointer min-w-0"
                  >
                    {uniqueRegus.map(regu => (
                      <option key={regu} value={regu} className="text-brand-primary">{regu}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[1200px] scrollbar-thin scrollbar-thumb-gray-200">
              <table className="w-full text-center border-collapse">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-[#06b6d4] to-[#1b3d5d]">
                  <tr className="text-white text-[9px] font-black uppercase tracking-tight leading-none bg-transparent">
                    <th rowSpan={2} className="p-0.5 min-w-[140px]">
                      <div className="bg-[#3b82f6] py-4 px-4 rounded-xl h-full flex items-center justify-start border border-white/10">PETUGAS</div>
                    </th>
                    <th rowSpan={2} className="p-0.5 min-w-[100px]">
                      <div className="bg-[#eab308] py-4 px-4 rounded-xl h-full flex items-center justify-start border border-white/10">UNIT</div>
                    </th>
                    <th colSpan={6} className="p-0.5">
                      <div className="bg-[#f43f5e] py-2 rounded-xl border border-white/10">KOMULATIF RATING PELAYANAN</div>
                    </th>
                  </tr>
                  <tr className="text-white text-[8px] font-black uppercase tracking-tight leading-none bg-transparent">
                    <th className="p-0.5 w-16">
                      <div className="bg-[#334155] p-2.5 rounded-lg border border-white/10">WO</div>
                    </th>
                    <th className="p-0.5 w-14">
                      <div className="bg-[#059669] p-2.5 rounded-lg border border-white/10">R5</div>
                    </th>
                    <th className="p-0.5 w-14">
                      <div className="bg-[#ca8a04] p-2.5 rounded-lg border border-white/10">R3-4</div>
                    </th>
                    <th className="p-0.5 w-14">
                      <div className="bg-[#dc2626] p-2.5 rounded-lg border border-white/10">R1-2</div>
                    </th>
                    <th className="p-0.5 w-14">
                      <div className="bg-[#111827] p-2.5 rounded-lg border border-white/10 opacity-80">N/R</div>
                    </th>
                    <th className="p-0.5 w-16">
                      <div className="bg-[#2b2b2b] p-2.5 rounded-lg border border-white/10 text-brand-secondary italic">%</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item, idx) => {
                      return (
                        <tr key={idx} className="border-b border-gray-50 text-[10px] font-bold italic text-brand-primary hover:bg-blue-50/30 transition-colors group">
                          <td className="px-4 py-[5.2px] text-left border-r border-gray-50 uppercase tracking-tight group-hover:text-blue-700 font-black truncate max-w-[140px]">{item.name}</td>
                          <td className="px-4 py-[5.2px] text-left border-r border-gray-50 uppercase tracking-tight text-gray-400 font-medium truncate max-w-[100px]">{item.ulp}</td>
                          <td 
                            onClick={() => handleOfficerCellClick(item.name, 'TOTAL WO', rating.totalWoPlnMobileList)}
                            className="px-2 py-[5.2px] border-r border-gray-50 font-black text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            {item.totalWoPlnMobile}
                          </td>
                          <td 
                            onClick={() => handleOfficerCellClick(item.name, 'RATING 5', rating.rating5List)}
                            className="px-2 py-[5.2px] border-r border-gray-50 text-emerald-600 font-black cursor-pointer hover:bg-emerald-50 transition-colors"
                          >
                            {item.rating5}
                          </td>
                          <td 
                            onClick={() => handleOfficerCellClick(item.name, 'RATING 3-4', rating.rating34List)}
                            className="px-2 py-[5.2px] border-r border-gray-50 text-amber-600 font-black cursor-pointer hover:bg-amber-50 transition-colors"
                          >
                            {item.rating34}
                          </td>
                          <td 
                            onClick={() => handleOfficerCellClick(item.name, 'RATING 1-2', rating.rating12List)}
                            className="px-2 py-[5.2px] border-r border-gray-50 text-rose-600 font-black cursor-pointer hover:bg-rose-50 transition-colors"
                          >
                            {item.rating12}
                          </td>
                          <td 
                            onClick={() => handleOfficerCellClick(item.name, 'NO RATING', rating.noRatingList)}
                            className="px-2 py-[5.2px] border-r border-gray-50 bg-slate-50 text-slate-800 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            {item.noRating}
                          </td>
                          <td className="p-0">
                            <div className={`w-full py-[5.2px] flex items-center justify-center font-black italic text-white text-[10px] ${item.percentageKomulatif === '100%' ? 'bg-emerald-500' : 'bg-rose-600'}`}>
                              {item.percentageKomulatif}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-20 text-center text-gray-200 font-black italic uppercase text-xs">TIDAK ADA DATA</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">
                {currentPage}/{totalPages}
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-brand-primary disabled:opacity-20 hover:border-brand-primary transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-brand-primary disabled:opacity-20 hover:border-brand-primary transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3: RATING PER KANTOR PELAYANAN (RIGHT) - Equal weight */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-r from-[#1b3d5d] to-[#06b6d4] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl text-brand-secondary">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black italic tracking-tighter uppercase leading-none">RATING PER KANTOR PELAYANAN</h3>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 justify-end max-w-[50%]">
                <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl border border-white/20">
                  <span className="text-[8px] font-black uppercase text-white/60 shrink-0">UNIT:</span>
                  <select 
                    value={selectedKPUnit}
                    onChange={(e) => setSelectedKPUnit(e.target.value)}
                    className="bg-transparent text-white text-[8px] font-black uppercase outline-none cursor-pointer min-w-0"
                  >
                    {uniqueKPUnits.map(u => (
                      <option key={u} value={u} className="text-brand-primary">{u}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl border border-white/20">
                  <span className="text-[8px] font-black uppercase text-white/60 shrink-0">REGU:</span>
                  <select 
                    value={selectedKPRegu}
                    onChange={(e) => setSelectedKPRegu(e.target.value)}
                    className="bg-transparent text-white text-[8px] font-black uppercase outline-none cursor-pointer min-w-0"
                  >
                    {uniqueKPRegus.map(r => (
                      <option key={r} value={r} className="text-brand-primary">{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-200">
              <table className="w-full text-center border-collapse">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-[#1b3d5d] to-[#06b6d4]">
                  <tr className="text-white text-[9px] font-black uppercase tracking-tight leading-none bg-transparent">
                    <th rowSpan={2} className="p-0.5 min-w-[140px]">
                      <div className="bg-[#3b82f6] py-4 px-4 rounded-xl h-full flex items-center justify-start border border-white/10 text-left">KANTOR PELAYANAN</div>
                    </th>
                    <th rowSpan={2} className="p-0.5 min-w-[100px]">
                      <div className="bg-[#eab308] py-4 px-4 rounded-xl h-full flex items-center justify-start border border-white/10 text-left">UNIT</div>
                    </th>
                    <th colSpan={6} className="p-0.5">
                      <div className="bg-[#f43f5e] py-2 rounded-xl border border-white/10">KOMULATIF RATING PELAYANAN</div>
                    </th>
                  </tr>
                  <tr className="text-white text-[8px] font-black uppercase tracking-tight leading-none bg-transparent">
                    <th className="p-0.5 w-16">
                      <div className="bg-[#334155] p-2.5 rounded-lg border border-white/10">WO</div>
                    </th>
                    <th className="p-0.5 w-14">
                      <div className="bg-[#059669] p-2.5 rounded-lg border border-white/10">R5</div>
                    </th>
                    <th className="p-0.5 w-14">
                      <div className="bg-[#ca8a04] p-2.5 rounded-lg border border-white/10">R3-4</div>
                    </th>
                    <th className="p-0.5 w-14">
                      <div className="bg-[#dc2626] p-2.5 rounded-lg border border-white/10">R1-2</div>
                    </th>
                    <th className="p-0.5 w-14">
                      <div className="bg-[#111827] p-2.5 rounded-lg border border-white/10 opacity-80">N/R</div>
                    </th>
                    <th className="p-0.5 w-16">
                      <div className="bg-[#2b2b2b] p-2.5 rounded-lg border border-white/10 text-brand-secondary italic">%</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredKPs.length > 0 ? (
                    filteredKPs.map((kp, idx) => {
                      return (
                        <tr key={idx} className="border-b border-gray-50 text-[10px] font-bold italic text-brand-primary hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-[1.8px] text-left border-r border-gray-50 uppercase tracking-tight font-black group-hover:text-blue-600 truncate max-w-[140px]">{kp.namaKp}</td>
                          <td className="px-4 py-[1.8px] text-left border-r border-gray-50 uppercase tracking-tight text-slate-400 font-bold truncate max-w-[100px]">{kp.ulp}</td>
                          <td 
                            onClick={() => handleKPCellClick(kp.ulp, kp.regu, 'TOTAL WO', rating.totalWoPlnMobileList)}
                            className="px-2 py-[1.8px] border-r border-gray-50 text-slate-600 font-black cursor-pointer hover:underline hover:bg-blue-50/50 transition-all"
                          >
                            {kp.totalWoPlnMobile}
                          </td>
                          <td 
                            onClick={() => handleKPCellClick(kp.ulp, kp.regu, 'RATING 5', rating.rating5List)}
                            className="px-2 py-[1.8px] border-r border-gray-50 text-emerald-600 font-black cursor-pointer hover:underline hover:bg-emerald-50/50 transition-all"
                          >
                            {kp.rating5}
                          </td>
                          <td 
                            onClick={() => handleKPCellClick(kp.ulp, kp.regu, 'RATING 3-4', rating.rating34List)}
                            className="px-2 py-[1.8px] border-r border-gray-50 text-amber-600 font-black cursor-pointer hover:underline hover:bg-amber-50/50 transition-all"
                          >
                            {kp.rating34}
                          </td>
                          <td 
                            onClick={() => handleKPCellClick(kp.ulp, kp.regu, 'RATING 1-2', rating.rating12List)}
                            className="px-2 py-[1.8px] border-r border-gray-50 text-rose-600 font-black cursor-pointer hover:underline hover:bg-rose-50/50 transition-all"
                          >
                            {kp.rating12}
                          </td>
                          <td 
                            onClick={() => handleKPCellClick(kp.ulp, kp.regu, 'NO RATING', rating.noRatingList)}
                            className="px-2 py-[1.8px] border-r border-gray-50 bg-slate-50/50 text-slate-400 font-black cursor-pointer hover:underline hover:bg-slate-200/50 transition-all"
                          >
                            {kp.noRating}
                          </td>
                          <td className="p-0">
                            <div className={`w-full py-[1.8px] flex items-center justify-center font-black text-white text-[10px] ${kp.percentageKomulatif === '100%' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                              {kp.percentageKomulatif}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-20 text-center text-slate-200 text-xs font-black uppercase italic tracking-widest">DATA KOSONG</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 px-5 py-3 border-t border-gray-100 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">
                TOTAL {filteredKPs.length} KANTOR PELAYANAN
              </span>
            </div>
          </div>

          {/* NEWSECTION: PIE CHART PERSENTASE PER UNIT */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col mt-4 flex-1">
            <div className="px-5 py-3 bg-gradient-to-r from-[#1b3d5d] to-[#06b6d4] text-white flex items-center gap-3 shrink-0">
              <div className="p-2 bg-white/10 rounded-xl text-brand-secondary">
                <PieIcon size={18} />
              </div>
              <h3 className="text-sm font-black italic tracking-tighter uppercase leading-none">PERSENTASE WO PER UNIT (ULP)</h3>
            </div>
            <div className="flex-1 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'].map((color, index) => (
                      <linearGradient key={`grad-${index}`} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={1}/>
                        <stop offset="95%" stopColor={['#1d4ed8', '#047857', '#b45309', '#b91c1c', '#6d28d9', '#be185d', '#0e7490'][index]} stopOpacity={1}/>
                      </linearGradient>
                    ))}
                  </defs>
                  {/* Shadow layer for 3D effect */}
                  <Pie
                    data={rating.ulpRatings.map(ulp => ({
                      name: ulp.namaUlp,
                      value: ulp.totalWoPlnMobile
                    }))}
                    cx="50%"
                    cy="53%"
                    innerRadius={0}
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                    legendType="none"
                  >
                    {rating.ulpRatings.map((_, index) => (
                      <Cell 
                        key={`cell-shadow-${index}`} 
                        fill={['#1e3a8a', '#064e3b', '#78350f', '#7f1d1d', '#4c1d95', '#831843', '#164e63'][index % 7]} 
                      />
                    ))}
                  </Pie>
                  {/* Main layer */}
                  <Pie
                    data={rating.ulpRatings.map(ulp => ({
                      name: ulp.namaUlp,
                      value: ulp.totalWoPlnMobile
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent, cx, cy, midAngle, outerRadius }: any) => {
                      const RADIAN = Math.PI / 180;
                      const isRight = Math.cos(-midAngle * RADIAN) > 0;
                      const radius = typeof outerRadius === 'string' ? 60 : outerRadius + 10;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="#1e293b" 
                          textAnchor={isRight ? 'start' : 'end'} 
                          dominantBaseline="central"
                          className="text-[8px] font-black uppercase tracking-tighter"
                        >
                          {`${name} ${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                  >
                    {rating.ulpRatings.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#grad-${index % 7})`}
                        stroke="#fff"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.96)', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ 
                      fontSize: '10px', 
                      fontWeight: '900', 
                      textTransform: 'uppercase',
                      marginTop: '30px',
                      paddingTop: '10px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ULPSummaryCardProps {
  ulp: any;
  delay: number;
}

const ULPSummaryCard: React.FC<ULPSummaryCardProps> = ({ ulp, delay }) => {
  const isExcellent = ulp.percentageKomulatif === '100%';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group"
    >
      <div className="bg-[#1b3d5d] px-4 py-2 flex items-center justify-between shrink-0">
        <h4 className="text-[9px] font-black italic uppercase text-white tracking-widest truncate mr-2 leading-none">{ulp.namaUlp}</h4>
        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black ${isExcellent ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
          {ulp.percentageKomulatif}
        </div>
      </div>
      <div className="p-2 gap-2 grid grid-cols-3">
        {/* TOTAL WO */}
        <div className="bg-blue-50/50 p-1.5 rounded-lg border border-blue-100/50 flex flex-col items-center">
          <span className="text-[6px] font-black text-blue-400 uppercase tracking-tighter mb-0.5 text-center leading-none">TOTAL WO</span>
          <span className="text-xs font-black text-blue-700 leading-none">{ulp.totalWoPlnMobile}</span>
        </div>
        {/* R5 */}
        <div className="bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100/50 flex flex-col items-center">
          <span className="text-[6px] font-black text-emerald-500 uppercase tracking-tighter mb-0.5 text-center leading-none font-sans">R5</span>
          <span className="text-xs font-black text-emerald-600 leading-none">{ulp.rating5}</span>
        </div>
        {/* R3-4 */}
        <div className="bg-amber-50/50 p-1.5 rounded-lg border border-amber-100/50 flex flex-col items-center">
          <span className="text-[6px] font-black text-amber-500 uppercase tracking-tighter mb-0.5 text-center leading-none font-sans">R3-4</span>
          <span className="text-xs font-black text-amber-600 leading-none">{ulp.rating34}</span>
        </div>
        {/* R1-2 */}
        <div className="bg-rose-50/50 p-1.5 rounded-lg border border-rose-100/50 flex flex-col items-center">
          <span className="text-[6px] font-black text-rose-500 uppercase tracking-tighter mb-0.5 text-center leading-none font-sans">R1-2</span>
          <span className="text-xs font-black text-rose-600 leading-none">{ulp.rating12}</span>
        </div>
        {/* NONE */}
        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex flex-col items-center">
          <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 text-center leading-none font-sans">NONE</span>
          <span className="text-xs font-black text-slate-600 leading-none">{ulp.noRating}</span>
        </div>
        {/* % */}
        <div className={`${isExcellent ? 'bg-emerald-50' : 'bg-rose-50'} p-1.5 rounded-lg border border-current/10 flex flex-col items-center`}>
          <span className={`text-[6px] font-black uppercase tracking-tighter mb-0.5 text-center leading-none font-sans ${isExcellent ? 'text-emerald-500' : 'text-rose-500'}`}>% KOM</span>
          <span className={`text-xs font-black leading-none ${isExcellent ? 'text-emerald-600' : 'text-rose-600'}`}>
            {typeof ulp.percentageKomulatif === 'string' ? ulp.percentageKomulatif.replace('%', '') : ulp.percentageKomulatif}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

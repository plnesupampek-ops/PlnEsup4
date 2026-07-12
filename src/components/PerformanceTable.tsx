import React, { useState, useEffect } from 'react';
import { OfficerPerformance } from '../types';
import { Users, ChevronRight, TrendingUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PerformanceTableProps {
  data: OfficerPerformance[];
  onDetailClick: (type: 'WO' | 'PO', name: string, isCctv: boolean) => void;
}

export const PerformanceTable: React.FC<PerformanceTableProps> = ({ data, onDetailClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Reset page to 1 whenever search/filters change the total length of officers
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportExcel = () => {
    const headers = [
      "Nama Petugas", "ULP", "WO Total", "WO CCTV", "Persen WO (%)", "PO Total", "PO CCTV", "Persen PO (%)", "Total Performa (%)"
    ];
    const rows = data.map(item => {
      const woVal = parseFloat(item.persenWo) || 0;
      const poVal = parseFloat(item.persenPo) || 0;
      const totalAvg = ((woVal + poVal) / 2).toFixed(2);
      return [
        item.name,
        item.ulp,
        item.jumlahWoTotal,
        item.totalWoPakaiCctv,
        item.persenWo,
        item.jumlahPoTotal,
        item.totalPoPakaiCctv,
        item.persenPo,
        `${totalAvg}%`
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kinerja Petugas");
    XLSX.writeFile(wb, `Kinerja_Petugas_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="dashboard-card flex flex-col">
      <div className="bg-gradient-to-r from-[#06b6d4] to-[#1b3d5d] p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-brand-secondary p-1.5 rounded text-white">
            <Users size={14} />
          </div>
          <h3 className="text-[11px] font-black text-white tracking-widest uppercase">KINERJA PETUGAS</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white border border-white/10 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            title="Download Excel Kinerja Petugas"
          >
            <Download size={10} />
            Download Excel
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-brand-accent uppercase">PERINGKAT</span>
            <TrendingUp size={12} className="text-brand-accent" />
          </div>
        </div>
      </div>

      <div className="overflow-y-auto overflow-x-auto custom-scrollbar" style={{ height: '436px' }}>
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="border-b border-gray-100 h-[36px]">
              <th className="px-2 text-[10px] font-black text-black-600 tracking-widest uppercase whitespace-nowrap">NAMA PETUGAS</th>
              <th className="px-2 text-[10px] font-black text-black-600 tracking-widest uppercase text-center">ULP</th>
              <th className="px-2 text-[10px] font-black text-black-600 tracking-widest uppercase text-center">WO TOTAL</th>
              <th className="px-2 text-[10px] font-black text-brand-primary tracking-widest uppercase text-center">WO CCTV</th>
              <th className="px-2 text-[10px] font-black text-red-600 tracking-widest uppercase text-center">%</th>
              <th className="px-2 text-[10px] font-black text-black-600 tracking-widest uppercase text-center">PO TOTAL</th>
              <th className="px-2 text-[10px] font-black text-brand-secondary tracking-widest uppercase text-center">PO CCTV</th>
              <th className="px-2 text-[10px] font-black text-red-600 tracking-widest uppercase text-center">%</th>
              <th className="px-2 text-[10px] font-black text-blue-600 tracking-widest uppercase text-center">TOTAL %</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, i) => {
              const woVal = parseFloat(item.persenWo) || 0;
              const poVal = parseFloat(item.persenPo) || 0;
              const totalAvg = ((woVal + poVal) / 2).toFixed(2);
              
              return (
                <tr key={i} className="table-row h-[40px] border-b border-gray-50/50 last:border-0">
                  <td className="px-2 font-black text-brand-primary uppercase text-[10px] whitespace-nowrap">{item.name}</td>
                  <td className="px-2 text-center font-bold text-gray-500 uppercase text-[9px]">{item.ulp}</td>
                  <td 
                    onClick={() => onDetailClick('WO', item.name, false)}
                    className="px-2 text-center font-bold text-gray-600 text-[10px] cursor-pointer hover:bg-gray-100 hover:text-brand-primary transition-colors"
                  >
                    {item.jumlahWoTotal}
                  </td>
                  <td 
                    onClick={() => onDetailClick('WO', item.name, true)}
                    className="px-2 text-center font-bold text-brand-primary text-[10px] cursor-pointer hover:bg-brand-primary/10 transition-colors"
                  >
                    {item.totalWoPakaiCctv}
                  </td>
                  <td className="px-2 text-center font-bold text-red-600 italic text-[10px]">{item.persenWo}</td>
                  <td 
                    onClick={() => onDetailClick('PO', item.name, false)}
                    className="px-2 text-center font-bold text-gray-600 text-[10px] cursor-pointer hover:bg-gray-100 hover:text-brand-secondary transition-colors"
                  >
                    {item.jumlahPoTotal}
                  </td>
                  <td 
                    onClick={() => onDetailClick('PO', item.name, true)}
                    className="px-2 text-center font-bold text-brand-secondary text-[10px] cursor-pointer hover:bg-brand-secondary/10 transition-colors"
                  >
                    {item.totalPoPakaiCctv}
                  </td>
                  <td className="px-2 text-center font-bold text-red-600 italic text-[10px]">{item.persenPo}</td>
                  <td className="px-2 text-center font-black text-blue-600 text-[10px] bg-blue-50/30">{totalAvg}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 shrink-0">
        <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
          MENAMPILKAN {Math.min(currentPage * itemsPerPage, data.length)} DARI {data.length} PETUGAS
        </span>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-1 bg-white border border-slate-200/60 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 py-0.5 rounded-md text-[9px] text-brand-primary font-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              title="Page Sebelumnya"
            >
              PREV
            </button>
            <span className="text-[9px] font-black tracking-tight text-slate-500 px-1 min-w-[50px] text-center">
              HLM {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-0.5 rounded-md text-[9px] text-brand-primary font-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              title="Page Selanjutnya"
            >
              NEXT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

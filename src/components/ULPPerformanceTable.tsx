import React from 'react';
import { ULPPerformance } from '../types';
import { Building2, TrendingUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ULPPerformanceTableProps {
  data: ULPPerformance[];
  onDetailClick: (type: 'WO' | 'PO', ulpName: string, isCctv: boolean) => void;
}

export const ULPPerformanceTable: React.FC<ULPPerformanceTableProps> = ({ data, onDetailClick }) => {
  const handleExportExcel = () => {
    const headers = [
      "Unit Layanan (ULP)", "WO Total", "WO CCTV", "Persen WO (%)", "PO Total", "PO CCTV", "Persen PO (%)", "Total Performa (%)"
    ];
    const rows = data.map(item => {
      const woVal = parseFloat(item.persenWo) || 0;
      const poVal = parseFloat(item.persenPo) || 0;
      const totalAvg = ((woVal + poVal) / 2).toFixed(2);
      return [
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
    XLSX.utils.book_append_sheet(wb, ws, "Kinerja ULP");
    XLSX.writeFile(wb, `Kinerja_ULP_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="dashboard-card flex flex-col mt-6">
      <div className="bg-gradient-to-r from-[#1b3d5d] to-[#06b6d4] p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-brand-accent p-1.5 rounded text-brand-primary">
            <Building2 size={14} />
          </div>
          <h3 className="text-[11px] font-black text-white tracking-widest uppercase">REKAPITULASI KINERJA PER ULP</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white border border-white/10 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            title="Download Excel Kinerja ULP"
          >
            <Download size={10} />
            Download Excel
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-brand-accent uppercase">SUMMARY</span>
            <TrendingUp size={12} className="text-brand-accent" />
          </div>
        </div>
      </div>

      <div className="overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="border-b border-gray-100">
              <th className="p-2 text-[10px] font-black text-gray-400 tracking-widest uppercase whitespace-nowrap">UNIT LAYANAN (ULP)</th>
              <th className="p-2 text-[10px] font-black text-gray-400 tracking-widest uppercase text-center">WO TOTAL</th>
              <th className="p-2 text-[10px] font-black text-brand-primary tracking-widest uppercase text-center">WO CCTV</th>
              <th className="p-2 text-[10px] font-black text-red-500 tracking-widest uppercase text-center">%</th>
              <th className="p-2 text-[10px] font-black text-gray-400 tracking-widest uppercase text-center">PO TOTAL</th>
              <th className="p-2 text-[10px] font-black text-brand-secondary tracking-widest uppercase text-center">PO CCTV</th>
              <th className="p-2 text-[10px] font-black text-red-500 tracking-widest uppercase text-center">%</th>
              <th className="p-2 text-[10px] font-black text-blue-600 tracking-widest uppercase text-center">TOTAL %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => {
              const woVal = parseFloat(item.persenWo) || 0;
              const poVal = parseFloat(item.persenPo) || 0;
              const totalAvg = ((woVal + poVal) / 2).toFixed(2);
              
              return (
                <tr key={i} className="table-row h-[40px]">
                  <td className="p-2 font-black text-brand-primary uppercase text-[10px] whitespace-nowrap">{item.ulp}</td>
                  <td 
                    onClick={() => onDetailClick('WO', item.ulp, false)}
                    className="p-2 text-center font-bold text-gray-600 text-[10px] cursor-pointer hover:bg-gray-100 hover:text-brand-primary transition-colors"
                  >
                    {item.jumlahWoTotal}
                  </td>
                  <td 
                    onClick={() => onDetailClick('WO', item.ulp, true)}
                    className="p-2 text-center font-bold text-brand-primary text-[10px] cursor-pointer hover:bg-brand-primary/10 transition-colors"
                  >
                    {item.totalWoPakaiCctv}
                  </td>
                  <td className="p-2 text-center font-bold text-red-600 italic text-[10px]">{item.persenWo}</td>
                  <td 
                    onClick={() => onDetailClick('PO', item.ulp, false)}
                    className="p-2 text-center font-bold text-gray-600 text-[10px] cursor-pointer hover:bg-gray-100 hover:text-brand-secondary transition-colors"
                  >
                    {item.jumlahPoTotal}
                  </td>
                  <td 
                    onClick={() => onDetailClick('PO', item.ulp, true)}
                    className="p-2 text-center font-bold text-brand-secondary text-[10px] cursor-pointer hover:bg-brand-secondary/10 transition-colors"
                  >
                    {item.totalPoPakaiCctv}
                  </td>
                  <td className="p-2 text-center font-bold text-red-600 italic text-[10px]">{item.persenPo}</td>
                  <td className="p-2 text-center font-black text-blue-600 text-[10px] bg-blue-50/30">{totalAvg}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { OverSLAData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface OverSLAPageProps {
  data: OverSLAData;
  onDetailClick?: (criteria: string, value?: string) => void;
}

export const OverSLAPage: React.FC<OverSLAPageProps> = ({ data, onDetailClick }) => {
  const COLORS = ['#26C6DA', '#FFD700', '#9C27B0', '#4CAF50', '#F44336', '#FF9800'];
  const [rptPage, setRptPage] = useState(1);
  const itemsPerRptPage = 15;

  useEffect(() => {
    setRptPage(1);
  }, [data]);

  const totalRptPages = Math.ceil(data.woOverSlaRptList.length / itemsPerRptPage) || 1;
  const paginatedRptList = useMemo(() => {
    const startIndex = (rptPage - 1) * itemsPerRptPage;
    return data.woOverSlaRptList.slice(startIndex, startIndex + itemsPerRptPage);
  }, [data.woOverSlaRptList, rptPage]);

  const handleBarClick = (barData: any) => {
    if (onDetailClick && barData && barData.name) {
      onDetailClick('ULP', barData.name);
    }
  };

  const handleExportOverSlaRptExcel = () => {
    const headers = ["No Laporan", "Tgl Laporan", "Nama Petugas", "RPT", "RCT"];
    const rows = data.woOverSlaRptList;
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Over SLA RPT");
    XLSX.writeFile(wb, `Over_SLA_RPT_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-8 relative px-2 pb-12">
      {/* Top Section - 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Summary Cards (col-span-2) */}
        <div className="lg:col-span-2 h-full">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm h-full flex flex-col">
            <div className="px-4 py-2 bg-gradient-to-r from-[#06b6d4] to-[#1b3d5d] text-white flex items-center gap-2 shrink-0">
              <h4 className="text-sm font-black italic tracking-tighter uppercase">RINGKASAN DATA</h4>
            </div>
            <div className="p-3 flex flex-col gap-3 flex-1 bg-gray-50/30">
              <StatCard label="TOTAL JUMLAH GANGGUAN" value={data.totalGangguan} color="#4CAF50" onClick={() => onDetailClick?.('ALL')} />
              <StatCard label="DURASI RPT TERTINGGI" value={data.highestRpt} color="#FF7043" onClick={() => onDetailClick?.('HIGHEST_RPT')} />
              <StatCard label="DURASI RCT TERTINGGI" value={data.highestRct} color="#616161" onClick={() => onDetailClick?.('HIGHEST_RCT')} />
              <StatCard label="WO RPT > 30 MNT" value={data.countRptOver30} color="#1565C0" onClick={() => onDetailClick?.('RPT_OVER_30')} />
              <StatCard label="WO RPT > 45 MNT" value={data.countRptOver45} color="#C62828" onClick={() => onDetailClick?.('RPT_OVER_45')} />
              <StatCard label="RATA-RATA RPT" value={data.avgRpt} color="#43A047" onClick={() => onDetailClick?.('AVG_RPT')} />
              <StatCard label="RATA-RATA RCT" value={data.avgRct} color="#2E7D32" onClick={() => onDetailClick?.('AVG_RCT')} />
            </div>
          </div>
        </div>
 
        {/* Center Column - Large Table (col-span-6) */}
        <div className="lg:col-span-6 h-full">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col shadow-sm h-full">
            <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#1b3d5d] to-[#06b6d4] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-white/30 rounded-full" />
                <h3 className="text-sm font-black italic tracking-tighter uppercase">
                  DAFTAR WO <span className="text-green-100">OVER SLA RPT</span>
                </h3>
              </div>
              <button
                onClick={handleExportOverSlaRptExcel}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white border border-white/10 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-sm"
                title="Download Excel Over SLA RPT"
              >
                <Download size={10} />
                Excel
              </button>
            </div>
            
            <div className="overflow-x-auto flex-1 max-h-[520px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-widest">No Laporan</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-widest">Tgl Laporan</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-widest">Nama Petugas</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-widest">RPT</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-widest">RCT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedRptList.map((row, idx) => (
                    <motion.tr 
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.01 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-[12px] font-black text-brand-primary">{row[0]}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">{row[1]}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600 font-bold">{row[2]}</td>
                      <td className="px-4 py-3 text-[12px] font-black text-right text-brand-secondary">{row[3]}</td>
                      <td className="px-4 py-3 text-[12px] font-black text-right text-brand-primary">{row[4]}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-end items-center text-[10px] text-gray-400 font-bold gap-4">
               <span className="uppercase tracking-widest">
                 MENAMPILKAN {Math.min(rptPage * itemsPerRptPage, data.woOverSlaRptList.length)} DARI {data.woOverSlaRptList.length} DATA
               </span>
               <div className="flex gap-2 items-center">
                 <button 
                   onClick={() => setRptPage(prev => Math.max(1, prev - 1))}
                   disabled={rptPage === 1}
                   className="hover:text-brand-primary disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed"
                   title="Previous Page"
                 >
                   <ChevronLeft size={14}/>
                 </button>
                 <span className="font-mono text-[10px] text-gray-500 font-black px-1">
                   Halaman {rptPage} / {totalRptPages}
                 </span>
                 <button 
                   onClick={() => setRptPage(prev => Math.min(totalRptPages, prev + 1))}
                   disabled={rptPage === totalRptPages}
                   className="hover:text-brand-primary disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed"
                   title="Next Page"
                 >
                   <ChevronRight size={14}/>
                 </button>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column - Small Tables (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Officer RPT Table */}
          <SmallTable 
            title="JUMLAH WO" 
            subtitle="OVER SLA RPT PER PETUGAS" 
            headers={['NAMA PETUGAS', 'JML WO']}
            data={data.officerOverSlaRpt.map(o => [o.name, o.count])}
            color="#EF5350"
            highlightCol={1}
            headerBg="bg-gradient-to-r from-[#06b6d4] to-[#1b3d5d]"
          />

          {/* Officer RCT Table */}
          <SmallTable 
            title="JUMLAH WO" 
            subtitle="OVER SLA RCT PER PETUGAS" 
            headers={['NAMA PETUGAS', 'JML WO']}
            data={data.officerOverSlaRct.map(o => [o.name, o.count])}
            color="#FF7043"
            highlightCol={1}
            headerBg="bg-gradient-to-r from-[#1b3d5d] to-[#06b6d4]"
          />
        </div>
      </div>

      {/* Bottom Section - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row gap-8">
          {/* ULP Bar Chart */}
          <div className="flex-1 min-h-[300px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-brand-secondary rounded-full" />
              <h3 className="text-sm font-black italic tracking-tighter text-brand-primary uppercase">
                JUMLAH WO OVER <span className="text-brand-secondary">SLA MENURUT ULP</span>
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.ulpDistribution} layout="vertical" margin={{ left: -20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.05} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} fontSize={9} stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#26C6DA" 
                  radius={[0, 4, 4, 0]} 
                  label={{ position: 'right', fontSize: 10, fill: '#444', fontWeight: 'bold' }} 
                  onClick={handleBarClick}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Shift Pie Chart */}
          <div className="w-full md:w-1/3 min-h-[300px] border-l border-gray-50 pl-0 md:pl-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-[#FFD700] rounded-full" />
              <h3 className="text-sm font-black italic tracking-tighter text-brand-primary uppercase">
                SEBARAN <span className="text-[#FFD700]">PER SHIFT</span>
              </h3>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.shiftDistribution}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.shiftDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 text-center">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total WO</span>
              <div className="text-2xl font-black text-brand-primary italic tracking-tighter leading-none">{data.totalGangguan}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number | string; color: string; onClick?: () => void }> = ({ label, value, color, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm relative overflow-hidden group text-left transition-all hover:border-brand-primary/30 hover:shadow-md cursor-pointer disabled:cursor-default"
    disabled={!onClick}
  >
    <div className="absolute top-0 right-0 w-16 h-16 bg-gray-50/50 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
    <span className="text-[14px] font-black italic tracking-tighter text-gray-400 uppercase mb-1 block leading-none">
      {label}
    </span>
    <div className="flex items-center gap-1.5">
      <div className="w-1 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xl font-black text-brand-primary italic tracking-tighter leading-none">
        {value}
      </span>
    </div>
  </button>
);

const SmallTable: React.FC<{ 
  title: string; 
  subtitle: string; 
  headers: string[]; 
  data: any[][]; 
  color: string; 
  highlightCol?: number;
  headerBg?: string;
}> = ({ title, subtitle, headers, data, color, highlightCol, headerBg }) => {
  const handleExportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 30));
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${subtitle.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <div className={`px-4 py-2 flex items-center justify-between ${headerBg ? `${headerBg} text-white` : 'border-b border-gray-50 bg-gray-50/50'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-1 h-3 rounded-full ${headerBg ? 'bg-white/30' : ''}`} style={!headerBg ? { backgroundColor: color } : {}} />
          <h4 className="text-sm font-black italic tracking-tighter uppercase">
            {title} <span style={!headerBg ? { color } : {}} className={headerBg ? 'text-white/80' : ''}>{subtitle}</span>
          </h4>
        </div>
        <button
          onClick={handleExportExcel}
          className={`p-1 rounded-lg border cursor-pointer hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center ${
            headerBg ? 'border-white/10 text-white hover:bg-white/10' : 'border-gray-200 text-gray-500 hover:bg-gray-100'
          }`}
          title={`Download Excel ${title} ${subtitle}`}
        >
          <Download size={11} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-3 py-1.5 text-left text-sm font-bold text-gray-400 uppercase">#</th>
              {headers.map((h, i) => (
                <th key={i} className={`px-3 py-1.5 text-left text-sm font-bold text-gray-400 uppercase ${i === headers.length - 1 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-1.5 text-[12px] text-gray-400 font-mono">{idx + 1}</td>
                {row.map((cell, i) => (
                  <td key={i} className={`px-3 py-1.5 text-[12px] font-bold ${i === row.length - 1 ? 'text-right' : 'text-gray-700 truncate max-w-[150px]'} ${i === highlightCol ? 'text-brand-secondary bg-brand-secondary/5' : ''}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};



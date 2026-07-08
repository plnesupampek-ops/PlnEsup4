import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headers: string[];
  rows: any[][];
}

export function DetailModal({ isOpen, onClose, title, headers, rows }: DetailModalProps) {
  if (!isOpen) return null;

  const handleExportExcel = () => {
    // Generate formatted rows based on display values in UI
    const formattedRows = rows.map(row => 
      row.map((cell, j) => formatCellValue(cell, headers[j]))
    );

    const ws = XLSX.utils.aoa_to_sheet([headers, ...formattedRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Detail");

    // Save file as .xlsx
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`);
  };

  const isDateColumn = (header: string) => {
    const h = header.toUpperCase();
    return h.includes('TGL') || h.includes('TANGGAL') || h.includes('DATE') || h.includes('TIME') || h.includes('CHECK IN') || h.includes('JAM');
  };

  const formatCellValue = (value: any, header: string) => {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (!str) return '';

    if (isDateColumn(header)) {
      // 1. Handle serial dates (numeric)
      // Standardize comma to dot for parsing
      const normalizedStr = str.replace(',', '.');
      // Look for a numeric value that represents a serial date
      // Era 2020-2030 is roughly 43831 to 51136. 0.xxx are time-only serials.
      if (/^\d{5}(\.\d+)?$/.test(normalizedStr) || (/^0\.\d+$/.test(normalizedStr)) || (/^\d+\.\d+$/.test(normalizedStr) && parseFloat(normalizedStr) > 30000)) {
        const serial = parseFloat(normalizedStr);
        const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
        
        // If it's a pure time serial (< 1), only show time
        const showDate = serial >= 1;
        
        return date.toLocaleString('id-ID', {
          day: showDate ? '2-digit' : undefined,
          month: showDate ? '2-digit' : undefined,
          year: showDate ? 'numeric' : undefined,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/\./g, ':');
      }

      const parseManual = (s: string) => {
        const months: Record<string, number> = {
          'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'juni': 5,
          'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'jun': 5, 'jul': 6, 'agu': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
        };
        
        // Separate date and time by searching for first space or T (ISO)
        let dateStr = s;
        let timeStr = '';
        const spaceIdx = s.indexOf(' ');
        const tIdx = s.indexOf('T');
        const splitIdx = spaceIdx !== -1 ? spaceIdx : (tIdx !== -1 ? tIdx : -1);
        
        if (splitIdx !== -1) {
          dateStr = s.substring(0, splitIdx).trim();
          timeStr = s.substring(splitIdx + 1).trim();
        }

        const dateParts = dateStr.toLowerCase().split(/[-/.\s,]+/);
        if (dateParts.length >= 3) {
          let day = parseInt(dateParts[0]);
          let monthStr = dateParts[1];
          let month = months[monthStr];
          let year = parseInt(dateParts[2]);
          
          if (isNaN(month)) {
            month = parseInt(monthStr) - 1;
          }

          if (isNaN(month) || month < 0 || month > 11) {
            // Try YYYY-MM-DD
            day = parseInt(dateParts[2]);
            monthStr = dateParts[1];
            month = months[monthStr];
            if (isNaN(month)) month = parseInt(monthStr) - 1;
            year = parseInt(dateParts[0]);
          }

          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
            const date = new Date(year, month, day);
            
            // Handle time part
            if (timeStr) {
               const timeMatch = timeStr.match(/(\d{1,2})[:.](\d{1,2})([:.](\d{1,2}))?/);
               if (timeMatch) {
                 date.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), parseInt(timeMatch[4] || '0'));
               }
            }
            return date;
          }
        }
        return null;
      };

      const d = parseManual(str) || new Date(str);
      if (d instanceof Date && !isNaN(d.getTime())) {
        return d.toLocaleString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/\./g, ':');
      }
    }

    return str;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-7xl h-full max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-cyan-600 text-white p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-[#0a1128]" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-widest uppercase">{title}</h3>
                <p className="text-[10px] font-bold text-brand-accent/60 tracking-widest uppercase">DETAIL DATA DARI GOOGLE SHEETS</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all"
              >
                <Download size={14} />
                EXPORT EXCELL
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-red-500 transition-colors rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto p-4 bg-gray-50 custom-scrollbar">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto max-h-full">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="sticky top-0 z-10 bg-gray-100 shadow-sm">
                  <tr className="border-b border-gray-200">
                    {headers.map((header, i) => (
                      <th key={i} className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap border-r border-gray-200 last:border-0">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-3 text-[11px] font-medium text-gray-700 whitespace-nowrap border-r border-gray-100 last:border-0">
                            {formatCellValue(cell, headers[j])}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={headers.length} className="px-4 py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                        Tidak ada data yang ditemukan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 p-3 border-t border-gray-200 flex justify-between items-center">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
              TOTAL: {rows.length} BARIS DATA
            </p>
            <p className="text-[10px] font-black text-gray-300 tracking-[0.3em] uppercase">
              PLN ELECTRICITY SERVICES • UL SOLOK
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

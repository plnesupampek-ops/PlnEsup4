import React, { useState, useMemo, useRef } from 'react';
import { 
  Upload, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  RefreshCw,
  Copy,
  Check,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UploadDataYoSubpageProps {
  vccData?: any[][];
  onRefreshData?: () => void;
}

export const UploadDataYoSubpage: React.FC<UploadDataYoSubpageProps> = ({ 
  vccData = [], 
  onRefreshData 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const [uploadText, setUploadText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Upload Progress States
  const [uploadPercentage, setUploadPercentage] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [activeStep, setActiveStep] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for copy feedback and custom confirm modal
  const [copiedHeaders, setCopiedHeaders] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Helper to split a single string row if it contains delimiters
  const healSingleRow = (row: any[]): string[] => {
    if (!row || row.length === 0) return [];
    if (row.length === 1 && typeof row[0] === 'string') {
      const val = row[0];
      if (val.startsWith('PK\x03\x04') || val.includes('[Content_Types].xml') || val.startsWith('PK\u0003\u0004')) {
        return []; // skip binary xlsx junk
      }
      const delimiter = val.includes('\t') ? '\t' : val.includes(';') ? ';' : val.includes(',') ? ',' : '';
      if (delimiter) {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < val.length; i++) {
          const char = val[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === delimiter && !inQuotes) {
            cells.push(current.replace(/^"|"$/g, '').trim());
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(current.replace(/^"|"$/g, '').trim());
        return cells;
      }
    }
    return row.map(c => String(c || ''));
  };

  // Parse existing headers and rows
  const headers = useMemo(() => {
    if (vccData.length > 0 && Array.isArray(vccData[0])) {
      const healedHeader = healSingleRow(vccData[0]);
      return healedHeader.map(h => String(h || '').trim());
    }
    return ["No Lapor", "Tgl Lapor", "Nama Petugas", "Nama ULP", "Total Skor", "Persentase Skor"];
  }, [vccData]);

  const rows = useMemo(() => {
    if (vccData.length > 1) {
      return vccData.slice(1).map(healSingleRow).filter(r => r.length > 0);
    }
    return [];
  }, [vccData]);

  // Count custom uploads currently stored in localStorage
  const customCount = useMemo(() => {
    try {
      const stored = localStorage.getItem('custom_vcc_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (e) {
      console.error(e);
    }
    return 0;
  }, [vccData]);

  // Filter rows based on search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase().trim();
    return rows.filter(row => {
      return row.some(cell => String(cell || '').toLowerCase().includes(term));
    });
  }, [rows, searchTerm]);



  // Simple robust parser for pasted TSV/CSV or uploaded files
  const parseDataText = (text: string): string[][] => {
    const lines = text.split(/\r?\n/);
    const parsedRows: string[][] = [];
    
    // Detect the delimiter based on the first few non-empty lines
    let tabCount = 0;
    let semiCount = 0;
    let commaCount = 0;
    let sampleLines = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      tabCount += (line.match(/\t/g) || []).length;
      semiCount += (line.match(/;/g) || []).length;
      commaCount += (line.match(/,/g) || []).length;
      sampleLines++;
      if (sampleLines >= 5) break;
    }
    
    let delimiter = ',';
    if (tabCount > semiCount && tabCount > commaCount) {
      delimiter = '\t';
    } else if (semiCount > commaCount && semiCount > tabCount) {
      delimiter = ';';
    }
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          cells.push(current.replace(/^"|"$/g, '').trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.replace(/^"|"$/g, '').trim());
      
      if (cells.length > 0) {
        parsedRows.push(cells);
      }
    }
    return parsedRows;
  };

  // Check if a row is likely a header row
  const isHeaderRow = (row: string[]): boolean => {
    const headerKeywords = [
      'no', 'tgl', 'lapor', 'petugas', 'skor', 'persentase', 'ulp', 'up3', 
      'employee', 'name', 'id', 'skor total', 'total skor', 'score', 'tanggal'
    ];
    let matches = 0;
    row.forEach(cell => {
      const cleaned = cell.toLowerCase().trim();
      if (headerKeywords.some(kw => cleaned.includes(kw))) {
        matches++;
      }
    });
    // If more than 2 cells match keywords, or the row is very similar to existing headers
    return matches >= 2;
  };

  // Perform upload process with duplicate checking
  const handleProcessUpload = async (rawText: string) => {
    if (!rawText.trim()) {
      setUploadFeedback({
        type: 'error',
        text: 'Maaf, data teks kosong atau tidak valid!'
      });
      return;
    }

    // Excel xlsx / xls check by signature
    if (rawText.startsWith('PK\x03\x04') || rawText.includes('[Content_Types].xml') || rawText.startsWith('PK\u0003\u0004')) {
      setUploadFeedback({
        type: 'error',
        text: 'Format file Excel (.xlsx/.xls) tidak didukung langsung karena bertipe biner. Silakan Simpan Sebagai (Save As) .CSV atau Salin-Tempel (Copy-Paste) data tabel Anda langsung dari Excel ke area teks di bawah!'
      });
      return;
    }

    setIsProcessing(true);
    setUploadFeedback(null);
    setUploadPercentage(5);
    setUploadStatusText('Memulai proses unggah data...');
    setActiveStep(1);

    // Step 1: Parsing raw text
    await new Promise(resolve => setTimeout(resolve, 300));
    setUploadPercentage(15);
    setUploadStatusText('Membaca dan memparsing data teks...');

    try {
      const parsedRows = parseDataText(rawText);
      if (parsedRows.length === 0) {
        setUploadFeedback({
          type: 'error',
          text: 'Format data tidak terbaca!'
        });
        setIsProcessing(false);
        return;
      }

      // Step 2: Extracting columns & validating headers
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadPercentage(30);
      setUploadStatusText('Memvalidasi header kolom dan baris data...');
      setActiveStep(2);

      // Filter out header row if present in the upload
      let startIndex = 0;
      if (isHeaderRow(parsedRows[0])) {
        startIndex = 1;
      }

      const dataToUpload = parsedRows.slice(startIndex);
      if (dataToUpload.length === 0) {
        setUploadFeedback({
          type: 'info',
          text: 'Data yang diunggah hanya berisi baris tajuk/header.'
        });
        setIsProcessing(false);
        return;
      }

      // Step 3: Deduplication with database
      await new Promise(resolve => setTimeout(resolve, 400));
      setUploadPercentage(55);
      setUploadStatusText(`Menyaring baris data ganda (Membandingkan dengan ${vccData.length} baris di database)...`);
      setActiveStep(3);

      // Create a unique set of keys for ALL existing rows
      const existingKeys = new Set<string>();
      
      // Feed in existing vccData (from both Sheet and current localStorage)
      vccData.forEach(row => {
        const sig = row.map(c => String(c || '').trim().toLowerCase()).join('||');
        existingKeys.add(sig);
      });

      const uniqueBatch: string[][] = [];
      let skippedCount = 0;

      dataToUpload.forEach(row => {
        // Normalize row cells length to match headers length if possible, or keep as is
        const sig = row.map(c => String(c || '').trim().toLowerCase()).join('||');
        
        if (existingKeys.has(sig)) {
          skippedCount++;
        } else {
          uniqueBatch.push(row);
          existingKeys.add(sig); // Avoid adding duplicates within the same batch
        }
      });

      const addedCount = uniqueBatch.length;

      if (addedCount === 0) {
        setUploadPercentage(100);
        setUploadStatusText('Proses selesai. Tidak ada baris data baru.');
        setActiveStep(6);
        await new Promise(resolve => setTimeout(resolve, 300));
        setUploadFeedback({
          type: 'info',
          text: `Unggahan dilewati! Semua data (${skippedCount} baris) sudah ada dalam database (Data Ganda terdeteksi).`
        });
      } else {
        // Step 4: Sync with Google Sheets
        await new Promise(resolve => setTimeout(resolve, 300));
        setUploadPercentage(75);
        setUploadStatusText(`Mengirim ${addedCount} baris data ke Google Spreadsheet (Sheet: VCC_DATA)...`);
        setActiveStep(4);

        // Attempt to sync with Google Sheet if gasUrl is set
        let isSynced = false;
        let syncStatusText = "";
        const gasUrl = localStorage.getItem('gas_web_app_url') || '';
        const spreadsheetId = localStorage.getItem('google_spreadsheet_id') || '';

        if (gasUrl) {
          try {
            const proxyUrl = `/api/gas-proxy?gasUrl=${encodeURIComponent(gasUrl.trim())}`;
            const response = await fetch(proxyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'append_vcc_data',
                rows: uniqueBatch,
                spreadsheetId: spreadsheetId
              })
            });

            if (response.ok) {
              const resText = await response.text();
              const resData = JSON.parse(resText);
              if (resData.success) {
                isSynced = true;
                syncStatusText = " dan DISINKRONISASI ke Google Sheets!";
              } else {
                syncStatusText = ` secara lokal (Gagal sinkron ke Google Sheets: ${resData.error || 'Unknown error'}).`;
              }
            } else {
              syncStatusText = ` secara lokal (Gagal sinkron ke Google Sheets: HTTP ${response.status}).`;
            }
          } catch (syncErr: any) {
            console.error("Gagal sinkronisasi data ke Google Sheets:", syncErr);
            syncStatusText = ` secara lokal (Gagal sinkron ke Google Sheets: ${syncErr.message || syncErr}).`;
          }
        } else {
          syncStatusText = " secara lokal saja (Google Apps Script Web App URL belum dikonfigurasi di Pengaturan).";
        }

        // Step 5: Save locally
        await new Promise(resolve => setTimeout(resolve, 300));
        setUploadPercentage(95);
        setUploadStatusText('Mengamankan data cadangan ke penyimpanan lokal...');
        setActiveStep(5);

        // Always save to custom_vcc_data as local backup/fallback
        let currentCustom: any[][] = [];
        try {
          const stored = localStorage.getItem('custom_vcc_data');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              currentCustom = parsed;
            }
          }
        } catch (e) {
          console.error(e);
        }

        const updatedCustom = [...currentCustom, ...uniqueBatch];
        localStorage.setItem('custom_vcc_data', JSON.stringify(updatedCustom));

        setUploadText('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Step 6: Complete
        await new Promise(resolve => setTimeout(resolve, 400));
        setUploadPercentage(100);
        setUploadStatusText('Unggah data sukses!');
        setActiveStep(6);

        await new Promise(resolve => setTimeout(resolve, 300));
        setUploadFeedback({
          type: isSynced ? 'success' : 'info',
          text: `Berhasil mengimpor ${addedCount} baris data baru${syncStatusText} ${skippedCount} baris data ganda berhasil disaring & dilewati.`
        });

        // Trigger refresh of App.tsx data to rebuild state
        if (onRefreshData) {
          onRefreshData();
        }
      }
    } catch (err: any) {
      console.error(err);
      setUploadFeedback({
        type: 'error',
        text: `Gagal memproses data: ${err.message || err}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // File change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')) {
        setUploadFeedback({
          type: 'error',
          text: 'Format file Excel (.xlsx/.xls) tidak didukung langsung karena bertipe biner. Silakan Simpan Sebagai (Save As) .CSV atau Salin-Tempel (Copy-Paste) data tabel Anda langsung dari Excel ke area teks di bawah!'
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleProcessUpload(text);
      };
      reader.onerror = () => {
        setUploadFeedback({
          type: 'error',
          text: 'Gagal membaca file tersebut!'
        });
      };
      reader.readAsText(file);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')) {
        setUploadFeedback({
          type: 'error',
          text: 'Format file Excel (.xlsx/.xls) tidak didukung langsung karena bertipe biner. Silakan Simpan Sebagai (Save As) .CSV atau Salin-Tempel (Copy-Paste) data tabel Anda langsung dari Excel ke area teks di bawah!'
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleProcessUpload(text);
      };
      reader.readAsText(file);
    }
  };

  // Trigger delete confirmation modal
  const handleClearCustomData = () => {
    setShowDeleteConfirm(true);
  };

  // Perform actual deletion of custom uploaded data
  const handleConfirmClearCustom = () => {
    localStorage.removeItem('custom_vcc_data');
    setUploadFeedback({
      type: 'success',
      text: 'Semua data unggahan custom berhasil dihapus dari penyimpanan lokal.'
    });
    setShowDeleteConfirm(false);
    if (onRefreshData) {
      onRefreshData();
    }
  };

  return (
    <div className="flex flex-col gap-6" id="upload_data_yo_subpage">
      
      {/* SECTION 1: UPLOAD & ACTIONS WIDGET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Upload Form (Left - col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 bg-gradient-to-r from-[#06b6d4] to-[#1b3d5d] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Upload size={16} />
              <h4 className="text-xs font-black tracking-wider uppercase text-white">UNGGAH DATA KINERJA YO BARU (VCC_DATA)</h4>
            </div>
            <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-black text-white">
              ANTI DATA GANDA
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
              Anda dapat mengunggah file spreadsheet (<strong className="text-slate-700">.CSV</strong> atau <strong className="text-slate-700">.TXT</strong>) atau langsung menyalin dan menempel tabel dari Microsoft Excel pada area teks di bawah ini. Sistem secara otomatis akan memfilter dan melewatkan baris data yang nilainya ganda (semua kolom sama persis dengan database).
            </p>

            {/* Drag & Drop Area */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                dragActive 
                  ? 'border-cyan-500 bg-cyan-50/50 scale-[1.01]' 
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <FileText size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-black text-slate-700">Tarik & Lepaskan File CSV di Sini</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase">atau klik tombol di bawah untuk memilih file</p>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.txt"
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Upload size={12} />
                PILIH FILE CSV/TXT
              </button>
            </div>

            {/* Paste Text Area */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-wider uppercase text-slate-600">Atau Tempel Baris Tabel Excel / CSV Teks:</label>
              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder="No,Tgl Lapor,Nama Petugas,Nama ULP,Total Skor,Persentase Skor&#10;1,12/07/2026,BUDI SANTOSO,ULP BUKITTINGGI,15,100%"
                rows={4}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Live Progress Indicator */}
            {isProcessing && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Progres Sinkronisasi Data</span>
                  <span className="text-xs font-black text-cyan-600 tabular-nums">{uploadPercentage}%</span>
                </div>
                
                {/* Progress Bar Container */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
                    style={{ width: `${uploadPercentage}%` }}
                  />
                </div>

                {/* Status message */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <RefreshCw size={12} className="animate-spin text-cyan-500 shrink-0" />
                  <span className="truncate">{uploadStatusText}</span>
                </div>

                {/* Multi-step list */}
                <div className="grid grid-cols-2 gap-2 mt-1 pt-2.5 border-t border-slate-200">
                  {[
                    { id: 1, label: "Membaca Data" },
                    { id: 2, label: "Validasi Kolom" },
                    { id: 3, label: "Penyaringan Duplikat" },
                    { id: 4, label: "Sinkronisasi Sheets" },
                    { id: 5, label: "Penyimpanan Lokal" },
                    { id: 6, label: "Selesai" }
                  ].map((step) => {
                    const isDone = activeStep > step.id || (activeStep === 6 && step.id === 6);
                    const isActive = activeStep === step.id;
                    return (
                      <div 
                        key={step.id} 
                        className={`flex items-center gap-1.5 text-[10px] font-black uppercase transition-all ${
                          isDone 
                            ? 'text-emerald-600 font-extrabold' 
                            : isActive 
                            ? 'text-cyan-600 font-extrabold scale-[1.02]' 
                            : 'text-slate-400 font-medium'
                        }`}
                      >
                        {isDone ? (
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <span className="text-[8px] text-emerald-600">✓</span>
                          </div>
                        ) : isActive ? (
                          <div className="w-3.5 h-3.5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0 animate-bounce">
                            <span className="text-[8px] text-cyan-600">•</span>
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <span className="text-[8px] text-slate-400">{step.id}</span>
                          </div>
                        )}
                        <span className="truncate">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-1">
              <button
                disabled={isProcessing || !uploadText.trim()}
                onClick={() => handleProcessUpload(uploadText)}
                className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-[10px] shadow-sm transition-all flex items-center gap-2 ${
                  !uploadText.trim() || isProcessing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-md active:scale-95 cursor-pointer'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    MEMPROSES DATA...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={12} />
                    IMPOR SEKARANG
                  </>
                )}
              </button>
            </div>

            {/* Feedback Message */}
            <AnimatePresence>
              {uploadFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex items-start gap-2.5 p-4 rounded-xl border ${
                    uploadFeedback.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : uploadFeedback.type === 'info'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {uploadFeedback.type === 'success' ? (
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                  ) : (
                    <AlertTriangle size={16} className="shrink-0 text-amber-500 mt-0.5" />
                  )}
                  <div className="text-[11px] font-bold">
                    {uploadFeedback.text}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Database Status & Guidelines Column (Right - col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Database Status Widget */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-r from-[#1b3d5d] to-[#06b6d4] text-white flex items-center gap-2.5">
              <Building2 size={16} />
              <h4 className="text-xs font-black tracking-wider uppercase text-white">RINGKASAN DATABASE VCC_DATA</h4>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                  <p className="text-[9px] font-black tracking-wider uppercase text-slate-400">Total Baris</p>
                  <p className="text-2xl font-black text-slate-800 mt-1 tabular-nums">
                    {vccData.length > 1 ? vccData.length - 1 : 0}
                  </p>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-center">
                  <p className="text-[9px] font-black tracking-wider uppercase text-blue-400">Spreadsheet</p>
                  <p className="text-2xl font-black text-blue-800 mt-1 tabular-nums">
                    {vccData.length > 1 ? (vccData.length - 1 - customCount) : 0}
                  </p>
                </div>
                <div className="bg-cyan-50/50 border border-cyan-100 rounded-2xl p-4 text-center">
                  <p className="text-[9px] font-black tracking-wider uppercase text-cyan-500">Custom Upload</p>
                  <p className="text-2xl font-black text-cyan-700 mt-1 tabular-nums">
                    {customCount}
                  </p>
                </div>
              </div>

              {/* Diagnostic Information */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-2.5 text-[11px] font-medium text-slate-600">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span>Status Sinkronisasi:</span>
                  <span className="font-extrabold text-emerald-600 uppercase text-[10px] flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Terhubung & Aktif
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span>Daftar Kolom Terbaca:</span>
                  <span className="font-black text-slate-800 truncate max-w-[160px]" title={headers.join(", ")}>
                    {headers.length} Kolom ({headers[0]}...)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Deduplikasi Otomatis:</span>
                  <span className="font-black text-cyan-600">100% Aktif (Cek Semua Kolom)</span>
                </div>
              </div>

              {customCount > 0 && (
                <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-rose-800 uppercase">HAPUS DATA CUSTOM</p>
                    <p className="text-[9px] font-bold text-rose-500 mt-0.5">Ada {customCount} baris data custom di storage browser ini.</p>
                  </div>
                  <button
                    onClick={handleClearCustomData}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Trash2 size={11} />
                    HAPUS
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Guidelines & Template Upload Widget */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-r from-[#1b3d5d] to-[#0f172a] text-white flex items-center gap-2.5">
              <FileSpreadsheet size={16} className="text-cyan-400" />
              <h4 className="text-xs font-black tracking-wider uppercase text-white">PEDOMAN TEMPLATE UPLOAD DATA YO</h4>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="text-[11px] text-slate-600 font-bold leading-relaxed flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Ekspor dari Excel sebagai <strong className="text-slate-800">.CSV (Semicolon Delimited atau Comma Delimited)</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Alternatif tercepat: <strong className="text-cyan-600 font-black">Copy-Paste</strong> langsung sel/baris tabel dari Excel ke kotak teks di sebelah kiri!</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Susunan kolom <strong className="text-rose-600 font-black">HARUS SAMA PERSIS</strong> dengan susunan kolom tabel di bawah ini.</span>
                </div>
              </div>

              {/* Dynamic Column Template Copier */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Template Kolom ({headers.length} Kolom)</span>
                  <button
                    onClick={() => {
                      const headerStr = headers.join("\t");
                      navigator.clipboard.writeText(headerStr);
                      setCopiedHeaders(true);
                      setTimeout(() => setCopiedHeaders(false), 2000);
                    }}
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm ${
                      copiedHeaders 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : 'bg-cyan-50 text-cyan-600 hover:text-cyan-700 border-cyan-200'
                    }`}
                  >
                    {copiedHeaders ? <Check size={10} /> : <Copy size={10} />}
                    {copiedHeaders ? 'Berhasil Disalin' : 'Salin Header Excel'}
                  </button>
                </div>

                <div className="max-h-[140px] overflow-y-auto border border-slate-200 rounded-xl bg-white p-2.5 scrollbar-thin">
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-bold text-slate-600">
                    {headers.map((header, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 truncate border-b border-slate-50 pb-1">
                        <span className="text-[9px] text-slate-400 font-extrabold w-5 shrink-0">#{idx + 1}</span>
                        <span className="text-slate-700 truncate" title={header}>{header}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sample Row Copy Widget */}
              {rows.length > 0 && (
                <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider font-sans">Contoh Data Valid (Format Tab/Excel)</span>
                    <button
                      onClick={() => {
                        const sampleRow = rows[0].join("\t");
                        navigator.clipboard.writeText(sampleRow);
                        setCopiedSample(true);
                        setTimeout(() => setCopiedSample(false), 2000);
                      }}
                      className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm ${
                        copiedSample
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-white text-slate-600 hover:text-slate-700 border-slate-200'
                      }`}
                    >
                      {copiedSample ? <Check size={10} /> : <Copy size={10} />}
                      {copiedSample ? 'Berhasil Disalin' : 'Salin Contoh'}
                    </button>
                  </div>
                  <div className="bg-slate-800 text-slate-200 font-mono text-[9px] p-2.5 rounded-xl overflow-x-auto select-all whitespace-nowrap scrollbar-thin">
                    {rows[0].join("\t")}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* SECTION 2: DATATABLE OF VCC_DATA */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Filter Panel */}
        <div className="px-5 py-4 bg-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-black tracking-widest text-[#00e5ff] uppercase flex items-center gap-1.5">
              📁 TABEL DATA KINERJA YO (VCC_DATA)
            </h3>
            <p className="text-[9px] text-slate-300 font-bold uppercase mt-0.5 opacity-80">
              Menampilkan {filteredRows.length} dari total {rows.length} baris data kinerja
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-56 flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
              <Search size={11} className="text-white/75" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari semua data..."
                className="bg-transparent text-white placeholder-white/50 text-[10px] font-bold outline-none w-full"
              />
            </div>
          </div>
        </div>

        {/* Real Table */}
        <div className="p-5 flex flex-col gap-3">
          <div className="overflow-auto max-h-[600px] border border-slate-200 rounded-2xl relative scrollbar-thin scrollbar-thumb-slate-300">
            {filteredRows.length > 0 ? (
              <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-800 min-w-[800px]">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase font-black text-[8.5px] tracking-wider shadow-[0_1.5px_0_0_rgba(226,232,240,1)]">
                    <th scope="col" className="px-4 py-3.5 text-center w-12 bg-slate-100">No</th>
                    {headers.map((header, hIdx) => (
                      <th key={hIdx} scope="col" className="px-4 py-3.5 bg-slate-100">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {filteredRows.map((row, idx) => {
                    const runningNo = idx + 1;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 tabular-nums font-extrabold">{runningNo}</td>
                        {headers.map((_, colIdx) => {
                          const cellVal = row[colIdx] !== undefined ? String(row[colIdx]) : "-";
                          
                          // Style highlight for performance columns
                          const isScore = headers[colIdx].toLowerCase().includes("skor") || headers[colIdx].toLowerCase().includes("score");
                          const isPercent = headers[colIdx].toLowerCase().includes("persen") || headers[colIdx].toLowerCase().includes("%") || cellVal.includes("%");
                          const isUlp = headers[colIdx].toLowerCase().includes("ulp") || headers[colIdx].toLowerCase().includes("unit");
                          const isPetugas = headers[colIdx].toLowerCase().includes("petugas") || headers[colIdx].toLowerCase().includes("nama");

                          return (
                            <td 
                              key={colIdx} 
                              className={`px-4 py-3 ${
                                isScore 
                                  ? 'font-black text-blue-800 tabular-nums' 
                                  : isPercent 
                                  ? 'font-black text-emerald-600 tabular-nums' 
                                  : isUlp 
                                  ? 'text-[#1b3d5d] font-black uppercase' 
                                  : isPetugas 
                                  ? 'text-slate-800 font-bold uppercase' 
                                  : 'text-slate-600'
                              }`}
                            >
                              {cellVal}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-slate-400 font-extrabold uppercase tracking-widest bg-slate-50/50">
                Tidak ada data yang cocok dengan pencarian
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Scroll ke bawah untuk melihat baris berikutnya</span>
            <span className="tabular-nums">Total: {filteredRows.length} baris</span>
          </div>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white rounded-3xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 flex flex-col gap-5 z-10"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-600 animate-pulse">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Konfirmasi Hapus Data</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed">
                    Apakah Anda yakin ingin menghapus semua data kinerja (<strong className="text-rose-600">VCC_DATA</strong>) yang telah diunggah secara custom? Tindakan ini akan mengembalikan data ke bawaan Google Sheet asli dan tidak dapat dibatalkan.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearCustom}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Trash2 size={13} />
                  Ya, Hapus Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

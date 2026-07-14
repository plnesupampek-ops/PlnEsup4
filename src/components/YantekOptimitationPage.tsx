import React, { useMemo, useState, useEffect } from 'react';
import { DashboardData } from '../types';
import { 
  Zap, 
  TrendingUp, 
  Award, 
  Clock, 
  Gauge, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  CornerDownRight, 
  ChevronRight, 
  Sliders, 
  Cpu, 
  Activity,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Info,
  X,
  Search,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend as RechartsLegend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  LineChart, 
  Line 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface YantekOptimitationPageProps {
  data: DashboardData;
  onDetailClick?: (type: 'WO' | 'PO', identifier: string, isUlp: boolean, isCctv: boolean) => void;
  selectedMonth?: string;
  globalSelectedUlp?: string;
  selectedUp3?: string;
}

export const YantekOptimitationPage: React.FC<YantekOptimitationPageProps> = ({ 
  data, 
  onDetailClick, 
  selectedMonth,
  globalSelectedUlp,
  selectedUp3
}) => {
  const isUpSumbarMode = !selectedUp3 || selectedUp3 === "UP SUMBAR" || selectedUp3 === "UP4 SUMBAR";

  const getUp3ForUlp = (ulpName: string): string => {
    const cleanString = (s: string) => s.toUpperCase()
      .replace(/^POSKO ULP\s+/i, "")
      .replace(/^ULP\s+/i, "")
      .replace(/^POSKO\s+/i, "")
      .replace(/[^A-Z0-9]/g, "")
      .trim();

    const cleanUlp = cleanString(ulpName);

    if (data.up3ToUlps) {
      for (const [up3, ulps] of Object.entries(data.up3ToUlps as Record<string, string[]>)) {
        if (ulps.some(u => cleanString(u) === cleanUlp)) {
          return up3.toUpperCase();
        }
      }
    }
    const standardMappings: Record<string, string> = {
      "LUBUKBASUNG": "UP3 BUKITTINGGI",
      "SIMPANGEMPAT": "UP3 BUKITTINGGI",
      "BASO": "UP3 BUKITTINGGI",
      "KOTOTUO": "UP3 BUKITTINGGI",
      "BUKITTINGGI": "UP3 BUKITTINGGI",
      "LUBUKSIKAPING": "UP3 BUKITTINGGI",
      "PADANGPANJANG": "UP3 BUKITTINGGI",
      "BELANTI": "UP3 PADANG",
      "INDARUNG": "UP3 PADANG",
      "TABING": "UP3 PADANG",
      "KURANJI": "UP3 PADANG",
      "LUBUKALUNG": "UP3 PADANG",
      "PARIAMAN": "UP3 PADANG",
      "SICINCIN": "UP3 PADANG",
      "PADANG": "UP3 PADANG",
      "SOLOK": "UP3 SOLOK",
      "SAWAHLUNTO": "UP3 SOLOK",
      "MUARALABUH": "UP3 SOLOK",
      "SIJUNJUNG": "UP3 SOLOK",
      "KOTOBARU": "UP3 SOLOK",
      "ALAHANPANJANG": "UP3 SOLOK",
      "PAYAKUMBUH": "UP3 PAYAKUMBUH",
      "LIMAPULUHKOTA": "UP3 PAYAKUMBUH",
    };
    return standardMappings[cleanUlp] || "UP3 BUKITTINGGI";
  };

  const [selectedUlp, setSelectedUlp] = useState<string>('ALL');
  const [clickedCell, setClickedCell] = useState<{
    ulpKey: string;
    ulpName: string;
    category: 'green' | 'yellow' | 'red' | 'total';
    title: string;
  } | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');
  const [officerPage, setOfficerPage] = useState<number>(1);

  useEffect(() => {
    if (globalSelectedUlp) {
      setSelectedUlp(globalSelectedUlp.toUpperCase());
    } else {
      setSelectedUlp('ALL');
    }
  }, [globalSelectedUlp]);

  useEffect(() => {
    setOfficerPage(1);
  }, [selectedUlp, selectedMonth]);

  // Filter VCC_DATA by selectedMonth based on "Tgl Lapor" column
  const filteredVccData = useMemo(() => {
    const rawRows = data.vccData || [];
    if (rawRows.length <= 1) return rawRows;
    if (!selectedMonth) return rawRows;

    const headers = rawRows[0] || [];
    const idxTglLapor = headers.findIndex(h => {
      const s = String(h || "").replace(/['"]/g, "").trim().toLowerCase();
      return (
        s === "tgl lapor" || 
        s === "tgllapor" || 
        s === "tanggal lapor" || 
        s === "tanggal_lapor" || 
        s === "tgl_lapor" || 
        s === "tgl" || 
        s === "date" || 
        s === "tanggal"
      );
    });

    if (idxTglLapor === -1) {
      console.warn("Column 'Tgl Lapor' not found in VCC_DATA headers:", headers);
      return rawRows;
    }

    const INDO_MONTHS = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const parts = selectedMonth.split('-');
    const targetYear = parseInt(parts[0], 10);
    const targetMonth = parseInt(parts[1], 10);
    if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return rawRows;
    }

    const targetMonthYearString = `${INDO_MONTHS[targetMonth - 1]} ${targetYear}`.toLowerCase().trim();

    const filtered = [headers];

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;
      const tglRaw = String(row[idxTglLapor] || "").replace(/['"]/g, "").trim();
      if (!tglRaw) continue;

      let rowMonthYearString = "";
      
      // Match DD/MM/YYYY or YYYY-MM-DD
      const matchSlash = tglRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      const matchDash = tglRaw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);

      if (matchSlash) {
        // Under mm/dd/yyyy, the first group is mm (month), and third group is yyyy (year)
        const monthNum = parseInt(matchSlash[1], 10);
        const yearNum = parseInt(matchSlash[3], 10);
        if (monthNum >= 1 && monthNum <= 12) {
          rowMonthYearString = `${INDO_MONTHS[monthNum - 1]} ${yearNum}`.toLowerCase().trim();
        }
      } else if (matchDash) {
        // Under yyyy-mm-dd, the second group is mm (month), and first group is yyyy (year)
        const yearNum = parseInt(matchDash[1], 10);
        const monthNum = parseInt(matchDash[2], 10);
        if (monthNum >= 1 && monthNum <= 12) {
          rowMonthYearString = `${INDO_MONTHS[monthNum - 1]} ${yearNum}`.toLowerCase().trim();
        }
      } else {
        const parsed = new Date(tglRaw);
        if (!isNaN(parsed.getTime())) {
          const yearNum = parsed.getFullYear();
          const monthNum = parsed.getMonth() + 1;
          rowMonthYearString = `${INDO_MONTHS[monthNum - 1]} ${yearNum}`.toLowerCase().trim();
        }
      }

      if (rowMonthYearString === targetMonthYearString) {
        filtered.push(row);
      }
    }

    return filtered;
  }, [data.vccData, selectedMonth]);

  // Eviden Map state loaded from localStorage
  const [evidenMap, setEvidenMap] = useState<any>(() => {
    const saved = localStorage.getItem('anomali_evidens');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  });

  // Re-sync eviden map dynamically when custom event is fired
  React.useEffect(() => {
    const syncEvidens = () => {
      const saved = localStorage.getItem('anomali_evidens');
      if (saved) {
        try {
          setEvidenMap(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.addEventListener('anomali_evidens_updated', syncEvidens);
    return () => {
      window.removeEventListener('anomali_evidens_updated', syncEvidens);
    };
  }, []);

  const COLORS = ['#00E5FF', '#00B0FF', '#2979FF', '#3D5AFE', '#651FFF', '#AA00FF'];
  const STATUS_COLORS = {
    OPTIMAL: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    OVERLOADED: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    'UNDER-UTILIZED': 'bg-amber-500/10 border-amber-500/30 text-amber-400'
  };

  // 1. Process all metrics dynamically from WO data
  const optimizationStats = useMemo(() => {
    const rows = data.distinctWoRows || [];
    const idx = data.woIndices;
    
    if (!idx || rows.length === 0) {
      return {
        totalWo: 0,
        avgRpt: 0,
        avgRct: 0,
        onTimeSlaRate: 100,
        ulpMetrics: [],
        shiftMetrics: [],
        recommendations: [],
        topRegu: []
      };
    }

    // Calculate overall stats
    const totalWo = rows.length;
    let totalRpt = 0;
    let totalRct = 0;
    let rptOver30Count = 0;

    rows.forEach(row => {
      const rpt = parseFloat(String(row[idx.rpt] || '0').replace(',', '.')) || 0;
      const rct = parseFloat(String(row[idx.rct] || '0').replace(',', '.')) || 0;
      totalRpt += rpt;
      totalRct += rct;
      if (rpt >= 30) {
        rptOver30Count++;
      }
    });

    const avgRpt = totalWo > 0 ? parseFloat((totalRpt / totalWo).toFixed(1)) : 0;
    const avgRct = totalWo > 0 ? parseFloat((totalRct / totalWo).toFixed(1)) : 0;
    const onTimeSlaRate = totalWo > 0 ? Math.min(100, parseFloat((((totalWo - rptOver30Count) / totalWo) * 100).toFixed(1))) : 100;

    // Process ULP Metrics
    const ulpMap: { [key: string]: any } = {};
    rows.forEach(row => {
      const ulpRaw = String(row[idx.ulp] || 'UNKNOWN').trim().toUpperCase();
      const ulp = ulpRaw.replace('ULP ', '');
      const rpt = parseFloat(String(row[idx.rpt] || '0').replace(',', '.')) || 0;
      const rct = parseFloat(String(row[idx.rct] || '0').replace(',', '.')) || 0;
      const regu = String(row[idx.regu] || 'Regu Utama').trim();
      const rating = parseFloat(String(row[idx.rating] || '5')) || 5;

      if (!ulpMap[ulp]) {
        ulpMap[ulp] = {
          name: ulp,
          fullName: ulpRaw,
          totalWo: 0,
          totalRpt: 0,
          totalRct: 0,
          rptOver30: 0,
          regus: new Set<string>(),
          totalRating: 0,
          ratingCount: 0
        };
      }

      ulpMap[ulp].totalWo++;
      ulpMap[ulp].totalRpt += rpt;
      ulpMap[ulp].totalRct += rct;
      if (rpt >= 30) {
        ulpMap[ulp].rptOver30++;
      }
      if (regu) ulpMap[ulp].regus.add(regu);
      if (rating > 0) {
        ulpMap[ulp].totalRating += rating;
        ulpMap[ulp].ratingCount++;
      }
    });

    const ulpMetrics = Object.keys(ulpMap).map(key => {
      const item = ulpMap[key];
      const avgRptItem = parseFloat((item.totalRpt / item.totalWo).toFixed(1));
      const avgRctItem = parseFloat((item.totalRct / item.totalWo).toFixed(1));
      const compliance = Math.min(100, parseFloat((((item.totalWo - item.rptOver30) / item.totalWo) * 100).toFixed(1)));
      const rating = item.ratingCount > 0 ? parseFloat((item.totalRating / item.ratingCount).toFixed(2)) : 0;
      
      // Determine optimization status & workload
      let status: 'OPTIMAL' | 'OVERLOADED' | 'UNDER-UTILIZED' = 'OPTIMAL';
      if (compliance < 80 || (item.totalWo > 100 && avgRptItem > 25)) {
        status = 'OVERLOADED';
      } else if (compliance > 95 && item.totalWo < 20) {
        status = 'UNDER-UTILIZED';
      }

      return {
        name: item.name,
        fullName: item.fullName,
        totalWo: item.totalWo,
        avgRpt: avgRptItem,
        avgRct: avgRctItem,
        compliance,
        reguCount: item.regus.size || 1,
        rating,
        status
      };
    }).sort((a, b) => b.totalWo - a.totalWo);

    // Process Shift Metrics
    const shiftMap: { [key: string]: any } = {};
    rows.forEach(row => {
      let shift = String(row[idx.shift] || 'SHIFT UNKNOWN').trim().toUpperCase();
      if (!shift || shift === '0' || shift === 'NULL') shift = 'SHIFT UTAMA';
      const rpt = parseFloat(String(row[idx.rpt] || '0').replace(',', '.')) || 0;
      const rct = parseFloat(String(row[idx.rct] || '0').replace(',', '.')) || 0;

      if (!shiftMap[shift]) {
        shiftMap[shift] = {
          name: shift,
          totalWo: 0,
          totalRpt: 0,
          totalRct: 0,
          overSla: 0
        };
      }

      shiftMap[shift].totalWo++;
      shiftMap[shift].totalRpt += rpt;
      shiftMap[shift].totalRct += rct;
      if (rpt >= 30) {
        shiftMap[shift].overSla++;
      }
    });

    const shiftMetrics = Object.keys(shiftMap).map(key => {
      const item = shiftMap[key];
      return {
        name: item.name,
        totalWo: item.totalWo,
        avgRpt: parseFloat((item.totalRpt / item.totalWo).toFixed(1)),
        avgRct: parseFloat((item.totalRct / item.totalWo).toFixed(1)),
        compliance: Math.min(100, parseFloat((((item.totalWo - item.overSla) / item.totalWo) * 100).toFixed(1)))
      };
    }).sort((a, b) => b.totalWo - a.totalWo);

    // Generate Dynamic Optimization Recommendations based on calculated metrics
    const recommendations: { title: string; desc: string; priority: 'CRITICAL' | 'MEDIUM' | 'INFO'; tag: string }[] = [];

    // Check overload
    ulpMetrics.forEach(u => {
      if (u.status === 'OVERLOADED') {
        recommendations.push({
          title: `Optimasi Personil ULP ${u.name}`,
          desc: `Tingkat kepatuhan SLA di ULP ${u.name} berada di bawah target (${u.compliance}%). Beban kerja per regu sangat tinggi (${(u.totalWo / u.reguCount).toFixed(1)} WO/regu). Disarankan relokasi 1 regu standby dari unit under-utilized atau tambah personil standby.`,
          priority: 'CRITICAL',
          tag: 'RESOURCE SHIFT'
        });
      }
    });

    // Check shift delays
    shiftMetrics.forEach(s => {
      if (s.avgRpt > 25) {
        recommendations.push({
          title: `Penyesuaian Respons ${s.name}`,
          desc: `${s.name} memiliki rata-rata Response Time (RPT) kritis sebesar ${s.avgRpt} menit. Atur ulang titik stasioner/mobil patroli yantek agar lebih mendekati pusat titik gangguan selama shift berlangsung.`,
          priority: 'MEDIUM',
          tag: 'STATIONARY POINT'
        });
      }
    });

    // General high-level optimization recommendations
    if (onTimeSlaRate < 90) {
      recommendations.push({
        title: "Pemberlakuan Titik Standby Dinamis",
        desc: "Response time beberapa unit melebihi 25 menit disebabkan oleh letak geografis. Aktifkan penempatan regu di Posko Pembantu di luar jam sibuk.",
        priority: 'CRITICAL',
        tag: 'GEOGRAPHIC OPTIMIZATION'
      });
    } else {
      recommendations.push({
        title: "Automated Routing Dispatch",
        desc: "Sistem autodispatch saat ini berjalan optimal. Pertahankan performa dengan sinkronisasi data CCTV Yantek secara berkala untuk memitigasi anomali.",
        priority: 'INFO',
        tag: 'AUTOMATION'
      });
    }

    // Process Top Performing Teams/Regu
    const reguMap: { [key: string]: any } = {};
    let totalRatingSum = 0;
    let ratingCountAll = 0;
    rows.forEach(row => {
      const regu = String(row[idx.regu] || 'Regu Utama').trim();
      const name = String(row[idx.name] || 'Petugas').trim();
      const rpt = parseFloat(String(row[idx.rpt] || '0').replace(',', '.')) || 0;
      const rct = parseFloat(String(row[idx.rct] || '0').replace(',', '.')) || 0;
      const rating = parseFloat(String(row[idx.rating] || '5')) || 5;

      if (!regu || regu === '0' || regu === 'NULL') return;

      if (!reguMap[regu]) {
        reguMap[regu] = {
          name: regu,
          leader: name,
          totalWo: 0,
          totalRpt: 0,
          totalRct: 0,
          totalRating: 0,
          ratingCount: 0
        };
      }

      reguMap[regu].totalWo++;
      reguMap[regu].totalRpt += rpt;
      reguMap[regu].totalRct += rct;
      if (rating > 0) {
        reguMap[regu].totalRating += rating;
        reguMap[regu].ratingCount++;
        totalRatingSum += rating;
        ratingCountAll++;
      }
    });

    const activeReguCount = Object.keys(reguMap).length; // Removed default fallback
    const avgRatingAll = ratingCountAll > 0 ? parseFloat((totalRatingSum / ratingCountAll).toFixed(2)) : 0;

    const topRegu = Object.keys(reguMap).map(key => {
      const item = reguMap[key];
      const rating = item.ratingCount > 0 ? parseFloat((item.totalRating / item.ratingCount).toFixed(2)) : 0;
      return {
        name: item.name,
        leader: item.leader,
        totalWo: item.totalWo,
        avgRpt: parseFloat((item.totalRpt / item.totalWo).toFixed(1)),
        avgRct: parseFloat((item.totalRct / item.totalWo).toFixed(1)),
        rating
      };
    }).sort((a, b) => b.rating - a.rating || a.avgRpt - b.avgRpt).slice(0, 5);

    return {
      totalWo,
      avgRpt,
      avgRct,
      onTimeSlaRate,
      ulpMetrics,
      shiftMetrics,
      recommendations,
      topRegu,
      activeReguCount,
      avgRatingAll
    };
  }, [data]);

  // Filter metrics if ULP selected
  const filteredMetrics = useMemo(() => {
    if (selectedUlp === 'ALL') return optimizationStats.ulpMetrics;
    return optimizationStats.ulpMetrics.filter(u => u.name === selectedUlp);
  }, [selectedUlp, optimizationStats]);

  // Process and parse VCC_DATA for dynamic UP3 performance indicators
  const vccMetrics = useMemo(() => {
    const rawRows = filteredVccData;
    const isFilteredButEmpty = selectedMonth && data.vccData && data.vccData.length > 1 && rawRows.length <= 1;

    if (isFilteredButEmpty) {
      return {
        avgPerforma: 0,
        avgKinerjaYo: 0,
        avgHariKerja: 0,
        totalWoPo: 0
      };
    }

    if (rawRows.length <= 1) {
      return {
        avgPerforma: 0,
        avgKinerjaYo: 0,
        avgHariKerja: 0,
        totalWoPo: 0
      };
    }

    const headers = rawRows[0] || [];
    const findIndex = (targets: string[]) => {
      const lowerTargets = targets.map(t => t.toLowerCase().trim().replace(/['"]/g, ""));
      return headers.findIndex(h => {
        const cleaned = String(h || "").toLowerCase().trim().replace(/['"]/g, "");
        return lowerTargets.includes(cleaned);
      });
    };

    const idxNamaUlp = findIndex(["Nama Ulp", "Nama ULP", "Ulp", "ULP"]);
    const idxTotalSkor = findIndex(["Total Skor", "Skor Total"]);
    const idxPersentaseSkor = findIndex(["Persentase Skor", "Persentase skor", "Skor"]);
    const idxJumlahHariSeharusnya = findIndex(["Jumlah Hari Seharusnya", "Hari Seharusnya"]);
    const idxJumlahHariRealisasi = findIndex(["Jumlah Hari Realisasi", "Hari Realisasi"]);
    const idxRct = findIndex(["RCT", "Rct"]);
    let idxPersentasePerformaP0 = findIndex(["Persentase Performa P0"]);
    if (idxPersentasePerformaP0 === -1) {
      idxPersentasePerformaP0 = findIndex(["Performa P0"]);
    }
    let idxPersentasePerformaWo = findIndex(["Persentase Performa Wo"]);
    if (idxPersentasePerformaWo === -1) {
      idxPersentasePerformaWo = findIndex(["Performa Wo"]);
    }

    const parseNum = (val: any): number => {
      if (val === undefined || val === null || val === "") return 0;
      if (typeof val === 'number') return val;
      const str = String(val).trim();
      if (!str) return 0;

      // Clean percentage signs
      let cleaned = str.replace('%', '').trim();

      // Detect Indonesian vs US format:
      // If we have both commas and dots, decide which is the decimal separator
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');

      if (hasComma && hasDot) {
        if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
          // US format: e.g. 1,234.56 -> remove comma
          cleaned = cleaned.replace(/,/g, '');
        } else {
          // ID format: e.g. 1.234,56 -> remove dot, replace comma with dot
          cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
        }
      } else if (hasComma) {
        // Only comma: e.g. 12,43 (ID decimal) or 1,234 (US thousands)
        const parts = cleaned.split(',');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          // Thousands
          cleaned = cleaned.replace(/,/g, '');
        } else {
          // Decimal
          cleaned = cleaned.replace(/,/g, '.');
        }
      } else if (hasDot) {
        // Only dot: e.g. 12.43 (US decimal) or 1.234 (ID thousands)
        const parts = cleaned.split('.');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          // Thousands
          cleaned = cleaned.replace(/\./g, '');
        }
      }

      return parseFloat(cleaned) || 0;
    };

    let sumTotalSkor = 0, countTotalSkor = 0;
    let sumSeharusnya = 0, countSeharusnya = 0;
    let sumRealisasi = 0, countRealisasi = 0;
    let sumRct = 0, countRct = 0;
    let sumPerfP0 = 0, countPerfP0 = 0;
    let sumPerfWo = 0, countPerfWo = 0;

    const ulpMetrics: { [ulpName: string]: { realisasiSum: number; realisasiCount: number; seharusnyaSum: number; seharusnyaCount: number; } } = {};

    const dataRows = rawRows.slice(1);
    dataRows.forEach(row => {
      if (!row || row.length === 0) return;

      const rowUlp = idxNamaUlp !== -1 ? String(row[idxNamaUlp] || "").toUpperCase().trim() : "";
      const matchesUlp = selectedUlp === 'ALL' || rowUlp.includes(selectedUlp.toUpperCase()) || selectedUlp.toUpperCase().includes(rowUlp);
      if (!matchesUlp) return;

      if (rowUlp) {
        if (!ulpMetrics[rowUlp]) {
          ulpMetrics[rowUlp] = {
            realisasiSum: 0,
            realisasiCount: 0,
            seharusnyaSum: 0,
            seharusnyaCount: 0
          };
        }
      }

      // Track Total Skor
      if (idxTotalSkor !== -1) {
        sumTotalSkor += parseNum(row[idxTotalSkor]);
        countTotalSkor++;
      } else if (idxPersentaseSkor !== -1) {
        // Fallback: convert percentage back to standard score scale if needed
        const pSkor = parseNum(row[idxPersentaseSkor]);
        sumTotalSkor += (pSkor / 100) * 15;
        countTotalSkor++;
      }

      // Track Seharusnya
      if (idxJumlahHariSeharusnya !== -1) {
        const val = parseNum(row[idxJumlahHariSeharusnya]);
        sumSeharusnya += val;
        countSeharusnya++;
        if (rowUlp && ulpMetrics[rowUlp]) {
          ulpMetrics[rowUlp].seharusnyaSum += val;
          ulpMetrics[rowUlp].seharusnyaCount++;
        }
      }

      // Track Realisasi
      if (idxJumlahHariRealisasi !== -1) {
        const val = parseNum(row[idxJumlahHariRealisasi]);
        sumRealisasi += val;
        countRealisasi++;
        if (rowUlp && ulpMetrics[rowUlp]) {
          ulpMetrics[rowUlp].realisasiSum += val;
          ulpMetrics[rowUlp].realisasiCount++;
        }
      }

      // Track RCT
      if (idxRct !== -1) {
        sumRct += parseNum(row[idxRct]);
        countRct++;
      }

      // Track Persentase Performa P0
      if (idxPersentasePerformaP0 !== -1) {
        sumPerfP0 += parseNum(row[idxPersentasePerformaP0]);
        countPerfP0++;
      }

      // Track Persentase Performa WO
      if (idxPersentasePerformaWo !== -1) {
        sumPerfWo += parseNum(row[idxPersentasePerformaWo]);
        countPerfWo++;
      }
    });

    const avgTotalSkor = countTotalSkor > 0 ? (sumTotalSkor / countTotalSkor) : 0;
    const avgSeharusnya = countSeharusnya > 0 ? (sumSeharusnya / countSeharusnya) : 0;
    const avgRealisasi = countRealisasi > 0 ? (sumRealisasi / countRealisasi) : 0;
    const avgRct = countRct > 0 ? (sumRct / countRct) : 0;
    const avgPerfP0 = countPerfP0 > 0 ? (sumPerfP0 / countPerfP0) : 0;
    const avgPerfWo = countPerfWo > 0 ? (sumPerfWo / countPerfWo) : 0;

    // Calculate the averages per ULP
    let totalUlpAvgRealisasi = 0;
    let totalUlpAvgSeharusnya = 0;
    let ulpCountForAvg = 0;

    Object.keys(ulpMetrics).forEach(ulpName => {
      const u = ulpMetrics[ulpName];
      const ulpAvgRealisasi = u.realisasiCount > 0 ? (u.realisasiSum / u.realisasiCount) : 0;
      const ulpAvgSeharusnya = u.seharusnyaCount > 0 ? (u.seharusnyaSum / u.seharusnyaCount) : 0;

      totalUlpAvgRealisasi += ulpAvgRealisasi;
      totalUlpAvgSeharusnya += ulpAvgSeharusnya;
      ulpCountForAvg++;
    });

    const avgRealisasiPerUlp = ulpCountForAvg > 0 ? (totalUlpAvgRealisasi / ulpCountForAvg) : 0;
    const avgSeharusnyaPerUlp = ulpCountForAvg > 0 ? (totalUlpAvgSeharusnya / ulpCountForAvg) : 0;

    // Calculators
    const avgPerforma = Math.min(100, (avgTotalSkor / 15) * 100);
    const avgKinerjaYo = Math.min(100, avgSeharusnyaPerUlp > 0 ? (avgRealisasiPerUlp / avgSeharusnyaPerUlp) * 100 : 0);
    const avgHariKerja = Math.min(100, avgRealisasi > 0 ? (((avgRct / avgRealisasi) + 1.5) / 8) * 100 : 0);
    const totalWoPo = Math.min(100, avgPerfP0 + avgPerfWo);

    return {
      avgPerforma: parseFloat(avgPerforma.toFixed(2)),
      avgKinerjaYo: parseFloat(avgKinerjaYo.toFixed(2)),
      avgHariKerja: parseFloat(avgHariKerja.toFixed(2)),
      totalWoPo: parseFloat(totalWoPo.toFixed(2))
    };
  }, [filteredVccData, selectedUlp]);

  // Hook to process and parse ULP-specific performance data from VCC_DATA sheet
  const ulpPerformanceData = useMemo(() => {
    const rawRows = filteredVccData;
    const isFilteredButEmpty = selectedMonth && data.vccData && data.vccData.length > 1 && rawRows.length <= 1;

    if (isFilteredButEmpty) {
      return [];
    }

    if (rawRows.length <= 1) {
      return [];
    }

    const headers = rawRows[0] || [];
    const findIndex = (targets: string[]) => {
      const lowerTargets = targets.map(t => t.toLowerCase().trim().replace(/['"]/g, ""));
      return headers.findIndex(h => {
        const cleaned = String(h || "").toLowerCase().trim().replace(/['"]/g, "");
        return lowerTargets.includes(cleaned);
      });
    };

    const idxNamaUlp = findIndex(["Nama Ulp", "Nama ULP", "Ulp", "ULP"]);
    const idxTotalSkor = findIndex(["Total Skor", "Skor Total"]);
    const idxPersentaseSkor = findIndex(["Persentase Skor", "Persentase skor", "Skor"]);
    const idxJumlahHariSeharusnya = findIndex(["Jumlah Hari Seharusnya", "Hari Seharusnya"]);
    const idxJumlahHariRealisasi = findIndex(["Jumlah Hari Realisasi", "Hari Realisasi"]);
    const idxRct = findIndex(["RCT", "Rct"]);
    let idxPersentasePerformaP0 = findIndex(["Persentase Performa P0"]);
    if (idxPersentasePerformaP0 === -1) {
      idxPersentasePerformaP0 = findIndex(["Performa P0"]);
    }
    let idxPersentasePerformaWo = findIndex(["Persentase Performa Wo"]);
    if (idxPersentasePerformaWo === -1) {
      idxPersentasePerformaWo = findIndex(["Performa Wo"]);
    }

    const parseNum = (val: any): number => {
      if (val === undefined || val === null || val === "") return 0;
      if (typeof val === 'number') return val;
      const str = String(val).trim();
      if (!str) return 0;

      let cleaned = str.replace('%', '').trim();
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');

      if (hasComma && hasDot) {
        if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
        }
      } else if (hasComma) {
        const parts = cleaned.split(',');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/,/g, '.');
        }
      } else if (hasDot) {
        const parts = cleaned.split('.');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          cleaned = cleaned.replace(/\./g, '');
        }
      }

      return parseFloat(cleaned) || 0;
    };

    const ulpGroups: { [groupKey: string]: {
      displayName: string;
      skorSum: number; skorCount: number;
      seharusnyaSum: number; seharusnyaCount: number;
      realisasiSum: number; realisasiCount: number;
      rctSum: number; rctCount: number;
      p0Sum: number; p0Count: number;
      woSum: number; woCount: number;
    } } = {};

    const dataRows = rawRows.slice(1);
    dataRows.forEach(row => {
      if (!row || row.length === 0) return;

      const rawUlpName = idxNamaUlp !== -1 ? String(row[idxNamaUlp] || "").trim() : "";
      if (!rawUlpName) return;

      const groupKey = isUpSumbarMode ? getUp3ForUlp(rawUlpName) : rawUlpName.toUpperCase();
      if (!ulpGroups[groupKey]) {
        ulpGroups[groupKey] = {
          displayName: isUpSumbarMode ? groupKey : rawUlpName,
          skorSum: 0, skorCount: 0,
          seharusnyaSum: 0, seharusnyaCount: 0,
          realisasiSum: 0, realisasiCount: 0,
          rctSum: 0, rctCount: 0,
          p0Sum: 0, p0Count: 0,
          woSum: 0, woCount: 0
        };
      }

      const group = ulpGroups[groupKey];

      if (idxTotalSkor !== -1) {
        group.skorSum += parseNum(row[idxTotalSkor]);
        group.skorCount++;
      } else if (idxPersentaseSkor !== -1) {
        const pSkor = parseNum(row[idxPersentaseSkor]);
        group.skorSum += (pSkor / 100) * 15;
        group.skorCount++;
      }

      if (idxJumlahHariSeharusnya !== -1) {
        group.seharusnyaSum += parseNum(row[idxJumlahHariSeharusnya]);
        group.seharusnyaCount++;
      }

      if (idxJumlahHariRealisasi !== -1) {
        group.realisasiSum += parseNum(row[idxJumlahHariRealisasi]);
        group.realisasiCount++;
      }

      if (idxRct !== -1) {
        group.rctSum += parseNum(row[idxRct]);
        group.rctCount++;
      }

      if (idxPersentasePerformaP0 !== -1) {
        group.p0Sum += parseNum(row[idxPersentasePerformaP0]);
        group.p0Count++;
      }

      if (idxPersentasePerformaWo !== -1) {
        group.woSum += parseNum(row[idxPersentasePerformaWo]);
        group.woCount++;
      }
    });

    const list = Object.keys(ulpGroups).map(name => {
      const g = ulpGroups[name];
      const avgTotalSkor = g.skorCount > 0 ? (g.skorSum / g.skorCount) : 0;
      const avgSeharusnya = g.seharusnyaCount > 0 ? (g.seharusnyaSum / g.seharusnyaCount) : 0;
      const avgRealisasi = g.realisasiCount > 0 ? (g.realisasiSum / g.realisasiCount) : 0;
      const avgRct = g.rctCount > 0 ? (g.rctSum / g.rctCount) : 0;
      const avgPerfP0 = g.p0Count > 0 ? (g.p0Sum / g.p0Count) : 0;
      const avgPerfWo = g.woCount > 0 ? (g.woSum / g.woCount) : 0;

      const totalNilaiYo = Math.min(100, (avgTotalSkor / 15) * 100);
      const nilaiHariKerja = Math.min(100, avgSeharusnya > 0 ? (avgRealisasi / avgSeharusnya) * 100 : 0);
      const nilaiProduktivitas = Math.min(100, avgRealisasi > 0 ? (((avgRct / avgRealisasi) + 1.5) / 8) * 100 : 0);
      const nilaiPerformaWoPo = Math.min(100, avgPerfP0 + avgPerfWo);

      return {
        name: g.displayName,
        totalNilaiYo: parseFloat(totalNilaiYo.toFixed(2)),
        nilaiHariKerja: parseFloat(nilaiHariKerja.toFixed(2)),
        nilaiProduktivitas: parseFloat(nilaiProduktivitas.toFixed(2)),
        nilaiPerformaWoPo: parseFloat(nilaiPerformaWoPo.toFixed(2))
      };
    });

    if (!isUpSumbarMode && selectedUlp !== 'ALL') {
      const uKey = selectedUlp.toUpperCase();
      return list.filter(u => u.name.toUpperCase().includes(uKey) || uKey.includes(u.name.toUpperCase()));
    }

    return list;
  }, [filteredVccData, selectedUlp, selectedUp3, data.up3ToUlps]);

  // Hook to process and parse Officer-specific performance data from VCC_DATA sheet
  const officerPerformanceData = useMemo(() => {
    const rawRows = filteredVccData;
    const isFilteredButEmpty = selectedMonth && data.vccData && data.vccData.length > 1 && rawRows.length <= 1;

    if (isFilteredButEmpty) {
      return [];
    }

    if (rawRows.length <= 1) {
      return [];
    }

    const headers = rawRows[0] || [];
    const findIndex = (targets: string[]) => {
      const lowerTargets = targets.map(t => t.toLowerCase().trim().replace(/['"]/g, ""));
      return headers.findIndex(h => {
        const cleaned = String(h || "").toLowerCase().trim().replace(/['"]/g, "");
        return lowerTargets.includes(cleaned);
      });
    };

    const idxNamaUlp = findIndex(["Nama Ulp", "Nama ULP", "Ulp", "ULP"]);
    let idxEmployeeName = findIndex(["Employeename"]);
    if (idxEmployeeName === -1) {
      idxEmployeeName = findIndex(["Employee Name", "Nama Petugas", "Petugas", "Employeename"]);
    }
    const idxTotalSkor = findIndex(["Total Skor", "Skor Total"]);
    const idxPersentaseSkor = findIndex(["Persentase Skor", "Persentase skor", "Skor"]);
    const idxJumlahHariSeharusnya = findIndex(["Jumlah Hari Seharusnya", "Hari Seharusnya"]);
    const idxJumlahHariRealisasi = findIndex(["Jumlah Hari Realisasi", "Hari Realisasi"]);
    const idxRct = findIndex(["RCT", "Rct"]);
    let idxPersentasePerformaP0 = findIndex(["Persentase Performa P0"]);
    if (idxPersentasePerformaP0 === -1) {
      idxPersentasePerformaP0 = findIndex(["Performa P0"]);
    }
    let idxPersentasePerformaWo = findIndex(["Persentase Performa Wo"]);
    if (idxPersentasePerformaWo === -1) {
      idxPersentasePerformaWo = findIndex(["Performa Wo"]);
    }

    const parseNum = (val: any): number => {
      if (val === undefined || val === null || val === "") return 0;
      if (typeof val === 'number') return val;
      const str = String(val).trim();
      if (!str) return 0;

      let cleaned = str.replace('%', '').trim();
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');

      if (hasComma && hasDot) {
        if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
        }
      } else if (hasComma) {
        const parts = cleaned.split(',');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/,/g, '.');
        }
      } else if (hasDot) {
        const parts = cleaned.split('.');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          cleaned = cleaned.replace(/\./g, '');
        }
      }

      return parseFloat(cleaned) || 0;
    };

    const officerGroups: { [officerName: string]: {
      displayName: string;
      skorSum: number; skorCount: number;
      seharusnyaSum: number; seharusnyaCount: number;
      realisasiSum: number; realisasiCount: number;
      rctSum: number; rctCount: number;
      p0Sum: number; p0Count: number;
      woSum: number; woCount: number;
    } } = {};

    const dataRows = rawRows.slice(1);
    dataRows.forEach(row => {
      if (!row || row.length === 0) return;

      const rawUlpName = idxNamaUlp !== -1 ? String(row[idxNamaUlp] || "").trim() : "";
      const matchesUlp = selectedUlp === 'ALL' || rawUlpName.toUpperCase().includes(selectedUlp.toUpperCase()) || selectedUlp.toUpperCase().includes(rawUlpName.toUpperCase());
      if (!matchesUlp) return;

      const rawOfficerName = idxEmployeeName !== -1 && String(row[idxEmployeeName] || "").trim() 
        ? String(row[idxEmployeeName]).trim() 
        : (rawUlpName ? `PETUGAS ${rawUlpName}` : "PETUGAS TANPA NAMA");

      const officerKey = rawOfficerName.toUpperCase();
      if (!officerGroups[officerKey]) {
        officerGroups[officerKey] = {
          displayName: rawOfficerName,
          skorSum: 0, skorCount: 0,
          seharusnyaSum: 0, seharusnyaCount: 0,
          realisasiSum: 0, realisasiCount: 0,
          rctSum: 0, rctCount: 0,
          p0Sum: 0, p0Count: 0,
          woSum: 0, woCount: 0
        };
      }

      const group = officerGroups[officerKey];

      if (idxTotalSkor !== -1) {
        group.skorSum += parseNum(row[idxTotalSkor]);
        group.skorCount++;
      } else if (idxPersentaseSkor !== -1) {
        const pSkor = parseNum(row[idxPersentaseSkor]);
        group.skorSum += (pSkor / 100) * 15;
        group.skorCount++;
      }

      if (idxJumlahHariSeharusnya !== -1) {
        group.seharusnyaSum += parseNum(row[idxJumlahHariSeharusnya]);
        group.seharusnyaCount++;
      }

      if (idxJumlahHariRealisasi !== -1) {
        group.realisasiSum += parseNum(row[idxJumlahHariRealisasi]);
        group.realisasiCount++;
      }

      if (idxRct !== -1) {
        group.rctSum += parseNum(row[idxRct]);
        group.rctCount++;
      }

      if (idxPersentasePerformaP0 !== -1) {
        group.p0Sum += parseNum(row[idxPersentasePerformaP0]);
        group.p0Count++;
      }

      if (idxPersentasePerformaWo !== -1) {
        group.woSum += parseNum(row[idxPersentasePerformaWo]);
        group.woCount++;
      }
    });

    const list = Object.keys(officerGroups).map(name => {
      const g = officerGroups[name];
      const avgTotalSkor = g.skorCount > 0 ? (g.skorSum / g.skorCount) : 0;
      const avgSeharusnya = g.seharusnyaCount > 0 ? (g.seharusnyaSum / g.seharusnyaCount) : 0;
      const avgRealisasi = g.realisasiCount > 0 ? (g.realisasiSum / g.realisasiCount) : 0;
      const avgRct = g.rctCount > 0 ? (g.rctSum / g.rctCount) : 0;
      const avgPerfP0 = g.p0Count > 0 ? (g.p0Sum / g.p0Count) : 0;
      const avgPerfWo = g.woCount > 0 ? (g.woSum / g.woCount) : 0;

      const totalNilaiYo = Math.min(100, (avgTotalSkor / 15) * 100);
      const nilaiHariKerja = Math.min(100, avgSeharusnya > 0 ? (avgRealisasi / avgSeharusnya) * 100 : 0);
      const nilaiProduktivitas = Math.min(100, avgRealisasi > 0 ? (((avgRct / avgRealisasi) + 1.5) / 8) * 100 : 0);
      const nilaiPerformaWoPo = Math.min(100, avgPerfP0 + avgPerfWo);

      return {
        name: g.displayName,
        totalNilaiYo: parseFloat(totalNilaiYo.toFixed(2)),
        nilaiHariKerja: parseFloat(nilaiHariKerja.toFixed(2)),
        nilaiProduktivitas: parseFloat(nilaiProduktivitas.toFixed(2)),
        nilaiPerformaWoPo: parseFloat(nilaiPerformaWoPo.toFixed(2))
      };
    });

    return list;
  }, [filteredVccData, selectedUlp]);

  const itemsPerPage = 10;
  const totalOfficerPages = Math.ceil(officerPerformanceData.length / itemsPerPage) || 1;
  const paginatedOfficers = useMemo(() => {
    const startIndex = (officerPage - 1) * itemsPerPage;
    return officerPerformanceData.slice(startIndex, startIndex + itemsPerPage);
  }, [officerPerformanceData, officerPage]);

  // Hook to process bottom performing officers under 60%
  const bottomOfficers = useMemo(() => {
    const rawRows = filteredVccData;
    const hasRealRows = rawRows.length > 1;
    const isFilteredButEmpty = selectedMonth && data.vccData && data.vccData.length > 1 && rawRows.length <= 1;

    let headers: string[] = [];
    let idxNamaPetugas = -1;
    let idxNamaUlp = -1;
    let idxTotalSkor = -1;
    let idxPersentaseSkor = -1;

    if (hasRealRows) {
      headers = rawRows[0] || [];
      const findIndex = (targets: string[]) => {
        for (const t of targets) {
          const idx = headers.findIndex(h => {
            const cleaned = String(h || "").replace(/['"]/g, "").trim().toLowerCase();
            return cleaned === t.toLowerCase();
          });
          if (idx !== -1) return idx;
        }
        return -1;
      };
      idxNamaPetugas = findIndex(["employeename", "employee_name", "nama petugas", "nama", "petugas", "personil", "name", "personil yantek"]);
      idxNamaUlp = findIndex(["nama ulp", "ulp", "unit"]);
      idxTotalSkor = findIndex(["total skor", "skor total", "total score", "skor"]);
      idxPersentaseSkor = findIndex(["persentase skor", "persentase", "skor %", "persen skor"]);
    }

    const parseNum = (val: any): number => {
      if (val === undefined || val === null || val === "") return 0;
      if (typeof val === 'number') return val;
      const str = String(val).trim();
      if (!str) return 0;
      let cleaned = str.replace('%', '').trim();
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');
      if (hasComma && hasDot) {
        if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
        }
      } else if (hasComma) {
        const parts = cleaned.split(',');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/,/g, '.');
        }
      } else if (hasDot) {
        const parts = cleaned.split('.');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          cleaned = cleaned.replace(/\./g, '');
        }
      }
      return parseFloat(cleaned) || 0;
    };

    let list: any[] = [];

    if (hasRealRows && idxNamaPetugas !== -1) {
      rawRows.slice(1).forEach(row => {
        if (!row || row.length === 0) return;
        const name = String(row[idxNamaPetugas] || "").trim().toUpperCase();
        if (!name || name === "NAMA PETUGAS" || name === "0" || name === "NULL" || name === "UNDEFINED") return;

        const ulpRaw = idxNamaUlp !== -1 ? String(row[idxNamaUlp] || "").trim().toUpperCase() : "";
        let cleanUlp = ulpRaw;
        if (!cleanUlp.startsWith("ULP ")) {
          cleanUlp = "ULP " + cleanUlp;
        }

        let totalSkor = 0;
        let pctYo = 0;

        if (idxPersentaseSkor !== -1) {
          pctYo = Math.min(100, parseNum(row[idxPersentaseSkor]));
        }
        if (idxTotalSkor !== -1) {
          totalSkor = parseNum(row[idxTotalSkor]);
        }

        // Fallbacks if percentage is missing
        if (idxPersentaseSkor === -1 && idxTotalSkor !== -1) {
          pctYo = Math.min(100, (totalSkor / 15) * 100);
        }
        
        // Filter: % PENCAPAIAN KINERJA YO kecil dari pada 60%
        if (pctYo < 60 && pctYo > 0) {
          list.push({
            name,
            ulp: cleanUlp || "ULP BUKITTINGGI",
            targetScore: 15,
            score: totalSkor,
            percent: Math.min(100, parseFloat(pctYo.toFixed(2)))
          });
        }
      });
    }

    // Fallback if no real rows or list is empty
    if (!hasRealRows && list.length === 0) {
      list = [];
    }

    // Apply ULP Filter if specified
    if (selectedUlp !== 'ALL') {
      const uKey = selectedUlp.toUpperCase();
      list = list.filter(o => o.ulp.includes(uKey) || uKey.includes(o.ulp));
    }

    list.sort((a, b) => a.percent - b.percent);
    return list;
  }, [filteredVccData, selectedUlp]);

  // Hook to calculate THRESHOLD NILAI YO table data matching the image
  const thresholdTableData = useMemo(() => {
    const UP3_ULP_MAPPING: Record<string, Array<{ key: string; name: string; up3: string; fallbackReal: number; fallbackGreen: number }>> = {
      "UP3 BUKITTINGGI": [
        { key: "LUBUK BASUNG", name: "ULP LUBUK BASUNG", up3: "BUKITTINGGI", fallbackReal: 89.69, fallbackGreen: 39 },
        { key: "SIMPANG EMPAT", name: "ULP SIMPANG EMPAT", up3: "BUKITTINGGI", fallbackReal: 90.61, fallbackGreen: 48 },
        { key: "BASO", name: "ULP BASO", up3: "BUKITTINGGI", fallbackReal: 99.05, fallbackGreen: 15 },
        { key: "KOTO TUO", name: "ULP KOTO TUO", up3: "BUKITTINGGI", fallbackReal: 96.96, fallbackGreen: 16 },
        { key: "BUKITTINGGI", name: "ULP BUKITTINGGI", up3: "BUKITTINGGI", fallbackReal: 99.49, fallbackGreen: 15 },
        { key: "LUBUK SIKAPING", name: "ULP LUBUK SIKAPING", up3: "BUKITTINGGI", fallbackReal: 96.24, fallbackGreen: 24 },
        { key: "PADANG PANJANG", name: "ULP PADANG PANJANG", up3: "BUKITTINGGI", fallbackReal: 98.29, fallbackGreen: 19 },
      ],
      "UP3 PADANG": [
        { key: "BELANTI", name: "ULP BELANTI", up3: "PADANG", fallbackReal: 95.5, fallbackGreen: 30 },
        { key: "INDARUNG", name: "ULP INDARUNG", up3: "PADANG", fallbackReal: 94.2, fallbackGreen: 28 },
        { key: "TABING", name: "ULP TABING", up3: "PADANG", fallbackReal: 96.1, fallbackGreen: 35 },
        { key: "KURANJI", name: "ULP KURANJI", up3: "PADANG", fallbackReal: 93.8, fallbackGreen: 32 },
        { key: "LUBUK ALUNG", name: "ULP LUBUK ALUNG", up3: "PADANG", fallbackReal: 91.2, fallbackGreen: 40 },
        { key: "PARIAMAN", name: "ULP PARIAMAN", up3: "PADANG", fallbackReal: 92.5, fallbackGreen: 25 },
        { key: "SICINCIN", name: "ULP SICINCIN", up3: "PADANG", fallbackReal: 89.9, fallbackGreen: 20 },
      ],
      "UP3 SOLOK": [
        { key: "SOLOK", name: "ULP SOLOK", up3: "SOLOK", fallbackReal: 93.4, fallbackGreen: 22 },
        { key: "SAWAHLUNTO", name: "ULP SAWAHLUNTO", up3: "SOLOK", fallbackReal: 95.1, fallbackGreen: 18 },
        { key: "MUARA LABUH", name: "ULP MUARA LABUH", up3: "SOLOK", fallbackReal: 88.7, fallbackGreen: 15 },
        { key: "SIJUNJUNG", name: "ULP SIJUNJUNG", up3: "SOLOK", fallbackReal: 90.2, fallbackGreen: 24 },
        { key: "KOTO BARU", name: "ULP KOTO BARU", up3: "SOLOK", fallbackReal: 91.8, fallbackGreen: 19 },
        { key: "ALAHAN PANJANG", name: "ULP ALAHAN PANJANG", up3: "SOLOK", fallbackReal: 89.5, fallbackGreen: 16 },
      ],
      "UP3 PAYAKUMBUH": [
        { key: "PAYAKUMBUH", name: "ULP PAYAKUMBUH", up3: "PAYAKUMBUH", fallbackReal: 97.5, fallbackGreen: 29 },
        { key: "LIMA PULUH KOTA", name: "ULP LIMA PULUH KOTA", up3: "PAYAKUMBUH", fallbackReal: 93.2, fallbackGreen: 21 },
      ]
    };

    const activeUp3 = selectedUp3 || "";
    const normalizedActiveUp3 = activeUp3.toUpperCase().replace(/^UP3\s+/i, "").replace(/[^A-Z0-9]/g, "").trim();

    const allStandardUlps = [
      ...UP3_ULP_MAPPING["UP3 BUKITTINGGI"],
      ...UP3_ULP_MAPPING["UP3 PADANG"],
      ...UP3_ULP_MAPPING["UP3 SOLOK"],
      ...UP3_ULP_MAPPING["UP3 PAYAKUMBUH"]
    ];

    let ulpsToProcess = allStandardUlps;

    const isSpecificUp3 = normalizedActiveUp3 && normalizedActiveUp3 !== "UPSUMBAR" && normalizedActiveUp3 !== "SUMBAR";

    if (isSpecificUp3) {
      const mapKey = Object.keys(UP3_ULP_MAPPING).find(k => {
        const cleanK = k.toUpperCase().replace(/^UP3\s+/i, "").replace(/[^A-Z0-9]/g, "").trim();
        return cleanK === normalizedActiveUp3;
      });

      if (mapKey) {
        ulpsToProcess = UP3_ULP_MAPPING[mapKey];
      } else if (data.up3ToUlps) {
        const matchingUp3Key = Object.keys(data.up3ToUlps).find(k => {
          const cleanK = k.toUpperCase().replace(/^UP3\s+/i, "").replace(/[^A-Z0-9]/g, "").trim();
          return cleanK === normalizedActiveUp3;
        });
        if (matchingUp3Key) {
          const dynamicUlps = (data.up3ToUlps[matchingUp3Key] as string[]) || [];
          ulpsToProcess = dynamicUlps.map(ulpName => {
            const key = ulpName.toUpperCase().replace(/^ULP\s+/i, "").trim();
            const matchedStd = allStandardUlps.find(std => std.key === key);
            return {
              key,
              name: ulpName.startsWith("ULP ") ? ulpName : `ULP ${ulpName}`,
              up3: matchingUp3Key,
              fallbackReal: matchedStd ? matchedStd.fallbackReal : 100,
              fallbackGreen: matchedStd ? matchedStd.fallbackGreen : 0
            };
          });
        }
      }
    } else {
      if (data.up3ToUlps && Object.keys(data.up3ToUlps).length > 0) {
        const compiledDynamic: Array<{ key: string; name: string; up3: string; fallbackReal: number; fallbackGreen: number }> = [];
        Object.entries(data.up3ToUlps as Record<string, string[]>).forEach(([up3Name, ulps]) => {
          ulps.forEach(ulpName => {
            const key = ulpName.toUpperCase().replace(/^ULP\s+/i, "").trim();
            const matchedStd = allStandardUlps.find(std => std.key === key);
            compiledDynamic.push({
              key,
              name: ulpName.startsWith("ULP ") ? ulpName : `ULP ${ulpName}`,
              up3: up3Name,
              fallbackReal: matchedStd ? matchedStd.fallbackReal : 100,
              fallbackGreen: matchedStd ? matchedStd.fallbackGreen : 0
            });
          });
        });
        if (compiledDynamic.length > 0) {
          ulpsToProcess = compiledDynamic;
        }
      }
    }

    const rawRows = filteredVccData;
    const hasRealRows = rawRows.length > 1;
    const isFilteredButEmpty = selectedMonth && data.vccData && data.vccData.length > 1 && rawRows.length <= 1;

    let headers: string[] = [];
    let idxNamaUlp = -1;
    let idxTotalSkor = -1;
    let idxPersentaseSkor = -1;

    if (hasRealRows) {
      headers = rawRows[0] || [];
      const findHeaderIdx = (possibleNames: string[]) => {
        const normNames = possibleNames.map(n => n.toLowerCase().trim().replace(/['"_\s-]/g, ""));
        return headers.findIndex(h => {
          const cleaned = String(h || "").toLowerCase().trim().replace(/['"_\s-]/g, "");
          return normNames.includes(cleaned);
        });
      };
      idxNamaUlp = findHeaderIdx(["namaulp", "ulp", "unit"]);
      idxTotalSkor = findHeaderIdx(["totalskor", "skortotal"]);
      idxPersentaseSkor = findHeaderIdx(["persentaseskor", "persentase", "skor", "kinerja"]);
    }

    const parseNum = (val: any): number => {
      if (val === undefined || val === null || val === "") return 0;
      if (typeof val === 'number') return val;
      const str = String(val).trim();
      if (!str) return 0;

      let cleaned = str.replace('%', '').trim();
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');

      if (hasComma && hasDot) {
        if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
        }
      } else if (hasComma) {
        const parts = cleaned.split(',');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/,/g, '.');
        }
      } else if (hasDot) {
        const parts = cleaned.split('.');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          cleaned = cleaned.replace(/\./g, '');
        }
      }

      return parseFloat(cleaned) || 0;
    };

    const UP3_LIST = [
      { key: "BUKITTINGGI", name: "UP3 BUKITTINGGI", up3: "SUMBAR", fallbackReal: 94.69, fallbackGreen: 176 },
      { key: "PADANG", name: "UP3 PADANG", up3: "SUMBAR", fallbackReal: 92.51, fallbackGreen: 210 },
      { key: "SOLOK", name: "UP3 SOLOK", up3: "SUMBAR", fallbackReal: 91.15, fallbackGreen: 113 },
      { key: "PAYAKUMBUH", name: "UP3 PAYAKUMBUH", up3: "SUMBAR", fallbackReal: 94.23, fallbackGreen: 67 }
    ];

    const itemsToProcess = isUpSumbarMode ? UP3_LIST : ulpsToProcess;

    const cleanString = (s: string) => s.toUpperCase()
      .replace(/^POSKO ULP\s+/i, "")
      .replace(/^ULP\s+/i, "")
      .replace(/^POSKO\s+/i, "")
      .replace(/[^A-Z0-9]/g, "")
      .trim();

    const rowsList = itemsToProcess.map((u) => {
      let realRate = u.fallbackReal;

      if (isFilteredButEmpty) {
        realRate = 0;
      } else if (hasRealRows) {
        let sumTotalSkor = 0;
        let countTotalSkor = 0;

        rawRows.slice(1).forEach(row => {
          if (!row || row.length === 0) return;
          const rowUlpRaw = idxNamaUlp !== -1 ? String(row[idxNamaUlp] || "").toUpperCase() : "";
          
          let matches = false;
          if (isUpSumbarMode) {
            const rowUp3Name = getUp3ForUlp(rowUlpRaw);
            const cleanRowUp3 = rowUp3Name.replace(/[^A-Z0-9]/g, "").toUpperCase();
            const cleanUKey = u.key.replace(/[^A-Z0-9]/g, "").toUpperCase();
            matches = cleanRowUp3.includes(cleanUKey) || cleanUKey.includes(cleanRowUp3);
          } else {
            const cleanRowUlp = cleanString(rowUlpRaw);
            const cleanUKey = cleanString(u.key);
            matches = cleanRowUlp.includes(cleanUKey) || cleanUKey.includes(cleanRowUlp);
          }

          if (matches) {
            if (idxTotalSkor !== -1) {
              sumTotalSkor += parseNum(row[idxTotalSkor]);
              countTotalSkor++;
            } else if (idxPersentaseSkor !== -1) {
              const pSkor = parseNum(row[idxPersentaseSkor]);
              sumTotalSkor += (pSkor / 100) * 15;
              countTotalSkor++;
            }
          }
        });

        if (countTotalSkor > 0) {
          const avgTotalSkor = sumTotalSkor / countTotalSkor;
          realRate = Math.min(100, (avgTotalSkor / 15) * 100);
        } else {
          realRate = 0;
        }
      }

      let greenCount = 0;
      let yellowCount = 0;
      let redCount = 0;
      let totalPetugas = 0;

      if (isFilteredButEmpty) {
        greenCount = 0;
        yellowCount = 0;
        redCount = 0;
        totalPetugas = 0;
      } else if (hasRealRows) {
        rawRows.slice(1).forEach(row => {
          if (!row || row.length === 0) return;
          const rowUlpRaw = idxNamaUlp !== -1 ? String(row[idxNamaUlp] || "").toUpperCase() : "";
          
          let matches = false;
          if (isUpSumbarMode) {
            const rowUp3Name = getUp3ForUlp(rowUlpRaw);
            const cleanRowUp3 = rowUp3Name.replace(/[^A-Z0-9]/g, "").toUpperCase();
            const cleanUKey = u.key.replace(/[^A-Z0-9]/g, "").toUpperCase();
            matches = cleanRowUp3.includes(cleanUKey) || cleanUKey.includes(cleanRowUp3);
          } else {
            const cleanRowUlp = cleanString(rowUlpRaw);
            const cleanUKey = cleanString(u.key);
            matches = cleanRowUlp.includes(cleanUKey) || cleanUKey.includes(cleanRowUlp);
          }

          if (matches) {
            let val = 0;
            if (idxTotalSkor !== -1) {
              val = parseNum(row[idxTotalSkor]);
            } else if (idxPersentaseSkor !== -1) {
              val = parseNum(row[idxPersentaseSkor]);
            }

            // Calculate percentage from total skor. 
            // Since max Total Skor is 15, we convert it to percentage: (val / 15) * 100.
            // If the value is already > 15, we can treat it as percentage directly.
            const pct = Math.min(100, val > 15 ? val : (val / 15) * 100);

            if (pct > 60) {
              greenCount++;
            } else if (pct >= 30) {
              yellowCount++;
            } else {
              redCount++;
            }
            totalPetugas++;
          }
        });
      } else {
        greenCount = 0;
        yellowCount = 0;
        redCount = 0;
        totalPetugas = 0;
      }

      return {
        key: u.key,
        name: u.name,
        up3: u.up3,
        targetRate: 100,
        realRate: Math.min(100, parseFloat(realRate.toFixed(2))),
        green: greenCount,
        yellow: yellowCount,
        red: redCount,
        totalPetugas
      };
    });

    let filteredList = rowsList;
    if (!isUpSumbarMode && selectedUlp !== 'ALL') {
      const uKey = selectedUlp.toUpperCase();
      filteredList = rowsList.filter(r => r.key.includes(uKey) || uKey.includes(r.key));
    }

    const activeRowsList = rowsList.filter(r => r.totalPetugas > 0);
    const averageRealRate = activeRowsList.length > 0 
      ? activeRowsList.reduce((acc, r) => acc + r.realRate, 0) / activeRowsList.length 
      : (isFilteredButEmpty || hasRealRows ? 0 : 0);

    const totalGreen = rowsList.reduce((acc, r) => acc + r.green, 0);
    const totalYellow = rowsList.reduce((acc, r) => acc + r.yellow, 0);
    const totalRed = rowsList.reduce((acc, r) => acc + r.red, 0);
    const grandTotalPetugas = rowsList.reduce((acc, r) => acc + r.totalPetugas, 0);

    return {
      rows: filteredList,
      totalUp3: {
        targetRate: 100,
        realRate: Math.min(100, parseFloat(averageRealRate.toFixed(2))),
        green: totalGreen,
        yellow: totalYellow,
        red: totalRed,
        totalPetugas: grandTotalPetugas
      }
    };
  }, [filteredVccData, data.officerPerformance, selectedUlp, selectedUp3, data.up3ToUlps]);

  const handleCellClick = (ulpKey: string, ulpName: string, category: 'green' | 'yellow' | 'red' | 'total') => {
    const titles = {
      green: 'HIGH PERFORMA (ZONA HIJAU > 60%)',
      yellow: 'MID PERFORMA (ZONA KUNING 30% - 60%)',
      red: 'UNDER PERFORMA (ZONA MERAH < 30%)',
      total: 'TOTAL PETUGAS'
    };
    setModalSearchTerm('');
    setClickedCell({
      ulpKey,
      ulpName,
      category,
      title: `${titles[category]} - ${ulpName}`
    });
  };

  const modalOfficersList = useMemo(() => {
    if (!clickedCell) return [];

    const { ulpKey, category } = clickedCell;
    const rawRows = filteredVccData;
    const hasRealRows = rawRows.length > 1;

    let headers: string[] = [];
    let idxNamaUlp = -1;
    let idxTotalSkor = -1;
    let idxPersentaseSkor = -1;
    let idxEmployeename = -1;
    let idxSkorHariKerja = -1;
    let idxSkorPerforma = -1;
    let idxSkorProduktivitas = -1;

    const parseNum = (val: any): number => {
      if (val === undefined || val === null || val === "") return 0;
      if (typeof val === 'number') return val;
      const str = String(val).trim();
      if (!str) return 0;

      let cleaned = str.replace('%', '').trim();
      const hasComma = cleaned.includes(',');
      const hasDot = cleaned.includes('.');

      if (hasComma && hasDot) {
        if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
        }
      } else if (hasComma) {
        const parts = cleaned.split(',');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          cleaned = cleaned.replace(/,/g, '');
        } else {
          cleaned = cleaned.replace(/,/g, '.');
        }
      } else if (hasDot) {
        const parts = cleaned.split('.');
        if (parts[parts.length - 1].length === 3 && parts[0].length <= 3) {
          cleaned = cleaned.replace(/\./g, '');
        }
      }

      return parseFloat(cleaned) || 0;
    };

    if (hasRealRows) {
      headers = rawRows[0] || [];
      const findHeaderIdx = (possibleNames: string[]) => {
        const normNames = possibleNames.map(n => n.toLowerCase().trim().replace(/['"_\s]/g, ""));
        return headers.findIndex(h => {
          const cleaned = String(h || "").toLowerCase().trim().replace(/['"_\s]/g, "");
          return normNames.includes(cleaned);
        });
      };

      idxNamaUlp = findHeaderIdx(["namaulp", "ulp", "unit"]);
      idxTotalSkor = findHeaderIdx(["totalskor", "skortotal"]);
      idxPersentaseSkor = findHeaderIdx(["persentaseskor", "persentase", "skor", "kinerja"]);
      idxEmployeename = findHeaderIdx(["employeename", "namapetugas", "nama", "petugas", "officer"]);
      idxSkorHariKerja = findHeaderIdx(["skorharikerja", "harikerja"]);
      idxSkorPerforma = findHeaderIdx(["skorperforma", "performa"]);
      idxSkorProduktivitas = findHeaderIdx(["skorproduktivitas", "produktivitas", "skorproduktifitas"]);

      const list: any[] = [];
      rawRows.slice(1).forEach(row => {
        if (!row || row.length === 0) return;

        // Check ULP filter
        const rowUlpRaw = idxNamaUlp !== -1 ? String(row[idxNamaUlp] || "").toUpperCase() : "";
        
        let matchesUlp = false;
        if (ulpKey === 'ALL') {
          matchesUlp = true;
        } else if (isUpSumbarMode) {
          const rowUp3Name = getUp3ForUlp(rowUlpRaw);
          const cleanRowUp3 = rowUp3Name.replace(/[^A-Z0-9]/g, "").toUpperCase();
          const cleanUlpKey = ulpKey.replace(/[^A-Z0-9]/g, "").toUpperCase();
          matchesUlp = cleanRowUp3.includes(cleanUlpKey) || cleanUlpKey.includes(cleanRowUp3);
        } else {
          matchesUlp = rowUlpRaw.includes(ulpKey) || ulpKey.includes(rowUlpRaw);
        }

        if (!matchesUlp) return;

        // Calculate score/percentage to determine category
        let totalSkorVal = 0;
        let pct = 0;

        if (idxTotalSkor !== -1) {
          totalSkorVal = parseNum(row[idxTotalSkor]);
        }
        if (idxPersentaseSkor !== -1) {
          pct = Math.min(100, parseNum(row[idxPersentaseSkor]));
        } else if (idxTotalSkor !== -1) {
          pct = Math.min(100, (totalSkorVal / 15) * 100);
        }

        let matchesCategory = false;
        if (category === 'total') {
          matchesCategory = true;
        } else if (category === 'green' && pct > 60) {
          matchesCategory = true;
        } else if (category === 'yellow' && pct >= 30 && pct <= 60) {
          matchesCategory = true;
        } else if (category === 'red' && pct < 30) {
          matchesCategory = true;
        }

        if (matchesCategory) {
          list.push({
            employeeName: idxEmployeename !== -1 ? String(row[idxEmployeename] || "").toUpperCase() : "UNNAMED OFFICER",
            namaUlp: idxNamaUlp !== -1 ? String(row[idxNamaUlp] || "").toUpperCase() : "ULP BUKITTINGGI",
            persentaseSkor: Math.min(100, pct),
            skorHariKerja: idxSkorHariKerja !== -1 ? parseNum(row[idxSkorHariKerja]) : 0,
            skorPerforma: idxSkorPerforma !== -1 ? parseNum(row[idxSkorPerforma]) : 0,
            skorProduktivitas: idxSkorProduktivitas !== -1 ? parseNum(row[idxSkorProduktivitas]) : 0,
            totalSkor: totalSkorVal,
          });
        }
      });
      return list;
    } else {
      return [];
    }
  }, [clickedCell, filteredVccData, isUpSumbarMode]);

  // Search filtered modal officers list
  const filteredModalOfficers = useMemo(() => {
    if (!modalSearchTerm.trim()) return modalOfficersList;
    const term = modalSearchTerm.toLowerCase();
    return modalOfficersList.filter((off: any) => 
      (off.employeeName || '').toLowerCase().includes(term) ||
      (off.namaUlp || '').toLowerCase().includes(term)
    );
  }, [modalOfficersList, modalSearchTerm]);

  const handleExportOfficerPerformanceExcel = () => {
    const headers = ["Nama Petugas", "Total Nilai YO (%)", "Nilai Hari Kerja (%)", "Nilai Produktivitas (%)", "Nilai Performa WO + PO (%)"];
    const rows = officerPerformanceData.map(row => [
      row.name,
      row.totalNilaiYo,
      row.nilaiHariKerja,
      row.nilaiProduktivitas,
      row.nilaiPerformaWoPo
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performa Petugas");
    XLSX.writeFile(wb, `Performa_Petugas_${new Date().getTime()}.xlsx`);
  };

  const handleExportThresholdExcel = () => {
    const headers = ["Nama Unit", "UP3", "Target Rata2 Performa (%)", "Real Rata2 Performa (%)", "Zona Hijau", "Zona Kuning", "Zona Merah", "Total Petugas"];
    const rows = thresholdTableData.rows.map(row => [
      row.name,
      row.up3,
      row.targetRate,
      row.realRate,
      row.green,
      row.yellow,
      row.red,
      row.totalPetugas
    ]);
    rows.push([
      isUpSumbarMode ? "TOTAL SUMBAR" : "TOTAL UP3",
      "",
      thresholdTableData.totalUp3.targetRate,
      thresholdTableData.totalUp3.realRate,
      thresholdTableData.totalUp3.green,
      thresholdTableData.totalUp3.yellow,
      thresholdTableData.totalUp3.red,
      thresholdTableData.totalUp3.totalPetugas
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Threshold");
    XLSX.writeFile(wb, `Threshold_Penilaian_${new Date().getTime()}.xlsx`);
  };

  const handleExportBottomOfficersExcel = () => {
    const headers = ["Nama Petugas Yantek", "Nama ULP", "Target Skor YO", "Pencapaian Skor YO", "% Pencapaian Kinerja YO"];
    const rows = bottomOfficers.map(off => [
      off.name,
      off.ulp,
      off.targetScore,
      off.score,
      off.percent
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tindak Lanjut");
    XLSX.writeFile(wb, `Tindak_Lanjut_Petugas_${new Date().getTime()}.xlsx`);
  };

  const handleExportModalOfficersExcel = () => {
    const headers = ["Nama Petugas", "Nama ULP", "% Skor", "Skor Hari Kerja", "Skor Performa", "Skor Produktivitas", "Total Skor"];
    const rows = filteredModalOfficers.map(off => [
      off.employeeName,
      off.namaUlp,
      off.persentaseSkor,
      off.skorHariKerja,
      off.skorPerforma,
      off.skorProduktivitas,
      off.totalSkor
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detail Petugas");
    XLSX.writeFile(wb, `${clickedCell?.title.replace(/\s+/g, '_') || 'Detail_Petugas'}_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-8 relative px-2 pb-12">
      
      {/* 1. Header & Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-white/5 flex items-center justify-between relative overflow-hidden shadow-lg shadow-blue-950/20">
          <div className="flex flex-col gap-1 z-10">
            <span className="text-[10px] font-black text-brand-accent tracking-widest uppercase">RATA RATA PERFORMA YO UP3</span>
            <span className="text-3xl font-black italic tracking-tight text-brand-accent">{vccMetrics.avgPerforma}%</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl z-10">
            <Cpu className="text-brand-accent" size={24} />
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-brand-accent/5 rounded-full blur-xl" />
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-white/5 flex items-center justify-between relative overflow-hidden shadow-lg shadow-blue-950/20">
          <div className="flex flex-col gap-1 z-10">
            <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">PERFORMA HARI KERJA UP3</span>
            <span className="text-3xl font-black italic tracking-tight text-emerald-400">{vccMetrics.avgKinerjaYo}%</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl z-10">
            <Gauge className="text-emerald-400" size={24} />
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-400/5 rounded-full blur-xl" />
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-white/5 flex items-center justify-between relative overflow-hidden shadow-lg shadow-blue-950/20">
          <div className="flex flex-col gap-1 z-10">
            <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">PERFORMA PRODUKTIFITAS KERJA</span>
            <span className="text-3xl font-black italic tracking-tight text-cyan-400">{vccMetrics.avgHariKerja}%</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl z-10">
            <Clock className="text-cyan-400" size={24} />
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-cyan-400/5 rounded-full blur-xl" />
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-white/5 flex items-center justify-between relative overflow-hidden shadow-lg shadow-blue-950/20">
          <div className="flex flex-col gap-1 z-10">
            <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase">TOTAL WO - PO UP3</span>
            <span className="text-3xl font-black italic tracking-tight text-purple-400">{vccMetrics.totalWoPo}%</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl z-10">
            <Sliders className="text-purple-400" size={24} />
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-400/5 rounded-full blur-xl" />
        </div>

      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table - Performance per ULP */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-brand-secondary rounded-full" />
              <h3 className="text-sm font-black italic tracking-tighter text-brand-primary uppercase">PERFORMA PER PETUGAS</h3>
              <button
                onClick={handleExportOfficerPerformanceExcel}
                className="ml-2 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-sm"
                title="Download Excel Performa Per Petugas"
              >
                <Download size={10} />
                Excel
              </button>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
              <Info size={12} />
              <span>Sumber Data: Sheet VCC_DATA (Realisasi & Target)</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 text-[9px] font-black uppercase text-gray-400 tracking-wider bg-slate-50/50">
                  <th className="py-1.5 px-3">NAMA PETUGAS</th>
                  <th className="py-1.5 px-3 text-right">TOTAL NILAI YO</th>
                  <th className="py-1.5 px-3 text-right">NILAI HARI KERJA</th>
                  <th className="py-1.5 px-3 text-right">NILAI PRODUKTIVITAS</th>
                  <th className="py-1.5 px-3 text-right">NILAI PERFORMA WO + PO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-[10px] font-semibold text-gray-700">
                {officerPerformanceData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 font-medium text-xs">
                      Tidak ada data petugas untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  paginatedOfficers.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-1.5 px-3 font-black text-slate-800 tracking-tight">
                        {row.name}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-brand-secondary">
                        {row.totalNilaiYo}%
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-emerald-600">
                        {row.nilaiHariKerja}%
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-cyan-600">
                        {row.nilaiProduktivitas}%
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-purple-600">
                        {row.nilaiPerformaWoPo}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {officerPerformanceData.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-2.5 border-t border-gray-100 text-[10px] gap-3">
              <span className="text-gray-500 font-bold">
                Menampilkan {Math.min(officerPerformanceData.length, (officerPage - 1) * itemsPerPage + 1)} - {Math.min(officerPerformanceData.length, officerPage * itemsPerPage)} dari {officerPerformanceData.length} Petugas
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setOfficerPage(prev => Math.max(1, prev - 1))}
                  disabled={officerPage === 1}
                  className="px-2 py-1 rounded-md border border-gray-200 text-gray-600 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-[10px]"
                >
                  Sebelumnya
                </button>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: totalOfficerPages }, (_, i) => i + 1)
                    .filter(p => {
                      if (totalOfficerPages <= 5) return true;
                      return Math.abs(p - officerPage) <= 1 || p === 1 || p === totalOfficerPages;
                    })
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="px-1 text-gray-400 font-bold">...</span>}
                          <button
                            onClick={() => setOfficerPage(p)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] transition-colors ${
                              officerPage === p
                                ? 'bg-brand-primary text-white'
                                : 'border border-gray-200 text-gray-600 hover:bg-slate-50'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>
                <button
                  onClick={() => setOfficerPage(prev => Math.min(totalOfficerPages, prev + 1))}
                  disabled={officerPage === totalOfficerPages}
                  className="px-2 py-1 rounded-md border border-gray-200 text-gray-600 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-[10px]"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Chart - Performance per ULP */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-brand-primary rounded-full" />
            <h3 className="text-sm font-black italic tracking-tighter text-brand-primary uppercase">
              {isUpSumbarMode ? "EVALUASI PERFORMA YO PER UP3" : "EVALUASI PERFORMA YO PER ULP"}
            </h3>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ulpPerformanceData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                  unit="%"
                />
                <RechartsTooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  formatter={(value: any) => [`${value}%`, "TOTAL NILAI YO"]}
                />
                <Bar 
                  dataKey="totalNilaiYo" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={30}
                >
                  {ulpPerformanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 3. Detailed Optimizer Matrix & Recommendations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-brand-primary" />
            <h3 className="text-sm font-black italic tracking-tighter text-brand-primary uppercase">THRESHOLD PENILAIAN & ALOKASI PETUGAS</h3>
            <button
              onClick={handleExportThresholdExcel}
              className="ml-2 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Download Excel Threshold"
            >
              <Download size={10} />
              Excel
            </button>
          </div>
          {!isUpSumbarMode && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-gray-400 uppercase">FILTER UNIT:</span>
              <select 
                value={selectedUlp} 
                onChange={(e) => setSelectedUlp(e.target.value)}
                className="bg-white border border-gray-200 rounded px-2.5 py-1 text-[10px] font-black text-brand-primary outline-none focus:border-brand-secondary transition-colors"
              >
                <option value="ALL">SEMUA UNIT</option>
                {thresholdTableData.rows.map(u => (
                  <option key={u.key} value={u.key}>{u.key}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto p-4 sm:p-6 bg-slate-50/40">
          <table className="w-full text-center border-2 border-slate-300 border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#154c79] text-white text-[11px] font-black uppercase tracking-wider">
                <th className="py-3 px-2 border-2 border-slate-300 align-middle" rowSpan={2}>NO</th>
                <th className="py-3 px-4 border-2 border-slate-300 text-left align-middle" rowSpan={2}>
                  {isUpSumbarMode ? "NAMA UP3" : "NAMA ULP"}
                </th>
                <th className="py-3 px-3 border-2 border-slate-300 align-middle" rowSpan={2}>UP3</th>
                <th className="py-3 px-3 border-2 border-slate-300 align-middle" rowSpan={2}>TARGET RATA2<br/>PERFORMA</th>
                <th className="py-3 px-3 border-2 border-slate-300 align-middle" rowSpan={2}>REAL RATA2<br/>PERFORMA</th>
                <th className="py-2.5 px-3 border-2 border-slate-300 bg-[#0a1c3f] text-white align-middle" colSpan={3}>THRESHOLD NILAI YO</th>
                <th className="py-3 px-3 border-2 border-slate-300 bg-[#0a1c3f] text-white align-middle" rowSpan={2}>TOTAL<br/>PETUGAS</th>
              </tr>
              <tr className="text-[10px] font-black uppercase text-center text-white">
                <th className="py-2.5 px-3 border-2 border-slate-300 bg-[#00a651] text-white leading-tight">
                  HIGH PERFORMA<br/>ZONA HIJAU : &gt; 60 %
                </th>
                <th className="py-2.5 px-3 border-2 border-slate-300 bg-[#fff200] text-black leading-tight">
                  MID PERFORMA<br/>ZONA KUNING : 60 s/d 30
                </th>
                <th className="py-2.5 px-3 border-2 border-slate-300 bg-[#ff0000] text-white leading-tight">
                  UNDER PERFORMA<br/>ZONA MERAH : &lt; 30
                </th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold text-slate-800 divide-y divide-slate-300">
              {thresholdTableData.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 bg-white font-medium border-2 border-slate-300">
                    Tidak ada data untuk filter ULP ini.
                  </td>
                </tr>
              ) : (
                thresholdTableData.rows.map((row, idx) => (
                  <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2 border border-slate-300 font-bold text-slate-900 text-center">{idx + 1}</td>
                    <td className="py-3 px-4 border border-slate-300 text-left font-black uppercase text-slate-900">{row.name}</td>
                    <td className="py-3 px-2 border border-slate-300 font-bold text-slate-600 text-center">{row.up3}</td>
                    <td className="py-3 px-2 border border-slate-300 font-black text-slate-900 text-center">{row.targetRate}%</td>
                    <td className="py-3 px-2 border border-slate-300 font-black text-blue-800 bg-blue-50/20 text-center">{row.realRate}%</td>
                    <td 
                      onClick={() => handleCellClick(row.key, row.name, 'green')}
                      className="py-3 px-2 border border-slate-300 font-black text-emerald-600 bg-emerald-50/10 hover:bg-emerald-100/50 cursor-pointer text-center select-none transition-colors duration-150"
                      title="Klik untuk melihat detail petugas Zona Hijau"
                    >
                      <span className="hover:underline hover:text-emerald-700">{row.green}</span>
                    </td>
                    <td 
                      onClick={() => handleCellClick(row.key, row.name, 'yellow')}
                      className="py-3 px-2 border border-slate-300 font-black text-amber-600 bg-amber-50/10 hover:bg-amber-100/50 cursor-pointer text-center select-none transition-colors duration-150"
                      title="Klik untuk melihat detail petugas Zona Kuning"
                    >
                      <span className="hover:underline hover:text-amber-700">{row.yellow}</span>
                    </td>
                    <td 
                      onClick={() => handleCellClick(row.key, row.name, 'red')}
                      className="py-3 px-2 border border-slate-300 font-black text-rose-600 bg-rose-50/10 hover:bg-rose-100/50 cursor-pointer text-center select-none transition-colors duration-150"
                      title="Klik untuk melihat detail petugas Zona Merah"
                    >
                      <span className="hover:underline hover:text-rose-700">{row.red}</span>
                    </td>
                    <td 
                      onClick={() => handleCellClick(row.key, row.name, 'total')}
                      className="py-3 px-2 border border-slate-300 font-black text-white bg-[#154c79] hover:bg-[#0f3758] cursor-pointer text-center select-none transition-colors duration-150"
                      title="Klik untuk melihat detail seluruh petugas"
                    >
                      <span className="hover:underline">{row.totalPetugas}</span>
                    </td>
                  </tr>
                ))
              )}
              
              {/* Total Row */}
              <tr className="bg-[#154c79] text-white font-black text-[11px] uppercase text-center">
                <td className="py-3.5 px-4 border-2 border-slate-300 text-left" colSpan={2}>
                  {isUpSumbarMode ? "TOTAL SUMBAR" : "TOTAL UP3"}
                </td>
                <td className="py-3.5 px-2 border-2 border-slate-300"></td>
                <td className="py-3.5 px-2 border-2 border-slate-300">{thresholdTableData.totalUp3.targetRate}%</td>
                <td className="py-3.5 px-2 border-2 border-slate-300 bg-[#113a5d]">{thresholdTableData.totalUp3.realRate}%</td>
                <td 
                  onClick={() => handleCellClick('ALL', isUpSumbarMode ? 'TOTAL SUMBAR (SEMUA UP3)' : 'TOTAL UP3 (SEMUA UNIT)', 'green')}
                  className="py-3.5 px-2 border-2 border-slate-300 bg-[#00a651] hover:bg-[#008f45] cursor-pointer select-none transition-colors duration-150"
                  title={isUpSumbarMode ? "Klik untuk melihat seluruh petugas Zona Hijau SUMBAR" : "Klik untuk melihat seluruh petugas Zona Hijau UP3"}
                >
                  <span className="hover:underline">{thresholdTableData.totalUp3.green}</span>
                </td>
                <td 
                  onClick={() => handleCellClick('ALL', isUpSumbarMode ? 'TOTAL SUMBAR (SEMUA UP3)' : 'TOTAL UP3 (SEMUA UNIT)', 'yellow')}
                  className="py-3.5 px-2 border-2 border-slate-300 bg-[#c2b800] text-black hover:bg-[#a39b00] cursor-pointer select-none transition-colors duration-150"
                  title={isUpSumbarMode ? "Klik untuk melihat seluruh petugas Zona Kuning SUMBAR" : "Klik untuk melihat seluruh petugas Zona Kuning UP3"}
                >
                  <span className="hover:underline">{thresholdTableData.totalUp3.yellow}</span>
                </td>
                <td 
                  onClick={() => handleCellClick('ALL', isUpSumbarMode ? 'TOTAL SUMBAR (SEMUA UP3)' : 'TOTAL UP3 (SEMUA UNIT)', 'red')}
                  className="py-3.5 px-2 border-2 border-slate-300 bg-[#cc0000] hover:bg-[#b30000] cursor-pointer select-none transition-colors duration-150"
                  title={isUpSumbarMode ? "Klik untuk melihat seluruh petugas Zona Merah SUMBAR" : "Klik untuk melihat seluruh petugas Zona Merah UP3"}
                >
                  <span className="hover:underline">{thresholdTableData.totalUp3.red}</span>
                </td>
                <td 
                  onClick={() => handleCellClick('ALL', isUpSumbarMode ? 'TOTAL SUMBAR (SEMUA UP3)' : 'TOTAL UP3 (SEMUA UNIT)', 'total')}
                  className="py-3.5 px-2 border-2 border-slate-300 bg-[#0a1c3f] hover:bg-[#061126] cursor-pointer select-none transition-colors duration-150"
                  title={isUpSumbarMode ? "Klik untuk melihat seluruh petugas SUMBAR" : "Klik untuk melihat seluruh petugas UP3"}
                >
                  <span className="hover:underline">{thresholdTableData.totalUp3.totalPetugas}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Tindak Lanjut Petugas Terbawah Table */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col gap-4" id="tindak_lanjut_petugas_terbawah_section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="text-rose-500" size={18} />
            <h3 className="text-sm font-black italic tracking-tighter text-brand-primary uppercase">TINDAK LANJUT EVALUASI PETUGAS (PERFORMA {"<60%"})</h3>
            <button
              onClick={handleExportBottomOfficersExcel}
              className="ml-2 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Download Excel Tindak Lanjut"
            >
              <Download size={10} />
              Excel
            </button>
          </div>
          <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-150 rounded-full text-[9px] font-black uppercase">
            Terdeteksi: {bottomOfficers.length} Orang
          </span>
        </div>
        
        <div className="overflow-x-auto border border-slate-300 rounded-xl">
          <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-800">
            <thead>
              <tr className="bg-slate-800 text-[#00e5ff] uppercase font-black text-[9px] tracking-wider text-center">
                <th className="py-3 px-3 border-2 border-slate-300 text-center w-12">No</th>
                <th className="py-3 px-4 border-2 border-slate-300 text-left w-64">Nama Petugas Yantek</th>
                <th className="py-3 px-4 border-2 border-slate-300 text-left w-52">Nama ULP</th>
                <th className="py-3 px-3 border-2 border-slate-300 w-36">Target Skor YO</th>
                <th className="py-3 px-3 border-2 border-slate-300 w-36">Pencapaian Skor YO</th>
                <th className="py-3 px-3 border-2 border-slate-300 w-36">% Pencapaian Kinerja YO</th>
                <th className="py-3 px-3 border-2 border-slate-300 w-60">Eviden Tindak Lanjut 1</th>
                <th className="py-3 px-3 border-2 border-slate-300 w-60">Eviden Tindak Lanjut 2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-[11px] font-bold">
              {bottomOfficers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 bg-slate-50 font-black uppercase tracking-wider border-2 border-slate-300">
                    Tidak ada petugas dengan pencapaian kinerja di bawah 60%
                  </td>
                </tr>
              ) : (
                bottomOfficers.map((officer, idx) => {
                  const runningNo = idx + 1;
                  const name = officer.name;
                  const ulp = officer.ulp;
                  const targetScore = officer.targetScore;
                  const score = officer.score;
                  const percent = officer.percent;

                  // Retrieve uploaded eviden from the synchronized state
                  const eviden = evidenMap[name] || {};
                  const img1 = eviden.fotoEviden1;
                  const img2 = eviden.fotoEviden2;

                  return (
                    <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3 border border-slate-300 text-center font-extrabold text-slate-400 tabular-nums">{runningNo}</td>
                      <td className="py-3.5 px-4 border border-slate-300 text-left font-black uppercase text-slate-900">{name}</td>
                      <td className="py-3.5 px-4 border border-slate-300 text-left font-extrabold text-[#1b3d5d] uppercase">{ulp}</td>
                      <td className="py-3.5 px-3 border border-slate-300 text-center font-bold text-slate-400">{targetScore.toFixed(2)}</td>
                      <td className="py-3.5 px-3 border border-slate-300 text-center font-black text-slate-800">{score.toFixed(2)}</td>
                      <td className="py-3.5 px-3 border border-slate-300 text-center bg-rose-50/20">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100">
                          {percent.toFixed(1)}%
                        </span>
                      </td>
                      
                      {/* Eviden 1 Column */}
                      <td className="py-2 px-3 border border-slate-300 text-center bg-slate-50/30">
                        {img1 ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-10 bg-slate-100 rounded border border-slate-200 overflow-hidden shrink-0 group relative">
                              <img src={img1} alt="Eviden 1" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <a 
                                href={img1} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-black uppercase tracking-wider transition-all"
                              >
                                Buka
                              </a>
                            </div>
                            <span className="text-[7.5px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded leading-none shrink-0">
                              Ada
                            </span>
                          </div>
                        ) : (
                          <span className="text-[7.5px] font-bold uppercase text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            Belum Ada Foto
                          </span>
                        )}
                      </td>

                      {/* Eviden 2 Column */}
                      <td className="py-2 px-3 border border-slate-300 text-center bg-slate-50/30">
                        {img2 ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-10 bg-slate-100 rounded border border-slate-200 overflow-hidden shrink-0 group relative">
                              <img src={img2} alt="Eviden 2" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <a 
                                href={img2} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-black uppercase tracking-wider transition-all"
                              >
                                Buka
                              </a>
                            </div>
                            <span className="text-[7.5px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded leading-none shrink-0">
                              Ada
                            </span>
                          </div>
                        ) : (
                          <span className="text-[7.5px] font-bold uppercase text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            Belum Ada Foto
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Clickable Cell Details Modal */}
      <AnimatePresence>
        {clickedCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setClickedCell(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden relative border border-slate-100 z-10"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#154c79]/25 rounded-lg border border-white/10">
                    <Users size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black italic uppercase tracking-wider text-emerald-400">
                      DETAIL PETUGAS VCC_DATA
                    </h3>
                    <p className="text-[10px] text-white/60 font-medium">
                      {clickedCell.title}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setClickedCell(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Toolbar */}
              <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    placeholder="Cari nama petugas atau unit..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-[#154c79] focus:ring-1 focus:ring-[#154c79] transition-all"
                  />
                  {modalSearchTerm && (
                    <button 
                      onClick={() => setModalSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-[10px]"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportModalOfficersExcel}
                    className="flex items-center gap-1.5 bg-[#154c79] hover:bg-[#0f3758] text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    <Download size={11} />
                    Download Excel
                  </button>
                  <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5 bg-slate-200/50 px-3 py-1.5 rounded-md">
                    TERDETEKSI: <span className="text-[#154c79]">{filteredModalOfficers.length} PETUGAS</span>
                  </div>
                </div>
              </div>

              {/* Grid content */}
              <div className="p-6 overflow-y-auto flex-1">
                {filteredModalOfficers.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
                    <Users size={40} className="text-slate-200 stroke-[1.5]" />
                    <p className="text-sm font-bold">Tidak ada petugas ditemukan</p>
                    <p className="text-xs text-slate-400">Silakan gunakan kata kunci pencarian lain atau periksa filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold text-center">
                          <th className="py-3 px-3 border border-slate-800 w-[50px]">NO</th>
                          <th className="py-3 px-4 border border-slate-800 text-left">NAMA PETUGAS</th>
                          <th className="py-3 px-4 border border-slate-800 text-left">NAMA ULP</th>
                          <th className="py-3 px-3 border border-slate-800">% SKOR</th>
                          <th className="py-3 px-3 border border-slate-800">SKOR HARI KERJA</th>
                          <th className="py-3 px-3 border border-slate-800">SKOR PERFORMA</th>
                          <th className="py-3 px-3 border border-slate-800">SKOR PRODUKTIVITAS</th>
                          <th className="py-3 px-3 border border-slate-800 bg-slate-800">TOTAL SKOR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredModalOfficers.map((off, index) => (
                          <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 border border-slate-200 text-center font-bold text-slate-400 tabular-nums">
                              {index + 1}
                            </td>
                            <td className="py-2.5 px-4 border border-slate-200 text-left font-black uppercase text-slate-900">
                              {off.employeeName}
                            </td>
                            <td className="py-2.5 px-4 border border-slate-200 text-left font-extrabold text-[#154c79] uppercase">
                              {off.namaUlp}
                            </td>
                            <td className="py-2.5 px-3 border border-slate-200 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                off.persentaseSkor > 60 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : off.persentaseSkor >= 30
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : 'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                                {off.persentaseSkor.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 border border-slate-200 text-center font-extrabold text-slate-600 tabular-nums">
                              {off.skorHariKerja.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 border border-slate-200 text-center font-extrabold text-slate-600 tabular-nums">
                              {off.skorPerforma.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 border border-slate-200 text-center font-extrabold text-slate-600 tabular-nums">
                              {off.skorProduktivitas.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 border border-slate-200 text-center font-black text-slate-900 bg-slate-50 tabular-nums">
                              {off.totalSkor.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Menampilkan hasil dari Google Sheet VCC_DATA
                </span>
                <button 
                  onClick={() => setClickedCell(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase rounded-lg shadow-sm tracking-wider transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

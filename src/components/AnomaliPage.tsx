import React, { useState, useMemo, useEffect } from 'react';
import { AnomaliData } from '../types';
import { 
  Building2, 
  MapPin, 
  AlertTriangle, 
  Search, 
  X, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  AlertOctagon,
  FileSpreadsheet,
  User,
  ArrowUpDown,
  BarChart3,
  PieChart as PieIcon,
  Camera,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Sector
} from 'recharts';

// Custom classification function for Indonesian Safety & Yandal Metrics
export const classifyAnomaly = (jenis: string, deskripsi: string): number => {
  const J = String(jenis || "").toLowerCase().trim();
  const D = String(deskripsi || "").toLowerCase().trim();

  // 1. Try to classify based on 'jenis' first if provided and not generic "lainnya"
  if (J && J !== "lainnya") {
    if (J.includes("konfirmasi") || J.includes("ccv")) return 4;
    if (J.includes("cctv") || J.includes("kamera")) return 0;
    if (J.includes("rambu")) return 1;
    if (J.includes("ps4") || J.includes("ps-4") || J.includes("ps 4")) return 2;
    if (J.includes("apd") || J.includes("tunjuk sebut") || J.includes("tunjuk-sebut")) return 3;
    if (J.includes("alat kerja") || J.includes("material") || J.includes("kelengkapan") || J.includes("peralatan") || J.includes("materila")) return 5;
    if (J.includes("wp") || J.includes("jsa") || J.includes("working permit") || J.includes("job safety")) return 6;
    if (J.includes("hsse") || J.includes("yandal sebelum") || (J.includes("lapor") && J.includes("sebelum"))) return 7;
    if (J.includes("briefing") || J.includes("brief")) return 8;
    if (J.includes("tersengat") || J.includes("listrik") || J.includes("sengat") || J.includes("setrum")) return 9;
    if (J.includes("jatuh") || J.includes("ketinggian") || J.includes("terjatuh")) return 10;
    if (J.includes("selesai") || J.includes("pekerjaan selesai")) return 11;
  }

  // 2. Fall back to classifying based on 'deskripsi'
  if (D) {
    if (D.includes("konfirmasi") || D.includes("ccv")) return 4;
    if (D.includes("cctv") || D.includes("kamera")) return 0;
    if (D.includes("rambu")) return 1;
    if (D.includes("ps4") || D.includes("ps-4") || D.includes("ps 4")) return 2;
    if (D.includes("apd") || D.includes("tunjuk sebut") || D.includes("tunjuk-sebut")) return 3;
    if (D.includes("alat kerja") || D.includes("material") || D.includes("kelengkapan") || D.includes("peralatan") || D.includes("materila")) return 5;
    if (D.includes("wp") || D.includes("jsa") || D.includes("working permit") || D.includes("job safety")) return 6;
    if (D.includes("hsse") || D.includes("yandal sebelum") || (D.includes("lapor") && D.includes("sebelum"))) return 7;
    if (D.includes("briefing") || D.includes("brief")) return 8;
    if (D.includes("tersengat") || D.includes("listrik") || D.includes("sengat") || D.includes("setrum")) return 9;
    if (D.includes("jatuh") || D.includes("ketinggian") || D.includes("terjatuh")) return 10;
    if (D.includes("selesai") || D.includes("pekerjaan selesai")) return 11;
  }

  return -1;
};

const roseColorsArray = [
  '#4f83e3', // Blue
  '#2ac9db', // Cyan
  '#3dcf9f', // Teal/Mint
  '#74db86', // Soft Light Green
  '#99e3ab', // Very Soft Pastel Green
  '#dfc76e', // Pastel Gold/Cream
  '#f5aa5f', // Soft Amber/Orange
  '#e88476', // Soft Salmon/Red
  '#c598ea', // Pastel Violet
  '#7dc2e8', // Pastel Sky Blue
  '#93a37d', // Sage Green
  '#cfaf93'  // Warm Clay
];

const CustomRoseTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-[#1b3d5d]/95 text-white p-3 rounded-xl border border-cyan-400 shadow-xl backdrop-blur-md max-w-xs">
        <p className="text-[9px] uppercase font-black tracking-widest text-cyan-300">Keterangan Anomali</p>
        <p className="text-[11px] font-bold leading-snug mt-1">{item.name}</p>
        <div className="border-t border-slate-800 my-2 pt-1.5 flex items-center justify-between gap-6">
          <span className="text-[9px] text-slate-300 font-bold uppercase">Jumlah Kasus:</span>
          <span className="text-xs font-black text-cyan-200">{item.count}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md">
        <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Unit ULP</p>
        <p className="text-xs font-black mt-1 uppercase">{item.ulpName}</p>
        <div className="border-t border-slate-800 my-2 pt-1.5 flex items-center justify-between gap-6">
          <span className="text-[9px] text-slate-400 font-bold uppercase">Total Anomali:</span>
          <span className="text-xs font-black text-rose-400">{item.total}</span>
        </div>
      </div>
    );
  }
  return null;
};

interface AnomaliPageProps {
  data: AnomaliData;
  selectedUp3?: string;
  ulpToUp3Map?: Record<string, string>;
}

interface PivotRow {
  petugas: string;
  ulp: string;
  counts: number[]; // 12 elements
  total: number;
}

export const AnomaliPage: React.FC<AnomaliPageProps> = ({ data, selectedUp3, ulpToUp3Map = {} }) => {
  const isUpSumbar = !selectedUp3 || selectedUp3 === "UP SUMBAR";

  const up3ListForSumbar = [
    { id: "padang", name: "UP3 PADANG" },
    { id: "solok", name: "UP3 SOLOK" },
    { id: "bukittinggi", name: "UP3 BUKITTINGGI" },
    { id: "payakumbuh", name: "UP3 PAYAKUMBUH" }
  ];

  // 7 ULP under UP3 Bukittinggi
  const ulpList = [
    { id: "bukittinggi", name: "BUKITTINGGI" },
    { id: "padang_panjang", name: "PADANG PANJANG" },
    { id: "lubuk_basung", name: "LUBUK BASUNG" },
    { id: "lubuk_sikaping", name: "LUBUK SIKAPING" },
    { id: "simpang_empat", name: "SIMPANG EMPAT" },
    { id: "baso", name: "BASO" },
    { id: "koto_tuo", name: "KOTO TUO" }
  ];

  const resolveStandardUp3Name = (name: string): string => {
    const val = String(name || "").toUpperCase();
    if (val.includes("BUKIT")) return "UP3 BUKITTINGGI";
    if (val.includes("PADANG")) return "UP3 PADANG";
    if (val.includes("SOLOK")) return "UP3 SOLOK";
    if (val.includes("PAYAKUMBUH")) return "UP3 PAYAKUMBUH";
    return val;
  };

  const currentUlpList = useMemo(() => {
    if (isUpSumbar) {
      return up3ListForSumbar;
    }
    const targetUP3Clean = resolveStandardUp3Name(selectedUp3 || "UP3 BUKITTINGGI");
    const ulps = Object.entries(ulpToUp3Map)
      .filter(([_, up3Name]) => resolveStandardUp3Name(up3Name as string) === targetUP3Clean)
      .map(([ulpName]) => ulpName);

    if (ulps.length > 0) {
      return ulps.map((name) => ({
        id: name.toLowerCase().replace(/\s+/g, "_"),
        name: name.toUpperCase()
      }));
    }

    return ulpList;
  }, [isUpSumbar, selectedUp3, ulpToUp3Map]);

  const cleanUlpName = (ulp: string): string => {
    const u = String(ulp || "").toUpperCase()
      .replace(/^POSKO ULP\s+/i, "")
      .replace(/^ULP\s+/i, "")
      .replace(/^POSKO\s+/i, "")
      .trim();
    if (u.includes("PADANG") && u.includes("PANJANG")) return "PADANG PANJANG";
    if (u.includes("KOTO") && u.includes("TUO")) return "KOTO TUO";
    if (u.includes("LUBUK") && u.includes("SIKAPING")) return "LUBUK SIKAPING";
    if (u.includes("LUBUK") && u.includes("BASUNG")) return "LUBUK BASUNG";
    if (u.includes("SIMPANG") && u.includes("EMPAT")) return "SIMPANG EMPAT";
    return u;
  };

  const getMappedUp3ForRow = (rowUlp: string): string => {
    const clean = cleanUlpName(rowUlp).toUpperCase().trim();
    
    // Static fallback first
    const staticMap: Record<string, string> = {
      "BUKITTINGGI": "UP3 BUKITTINGGI",
      "PADANG PANJANG": "UP3 BUKITTINGGI",
      "PADANGPANJANG": "UP3 BUKITTINGGI",
      "LUBUK SIKAPING": "UP3 BUKITTINGGI",
      "LUBUKSIKAPING": "UP3 BUKITTINGGI",
      "LUBUK BASUNG": "UP3 BUKITTINGGI",
      "LUBUKBASUNG": "UP3 BUKITTINGGI",
      "SIMPANG EMPAT": "UP3 BUKITTINGGI",
      "SIMPANGEMPAT": "UP3 BUKITTINGGI",
      "BASO": "UP3 BUKITTINGGI",
      "KOTO TUO": "UP3 BUKITTINGGI",
      "KOTOTUO": "UP3 BUKITTINGGI"
    };

    if (staticMap[clean]) {
      return staticMap[clean];
    }

    // 1. Direct lookup in map
    if (ulpToUp3Map[clean]) {
      return resolveStandardUp3Name(ulpToUp3Map[clean]);
    }
    // 2. Direct lookup of uncleaned
    const cleanRowUlp = rowUlp.toUpperCase().trim();
    if (ulpToUp3Map[cleanRowUlp]) {
      return resolveStandardUp3Name(ulpToUp3Map[cleanRowUlp]);
    }
    // 3. Fallback check for keys in map that are contained in or contain the clean name
    const entry = Object.entries(ulpToUp3Map).find(([key]) => {
      const k = key.toUpperCase().trim();
      return k === clean || k.includes(clean) || clean.includes(k);
    });
    if (entry) {
      return resolveStandardUp3Name(String(entry[1] || ""));
    }

    // Dynamic fallback heuristic
    if (clean.includes("BUKIT") || clean.includes("BASO") || clean.includes("SIKAPING") || clean.includes("BASUNG") || clean.includes("EMPAT") || clean.includes("TUO")) {
      return "UP3 BUKITTINGGI";
    }
    if (clean.includes("PAYAKUMBUH") || clean.includes("BATUSANGKAR") || clean.includes("LINTAU") || clean.includes("SARILAMAK")) {
      return "UP3 PAYAKUMBUH";
    }
    if (clean.includes("SOLOK") || clean.includes("SIJUNJUNG") || clean.includes("SAWAHLUNTO") || clean.includes("PUNJUNG") || clean.includes("ALAHAN")) {
      return "UP3 SOLOK";
    }
    if (clean.includes("PADANG") || clean.includes("BELANTI") || clean.includes("TABING") || clean.includes("HARU") || clean.includes("PARIAMAN") || clean.includes("ALUNG") || clean.includes("SICINCIN") || clean.includes("PAINAN")) {
      return "UP3 PADANG";
    }

    return "";
  };

  const categories = [
    { label: "CCTV", index: 0 },
    { label: "Rambu Kerja", index: 1 },
    { label: "PS4", index: 2 },
    { label: "APD Tunjuk Sebut", index: 3 },
    { label: "Konfirmasi CCV", index: 4 },
    { label: "Kelengkapan Alat Kerja & Material", index: 5 },
    { label: "WP & JSA", index: 6 },
    { label: "Laporan Yandal ke HSSE Sebelum Bekerja", index: 7 },
    { label: "Safety Briefing", index: 8 },
    { label: "Antisipasi tersengat Listrik", index: 9 },
    { label: "Antisipasi Terjatuh dari Ketinggian", index: 10 },
    { label: "Laporan Pekerjaan Selesai", index: 11 },
  ];

  // UP3 Bukittinggi total counts
  const totalUp3Anomali = data?.totalAnomali ?? data?.anomaliList?.length ?? 0;

  // Unified General Modal configuration
  const [detailModal, setDetailModal] = useState<{
    title: string;
    subTitle: string;
    excelName: string;
    rows: any[][];
  } | null>(null);

  // Search within popup table
  const [modalSearch, setModalSearch] = useState('');
  
  // Pagination inside modal
  // Pagination inside modal
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search and Filters for Pilot/Officer Table
  const [localSearch, setLocalSearch] = useState('');
  const [pivotSearch, setPivotSearch] = useState('');
  const [pivotUlpSelect, setPivotUlpSelect] = useState('ALL');

  // Pivot Table Pagination states
  const [pivotPage, setPivotPage] = useState(1);
  const itemsPerPivotPage = 25; // Render 25 rows at a time for lag-free performance

  // Tindak Lanjut Table Pagination & Modal states
  const [tindakPage, setTindakPage] = useState(1);
  const itemsPerTindakPage = 15;
  const [evidenceModalRow, setEvidenceModalRow] = useState<any[] | null>(null);
  const [evidencePhotoIdx, setEvidencePhotoIdx] = useState<1 | 2>(1);

  // Load Eviden mappings from localStorage
  const [uploadedEvidens, setUploadedEvidens] = useState<{ [noTugas: string]: any }>({});

  useEffect(() => {
    const loadEvidens = () => {
      const saved = localStorage.getItem('anomali_evidens');
      if (saved) {
        try {
          setUploadedEvidens(JSON.parse(saved));
        } catch (e) {
          console.error("Gagal membaca anomali_evidens di AnomaliPage", e);
        }
      } else {
        setUploadedEvidens({});
      }
    };

    loadEvidens();

    // Listen for up-to-date changes from AdminPage
    window.addEventListener('anomali_evidens_updated', loadEvidens);
    return () => {
      window.removeEventListener('anomali_evidens_updated', loadEvidens);
    };
  }, []);

  // Automatically reset Tindak Lanjut pagination to page 1 on search or filter change
  useEffect(() => {
    setTindakPage(1);
  }, [pivotSearch, pivotUlpSelect]);

  // Helper to determine the photo url based on anomaly description/types
  const getEvidencePhotoUrl = (row: any[], photoIdx: number = 1): string => {
    // Check if the spreadsheet itself has FOTO EVIDEN 1/2 links first (online sync representation)
    if (photoIdx === 1 && row[20]) {
      return row[20];
    }
    if (photoIdx === 2 && row[21]) {
      return row[21];
    }

    const noTugas = String(row[0] || "");
    const customEviden = uploadedEvidens[noTugas];
    if (customEviden) {
      if (photoIdx === 1 && customEviden.fotoEviden1) {
        return customEviden.fotoEviden1;
      }
      if (photoIdx === 2 && customEviden.fotoEviden2) {
        return customEviden.fotoEviden2;
      }
    }

    const jenis = String(row[4] || "").toLowerCase();
    if (photoIdx === 1) {
      if (jenis.includes("cctv") || jenis.includes("kamera")) {
        return "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80";
      }
      if (jenis.includes("rambu")) {
        return "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=800&q=80";
      }
      if (jenis.includes("apd") || jenis.includes("tunjuk sebut") || jenis.includes("helmet")) {
        return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80";
      }
      if (jenis.includes("listrik") || jenis.includes("sengat")) {
        return "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80";
      }
      if (jenis.includes("ketinggian") || jenis.includes("jatuh")) {
        return "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80";
      }
      return "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800&q=80";
    } else {
      // Second distinct high-quality photo variant
      if (jenis.includes("cctv") || jenis.includes("kamera")) {
        return "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80";
      }
      if (jenis.includes("rambu")) {
        return "https://images.unsplash.com/photo-1510981105307-eac9df3afdf9?auto=format&fit=crop&w=800&q=80";
      }
      if (jenis.includes("apd") || jenis.includes("tunjuk sebut") || jenis.includes("helmet")) {
        return "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80";
      }
      if (jenis.includes("listrik") || jenis.includes("sengat")) {
        return "https://images.unsplash.com/photo-1455165814004-1126a7199f9b?auto=format&fit=crop&w=800&q=80";
      }
      if (jenis.includes("ketinggian") || jenis.includes("jatuh")) {
        return "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80";
      }
      return "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80";
    }
  };

  // Debounce input to keep typing completely fluid
  useEffect(() => {
    const handler = setTimeout(() => {
      setPivotSearch(localSearch);
    }, 200); // 200ms debounce
    return () => clearTimeout(handler);
  }, [localSearch]);

  // Pre-calculate ULP counts map for constant-time lookups on renders
  const ulpCountsMap = useMemo(() => {
    const countsMap: { [key: string]: number } = {};
    if (!data || !data.anomaliList) return countsMap;
    
    currentUlpList.forEach(u => {
      countsMap[u.name.toUpperCase()] = 0;
    });
    
    data.anomaliList.forEach(row => {
      const rowUlp = String(row[3] || "").toUpperCase().trim();
      if (rowUlp) {
        if (isUpSumbar) {
          // When UP SUMBAR is selected, we group by UP3 using mapped UP3 name
          const rowMappedUp3 = resolveStandardUp3Name(getMappedUp3ForRow(rowUlp));
          if (rowMappedUp3) {
            currentUlpList.forEach(u => {
              const target = resolveStandardUp3Name(u.name);
              if (rowMappedUp3 === target) {
                countsMap[u.name.toUpperCase()] = (countsMap[u.name.toUpperCase()] || 0) + 1;
              }
            });
          }
        } else {
          // When a specific UP3 is selected, we group by ULP
          currentUlpList.forEach(u => {
            const target = u.name.toUpperCase().trim();
            if (rowUlp === target || rowUlp.includes(target) || target.includes(rowUlp)) {
              countsMap[target] = (countsMap[target] || 0) + 1;
            }
          });
        }
      }
    });
    return countsMap;
  }, [data, currentUlpList, isUpSumbar, getMappedUp3ForRow]);

  // Helper to count anomalies for a specific ULP in O(1) constant time
  const getUlpAnomalyCount = (ulpName: string): number => {
    return ulpCountsMap[ulpName.toUpperCase()] || 0;
  };

  // Helper to filter anomaly rows for the selected unit (either UP3 or specific ULP)
  const getAnomaliRowsForUnit = (unitName: string | null): any[][] => {
    if (!data || !data.anomaliList || !unitName) return [];
    
    const target = unitName.toUpperCase().trim();
    
    // Check if it represents "UP SUMBAR" or "UP4 SUMBAR"
    if (target === "UP SUMBAR" || target === "UP4 SUMBAR") {
      return data.anomaliList;
    }
    
    // Check if the target is a canonical UP3 name
    if (target.startsWith("UP3")) {
      const standardTarget = resolveStandardUp3Name(target);
      return data.anomaliList.filter(row => {
        const rowUlp = String(row[3] || "").toUpperCase().trim();
        const mappedUp3 = resolveStandardUp3Name(getMappedUp3ForRow(rowUlp));
        return mappedUp3 === standardTarget;
      });
    }
    
    // Default: Specific ULP filtering
    return data.anomaliList.filter(row => {
      const rowUlp = String(row[3] || "").toUpperCase().trim();
      return rowUlp === target || rowUlp.includes(target) || target.includes(rowUlp);
    });
  };

  // Calculate Officer Pivot Table
  const pivotData: PivotRow[] = useMemo(() => {
    if (!data || !data.anomaliList) return [];

    const groups: { [key: string]: PivotRow } = {};

    data.anomaliList.forEach(row => {
      const rawPetugas = String(row[2] || "").trim();
      const rawUlp = String(row[3] || "").trim().toUpperCase();

      // Skip lines with placeholders
      if (!rawPetugas || rawPetugas === "-" || rawPetugas.toUpperCase() === "UNKNOWN") return;

      const key = `${rawPetugas.toUpperCase()} || ${rawUlp}`;
      if (!groups[key]) {
        groups[key] = {
          petugas: rawPetugas.toUpperCase(),
          ulp: rawUlp,
          counts: Array(12).fill(0),
          total: 0
        };
      }

      let hasStatusColumns = false;
      for (let i = 0; i < 12; i++) {
        const val = String(row[8 + i] || "").trim();
        if (val && val !== "-") {
          hasStatusColumns = true;
          break;
        }
      }

      if (hasStatusColumns) {
        for (let i = 0; i < 12; i++) {
          const val = String(row[8 + i] || "").trim().toUpperCase();
          if (val === "TIDAK SESUAI") {
            groups[key].counts[i]++;
          }
        }
        groups[key].total += 1;
      } else {
        // Fallback to original classifyAnomaly
        const jenis = String(row[4] || "");
        const desc = String(row[5] || "");
        
        const parts = jenis.split(",").map(p => p.trim()).filter(Boolean);
        parts.forEach(part => {
          const catIdx = classifyAnomaly(part, desc);
          if (catIdx !== -1) {
            groups[key].counts[catIdx]++;
          }
        });

        if (parts.length === 0) {
          const catIdx = classifyAnomaly("", desc);
          if (catIdx !== -1) {
            groups[key].counts[catIdx]++;
          }
        }
        groups[key].total += 1;
      }
    });

    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [data]);

  // Calculate ULP Pivot Table
  const ulpPivotData = useMemo(() => {
    if (!data || !data.anomaliList) return [];

    const groups: { [key: string]: { ulp: string; counts: number[]; total: number } } = {};

    // Pre-initialize current list of units (either 4 UP3s or ULPs of selected UP3) so they always appear in the table
    currentUlpList.forEach(u => {
      groups[u.name.toUpperCase()] = {
        ulp: u.name.toUpperCase(),
        counts: Array(12).fill(0),
        total: 0
      };
    });

    data.anomaliList.forEach(row => {
      let rawUlp = String(row[3] || "").trim().toUpperCase();
      if (!rawUlp || rawUlp === "-" || rawUlp === "UNKNOWN") return;

      let key = "";
      if (isUpSumbar) {
        // If the selected UP3 is "UP SUMBAR", we want to group by UP3!
        // So we look up the UP3 for this ULP
        const mappedUp3 = getMappedUp3ForRow(rawUlp);
        if (mappedUp3) {
          key = mappedUp3.toUpperCase().trim();
        } else {
          return; // skip if cannot be mapped
        }
      } else {
        // Otherwise, group by ULP
        key = rawUlp;
      }

      if (!groups[key]) {
        // Skip if it doesn't belong to the current filter list
        const isInCurrentList = currentUlpList.some(u => u.name.toUpperCase() === key);
        if (!isInCurrentList) {
          return;
        }

        groups[key] = {
          ulp: key,
          counts: Array(12).fill(0),
          total: 0
        };
      }

      let hasStatusColumns = false;
      for (let i = 0; i < 12; i++) {
        const val = String(row[8 + i] || "").trim();
        if (val && val !== "-") {
          hasStatusColumns = true;
          break;
        }
      }

      if (hasStatusColumns) {
        for (let i = 0; i < 12; i++) {
          const val = String(row[8 + i] || "").trim().toUpperCase();
          if (val === "TIDAK SESUAI") {
            groups[key].counts[i]++;
          }
        }
        groups[key].total += 1;
      } else {
        // Fallback to original classifyAnomaly
        const jenis = String(row[4] || "");
        const desc = String(row[5] || "");

        const parts = jenis.split(",").map(p => p.trim()).filter(Boolean);
        parts.forEach(part => {
          const catIdx = classifyAnomaly(part, desc);
          if (catIdx !== -1) {
            groups[key].counts[catIdx]++;
          }
        });

        if (parts.length === 0) {
          const catIdx = classifyAnomaly("", desc);
          if (catIdx !== -1) {
            groups[key].counts[catIdx]++;
          }
        }
        groups[key].total += 1;
      }
    });

    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [data, currentUlpList, isUpSumbar, getMappedUp3ForRow]);

  // Filter pivot table rows based on input search and ULP selector
  const filteredPivotData = useMemo(() => {
    return pivotData.filter(row => {
      const matchesSearch = row.petugas.toLowerCase().includes(pivotSearch.toLowerCase()) || 
                            row.ulp.toLowerCase().includes(pivotSearch.toLowerCase());
      
      let matchesUlp = pivotUlpSelect === "ALL";
      if (!matchesUlp) {
        if (isUpSumbar) {
          const rowUp3 = getMappedUp3ForRow(row.ulp);
          matchesUlp = rowUp3.toUpperCase().trim() === pivotUlpSelect.toUpperCase().trim();
        } else {
          matchesUlp = row.ulp.toUpperCase() === pivotUlpSelect.toUpperCase() ||
                       row.ulp.toUpperCase().includes(pivotUlpSelect.toUpperCase());
        }
      }
                          
      return matchesSearch && matchesUlp;
    });
  }, [pivotData, pivotSearch, pivotUlpSelect, isUpSumbar, getMappedUp3ForRow]);

  // Paginated pivot data for Officer Pivot Table to prevent expensive DOM updates
  const paginatedPivotData = useMemo(() => {
    const startIdx = (pivotPage - 1) * itemsPerPivotPage;
    return filteredPivotData.slice(startIdx, startIdx + itemsPerPivotPage);
  }, [filteredPivotData, pivotPage]);

  const totalPivotPages = Math.ceil(filteredPivotData.length / itemsPerPivotPage) || 1;

  // Filter ULP pivot table rows based on ULP selector (or other search if applicable)
  const filteredUlpPivotData = useMemo(() => {
    return ulpPivotData.filter(row => {
      const matchesSearch = row.ulp.toLowerCase().includes(pivotSearch.toLowerCase());
      
      const matchesUlp = pivotUlpSelect === "ALL" || 
                         row.ulp.toUpperCase() === pivotUlpSelect.toUpperCase() ||
                         row.ulp.toUpperCase().includes(pivotUlpSelect.toUpperCase());
                         
      return matchesSearch && matchesUlp;
    });
  }, [ulpPivotData, pivotSearch, pivotUlpSelect]);

  // Filtered and Searchable Data for the TINDAK LANJUT ANOMALI Table
  const tindakLanjutData = useMemo(() => {
    if (!data || !data.anomaliList) return [];
    return data.anomaliList.filter(row => {
      const id = String(row[0] || "").toLowerCase();
      const petugas = String(row[2] || "").toLowerCase();
      const ulp = String(row[3] || "").toLowerCase();
      const jenis = String(row[4] || "").toLowerCase();
      const search = pivotSearch.toLowerCase().trim();

      const matchesSearch = !search ||
        id.includes(search) ||
        petugas.includes(search) ||
        ulp.includes(search) ||
        jenis.includes(search);

      let matchesUlp = pivotUlpSelect === "ALL";
      if (!matchesUlp) {
        if (isUpSumbar) {
          const rowUp3 = getMappedUp3ForRow(ulp);
          matchesUlp = rowUp3.toUpperCase().trim() === pivotUlpSelect.toUpperCase().trim();
        } else {
          matchesUlp = ulp.toUpperCase() === pivotUlpSelect.toUpperCase() ||
                       ulp.includes(pivotUlpSelect.toLowerCase());
        }
      }

      return matchesSearch && matchesUlp;
    });
  }, [data, pivotSearch, pivotUlpSelect, isUpSumbar, getMappedUp3ForRow]);

  const totalTindakPages = Math.ceil(tindakLanjutData.length / itemsPerTindakPage) || 1;

  const paginatedTindakLanjutData = useMemo(() => {
    const startIdx = (tindakPage - 1) * itemsPerTindakPage;
    return tindakLanjutData.slice(startIdx, startIdx + itemsPerTindakPage);
  }, [tindakLanjutData, tindakPage]);

  // Chart data for KETERANGAN ANOMALI (Rose / Radar Chart style representation)
  const keteranganAnomaliChartData = useMemo(() => {
    const counts = Array(12).fill(0);
    filteredUlpPivotData.forEach(row => {
      row.counts.forEach((count, idx) => {
        counts[idx] += count;
      });
    });

    const getShortLabel = (label: string) => {
      if (label.includes("CCTV")) return "CCTV";
      if (label.includes("Rambu")) return "Rambu";
      if (label.includes("PS4")) return "PS4";
      if (label.includes("Tunjuk Sebut")) return "APD Tunjuk";
      if (label.includes("CCV")) return "CCV";
      if (label.includes("Alat Kerja")) return "Alat/Mat";
      if (label.includes("WP & JSA")) return "WP & JSA";
      if (label.includes("Yandal ke HSSE")) return "Yandal HSSE";
      if (label.includes("Safety Briefing")) return "Safety Brief";
      if (label.includes("tersengat Listrik")) return "Anti Listrik";
      if (label.includes("Terjatuh dari Ketinggian")) return "Anti Tinggi";
      if (label.includes("Pekerjaan Selesai")) return "Lap Selesai";
      return label;
    };

    return categories.map(cat => ({
      name: cat.label,
      shortName: getShortLabel(cat.label),
      count: counts[cat.index]
    }));
  }, [filteredUlpPivotData]);

  // Chart data for ANOMALI PER ULP (Bar / Batang Chart)
  const ulpChartData = useMemo(() => {
    return filteredUlpPivotData.map(row => ({
      ulpName: row.ulp,
      total: row.total
    }));
  }, [filteredUlpPivotData]);

  const handlePivotSearchChange = (val: string) => {
    setLocalSearch(val);
    setPivotPage(1);
  };

  const handlePivotUlpChange = (val: string) => {
    setPivotUlpSelect(val);
    setPivotPage(1);
  };

  // Handle open modal for standard Unit card klik
  const openModalForUnit = (unitName: string) => {
    const rows = getAnomaliRowsForUnit(unitName);
    setDetailModal({
      title: `ANOMALI ${unitName}`,
      subTitle: `Total Temuan: ${rows.length} Baris Terdeteksi`,
      excelName: `ANOMALI_${unitName.replace(/\s+/g, '_')}`,
      rows: rows
    });
    setModalSearch('');
    setCurrentPage(1);
  };

  // Handle open modal for specific Pivot table cell click!
  const openModalForCell = (petugas: string, ulp: string, categoryIdx: number | null, categoryLabel?: string) => {
    const Tomor = petugas.toUpperCase().trim();
    const filtered = (data?.anomaliList || []).filter(row => {
      // Robust split-matching for officers in case of helper teams/comma values
      const rowPetugas = String(row[2] || "").toUpperCase().trim();
      const isOfficerMatch = rowPetugas === Tomor || 
        rowPetugas.split(",").map(n => n.trim()).includes(Tomor) ||
        Tomor.split(",").map(n => n.trim()).includes(rowPetugas);
        
      if (!isOfficerMatch) return false;
      
      const rowUlp = String(row[3] || "").toUpperCase().trim();
      if (ulp !== "ALL" && rowUlp !== ulp.toUpperCase().trim() && !rowUlp.includes(ulp.toUpperCase().trim())) return false;
      
      let hasStatusColumns = false;
      for (let i = 0; i < 12; i++) {
        const val = String(row[8 + i] || "").trim();
        if (val && val !== "-") {
          hasStatusColumns = true;
          break;
        }
      }

      if (hasStatusColumns) {
        if (categoryIdx !== null) {
          const val = String(row[8 + categoryIdx] || "").trim().toUpperCase();
          if (val !== "TIDAK SESUAI") return false;
        } else {
          let hasAnyAnom = false;
          for (let i = 0; i < 12; i++) {
            if (String(row[8 + i] || "").trim().toUpperCase() === "TIDAK SESUAI") {
              hasAnyAnom = true;
              break;
            }
          }
          if (!hasAnyAnom) return false;
        }
      } else {
        // Fallback
        if (categoryIdx !== null) {
          const rowJenis = String(row[4] || "");
          const rowDesc = String(row[5] || "");
          const parts = rowJenis.split(",").map(p => p.trim()).filter(Boolean);
          
          if (parts.length > 0) {
            const hasCategoryMatch = parts.some(part => {
              const idx = classifyAnomaly(part, rowDesc);
              return idx === categoryIdx;
            });
            if (!hasCategoryMatch) return false;
          } else {
            const idx = classifyAnomaly("", rowDesc);
            if (idx !== categoryIdx) {
              if (categoryIdx === 0 && idx === -1) {
                return true; // Fallback mapping match
              }
              return false;
            }
          }
        }
      }
      return true;
    });

    setDetailModal({
      title: `${petugas} (${ulp})`,
      subTitle: categoryLabel ? `Pemeriksaan Integritas: ${categoryLabel} (${filtered.length} Kasus)` : `Semua Temuan Integritas (${filtered.length} Kasus)`,
      excelName: `ANOMALI_${petugas.replace(/\s+/g, '_')}_${ulp}_${(categoryLabel || "ALL").replace(/\s+/g, '_')}`,
      rows: filtered
    });
    setModalSearch('');
    setCurrentPage(1);
  };

  // Excel Export for Pivot table itself
  const handleExportPivotExcel = () => {
    const headers = [
      "PETUGAS", "ULP", "TOTAL ANOMALI",
      "CCTV", "Rambu Kerja", "PS4", "APD Tunjuk Sebut", 
      "Konfirmasi CCV", "Kelengkapan Alat Kerja & Material", "WP & JSA", 
      "Laporan Yandal ke HSSE Sebelum Bekerja", "Safety Briefing", 
      "Antisipasi tersengat Listrik", "Antisipasi Terjatuh dari Ketinggian", 
      "Laporan Pekerjaan Selesai"
    ];
    
    const rows = filteredPivotData.map(r => [
      r.petugas,
      r.ulp,
      r.total,
      ...r.counts
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Per Petugas");
    XLSX.writeFile(wb, `REKAP_ANOMALI_PETUGAS_${new Date().getTime()}.xlsx`);
  };

  // Handle open modal for specific ULP Pivot table cell click!
  const openModalForUlpCell = (ulp: string, categoryIdx: number | null, categoryLabel?: string) => {
    const filtered = (data?.anomaliList || []).filter(row => {
      const rowUlp = String(row[3] || "").toUpperCase().trim();
      if (ulp !== "ALL") {
        if (isUpSumbar) {
          // 'ulp' is actually a UP3 name (e.g. "UP3 PADANG")
          const mappedUp3 = getMappedUp3ForRow(rowUlp).toUpperCase().trim();
          if (mappedUp3 !== ulp.toUpperCase().trim()) return false;
        } else {
          if (rowUlp !== ulp.toUpperCase().trim() && !rowUlp.includes(ulp.toUpperCase().trim())) return false;
        }
      }
      
      let hasStatusColumns = false;
      for (let i = 0; i < 12; i++) {
        const val = String(row[8 + i] || "").trim();
        if (val && val !== "-") {
          hasStatusColumns = true;
          break;
        }
      }

      if (hasStatusColumns) {
        if (categoryIdx !== null) {
          const val = String(row[8 + categoryIdx] || "").trim().toUpperCase();
          if (val !== "TIDAK SESUAI") return false;
        } else {
          let hasAnyAnom = false;
          for (let i = 0; i < 12; i++) {
            if (String(row[8 + i] || "").trim().toUpperCase() === "TIDAK SESUAI") {
              hasAnyAnom = true;
              break;
            }
          }
          if (!hasAnyAnom) return false;
        }
      } else {
        // Fallback
        if (categoryIdx !== null) {
          const rowJenis = String(row[4] || "");
          const rowDesc = String(row[5] || "");
          const parts = rowJenis.split(",").map(p => p.trim()).filter(Boolean);
          
          if (parts.length > 0) {
            const hasCategoryMatch = parts.some(part => {
              const idx = classifyAnomaly(part, rowDesc);
              return idx === categoryIdx;
            });
            if (!hasCategoryMatch) return false;
          } else {
            const idx = classifyAnomaly("", rowDesc);
            if (idx !== categoryIdx) {
              if (categoryIdx === 0 && idx === -1) {
                return true; // Fallback mapping match
              }
              return false;
            }
          }
        }
      }
      return true;
    });

    setDetailModal({
      title: `${isUpSumbar ? "UP3" : "ULP"} ${ulp}`,
      subTitle: categoryLabel ? `Pemeriksaan Integritas: ${categoryLabel} (${filtered.length} Kasus)` : `Semua Temuan Integritas (${filtered.length} Kasus)`,
      excelName: `ANOMALI_${isUpSumbar ? "UP3" : "ULP"}_${ulp.replace(/\s+/g, '_')}_${(categoryLabel || "ALL").replace(/\s+/g, '_')}`,
      rows: filtered
    });
    setModalSearch('');
    setCurrentPage(1);
  };

  // Excel Export for ULP Pivot table itself
  const handleExportUlpPivotExcel = () => {
    const headers = [
      isUpSumbar ? "UP3" : "ULP", "TOTAL ANOMALI",
      "CCTV", "Rambu Kerja", "PS4", "APD Tunjuk Sebut", 
      "Konfirmasi CCV", "Kelengkapan Alat Kerja & Material", "WP & JSA", 
      "Laporan Yandal ke HSSE Sebelum Bekerja", "Safety Briefing", 
      "Antisipasi tersengat Listrik", "Antisipasi Terjatuh dari Ketinggian", 
      "Laporan Pekerjaan Selesai"
    ];
    
    const rows = filteredUlpPivotData.map(r => [
      r.ulp,
      r.total,
      ...r.counts
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isUpSumbar ? "Rekap Per UP3" : "Rekap Per ULP");
    XLSX.writeFile(wb, `REKAP_ANOMALI_${isUpSumbar ? "UP3" : "ULP"}_${new Date().getTime()}.xlsx`);
  };

  // Excel Export inside modal
  const handleExportExcelModal = (name: string, rows: any[][]) => {
    const headers = ["No Laporan", "Tgl Lapor", "Nama Petugas", "ULP", "Jenis Anomali", "Deskripsi", "RPT", "RCT"];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Anomali Detail");
    XLSX.writeFile(wb, `${name}_${new Date().getTime()}.xlsx`);
  };

  // Excel Export for Tindak Lanjut table
  const handleExportTindakLanjutExcel = () => {
    const headers = ["NO", "ULP", "NAMA PETUGAS", "NO TUGAS / NO LAPORAN", "JENIS ANOMALI", "KETERANGAN / DESKRIPSI"];
    const rows = tindakLanjutData.map((row, idx) => [
      idx + 1,
      row[3] || "-",
      row[2] || "-",
      row[0] || "-",
      row[4] || "-",
      row[5] || "-"
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tindak Lanjut Anomali");
    XLSX.writeFile(wb, `TINDAK_LANJUT_ANOMALI_${new Date().getTime()}.xlsx`);
  };

  // Helpers for filtering modal
  const filteredModalRows = useMemo(() => {
    if (!detailModal) return [];
    if (!modalSearch.trim()) return detailModal.rows;
    const term = modalSearch.toLowerCase().trim();
    return detailModal.rows.filter(row => {
      return row.some(cell => String(cell || "").toLowerCase().includes(term));
    });
  }, [detailModal, modalSearch]);

  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredModalRows.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredModalRows, currentPage]);

  const totalPages = Math.ceil(filteredModalRows.length / itemsPerPage) || 1;

  const getJenisBadgeColor = (jenis: string) => {
    const j = jenis.toLowerCase();
    if (j.includes("kronologi") || j.includes("waktu")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (j.includes("check") || j.includes("check-in") || j.includes("tanpa")) return "bg-cyan-50 text-cyan-700 border-cyan-200";
    if (j.includes("ekstrim") || j.includes("durasi")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (j.includes("petugas") || j.includes("kosong")) return "bg-pink-50 text-pink-700 border-pink-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <div id="anomali_page_outer" className="flex flex-col gap-8 relative px-2 pb-12">
      
      {/* Row 1 Grid: All cards aligned in a single row */}
      <div 
        id="anomali_row_deck" 
        className="flex overflow-x-auto pb-4 gap-4 snap-x lg:grid lg:overflow-x-visible lg:pb-0 w-full"
        style={{
          gridTemplateColumns: `repeat(${currentUlpList.length + 1}, minmax(0, 1fr))`
        }}
      >
        
        {/* Card 1: UP3 BUKITTINGGI / DYNAMIC SELECTED UP3 */}
        <div 
          onClick={() => openModalForUnit(isUpSumbar ? "UP4 SUMBAR" : (selectedUp3 || "UP3 BUKITTINGGI"))}
          id="card_up3_bukittinggi" 
          className="snap-center shrink-0 w-[240px] lg:w-auto bg-gradient-to-br from-blue-600 to-[#1b3d5d] text-white p-5 lg:p-3 xl:p-4 rounded-2xl shadow-md shadow-blue-200 border border-blue-400 hover:shadow-lg hover:scale-[1.03] active:scale-95 transition-all cursor-pointer flex flex-col justify-between min-h-[140px] lg:min-h-[130px] xl:min-h-[140px]"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 lg:p-1.5 xl:p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Building2 className="text-white w-5 h-5 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
            </div>
            {totalUp3Anomali > 0 ? (
              <span className="bg-white/20 text-white text-[8px] lg:text-[7px] xl:text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertOctagon size={8} className="animate-ping" />
                UTAMA
              </span>
            ) : (
              <span className="bg-emerald-500/30 text-emerald-100 text-[8px] lg:text-[7px] xl:text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
                NIHIL
              </span>
            )}
          </div>
          
          <div className="mt-2 lg:mt-1 xl:mt-2">
            <p className="text-[9px] lg:text-[7.5px] xl:text-[9px] font-extrabold tracking-widest text-blue-100 uppercase truncate">
              {isUpSumbar ? "UP4 SUMBAR" : (selectedUp3 || "UP3 BUKITTINGGI")}
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <h3 className="text-3xl lg:text-lg xl:text-xl 2xl:text-2xl font-black tracking-tight leading-none hover:underline">
                {totalUp3Anomali.toLocaleString()}
              </h3>
              <span className="text-[10px] lg:text-[8px] xl:text-[9px] text-blue-100 font-bold">kasus</span>
            </div>
            <p className="text-[8px] lg:text-[7px] xl:text-[8px] text-blue-100/85 font-medium mt-1 line-clamp-1">
              Semua temuan anomali
            </p>
          </div>
        </div>

        {/* Dynamic Card row (RINGKASAN DATA ULP or RINGKASAN DATA UP3) */}
        {currentUlpList.map((item) => {
          const count = isUpSumbar 
            ? getAnomaliRowsForUnit(item.name).length 
            : getUlpAnomalyCount(item.name);
          return (
            <div 
              key={item.id}
              id={`card_unit_${item.id}`}
              onClick={() => openModalForUnit(item.name)}
              className="snap-center shrink-0 w-[180px] lg:w-auto bg-white hover:bg-blue-50/10 p-5 lg:p-3 xl:p-4 rounded-2xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95 transition-all cursor-pointer flex flex-col justify-between min-h-[140px] lg:min-h-[130px] xl:min-h-[140px]"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 lg:p-1.5 xl:p-2 bg-slate-50 text-slate-400 rounded-lg">
                  {isUpSumbar ? (
                    <Building2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4" />
                  ) : (
                    <MapPin className="w-4 h-4 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4" />
                  )}
                </div>
                <span className={`text-[8px] lg:text-[7px] xl:text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full ${
                  count > 0 ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                }`}>
                  {count > 0 ? "TEMUAN" : "AMAN"}
                </span>
              </div>
              
              <div className="mt-2 lg:mt-1 xl:mt-2">
                <p className="text-[9px] lg:text-[7.5px] xl:text-[9px] font-extrabold tracking-widest text-gray-400 uppercase truncate">
                  {item.name}
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <h3 className={`text-2xl lg:text-base xl:text-lg 2xl:text-xl font-black tracking-tight leading-none tabular-nums ${
                    count > 0 ? "text-blue-600 hover:underline" : "text-gray-800"
                  }`}>
                    {count.toLocaleString()}
                  </h3>
                  <span className="text-[9px] lg:text-[7.5px] xl:text-[8px] text-gray-400 font-bold">Kasus</span>
                </div>
                <p className="text-[8px] lg:text-[7px] xl:text-[8px] text-gray-400 font-medium mt-1">
                  {isUpSumbar ? "UNIT " + item.name : "ULP " + item.name}
                </p>
              </div>
            </div>
          );
        })}

      </div>

      {/* Section 2: Tabel Per Petugas as requested with exactly matched headers */}
      <div id="pivot_petugas_section" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col gap-4">
        <div className="px-5 py-4 bg-gradient-to-r from-[#06b6d4] to-[#1b3d5d] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
          <div>
            <h3 className="text-xs font-black tracking-widest text-white uppercase flex items-center gap-1.5">
              <User size={14} className="text-cyan-300" />
              REKAPITULASI ANOMALI PER PETUGAS
            </h3>
            <p className="text-[10px] text-cyan-100 font-bold uppercase mt-0.5 opacity-80">
              Diurutkan dari total temuan kasus anomali terbanyak
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ULP dropdown selection */}
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/20">
              <span className="text-[8px] font-black uppercase text-white/75 shrink-0">UNIT:</span>
              <select
                value={pivotUlpSelect}
                onChange={(e) => handlePivotUlpChange(e.target.value)}
                className="bg-transparent text-white text-[10px] font-black uppercase outline-none cursor-pointer min-w-0"
              >
                <option value="ALL" className="text-slate-900 bg-white font-semibold">
                  {isUpSumbar ? "SEMUA UP3" : "SEMUA ULP (UP3)"}
                </option>
                {currentUlpList.map(u => (
                  <option key={u.id} value={u.name} className="text-slate-900 bg-white font-semibold">{u.name}</option>
                ))}
              </select>
            </div>

            {/* Live Search inside pivot table */}
            <div className="relative w-44 flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/20">
              <Search size={11} className="text-white/70" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => handlePivotSearchChange(e.target.value)}
                placeholder="Cari petugas..."
                className="bg-transparent text-white placeholder-white/50 text-[10px] font-bold outline-none w-full"
              />
            </div>

            {/* Export Pivot Button */}
            <button
              onClick={handleExportPivotExcel}
              className="flex items-center gap-1 bg-white hover:bg-white/90 text-[#1b3d5d] px-3.5 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all active:scale-95 shadow-md"
            >
              <Download size={10} className="stroke-[3]" />
              EXPORT MATRIX
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-4">
          {/* Pivot Matrix Table Wrapper */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl custom-scrollbar shadow-inner">
            <table className="w-full text-center border-collapse text-[11px] font-semibold text-slate-800 min-w-[1300px]">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-[#06b6d4] to-[#1b3d5d]">
                {/* Row 1 Headers */}
                <tr className="text-white uppercase font-black text-[10px] tracking-wider bg-transparent">
                  <th rowSpan={2} className="p-0.5 min-w-[180px]">
                    <div className="bg-[#3b82f6] py-4 px-4 rounded-xl h-full flex items-center justify-start border border-white/10 uppercase font-black text-[10px] tracking-wider">PETUGAS</div>
                  </th>
                  <th rowSpan={2} className="p-0.5 min-w-[120px]">
                    <div className="bg-[#eab308] py-4 px-4 rounded-xl h-full flex items-center justify-start border border-white/10 uppercase font-black text-[10px] tracking-wider">ULP</div>
                  </th>
                  <th rowSpan={2} className="p-0.5 min-w-[95px] max-w-[110px]">
                    <div className="bg-[#f43f5e] py-4 px-2 rounded-xl h-full flex items-center justify-center border border-white/10 whitespace-normal leading-tight text-[9px] uppercase font-black">TOTAL ANOMALI</div>
                  </th>
                  <th colSpan={12} className="p-0.5">
                    <div className="bg-[#1b3d5d] py-2 rounded-xl border border-white/10 tracking-widest text-slate-100 uppercase font-black text-[10px]">KETERANGAN ANOMALI</div>
                  </th>
                </tr>
                {/* Row 2 Sub-headers with compact width and word wrapping */}
                <tr className="text-white uppercase text-[8px] font-black tracking-tight bg-transparent">
                  <th className="p-0.5 min-w-[60px] max-w-[80px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">CCTV</div></th>
                  <th className="p-0.5 min-w-[70px] max-w-[85px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Rambu Kerja</div></th>
                  <th className="p-0.5 min-w-[50px] max-w-[60px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">PS4</div></th>
                  <th className="p-0.5 min-w-[85px] max-w-[95px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">APD Tunjuk Sebut</div></th>
                  <th className="p-0.5 min-w-[75px] max-w-[90px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Konfirmasi CCV</div></th>
                  <th className="p-0.5 min-w-[100px] max-w-[115px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight text-[8px]">Kelengkapan Alat Kerja & Material</div></th>
                  <th className="p-0.5 min-w-[60px] max-w-[75px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">WP & JSA</div></th>
                  <th className="p-0.5 min-w-[105px] max-w-[125px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight text-[8px]">Laporan Yandal ke HSSE Sebelum Bekerja</div></th>
                  <th className="p-0.5 min-w-[75px] max-w-[90px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Safety Briefing</div></th>
                  <th className="p-0.5 min-w-[80px] max-w-[95px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Antisipasi tersengat Listrik</div></th>
                  <th className="p-0.5 min-w-[80px] max-w-[95px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Antisipasi Terjatuh dari Ketinggian</div></th>
                  <th className="p-0.5 min-w-[80px] max-w-[95px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Laporan Pekerjaan Selesai</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 bg-white">
                {paginatedPivotData.length > 0 ? (
                  paginatedPivotData.map((row, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 border-r border-slate-300 text-left font-black text-slate-900 uppercase">
                          {row.petugas}
                        </td>
                        <td className="px-3 py-3 border-r border-slate-300 text-left font-extrabold text-[10px] text-slate-500 uppercase">
                          {row.ulp}
                        </td>
                        {/* Total column */}
                        <td 
                          onClick={() => row.total > 0 ? openModalForCell(row.petugas, row.ulp, null) : null}
                          className="px-2 py-3 text-center text-xs font-black bg-rose-50 text-rose-700 border-r border-slate-300 cursor-pointer hover:bg-rose-100 hover:underline"
                        >
                          {row.total}
                        </td>
                        {categories.map((cat) => {
                          const count = row.counts[cat.index];
                          return (
                            <td 
                              key={cat.index} 
                              onClick={() => count > 0 ? openModalForCell(row.petugas, row.ulp, cat.index, cat.label) : null}
                              className={`px-2 py-3 border-r border-slate-300 text-center text-xs tabular-nums transition-colors ${
                                count > 0 
                                  ? "cursor-pointer hover:bg-rose-50 text-rose-600 font-extrabold hover:underline" 
                                  : "text-slate-350 font-normal"
                              }`}
                            >
                              {count > 0 ? count : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={15} className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      Tidak ada data petugas yang cocok dengan filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total info badge footer with Pagination controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-150 pt-3 gap-3" id="pivot_pagination_bar">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase">
              Menampilkan <span className="text-slate-800 font-black">{filteredPivotData.length > 0 ? (pivotPage - 1) * itemsPerPivotPage + 1 : 0}</span> - <span className="text-slate-800 font-black">{Math.min(pivotPage * itemsPerPivotPage, filteredPivotData.length)}</span> dari <span className="text-blue-600 font-black">{filteredPivotData.length}</span> Petugas
            </span>
            
            {totalPivotPages > 1 && (
              <div className="flex items-center gap-2" id="officer_table_pagination">
                <button
                  onClick={() => setPivotPage(prev => Math.max(prev - 1, 1))}
                  disabled={pivotPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 text-gray-600 disabled:opacity-45 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={14} className="stroke-[2.5]" />
                </button>
                <span className="text-[11px] font-black text-slate-600 min-w-[70px] text-center">
                  Hlm {pivotPage} / {totalPivotPages}
                </span>
                <button
                  onClick={() => setPivotPage(prev => Math.min(prev + 1, totalPivotPages))}
                  disabled={pivotPage === totalPivotPages}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 text-gray-600 disabled:opacity-45 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Tabel Per ULP as requested with exactly matched headers (without PETUGAS column) */}
      <div id="pivot_ulp_section" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col gap-4">
        <div className="px-5 py-4 bg-gradient-to-r from-[#1b3d5d] to-[#06b6d4] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h3 className="text-xs font-black tracking-widest text-white uppercase flex items-center gap-1.5">
              <Building2 size={14} className="text-cyan-300" />
              REKAPITULASI ANOMALI PER {isUpSumbar ? "UP3" : "ULP"}
            </h3>
            <p className="text-[10px] text-cyan-100 font-bold uppercase mt-0.5 opacity-80">
              Diurutkan dari total temuan kasus anomali terbanyak
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Pivot Button for ULP */}
            <button
              onClick={handleExportUlpPivotExcel}
              className="flex items-center gap-1 bg-white hover:bg-white/90 text-[#1b3d5d] px-3.5 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all active:scale-95 shadow-md"
            >
              <Download size={10} className="stroke-[3]" />
              EXPORT MATRIX {isUpSumbar ? "UP3" : "ULP"}
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-4">
          {/* Pivot Matrix Table Wrapper for ULP */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl custom-scrollbar shadow-inner">
            <table className="w-full text-center border-collapse text-[11px] font-semibold text-slate-800 min-w-[1100px]">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-[#1b3d5d] to-[#06b6d4]">
                {/* Row 1 Headers */}
                <tr className="text-white uppercase font-black text-[10px] tracking-wider bg-transparent">
                  <th rowSpan={2} className="p-0.5 min-w-[150px]">
                    <div className="bg-[#3b82f6] py-4 px-4 rounded-xl h-full flex items-center justify-start border border-white/10 uppercase font-black text-[10px] tracking-wider">{isUpSumbar ? "UP3" : "ULP"}</div>
                  </th>
                  <th rowSpan={2} className="p-0.5 min-w-[95px] max-w-[110px]">
                    <div className="bg-[#f43f5e] py-4 px-2 rounded-xl h-full flex items-center justify-center border border-white/10 whitespace-normal leading-tight text-[9px] uppercase font-black">TOTAL ANOMALI</div>
                  </th>
                  <th colSpan={12} className="p-0.5">
                    <div className="bg-[#1b3d5d] py-2 rounded-xl border border-white/10 tracking-widest text-slate-100 uppercase font-black text-[10px]">KETERANGAN ANOMALI</div>
                  </th>
                </tr>
                {/* Row 2 Sub-headers with compact width and word wrapping */}
                <tr className="text-white uppercase text-[8px] font-black tracking-tight bg-transparent">
                  <th className="p-0.5 min-w-[60px] max-w-[80px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">CCTV</div></th>
                  <th className="p-0.5 min-w-[70px] max-w-[85px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Rambu Kerja</div></th>
                  <th className="p-0.5 min-w-[50px] max-w-[60px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">PS4</div></th>
                  <th className="p-0.5 min-w-[85px] max-w-[95px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">APD Tunjuk Sebut</div></th>
                  <th className="p-0.5 min-w-[75px] max-w-[90px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Konfirmasi CCV</div></th>
                  <th className="p-0.5 min-w-[100px] max-w-[115px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight text-[8px]">Kelengkapan Alat Kerja & Material</div></th>
                  <th className="p-0.5 min-w-[60px] max-w-[75px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">WP & JSA</div></th>
                  <th className="p-0.5 min-w-[105px] max-w-[125px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight text-[8px]">Laporan Yandal ke HSSE Sebelum Bekerja</div></th>
                  <th className="p-0.5 min-w-[75px] max-w-[90px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Safety Briefing</div></th>
                  <th className="p-0.5 min-w-[80px] max-w-[95px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Antisipasi tersengat Listrik</div></th>
                  <th className="p-0.5 min-w-[80px] max-w-[95px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Antisipasi Terjatuh dari Ketinggian</div></th>
                  <th className="p-0.5 min-w-[80px] max-w-[95px]"><div className="bg-slate-800/80 p-2 rounded-lg border border-white/10 whitespace-normal leading-tight">Laporan Pekerjaan Selesai</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 bg-white">
                {filteredUlpPivotData.length > 0 ? (
                  filteredUlpPivotData.map((row, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 border-r border-slate-300 text-left font-black text-slate-900 uppercase bg-slate-50">
                          {row.ulp}
                        </td>
                        {/* Total column */}
                        <td 
                          onClick={() => row.total > 0 ? openModalForUlpCell(row.ulp, null) : null}
                          className="px-2 py-3 text-center text-xs font-black bg-rose-50 text-rose-700 border-r border-slate-300 cursor-pointer hover:bg-rose-100 hover:underline"
                        >
                          {row.total}
                        </td>
                        {categories.map((cat) => {
                          const count = row.counts[cat.index];
                          return (
                            <td 
                              key={cat.index} 
                              onClick={() => count > 0 ? openModalForUlpCell(row.ulp, cat.index, cat.label) : null}
                              className={`px-2 py-3 border-r border-slate-300 text-center text-xs tabular-nums transition-colors ${
                                count > 0 
                                  ? "cursor-pointer hover:bg-rose-50 text-rose-600 font-extrabold hover:underline" 
                                  : "text-slate-350 font-normal"
                              }`}
                            >
                              {count > 0 ? count : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={14} className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      Tidak ada data ULP yang cocok dengan filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total info badge footer */}
          <div className="flex items-center justify-between border-t border-slate-150 pt-1" id="ulp_pivot_footer_bar">
            <span className="text-[10px] text-slate-500 font-bold uppercase">
              Total Terdeteksi: <span className="text-blue-600 font-black">{filteredUlpPivotData.length}</span> {isUpSumbar ? "UP3" : "ULP"} Unit • Semua data dimuat dalam 1 halaman / scrollable view
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Visual Analytics & Anomaly Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6" id="three_features_row">
        
        {/* Left Column: Stacked Charts (Anomali Keterangan & Anomali Per ULP) */}
        <div className="lg:col-span-5 flex flex-col gap-6" id="left_stacked_charts">
          
          {/* Top Chart: KETERANGAN ANOMALI (Rose / Radar style chart) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-[750px] w-full" id="keterangan_anomali_chart_card">
            <div className="mb-4">
              <h3 className="text-xs font-black tracking-widest text-[#1b3d5d] uppercase flex items-center gap-1.5">
                <PieIcon size={14} className="text-cyan-500 font-bold" />
                KETERANGAN ANOMALI
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                Distribusi frekuensi temuan berdasarkan 12 kategori integritas (Rose/Radar)
              </p>
            </div>
            <div className="flex-1 w-full min-h-0 flex flex-col justify-between">
              <div className="h-[520px] shrink-0 relative w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={keteranganAnomaliChartData.map(item => ({ ...item, value: 1 }))}
                      cx="55%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={225}
                      dataKey="value"
                      shape={(props: any) => {
                        const { cx, cy, innerRadius, startAngle, endAngle, fill, payload } = props;
                        
                        // Dynamic outerRadius logic
                        const counts = keteranganAnomaliChartData.map(d => d.count);
                        const maxVal = Math.max(...counts, 1);
                        const minOuterRadius = 60;
                        const maxOuterRadius = 225;
                        
                        const currentOuterRadius = payload.count === 0 
                          ? minOuterRadius 
                          : minOuterRadius + (payload.count / maxVal) * (maxOuterRadius - minOuterRadius);

                        const middleAngle = (startAngle + endAngle) / 2;
                        const RADIAN = Math.PI / 180;
                        const labelRadius = innerRadius + (currentOuterRadius - innerRadius) * 0.55;
                        const labelX = cx + labelRadius * Math.cos(-middleAngle * RADIAN);
                        const labelY = cy + labelRadius * Math.sin(-middleAngle * RADIAN);

                        const sumVal = counts.reduce((a, b) => a + b, 0);
                        const percentage = sumVal > 0 ? Math.round((payload.count / sumVal) * 100) : 0;

                        return (
                          <g>
                            <Sector
                              cx={cx}
                              cy={cy}
                              innerRadius={innerRadius}
                              outerRadius={currentOuterRadius}
                              startAngle={startAngle}
                              endAngle={endAngle}
                              fill={fill}
                              opacity={0.85}
                              cursor="pointer"
                              stroke="#ffffff"
                              strokeWidth={1.5}
                              className="transition-all duration-300 hover:opacity-100"
                            />
                            {percentage > 0 && currentOuterRadius > 70 && (
                              <text
                                x={labelX}
                                y={labelY}
                                fill="#ffffff"
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="text-[11px] font-extrabold pointer-events-none drop-shadow-md select-none"
                              >
                                {`${percentage}%`}
                              </text>
                            )}
                          </g>
                        );
                      }}
                    >
                      {keteranganAnomaliChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={roseColorsArray[index % roseColorsArray.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomRoseTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Custom Legend Underneath the Rose Chart */}
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 mt-2 max-h-[130px] overflow-y-auto custom-scrollbar px-1 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                {keteranganAnomaliChartData.map((item, index) => {
                  const color = roseColorsArray[index % roseColorsArray.length];
                  return (
                    <div 
                      key={index} 
                      className="flex items-center gap-1.5 bg-white border border-slate-100 px-2 py-0.5 rounded-lg text-[8px] font-black text-slate-700 uppercase tracking-tight shadow-sm hover:scale-[1.03] transition-transform cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span>{item.shortName}</span>
                      <span className="text-[7.5px] font-bold text-slate-400 bg-slate-100 px-1 rounded tabular-nums">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Chart: ANOMALI PER ULP (Bar/Batang chart) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-[485px] w-full" id="anomali_per_ulp_chart_card">
            <div className="mb-4">
              <h3 className="text-xs font-black tracking-widest text-[#1b3d5d] uppercase flex items-center gap-1.5">
                <BarChart3 size={14} className="text-cyan-500 font-bold" />
                ANOMALI PER ULP
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                Perbandingan total temuan kasus kesalahan antar Unit Layanan Pelanggan (Bar)
              </p>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={ulpChartData} 
                  margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="ulpName" 
                    tick={{ fill: '#475569', fontSize: 8, fontWeight: 800 }} 
                    tickLine={false} 
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <RechartsTooltip cursor={{ fill: 'rgba(6, 182, 212, 0.04)' }} content={<CustomBarTooltip />} />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="#0f172a" maxBarSize={45}>
                    {ulpChartData.map((entry, index) => {
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? '#06b6d4' : index % 2 === 0 ? '#1b3d5d' : '#3b82f6'} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column: Tindak Lanjut Anomali Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between h-auto lg:h-[1259px] w-full" id="tindak_lanjut_anomali_section">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div>
                <h3 className="text-xs font-black tracking-widest text-[#1b3d5d] uppercase flex items-center gap-1">
                  <Camera size={14} className="text-[#06b6d4]" />
                  TINDAK LANJUT ANOMALI
                </h3>
                <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-0.5">
                  Bukti fisik / foto temuan kasus
                </p>
              </div>
              
              <div className="flex items-center gap-2 self-start">
                {/* Download Excel Button */}
                <button
                  onClick={handleExportTindakLanjutExcel}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-[#1b3d5d] px-2.5 py-1 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all active:scale-95 border border-slate-200"
                  title="Download Excel Tindak Lanjut Anomali"
                >
                  <Download size={8} className="stroke-[3]" />
                  EXCEL
                </button>

                {/* Quick Counter */}
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-150">
                  <span className="text-[7.5px] font-extrabold text-[#1b3d5d] uppercase tracking-widest">Temuan:</span>
                  <span className="text-[10px] font-black text-rose-500 tabular-nums">{tindakLanjutData.length}</span>
                </div>
              </div>
            </div>

            {/* Table representation */}
            <div className="overflow-x-auto min-w-full custom-scrollbar">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50 rounded-lg">
                    <th scope="col" className="px-2 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest w-6">No</th>
                    <th scope="col" className="px-2 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest">ULP</th>
                    <th scope="col" className="px-2 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest">Petugas</th>
                    <th scope="col" className="px-2 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest">No Tugas</th>
                    <th scope="col" className="px-2 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest">Jenis Anomali</th>
                    <th scope="col" className="px-2 py-2 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">Foto Eviden 1</th>
                    <th scope="col" className="px-2 py-2 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">Foto Eviden 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedTindakLanjutData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-2 py-12 text-center text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">
                        Tidak ada temuan anomali
                      </td>
                    </tr>
                  ) : (
                    paginatedTindakLanjutData.map((row, idx) => {
                      const runningNo = (tindakPage - 1) * itemsPerTindakPage + idx + 1;
                      const rowId = row[0] || "-";
                      const rowTgl = row[1] || "-";
                      const rowPetugas = row[2] || "-";
                      const rowUlp = row[3] || "UNKNOWN";
                      const rowJenis = row[4] || "Lainnya";
                      const rowDesc = row[5] || "-";
                      
                      // Split individual safety violations
                      const violationsList = rowJenis.split(",").map(v => v.trim()).filter(Boolean);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          {/* No */}
                          <td className="px-2 py-2 text-left text-[9px] font-extrabold text-slate-400 tabular-nums">{runningNo}</td>
                          
                          {/* ULP */}
                          <td className="px-2 py-2 text-left text-[8px] font-black text-cyan-600 uppercase tracking-tight">
                            {rowUlp}
                          </td>

                          {/* Petugas */}
                          <td className="px-2 py-2 text-left max-w-[85px] text-[8px] font-bold text-slate-600 uppercase truncate" title={rowPetugas}>
                            {rowPetugas}
                          </td>

                          {/* No Tugas */}
                          <td className="px-2 py-2 text-left text-[9px] font-black text-slate-700 font-mono">
                            <span className="bg-slate-50 border border-slate-150 rounded px-1 py-0.5">{rowId}</span>
                          </td>
                          
                          {/* Jenis Anomali badging */}
                          <td className="px-2 py-2 text-left max-w-[125px]">
                            <div className="flex flex-wrap gap-0.5 max-h-[30px] overflow-y-auto custom-scrollbar">
                              {violationsList.map((v, vIdx) => {
                                let badgeStyle = "bg-rose-50 text-rose-600 border-rose-100";
                                const vLower = v.toLowerCase();
                                if (vLower.includes("cctv") || vLower.includes("kamera")) {
                                  badgeStyle = "bg-red-50 text-red-600 border-red-100";
                                } else if (vLower.includes("rambu")) {
                                  badgeStyle = "bg-amber-50 text-amber-600 border-amber-100";
                                } else if (vLower.includes("ps4") || vLower.includes("ps-4")) {
                                  badgeStyle = "bg-orange-50 text-orange-600 border-orange-100";
                                } else if (vLower.includes("apd")) {
                                  badgeStyle = "bg-yellow-50 text-yellow-700 border-yellow-200";
                                } else if (vLower.includes("konfirmasi")) {
                                  badgeStyle = "bg-purple-50 text-purple-600 border-purple-100";
                                } else if (vLower.includes("alat kerja") || vLower.includes("material")) {
                                  badgeStyle = "bg-pink-50 text-pink-600 border-pink-100";
                                } else if (vLower.includes("wp") || vLower.includes("jsa")) {
                                  badgeStyle = "bg-indigo-50 text-indigo-600 border-indigo-100";
                                } else if (vLower.includes("hsse") || vLower.includes("lapor")) {
                                  badgeStyle = "bg-blue-50 text-blue-600 border-blue-100";
                                } else if (vLower.includes("briefing")) {
                                  badgeStyle = "bg-teal-50 text-teal-600 border-teal-100";
                                }

                                return (
                                  <span key={vIdx} className={`px-1 py-0.5 text-[7px] font-black uppercase tracking-tight rounded border ${badgeStyle}`}>
                                    {v}
                                  </span>
                                );
                              })}
                            </div>
                            {rowDesc && rowDesc !== "-" && (
                              <p className="text-[7.5px] text-slate-400 font-semibold truncate max-w-[120px] mt-0.5" title={rowDesc}>{rowDesc}</p>
                            )}
                          </td>
                          
                          {/* Foto Eviden 1 Button */}
                          <td className="px-2 py-2 text-center">
                            {uploadedEvidens[rowId]?.fotoEviden1 ? (
                              <div className="flex flex-col items-center gap-1">
                                <div 
                                  onClick={() => {
                                    setEvidencePhotoIdx(1);
                                    setEvidenceModalRow(row);
                                  }}
                                  className="w-10 h-10 rounded overflow-hidden border border-cyan-455 group relative shadow-sm hover:scale-[1.05] transition-transform cursor-pointer mx-auto"
                                  title="Klik untuk memperbesar eviden 1"
                                >
                                  <img 
                                    src={uploadedEvidens[rowId].fotoEviden1} 
                                    alt="Eviden 1" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <span className="text-[6.5px] text-cyan-600 font-extrabold uppercase leading-none">Ada Foto</span>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  setEvidencePhotoIdx(1);
                                  setEvidenceModalRow(row);
                                }}
                                className="inline-flex items-center gap-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-1.5 py-0.5 rounded text-[7px] font-black tracking-widest uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                              >
                                <Camera size={7} className="shrink-0" />
                                <span>Eviden 1</span>
                              </button>
                            )}
                          </td>

                          {/* Foto Eviden 2 Button */}
                          <td className="px-2 py-2 text-center">
                            {uploadedEvidens[rowId]?.fotoEviden2 ? (
                              <div className="flex flex-col items-center gap-1">
                                <div 
                                  onClick={() => {
                                    setEvidencePhotoIdx(2);
                                    setEvidenceModalRow(row);
                                  }}
                                  className="w-10 h-10 rounded overflow-hidden border border-emerald-400 group relative shadow-sm hover:scale-[1.05] transition-transform cursor-pointer mx-auto"
                                  title="Klik untuk memperbesar eviden 2"
                                >
                                  <img 
                                    src={uploadedEvidens[rowId].fotoEviden2} 
                                    alt="Eviden 2" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <span className="text-[6.5px] text-emerald-600 font-extrabold uppercase leading-none">Ada Foto</span>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  setEvidencePhotoIdx(2);
                                  setEvidenceModalRow(row);
                                }}
                                className="inline-flex items-center gap-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-1.5 py-0.5 rounded text-[7px] font-black tracking-widest uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                              >
                                <Camera size={7} className="shrink-0" />
                                <span>Eviden 2</span>
                              </button>
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

          {/* Simple Pagination bar */}
          {totalTindakPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 shrink-0">
              <span className="text-[8px] text-slate-400 font-bold uppercase">
                Halaman <span className="text-slate-700">{tindakPage}</span> dari <span className="text-slate-700">{totalTindakPages}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTindakPage(p => Math.max(1, p - 1))}
                  disabled={tindakPage === 1}
                  className="p-1 px-1.5 bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 text-[8px] font-black uppercase disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setTindakPage(p => Math.min(totalTindakPages, p + 1))}
                  disabled={tindakPage === totalTindakPages}
                  className="p-1 px-1.5 bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 text-[8px] font-black uppercase disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Bespoke Universal Interactive Details Modal */}
      <AnimatePresence>
        {evidenceModalRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with elegant blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEvidenceModalRow(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              id="evidence_modal_backdrop"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
              id="evidence_detail_modal"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-cyan-600 to-[#1b3d5d] text-white p-4 flex items-center justify-between border-b border-gray-150">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/10">
                    <Camera size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-widest uppercase">
                      BUKTI FISIK / FOTO EVIDEN {evidencePhotoIdx}
                    </h3>
                    <p className="text-[8px] text-slate-300 font-extrabold uppercase tracking-widest mt-0.5">
                      No Tugas: {evidenceModalRow[0] || "-"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEvidenceModalRow(null)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors rounded-xl bg-white/10 text-white"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-y-auto flex flex-col gap-4">
                
                {/* Switcher Tabs inside Modal */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setEvidencePhotoIdx(1)}
                    className={`flex-1 py-1.5 text-center rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      evidencePhotoIdx === 1
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Foto Eviden 1
                  </button>
                  <button
                    onClick={() => setEvidencePhotoIdx(2)}
                    className={`flex-1 py-1.5 text-center rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      evidencePhotoIdx === 2
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Foto Eviden 2
                  </button>
                </div>

                {/* Simulated Image Viewer */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner">
                  <img
                    src={getEvidencePhotoUrl(evidenceModalRow, evidencePhotoIdx)}
                    alt={`Foto Eviden Lapangan ${evidencePhotoIdx}`}
                    className="w-full h-full object-cover opacity-90 hover:scale-[1.02] duration-300 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  {/* Camera overlay HUD */}
                  <div className="absolute inset-0 border-[8px] border-black/15 pointer-events-none flex flex-col justify-between p-4">
                    <div className="flex justify-between items-start">
                      <span className="bg-black/60 backdrop-blur-md text-cyan-400 font-mono text-[8px] px-2 py-0.5 rounded font-black tracking-widest">● LIVE CAM</span>
                      <span className="bg-black/60 backdrop-blur-md text-white/90 font-mono text-[8px] px-2 py-0.5 rounded font-black">
                        {evidenceModalRow[1] || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="bg-rose-600/90 backdrop-blur-md text-white font-mono text-[8px] px-2 py-0.5 rounded font-black tracking-wider uppercase">
                        ANOMALI DETECTED
                      </span>
                      <span className="bg-[#1b3d5d]/85 text-white font-mono text-[7px] px-1.5 py-0.5 rounded uppercase">
                        {evidenceModalRow[3] || "ULP"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Card */}
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 shrink-0">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Rincian Kejadian & Temuan
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">Petugas Lapangan</span>
                      <span className="text-[10px] font-black text-slate-700 block mt-0.5 uppercase">
                        {evidenceModalRow[2] || "TIDAK TERIDENTIFIKASI"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">Unit Pelayanan</span>
                      <span className="text-[10px] font-black text-slate-700 block mt-0.5 uppercase">
                        {evidenceModalRow[3] || "-"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">Jenis Kerawanan / Anomali</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(evidenceModalRow[4] || "").split(",").map((v: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-tight rounded bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                            {v.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                    {evidenceModalRow[5] && evidenceModalRow[5] !== "-" && (
                      <div className="col-span-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase block">Keterangan / Temuan</span>
                        <p className="text-[10px] font-semibold text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 mt-1.5 leading-relaxed">
                          {evidenceModalRow[5]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setEvidenceModalRow(null)}
                    className="bg-[#1b3d5d] hover:bg-[#1b3d5d]/90 text-white w-full py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-colors"
                  >
                    Tutup Eviden
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {detailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with elegant blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              id="modal_backdrop"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
              id="anomali_detail_modal"
            >
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#06b6d4] to-[#1b3d5d] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-md">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-widest uppercase">
                      DETAIL DATA ANOMALI: {detailModal.title}
                    </h3>
                    <p className="text-[9px] text-slate-200 font-bold tracking-widest uppercase">
                      {detailModal.subTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleExportExcelModal(detailModal.excelName, detailModal.rows)}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-[10px] font-extrabold tracking-widest uppercase transition-all"
                  >
                    <Download size={12} />
                    EXPORT EXCEL ({detailModal.rows.length})
                  </button>
                  <button
                    onClick={() => setDetailModal(null)}
                    className="w-9 h-9 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors rounded-xl bg-white/10 text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Toolbar: Live Search & Summary stats */}
              <div className="p-4 bg-slate-50 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                  Menampilkan <span className="text-blue-600 font-extrabold">{filteredModalRows.length}</span> data dari total {detailModal.rows.length}
                </p>
                
                <div className="relative w-full sm:w-72">
                  <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => {
                      setModalSearch(e.target.value);
                      setCurrentPage(1); // reset to page 1
                    }}
                    placeholder="Cari No. Laporan, Petugas, Deskripsi..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 focus:border-blue-400 focus:outline-none bg-white text-xs font-bold text-gray-700 rounded-xl transition-all shadow-inner"
                  />
                  {modalSearch && (
                    <button 
                       onClick={() => { setModalSearch(''); setCurrentPage(1); }}
                       className="absolute inset-y-0 right-3 flex items-center hover:text-red-500 text-gray-400 text-xs font-black"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-auto p-5 custom-scrollbar min-h-[300px]">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest text-[9px]">
                        <th className="px-4 py-3 w-32">No Laporan</th>
                        <th className="px-4 py-3 w-40">Tgl Lapor</th>
                        <th className="px-4 py-3 w-48">Petugas</th>
                        <th className="px-4 py-3 w-32">ULP Unit</th>
                        <th className="px-4 py-3 w-44">Jenis Anomali</th>
                        <th className="px-4 py-3">Deskripsi Temuan</th>
                        <th className="px-4 py-3 w-20 text-center">RPT</th>
                        <th className="px-4 py-3 w-20 text-center">RCT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                      {paginatedRows.length > 0 ? (
                        paginatedRows.map((row, idx) => {
                          const [noLaporan, tglLapor, mPetugas, rUlp, jenis, deskripsi, rpt, rct] = row;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3 text-slate-950 font-black tabular-nums whitespace-nowrap">
                                {noLaporan}
                              </td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap tabular-nums">
                                {tglLapor}
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-800">
                                {mPetugas || "-"}
                              </td>
                              <td className="px-4 py-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 whitespace-nowrap">
                                {rUlp}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold ${getJenisBadgeColor(jenis || "")}`}>
                                  {jenis}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 leading-relaxed font-normal whitespace-pre-wrap break-words min-w-[250px] max-w-sm">
                                {deskripsi}
                              </td>
                              <td className="px-4 py-3 font-bold text-center text-gray-500 tabular-nums">
                                {rpt}
                              </td>
                              <td className="px-4 py-3 font-bold text-center text-gray-500 tabular-nums">
                                {rct}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center py-16 text-gray-400 font-bold uppercase tracking-widest">
                            Tidak ada data anomali ditemukan
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Panel: Pagination and closing stats */}
              <div className="bg-slate-50 p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase">
                  PLN ELECTRICITY DATA SERVICE • UP3 BUKITTINGGI
                </span>

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2" id="modal_pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold text-gray-600 min-w-[70px] text-center">
                      Hlm {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

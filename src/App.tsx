import React, { useEffect, useState } from 'react';
import { Header } from './components/Header.tsx';
import { SubHeader } from './components/SubHeader.tsx';
import { WOUP3Card } from './components/WOUP3Card.tsx';
import { ULPStatsCard } from './components/ULPStatsCard.tsx';
import { POUP3Card } from './components/POUP3Card.tsx';
import { ULPPOStatsCard } from './components/ULPPOStatsCard.tsx';
import { PerformanceTable } from './components/PerformanceTable.tsx';
import { ULPPerformanceTable } from './components/ULPPerformanceTable.tsx';
import { DetailModal } from './components/DetailModal.tsx';
import { OverSLAPage } from './components/OverSLAPage.tsx';
import { RatingPage } from './components/RatingPage.tsx';
import { AnomaliPage } from './components/AnomaliPage.tsx';
import { YantekOptimitationPage } from './components/YantekOptimitationPage.tsx';
import { AdminPage } from './components/AdminPage.tsx';
import { GoogleSheetsService } from './services/googleSheetsService.ts';
import { DashboardData } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

type TabType = 'CCTV' | 'ANOMALI' | 'OVER_SLA' | 'RATING' | 'YANTEK_OPTIMITATION' | 'ADMIN';

interface TabFilter {
  startDate: string;
  endDate: string;
  selectedMonth: string;
  selectedUlp: string;
  selectedUp3: string;
}

const getInitialDefaultDates = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const formatDateForQuery = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  return {
    startDate: formatDateForQuery(firstDay),
    endDate: formatDateForQuery(now),
    selectedMonth: `${year}-${month}`
  };
};

const resolveStandardUp3Name = (name: string): string => {
  const val = String(name || "").toUpperCase();
  if (val.includes("BUKIT")) return "UP3 BUKITTINGGI";
  if (val.includes("PADANG")) return "UP3 PADANG";
  if (val.includes("SOLOK")) return "UP3 SOLOK";
  if (val.includes("PAYAKUMBUH")) return "UP3 PAYAKUMBUH";
  return val;
};

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('CCTV');

  const [tabFilters, setTabFilters] = useState<Record<TabType, TabFilter>>(() => {
    const initialDates = getInitialDefaultDates();
    const createDefault = (): TabFilter => ({
      startDate: initialDates.startDate,
      endDate: initialDates.endDate,
      selectedMonth: initialDates.selectedMonth,
      selectedUlp: "",
      selectedUp3: ""
    });
    return {
      CCTV: createDefault(),
      ANOMALI: createDefault(),
      OVER_SLA: createDefault(),
      RATING: createDefault(),
      YANTEK_OPTIMITATION: createDefault(),
      ADMIN: createDefault()
    };
  });

  const currentFilters = tabFilters[activeTab];
  const startDate = currentFilters.startDate;
  const endDate = currentFilters.endDate;
  const selectedMonth = currentFilters.selectedMonth;
  const selectedUlp = currentFilters.selectedUlp;
  const selectedUp3 = currentFilters.selectedUp3;

  const isUpSumbar = !selectedUp3 || selectedUp3 === "UP SUMBAR";

  const handleUp3Change = (up3: string) => {
    const val = up3 === "UP SUMBAR" ? "" : up3;
    setTabFilters(prev => {
      const activeFilters = prev[activeTab];
      let newSelectedUlp = activeFilters.selectedUlp;
      if (val && data?.up3ToUlps) {
        const allowedUlps = data.up3ToUlps[val] || [];
        const clean = (u: string) => u.toUpperCase().replace(/^POSKO ULP\s+/i, "").replace(/^ULP\s+/i, "").replace(/^POSKO\s+/i, "").replace(/[^A-Z0-9]/g, "").trim();
        const isAllowed = allowedUlps.some(u => clean(u) === clean(activeFilters.selectedUlp));
        if (!isAllowed) {
          newSelectedUlp = "";
        }
      }
      return {
        ...prev,
        [activeTab]: {
          ...activeFilters,
          selectedUp3: val,
          selectedUlp: newSelectedUlp
        }
      };
    });
  };

  const handleMonthChange = (monthStr: string) => {
    if (monthStr) {
      const [year, month] = monthStr.split('-');
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      if (!isNaN(y) && !isNaN(m)) {
        const firstDay = `${year}-${month}-01`;
        const lastDayObj = new Date(y, m, 0);
        const lastDayDate = String(lastDayObj.getDate()).padStart(2, '0');
        const lastDay = `${year}-${month}-${lastDayDate}`;
        setTabFilters(prev => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            selectedMonth: monthStr,
            startDate: firstDay,
            endDate: lastDay
          }
        }));
      }
    } else {
      setTabFilters(prev => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          selectedMonth: monthStr
        }
      }));
    }
  };

  const handleUlpChange = (ulp: string) => {
    setTabFilters(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        selectedUlp: ulp
      }
    }));
  };

  const handleStartDateChange = (date: string) => {
    setTabFilters(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        startDate: date
      }
    }));
  };

  const handleEndDateChange = (date: string) => {
    setTabFilters(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        endDate: date
      }
    }));
  };

  const formatDateForQuery = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const ulpToUp3Map = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (data?.up3ToUlps) {
      Object.entries(data.up3ToUlps).forEach(([up3, ulps]) => {
        const uList = ulps as string[];
        uList.forEach(ulp => {
          map[ulp.toUpperCase()] = up3;
        });
      });
    }
    return map;
  }, [data]);

  const up3PerformanceList = React.useMemo(() => {
    if (!data) return [];
    
    const up3s = ["UP3 PADANG", "UP3 SOLOK", "UP3 BUKITTINGGI", "UP3 PAYAKUMBUH"];
    const checkCctv = (val: any) => {
      const s = String(val || "").toUpperCase();
      return s.includes("CCTV") || s.includes("PAKAI") || s.includes("YA") || s.includes("VIDEO") || s.includes("FOTO") || s.includes("ADA");
    };

    return up3s.map(up3Name => {
      const cleanUp3Str = up3Name.toUpperCase().replace(/^UP3\s+/i, "").replace(/[^A-Z0-9]/g, "").trim();

      // Filter WO rows for this UP3
      const woRowsForUp3 = data.distinctWoRows.filter(row => {
        const rowUp3 = String(row[data.woIndices.up3] || "").toUpperCase().replace(/^UP3\s+/i, "").replace(/[^A-Z0-9]/g, "").trim();
        return rowUp3 === cleanUp3Str;
      });

      // Filter PO rows for this UP3
      const poRowsForUp3 = data.distinctPoRows.filter(row => {
        const rowUp3 = String(row[data.poIndices.up3] || "").toUpperCase().replace(/^UP3\s+/i, "").replace(/[^A-Z0-9]/g, "").trim();
        return rowUp3 === cleanUp3Str;
      });

      const jumlahWoTotal = woRowsForUp3.length;
      const totalWoPakaiCctv = woRowsForUp3.filter(row => checkCctv(row[data.woIndices.cctv])).length;
      const persenWo = jumlahWoTotal > 0 ? ((totalWoPakaiCctv / jumlahWoTotal) * 100).toFixed(0) + "%" : "0%";

      const jumlahPoTotal = poRowsForUp3.length;
      const totalPoPakaiCctv = poRowsForUp3.filter(row => checkCctv(row[data.poIndices.cctv])).length;
      const persenPo = jumlahPoTotal > 0 ? ((totalPoPakaiCctv / jumlahPoTotal) * 100).toFixed(0) + "%" : "0%";

      const totalUsed = totalWoPakaiCctv + totalPoPakaiCctv;
      const totalAll = jumlahWoTotal + jumlahPoTotal;
      const persenPenggunaanCctv = totalAll > 0 ? ((totalUsed / totalAll) * 100).toFixed(0) + "%" : "0%";

      return {
        ulp: up3Name,
        jumlahWoTotal,
        totalWoPakaiCctv,
        persenWo,
        jumlahPoTotal,
        totalPoPakaiCctv,
        persenPo,
        persenPenggunaanCctv
      };
    });
  }, [data]);

  // Memoized filter logic
  const filteredData = React.useMemo(() => {
    if (!data) return null;

    const cleanUp3 = (up3: any) => {
      return String(up3 || "").toUpperCase()
        .replace(/^UP3\s+/i, "")
        .replace(/[^A-Z0-9]/g, "")
        .trim();
    };
    const targetUp3Clean = selectedUp3 ? cleanUp3(selectedUp3) : "";

    const cleanUlp = (ulp: any) => {
      const str = String(ulp || "").toUpperCase()
        .replace(/^POSKO ULP\s+/i, "")
        .replace(/^ULP\s+/i, "")
        .replace(/^POSKO\s+/i, "")
        .replace(/[^A-Z0-9]/g, "")
        .trim();
      if (str.includes("PADANG") && str.includes("PANJANG")) return "PADANGPANJANG";
      if (str.includes("KOTO") && str.includes("TUO")) return "KOTOTUO";
      return str;
    };
    const targetUlpClean = selectedUlp ? cleanUlp(selectedUlp) : "";

    // Helper to check if row matches selected UP3
    const rowMatchUp3 = (row: any[], up3Idx: number) => {
      if (!selectedUp3 || selectedUp3 === "UP SUMBAR" || selectedUp3 === "UP4 SUMBAR") return true;
      if (up3Idx === -1 || up3Idx >= row.length) return false;
      return resolveStandardUp3Name(row[up3Idx]) === resolveStandardUp3Name(selectedUp3);
    };

    // Helper to check if a standalone record (e.g. from sub-tables) belongs to UP3
    const getAllowedUlps = () => {
      if (!selectedUp3 || selectedUp3 === "UP SUMBAR" || selectedUp3 === "UP4 SUMBAR" || !data.up3ToUlps) return [];
      const targetUP3Std = resolveStandardUp3Name(selectedUp3);
      const entry = Object.entries(data.up3ToUlps).find(([key]) => {
        return resolveStandardUp3Name(key) === targetUP3Std;
      });
      return entry ? (entry[1] as string[]) : [];
    };
    const allowedUlps = getAllowedUlps();
    const allowedUlpsClean = allowedUlps.map(u => cleanUlp(u));
    const isUlpAllowed = (ulpName: string) => {
      if (!selectedUp3 || selectedUp3 === "UP SUMBAR" || selectedUp3 === "UP4 SUMBAR") return true;
      return allowedUlpsClean.includes(cleanUlp(ulpName));
    };

    // 1. Filter distinct rows
    const filteredDistinctWoRows = data.distinctWoRows.filter(row => {
      const matchUp3 = rowMatchUp3(row, data.woIndices.up3);
      const matchUlp = !selectedUlp || cleanUlp(row[data.woIndices.ulp]) === targetUlpClean;
      return matchUp3 && matchUlp;
    });

    const filteredDistinctPoRows = data.distinctPoRows.filter(row => {
      const matchUp3 = rowMatchUp3(row, data.poIndices.up3);
      const matchUlp = !selectedUlp || cleanUlp(row[data.poIndices.ulp]) === targetUlpClean;
      return matchUp3 && matchUlp;
    });

    // 2. Filter raw rows
    const filteredRawWoRows = data.rawWoRows.filter(row => {
      const matchUp3 = rowMatchUp3(row, data.woIndices.up3);
      const matchUlp = !selectedUlp || cleanUlp(row[data.woIndices.ulp]) === targetUlpClean;
      return matchUp3 && matchUlp;
    });

    const filteredRawPoRows = data.rawPoRows.filter(row => {
      const matchUp3 = rowMatchUp3(row, data.poIndices.up3);
      const matchUlp = !selectedUlp || cleanUlp(row[data.poIndices.ulp]) === targetUlpClean;
      return matchUp3 && matchUlp;
    });

    // 3. Filter CCTV Usage
    const filteredCctvUsage = data.cctvUsage.filter(u => {
      const matchUp3 = isUlpAllowed(u.ulp);
      const matchUlp = !selectedUlp || cleanUlp(u.ulp) === targetUlpClean;
      return matchUp3 && matchUlp;
    });

    // 4. Recalculate overSla data
    let filteredOverSla = data.overSla;
    if (selectedUlp || selectedUp3) {
      const rptValArray = filteredDistinctWoRows.map(row => parseFloat(String(row[data.woIndices.rpt]).replace(",", ".")) || 0);
      const rctValArray = filteredDistinctWoRows.map(row => parseFloat(String(row[data.woIndices.rct]).replace(",", ".")) || 0);

      const highestRpt = rptValArray.length > 0 ? rptValArray.reduce((max, v) => v > max ? v : max, 0) : 0;
      const highestRct = rctValArray.length > 0 ? rctValArray.reduce((max, v) => v > max ? v : max, 0) : 0;

      const countRptOver30 = rptValArray.filter(v => v >= 30).length;
      const countRptOver45 = rptValArray.filter(v => v >= 45).length;

      const avgRpt = rptValArray.length > 0 ? parseFloat((rptValArray.reduce((src, sum) => src + sum, 0) / rptValArray.length).toFixed(1)) : 0;
      const avgRct = rctValArray.length > 0 ? parseFloat((rctValArray.reduce((src, sum) => src + sum, 0) / rctValArray.length).toFixed(1)) : 0;

      const woOverSlaRptList: any[][] = filteredDistinctWoRows
        .filter(row => (parseFloat(String(row[data.woIndices.rpt]).replace(",", ".")) || 0) >= 30)
        .map(row => [
          row[data.woIndices.noLaporan] || row[0] || "", // No Laporan
          row[data.woIndices.tglLapor] || "", // Tanggal Lapor
          row[data.woIndices.name] || "", // Nama Petugas
          row[data.woIndices.rpt] || "", // RPT
          row[data.woIndices.rct] || ""  // RCT
        ]);

      const shiftsCounts: { [shift: string]: number } = { "SHIFT 1": 0, "SHIFT 2": 0, "SHIFT 3": 0 };
      filteredDistinctWoRows.forEach(row => {
        let shift = String(row[data.woIndices.shift] || "").trim().toUpperCase();
        if (shift === "PAGI") shift = "SHIFT 1";
        if (shift === "SORE") shift = "SHIFT 2";
        if (shift === "MALAM") shift = "SHIFT 3";
        if (shift in shiftsCounts) {
          shiftsCounts[shift]++;
        }
      });

      const shiftDistribution = Object.keys(shiftsCounts).map(name => ({
        name,
        value: shiftsCounts[name]
      }));

      const rptOvershootByOfficer: { [name: string]: number } = {};
      const rctOvershootByOfficer: { [name: string]: number } = {};

      const maxRctInDataSet = rctValArray.length > 0 ? Math.max(...rctValArray) : 0;
      const rctSlaThreshold = maxRctInDataSet >= 120 ? 120 : (maxRctInDataSet >= 60 ? 60 : 30);

      filteredDistinctWoRows.forEach(row => {
        const name = String(row[data.woIndices.name] || "").trim();
        if (!name) return;
        const rpt = parseFloat(String(row[data.woIndices.rpt]).replace(",", ".")) || 0;
        const rct = parseFloat(String(row[data.woIndices.rct]).replace(",", ".")) || 0;

        if (rpt >= 30) rptOvershootByOfficer[name] = (rptOvershootByOfficer[name] || 0) + 1;
        if (rct >= rctSlaThreshold) rctOvershootByOfficer[name] = (rctOvershootByOfficer[name] || 0) + 1;
      });

      const officerOverSlaRpt = Object.keys(rptOvershootByOfficer).map(name => ({
        name,
        count: rptOvershootByOfficer[name]
      })).sort((a,b) => b.count - a.count).slice(0, 5);

      const officerOverSlaRct = Object.keys(rctOvershootByOfficer).map(name => ({
        name,
        count: rctOvershootByOfficer[name]
      })).sort((a,b) => b.count - a.count).slice(0, 5);

      const ulpOverSlaCount: { [ulp: string]: number } = {};
      filteredDistinctWoRows.forEach(row => {
        const u = cleanUlp(row[data.woIndices.ulp]);
        const rpt = parseFloat(String(row[data.woIndices.rpt]).replace(",", ".")) || 0;
        if (rpt >= 30) {
          ulpOverSlaCount[u] = (ulpOverSlaCount[u] || 0) + 1;
        }
      });

      const overSlaUlpDistribution = Object.keys(ulpOverSlaCount).map(name => ({
        name,
        value: ulpOverSlaCount[name]
      }));

      filteredOverSla = {
        totalGangguan: filteredDistinctWoRows.length,
        highestRpt,
        highestRct,
        countRptOver30,
        countRptOver45,
        avgRpt,
        avgRct,
        woOverSlaRptList,
        shiftDistribution,
        officerOverSlaRpt,
        officerOverSlaRct,
        ulpDistribution: overSlaUlpDistribution
      };
    }

    // Helper to calculate CCTV counts for summary
    const countWoCctv = filteredDistinctWoRows.filter(row => {
      const s = String(row[data.woIndices.cctv] || "").toUpperCase();
      return s.includes("CCTV") || s.includes("PAKAI") || s.includes("YA") || s.includes("VIDEO") || s.includes("FOTO") || s.includes("ADA");
    }).length;

    const countPoCctv = filteredDistinctPoRows.filter(row => {
      const s = String(row[data.poIndices.cctv] || "").toUpperCase();
      return s.includes("CCTV") || s.includes("PAKAI") || s.includes("YA") || s.includes("VIDEO") || s.includes("FOTO") || s.includes("ADA");
    }).length;
    
    // Filter vccData
    let filteredVccData = data.vccData || [];
    if (filteredVccData.length > 1) {
      const vccHeaders = filteredVccData[0] || [];
      const findVccHeaderIdx = (possibleNames: string[]) => {
        const normNames = possibleNames.map(n => n.toLowerCase().trim().replace(/['"_\s]/g, ""));
        return vccHeaders.findIndex(h => {
          const cleaned = String(h || "").toLowerCase().trim().replace(/['"_\s]/g, "");
          return normNames.includes(cleaned);
        });
      };
      const vccUlpIdx = findVccHeaderIdx(["namaulp", "ulp", "unit"]);
      
      if (vccUlpIdx !== -1) {
        const vccHeadersRow = filteredVccData[0];
        const vccDataRows = filteredVccData.slice(1).filter(row => {
          const u = cleanUlp(row[vccUlpIdx]);
          const matchUp3 = isUlpAllowed(u);
          const matchUlp = !selectedUlp || u === targetUlpClean;
          return matchUp3 && matchUlp;
        });
        filteredVccData = [vccHeadersRow, ...vccDataRows];
      }
    }

    return {
      ...data,
      vccData: filteredVccData,
      distinctWoRows: filteredDistinctWoRows,
      distinctPoRows: filteredDistinctPoRows,
      rawWoRows: filteredRawWoRows,
      rawPoRows: filteredRawPoRows,
      cctvUsage: filteredCctvUsage,
      overSla: filteredOverSla,
      ulpPerformance: data.ulpPerformance.filter(u => {
        const matchUp3 = isUlpAllowed(u.ulp);
        const matchUlp = !selectedUlp || cleanUlp(u.ulp) === targetUlpClean;
        return matchUp3 && matchUlp;
      }).sort((a, b) => {
        const avgA = (parseFloat(a.persenWo) || 0) + (parseFloat(a.persenPo) || 0);
        const avgB = (parseFloat(b.persenWo) || 0) + (parseFloat(b.persenPo) || 0);
        return avgB - avgA;
      }),
      officerPerformance: data.officerPerformance.filter(o => {
        const matchUp3 = isUlpAllowed(o.ulp);
        const matchUlp = !selectedUlp || cleanUlp(o.ulp) === targetUlpClean;
        return matchUp3 && matchUlp;
      }).sort((a, b) => {
        const avgA = (parseFloat(a.persenWo) || 0) + (parseFloat(a.persenPo) || 0);
        const avgB = (parseFloat(b.persenWo) || 0) + (parseFloat(b.persenPo) || 0);
        return avgB - avgA;
      }),
      summary: {
        ...data.summary,
        totalWo: filteredDistinctWoRows.length,
        totalPo: filteredDistinctPoRows.length,
        distinctTotalWo: filteredDistinctWoRows.length,
        distinctTotalWoCctv: countWoCctv,
        distinctTotalPo: filteredDistinctPoRows.length,
        distinctTotalPoCctv: countPoCctv,
        totalCctv: countWoCctv + countPoCctv,
        totalBaca: filteredDistinctWoRows.length + filteredDistinctPoRows.length,
        totalValid: countWoCctv + countPoCctv,
        tidakValid: (filteredDistinctWoRows.length + filteredDistinctPoRows.length) - (countWoCctv + countPoCctv)
      },
      rating: {
        ...data.rating,
        officerRatings: data.rating.officerRatings.filter(o => {
          const matchUp3 = isUlpAllowed(o.ulp);
          const matchUlp = !selectedUlp || cleanUlp(o.ulp) === targetUlpClean;
          return matchUp3 && matchUlp;
        }),
        ulpRatings: data.rating.ulpRatings.filter(u => {
          const matchUp3 = isUlpAllowed(u.namaUlp);
          const matchUlp = !selectedUlp || cleanUlp(u.namaUlp) === targetUlpClean;
          return matchUp3 && matchUlp;
        }),
        kpRatings: data.rating.kpRatings.filter(k => {
          const matchUp3 = isUlpAllowed(k.ulp);
          const matchUlp = !selectedUlp || cleanUlp(k.ulp) === targetUlpClean;
          return matchUp3 && matchUlp;
        })
      },
      anomali: {
        ...data.anomali,
        totalAnomali: data.anomali.anomaliList.filter(row => {
          const u = cleanUlp(row[3]);
          return isUlpAllowed(u) && (!selectedUlp || u === targetUlpClean);
        }).length,
        anomaliList: data.anomali.anomaliList.filter(row => {
          const u = cleanUlp(row[3]);
          return isUlpAllowed(u) && (!selectedUlp || u === targetUlpClean);
        })
      }
    };
  }, [data, selectedUlp, selectedUp3]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalHeaders, setModalHeaders] = useState<string[]>([]);
  const [modalRows, setModalRows] = useState<any[][]>([]);

  // Filter logic options
  const filterList = React.useMemo(() => {
    if (!data) return [];
    if (selectedUp3 && data.up3ToUlps) {
      if (selectedUp3 === "UP SUMBAR" || selectedUp3 === "UP4 SUMBAR") {
        return data.allUlps || [];
      }
      const matchKey = Object.keys(data.up3ToUlps).find(k => k.toUpperCase() === selectedUp3.toUpperCase());
      if (matchKey) {
        return data.up3ToUlps[matchKey] || [];
      }
    }
    return data.allUlps || [];
  }, [data, selectedUp3]);

  const handleDetailClick = (type: 'WO' | 'PO', identifier: string, isUlp: boolean, isCctv: boolean) => {
    if (!data) return;

    const headers = type === 'WO' ? data.woHeaders : data.poHeaders;
    const rawRows = type === 'WO' 
      ? (isUlp ? data.distinctWoRows : data.rawWoRows) 
      : (isUlp ? data.distinctPoRows : data.rawPoRows);
    const indices = type === 'WO' ? data.woIndices : data.poIndices;

    const cleanName = (name: any) => {
      return String(name || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    };

    const cleanUlp = (ulp: any) => {
      const str = String(ulp || "").toUpperCase()
        .replace(/^POSKO ULP\s+/i, "")
        .replace(/^ULP\s+/i, "")
        .replace(/^POSKO\s+/i, "")
        .replace(/[^A-Z0-9]/g, "")
        .trim();
      if (str.includes("PADANG") && str.includes("PANJANG")) return "PADANGPANJANG";
      if (str.includes("KOTO") && str.includes("TUO")) return "KOTOTUO";
      return str;
    };

    // Build officer to ULP map for fallback using standardized clean names
    const officerToCleanUlpMap = new Map<string, string>();
    data.officerPerformance.forEach(op => {
      officerToCleanUlpMap.set(cleanName(op.name), cleanUlp(op.ulp));
    });

    let filteredRows = rawRows;

    // 1. Filter by CCTV if requested
    if (isCctv) {
      filteredRows = filteredRows.filter(row => {
        if (indices.cctv === -1 || indices.cctv >= row.length) return false;
        const cctvVal = String(row[indices.cctv] || '').toUpperCase();
        return cctvVal.includes('CCTV');
      });
    }

    // 2. Filter by ULP or Officer or UP3
    if (identifier.toUpperCase().startsWith("UP3")) {
      const stdIdentifier = resolveStandardUp3Name(identifier);
      filteredRows = filteredRows.filter(row => {
        if (indices.up3 === -1 || indices.up3 >= row.length) return false;
        return resolveStandardUp3Name(row[indices.up3]) === stdIdentifier;
      });
      setModalTitle(`DETAIL DATA ${type}${isCctv ? ' (CCTV)' : ''} - ${identifier}`);
    } else if (identifier === "ALL") {
      setModalTitle(`DETAIL DATA ${type}${isCctv ? ' (CCTV)' : ''} - SEMUA`);
    } else if (isUlp) {
      const targetUlpClean = cleanUlp(identifier);
      filteredRows = filteredRows.filter(row => {
        let rowUlp = "";
        if (indices.ulp !== -1 && indices.ulp < row.length && row[indices.ulp]) {
          rowUlp = cleanUlp(row[indices.ulp]);
        } else if (indices.name !== -1 && indices.name < row.length && row[indices.name]) {
          // Fallback to officer mapping
          const rowNameClean = cleanName(row[indices.name]);
          rowUlp = officerToCleanUlpMap.get(rowNameClean) || "";
        }
        return rowUlp === targetUlpClean;
      });
      setModalTitle(`DETAIL DATA ${type}${isCctv ? ' (CCTV)' : ''} - ULP: ${identifier}`);
    } else {
      const targetNameClean = cleanName(identifier);
      filteredRows = filteredRows.filter(row => {
        if (indices.name === -1 || indices.name >= row.length) return false;
        const rowNameClean = cleanName(row[indices.name]);
        return rowNameClean === targetNameClean;
      });
      setModalTitle(`DETAIL DATA ${type}${isCctv ? ' (CCTV)' : ''} - PETUGAS: ${identifier}`);
    }

    setModalHeaders(headers);
    setModalRows(filteredRows);
    setModalOpen(true);
  };

  const handleOverSLADetailClick = (criteria: string, value?: string) => {
    if (!data) return;

    const headers = data.woHeaders;
    const rawRows = data.rawWoRows;
    const indices = data.woIndices;

    let filteredRows = rawRows;
    let title = "DETAIL DATA OVER SLA";

    const getRptValue = (row: any[]) => {
      if (indices.rpt !== -1 && row[indices.rpt]) {
        return parseFloat(String(row[indices.rpt]).replace(",", "."));
      }
      return -1;
    };

    const getRctValue = (row: any[]) => {
      if (indices.rct !== -1 && row[indices.rct]) {
        return parseFloat(String(row[indices.rct]).replace(",", "."));
      }
      return -1;
    };

    switch (criteria) {
      case 'ALL':
        title = "DETAIL SELURUH DATA GANGGUAN";
        break;
      case 'RPT_OVER_30':
        filteredRows = rawRows.filter(row => getRptValue(row) >= 30);
        title = "DETAIL WO RPT > 30 MENIT";
        break;
      case 'RPT_OVER_45':
        filteredRows = rawRows.filter(row => getRptValue(row) >= 45);
        title = "DETAIL WO RPT > 45 MENIT";
        break;
      case 'HIGHEST_RPT':
        const maxRpt = rawRows.reduce((max, row) => {
          const v = getRptValue(row);
          return v > max ? v : max;
        }, 0);
        filteredRows = rawRows.filter(row => getRptValue(row) === maxRpt);
        title = "DETAIL DURASI RPT TERTINGGI";
        break;
      case 'HIGHEST_RCT':
        const maxRct = rawRows.reduce((max, row) => {
          const v = getRctValue(row);
          return v > max ? v : max;
        }, 0);
        filteredRows = rawRows.filter(row => getRctValue(row) === maxRct);
        title = "DETAIL DURASI RCT TERTINGGI";
        break;
      case 'AVG_RPT':
        filteredRows = rawRows.filter(row => getRptValue(row) >= 0);
        title = "DETAIL DATA RATA-RATA RPT";
        break;
      case 'AVG_RCT':
        filteredRows = rawRows.filter(row => getRctValue(row) >= 0);
        title = "DETAIL DATA RATA-RATA RCT";
        break;
      case 'ULP':
        if (value) {
          const targetUlp = value.toUpperCase().trim();
          filteredRows = rawRows.filter(row => {
            let rowUlp = "";
            if (indices.ulp !== -1 && row[indices.ulp]) {
              rowUlp = String(row[indices.ulp]).toUpperCase().replace(/^POSKO ULP\s+/i, '').replace(/^ULP\s+/i, '').trim();
            }
            return rowUlp === targetUlp || String(row[indices.name] || '').toUpperCase().includes(targetUlp);
          });
          title = `DETAIL DATA WO - ULP: ${value}`;
        }
        break;
    }

    setModalHeaders(headers);
    setModalRows(filteredRows);
    setModalOpen(true);
  };

  useEffect(() => {
    const loadData = async (showLoading = false) => {
      // If we already have data and are just changing ULP, we don't need a full-page loader
      // the new caching logic in GoogleSheetsService handles this instantly
      const needsFullLoader = !data || (showLoading && !isRefreshing);
      
      if (needsFullLoader) setIsRefreshing(true);
      
      try {
        const result = await GoogleSheetsService.fetchData(startDate, endDate, selectedUlp);
        const hasData = result.officerPerformance.length > 0 || result.summary.dataAktif > 0;
        if (!hasData) {
          setError("Tidak ada data yang ditemukan untuk rentang tanggal ini.");
        } else {
          setError(null);
        }
        setData(result);
      } catch (err: any) {
        console.error("Failed to fetch data with stack trace:", err?.stack || err);
        setError("Gagal menghubungkan ke Google Sheets.");
      } finally {
        setIsRefreshing(false);
      }
    };

    loadData(!data);
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, [startDate, endDate, selectedUlp]);

  if (error && !data) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a1128] text-white p-6 gap-6">
        <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-lg max-w-2xl w-full text-center">
          <h2 className="text-2xl font-black text-red-500 tracking-widest uppercase mb-4">KESALAHAN SINKRONISASI</h2>
          <p className="text-white/80 font-bold mb-6">{error}</p>
          <div className="text-left bg-black/40 p-4 rounded text-xs font-mono text-brand-accent/80 space-y-2">
            <p className="font-bold text-white mb-1 underline">LANGKAH PERBAIKAN:</p>
            <p>1. Buka Google Sheet Anda.</p>
            <p>2. Klik menu <span className="text-white">File &gt; Share &gt; Publish to web</span>.</p>
            <p>3. Pilih <span className="text-white">"Entire Document"</span> dan <span className="text-white">"Comma-separated values (.csv)"</span>.</p>
            <p>4. Klik <span className="text-white">Publish</span>.</p>
            <p>5. Refresh halaman ini.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 bg-brand-accent text-[#0a1128] px-8 py-3 font-black tracking-widest uppercase hover:bg-white transition-colors"
          >
            COBA LAGI SEKARANG
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a1128] text-white">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
          <h2 className="text-xl font-black tracking-widest uppercase">MEMUAT DATA...</h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {isRefreshing && (
        <div className="fixed top-0 left-0 w-full h-1 z-[100]">
          <motion.div 
            initial={{ x: "-100%" }} 
            animate={{ x: "100%" }} 
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="h-full bg-brand-accent w-full"
          />
        </div>
      )}

      <Header 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <SubHeader 
        lastSync={data.summary.lastSync} 
        summary={filteredData?.summary || data.summary} 
        selectedUlp={selectedUlp}
        onUlpChange={handleUlpChange}
        ulpList={filterList}
        selectedUp3={selectedUp3}
        onUp3Change={handleUp3Change}
        up3List={data?.up3List || []}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        activeTab={activeTab}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
      />
      
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={isRefreshing ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}
          >
            {activeTab === 'CCTV' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
                {/* Left Column - WO UP3 & ULP Cards */}
                <div className="lg:col-span-3 flex flex-col">
                  <WOUP3Card 
                    totalWo={filteredData?.summary.distinctTotalWo || 0} 
                    totalWoCctv={filteredData?.summary.distinctTotalWoCctv || 0} 
                    onDetailClick={(isCctv) => handleDetailClick('WO', selectedUlp ? selectedUlp : (selectedUp3 ? selectedUp3 : "ALL"), true, isCctv)}
                    title={isUpSumbar ? "TOTAL WO UP4" : "TOTAL WO UP3"}
                  />
                  <ULPStatsCard 
                    ulpData={isUpSumbar ? up3PerformanceList : (filteredData?.ulpPerformance || [])} 
                    allUlps={isUpSumbar ? ["UP3 PADANG", "UP3 SOLOK", "UP3 BUKITTINGGI", "UP3 PAYAKUMBUH"] : filterList}
                    onDetailClick={(ulp, isCctv) => handleDetailClick('WO', ulp, true, isCctv)}
                    title={isUpSumbar ? "TOTAL WO PER UP3" : "TOTAL WO PER ULP"}
                  />
                </div>

                {/* Center Column - Performance Tables */}
                <div className="lg:col-span-6 flex flex-col gap-6">
                  <PerformanceTable 
                    data={filteredData?.officerPerformance || []} 
                    onDetailClick={(type, name, isCctv) => handleDetailClick(type, name, false, isCctv)}
                  />
                  <ULPPerformanceTable 
                    data={filteredData?.ulpPerformance || []} 
                    onDetailClick={(type, ulp, isCctv) => handleDetailClick(type, ulp, true, isCctv)}
                  />
                </div>

                {/* Right Column - PO UP3 & ULP Cards */}
                <div className="lg:col-span-3 flex flex-col">
                  <POUP3Card 
                    totalPo={filteredData?.summary.distinctTotalPo || 0} 
                    totalPoCctv={filteredData?.summary.distinctTotalPoCctv || 0} 
                    onDetailClick={(isCctv) => handleDetailClick('PO', selectedUlp ? selectedUlp : (selectedUp3 ? selectedUp3 : "ALL"), true, isCctv)}
                    title={isUpSumbar ? "TOTAL PO UP4" : "TOTAL PO UP3"}
                  />
                  <ULPPOStatsCard 
                    ulpData={isUpSumbar ? up3PerformanceList : (filteredData?.ulpPerformance || [])} 
                    allUlps={isUpSumbar ? ["UP3 PADANG", "UP3 SOLOK", "UP3 BUKITTINGGI", "UP3 PAYAKUMBUH"] : filterList}
                    onDetailClick={(ulp, isCctv) => handleDetailClick('PO', ulp, true, isCctv)}
                    title={isUpSumbar ? "TOTAL PO PER UP3" : "TOTAL PO PER ULP"}
                  />
                </div>
              </div>
            ) : activeTab === 'ANOMALI' ? (
              <AnomaliPage 
                data={filteredData?.anomali || data.anomali} 
                selectedUp3={selectedUp3} 
                ulpToUp3Map={ulpToUp3Map} 
              />
            ) : activeTab === 'OVER_SLA' ? (
              <OverSLAPage 
                data={filteredData?.overSla || data.overSla} 
                onDetailClick={handleOverSLADetailClick}
              />
            ) : activeTab === 'RATING' ? (
              <RatingPage 
                data={filteredData || data} 
                selectedUp3={selectedUp3} 
                ulpToUp3Map={ulpToUp3Map} 
                isUpSumbar={isUpSumbar}
              />
            ) : activeTab === 'YANTEK_OPTIMITATION' ? (
              <YantekOptimitationPage 
                data={filteredData || data} 
                onDetailClick={handleDetailClick}
                selectedMonth={selectedMonth}
                globalSelectedUlp={selectedUlp}
                selectedUp3={selectedUp3}
              />
            ) : (
              <AdminPage anomaliList={data.anomali.anomaliList} vccData={data.vccData} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <DetailModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        headers={modalHeaders}
        rows={modalRows}
      />

      <footer className="bg-white border-t border-gray-100 p-4 text-center">
        <p className="text-[10px] font-black text-gray-300 tracking-[0.5em] uppercase">
          © 2026 PLN ELECTRICITY SERVICES • REGIONAL SUMATERA BARAT • UL BUKITTINGGI
        </p>
      </footer>
    </div>
  );
}

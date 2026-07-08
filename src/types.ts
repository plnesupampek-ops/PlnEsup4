export interface CCTVUsage {
  no: number;
  namaPetugas: string;
  ulp: string;
  jumlahWoTotal: number;
  totalWoPakaiCctv: number;
  persenWo: string;
  jumlahPoTotal: number;
  totalPoPakaiCctv: number;
  persenPo: string;
  persenPenggunaanCctv: string;
}

export interface DashboardData {
  officerPerformance: OfficerPerformance[];
  ulpPerformance: ULPPerformance[];
  cctvUsage: CCTVUsage[];
  summary: {
    totalBaca: number;
    totalValid: number;
    tidakValid: number;
    totalPo: number;
    totalPoCctv: number;
    distinctTotalWo?: number;
    distinctTotalWoCctv?: number;
    distinctTotalPo?: number;
    distinctTotalPoCctv?: number;
    lastSync: string;
    dataAktif: number;
    totalWo: number;
    latestWoDate: string;
    totalCctv: number;
    latestCctvDate: string;
    latestPoDate: string;
    totalAnomali: number;
    latestAnomaliDate: string;
  };
  allUlps: string[];
  allPoskos: string[];
  up3List?: string[];
  up3ToUlps?: { [up3: string]: string[] };
  overSla: OverSLAData;
  rating: RatingData;
  anomali: AnomaliData;
  vccData?: any[][];
  rawWoRows: any[][];
  rawPoRows: any[][];
  distinctWoRows: any[][];
  distinctPoRows: any[][];
  woHeaders: string[];
  poHeaders: string[];
  woIndices: { up3: number; name: number; ulp: number; cctv: number; tglLapor: number; tglPengerjaan: number; tglSelesai: number; source: number; reporter: number; shift: number; rpt: number; rct: number };
  poIndices: { up3: number; name: number; ulp: number; cctv: number };
}

export interface AnomaliData {
  totalAnomali: number;
  chronologyAnomalies: number;
  missingCheckInOut: number;
  extremeDuration: number;
  missingOfficer: number;
  anomaliList: any[][]; // Table row structure: [No Laporan, Tgl Laporan, Nama Petugas, ULP, Jenis Anomali, Deskripsi, RPT, RCT]
  ulpDistribution: { name: string; value: number }[];
  typeDistribution: { name: string; value: number }[];
  officerDistribution: { name: string; count: number }[];
}

export interface OverSLAData {
  totalGangguan: number;
  highestRpt: number;
  highestRct: number;
  countRptOver30: number;
  countRptOver45: number;
  avgRpt: number;
  avgRct: number;
  woOverSlaRptList: any[][]; // Table data: No Laporan, Tgl Lapor, Nama Petugas, RPT, RCT
  shiftDistribution: { name: string; value: number }[];
  officerOverSlaRpt: { name: string; count: number }[];
  officerOverSlaRct: { name: string; count: number }[];
  ulpDistribution: { name: string; value: number }[];
}

export interface RatingData {
  officerRatings: OfficerRating[];
  summary: {
    avgRating: number;
    totalFeedback: number;
  };
  totalWoPlnMobile: number;
  rating5: number;
  rating34: number;
  rating12: number;
  noRating: number;
  totalWoPlnMobileList: any[][];
  rating5List: any[][];
  rating34List: any[][];
  rating12List: any[][];
  noRatingList: any[][];
  kpRatings: KPRating[];
  ulpRatings: ULPRating[];
}

export interface ULPRating {
  namaUlp: string;
  totalWoPlnMobile: number;
  rating5: number;
  rating34: number;
  rating12: number;
  noRating: number;
  percentageKomulatif: string;
}

export interface KPRating {
  namaKp: string;
  ulp: string;
  regu: string;
  totalWoPlnMobile: number;
  rating5: number;
  rating34: number;
  rating12: number;
  noRating: number;
  percentageKomulatif: string;
}

export interface OfficerRating {
  name: string;
  ulp: string;
  regu: string;
  totalWoPlnMobile: number;
  rating5: number;
  rating34: number;
  rating12: number;
  noRating: number;
  percentageKomulatif: string;
}

export interface OfficerPerformance {
  name: string;
  ulp: string;
  jumlahWoTotal: number;
  totalWoPakaiCctv: number;
  persenWo: string;
  jumlahPoTotal: number;
  totalPoPakaiCctv: number;
  persenPo: string;
}

export interface ULPPerformance {
  ulp: string;
  jumlahWoTotal: number;
  totalWoPakaiCctv: number;
  persenWo: string;
  jumlahPoTotal: number;
  totalPoPakaiCctv: number;
  persenPo: string;
  persenPenggunaanCctv: string;
}

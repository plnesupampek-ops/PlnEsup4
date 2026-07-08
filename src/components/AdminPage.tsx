import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Camera, 
  Upload, 
  Trash2, 
  Settings2, 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle, 
  Search, 
  Building2, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  RefreshCw,
  LogOut,
  Info,
  Copy,
  Check,
  Edit,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleSheetsService } from '../services/googleSheetsService';

interface AdminPageProps {
  anomaliList: any[][]; // Table row structure: [No Laporan, Tgl Laporan, Nama Petugas, ULP, Jenis Anomali, Deskripsi, RPT, RCT]
  vccData?: any[][];
}

export interface EvidenUpload {
  fotoEviden1?: string;
  fotoEviden2?: string;
  uploadedAt1?: string;
  uploadedAt2?: string;
  fileName1?: string;
  fileName2?: string;
}

export type EvidenMap = { [noTugas: string]: EvidenUpload };

// Compress images tool to avoid Supabase "object exceeded maximum allowed size" and "Payload Too Large" problems
const compressImage = (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.75): Promise<{ base64: string; blob: Blob }> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result as string, blob: file });
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve({ base64: reader.result as string, blob: file });
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const base64 = canvas.toDataURL('image/jpeg', quality);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ base64, blob });
        } else {
          resolve({ base64, blob: file });
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = (err) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result as string, blob: file });
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    };
  });
};

export const AdminPage: React.FC<AdminPageProps> = ({ anomaliList = [], vccData = [] }) => {
  // Authentication states
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // GAS Web App configuration
  const [gasUrl, setGasUrl] = useState('');
  const [folderId, setFolderId] = useState('1NvIw5QLalD-eK1u7Hv6vhW5PS0JWjwK2');
  const [spreadsheetId, setSpreadsheetId] = useState('1UUxU8soJuTeB_kMk0XFqHY8UaPcISnWto9MOp960-mo');
  const [uploadMethod, setUploadMethod] = useState<'server' | 'gdrive'>('gdrive');
  const [showSettings, setShowSettings] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Supabase direct configuration for Cloudflare client fallback
  const [supabaseUrl, setSupabaseUrl] = useState('https://bicyhoavntfuwaesqwwf.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseBucket, setSupabaseBucket] = useState('EVIDEN');

  // Connection diagnostics states
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

  // Eviden data state (loaded from localStorage)
  const [evidenMap, setEvidenMap] = useState<EvidenMap>({});

  // Table search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [adminSubTab, setAdminSubTab] = useState<'ANOMALI' | 'TINDAK_LANJUT' | 'SETTING'>('ANOMALI');

  // New master settings states
  const [petugasList, setPetugasList] = useState<any[][]>([]);
  const [reguCctvList, setReguCctvList] = useState<any[][]>([]);
  const [ulpList, setUlpList] = useState<any[][]>([]);
  const [up3List, setUp3List] = useState<any[][]>([]);
  const [poskoList, setPoskoList] = useState<any[][]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Forms
  const [newPetugasName, setNewPetugasName] = useState('');
  const [newPetugasUlpId, setNewPetugasUlpId] = useState('');
  const [addingPetugas, setAddingPetugas] = useState(false);

  const [newReguCctvName, setNewReguCctvName] = useState('');
  const [newReguCctvUp3Id, setNewReguCctvUp3Id] = useState('');
  const [newReguCctvPoskoId, setNewReguCctvPoskoId] = useState('');
  const [addingReguCctv, setAddingReguCctv] = useState(false);

  // Editing states
  const [editingPetugasId, setEditingPetugasId] = useState<string | null>(null);
  const [editPetugasName, setEditPetugasName] = useState('');
  const [editPetugasUlpId, setEditPetugasUlpId] = useState('');
  const [savingPetugasId, setSavingPetugasId] = useState<string | null>(null);

  const [editingReguId, setEditingReguId] = useState<string | null>(null);
  const [editReguName, setEditReguName] = useState('');
  const [editReguUp3Id, setEditReguUp3Id] = useState('');
  const [editReguPoskoId, setEditReguPoskoId] = useState('');
  const [savingReguId, setSavingReguId] = useState<string | null>(null);

  // Filter searches
  const [settingPetugasSearch, setSettingPetugasSearch] = useState('');
  const [settingReguSearch, setSettingReguSearch] = useState('');

  // Confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'petugas' | 'regu_cctv';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'petugas', id: '', name: '' });

  // Toggle sections
  const [showAddPetugasForm, setShowAddPetugasForm] = useState(false);
  const [showAddReguForm, setShowAddReguForm] = useState(false);

  const loadSettingsData = async () => {
    setLoadingSettings(true);
    setSettingsError(null);
    try {
      const [rawPetugas, rawReguCctv, rawUlp, rawUp3, rawPosko] = await Promise.all([
        GoogleSheetsService.fetchSheetDataRaw("PETUGAS").catch(() => [] as any[][]),
        GoogleSheetsService.fetchSheetDataRaw("REGU-CCTV").catch(() => [] as any[][]),
        GoogleSheetsService.fetchSheetDataRaw("ULP").catch(() => [] as any[][]),
        GoogleSheetsService.fetchSheetDataRaw("UP3").catch(() => [] as any[][]),
        GoogleSheetsService.fetchSheetDataRaw("POSKO").catch(() => [] as any[][])
      ]);

      let finalPetugas = rawPetugas;
      if (finalPetugas.length <= 1) {
        const stored = localStorage.getItem('local_petugas');
        if (stored) {
          finalPetugas = JSON.parse(stored);
        } else {
          finalPetugas = [
            ["id", "name", "ulpId"],
            ["k1", "13226_AZWARDI", "BKT6"],
            ["k2", "13226_BOBI HERMANTO", "BKT6"],
            ["k3", "13226_BOBY ADIQ MUTYA", "BKT6"],
            ["k4", "13226_MAKMUR RIDWAN", "BKT6"],
            ["k5", "13226_EDY JUNAIDI", "BKT6"],
            ["k6", "13226_REDI SATRIA", "BKT1"],
            ["k7", "13226_RIKO PUTRA", "BKT1"],
            ["k8", "13226_SYAHRIAL", "BKT2"],
            ["k9", "13226_ZULHELMID", "BKT2"]
          ];
          localStorage.setItem('local_petugas', JSON.stringify(finalPetugas));
        }
      } else {
        localStorage.setItem('local_petugas', JSON.stringify(finalPetugas));
      }

      let finalRegu = rawReguCctv;
      if (finalRegu.length <= 1) {
        const stored = localStorage.getItem('local_regu_cctv');
        if (stored) {
          finalRegu = JSON.parse(stored);
        } else {
          finalRegu = [
            ["id", "name", "up3Id"],
            ["RC1", "LUBUK SIKAPING", "UP03"],
            ["RC2", "BUKITTINGGI", "UP03"],
            ["RC3", "BASO", "UP03"],
            ["RC4", "LUBUK BASUNG", "UP03"],
            ["RC5", "KOTOTUO", "UP03"]
          ];
          localStorage.setItem('local_regu_cctv', JSON.stringify(finalRegu));
        }
      } else {
        localStorage.setItem('local_regu_cctv', JSON.stringify(finalRegu));
      }

      setPetugasList(finalPetugas);
      setReguCctvList(finalRegu);
      
      let finalUlp = rawUlp;
      if (finalUlp.length <= 1) {
        finalUlp = [
          ["id", "name", "poskoId"],
          ["BKT1", "BUKITTINGGI", "PBK01"],
          ["BKT2", "PADANG PANJANG", "PBK02"],
          ["BKT3", "LUBUK SIKAPING", "PBK03"],
          ["BKT4", "LUBUK BASUNG", "PBK04"],
          ["BKT5", "SIMPANG EMPAT", "PBK05"],
          ["BKT6", "BASO", "PBK06"],
          ["BKT7", "KOTO TUO", "PBK07"]
        ];
      }
      setUlpList(finalUlp);

      let finalUp3 = rawUp3;
      if (finalUp3.length <= 1) {
        finalUp3 = [
          ["id", "name"],
          ["UP01", "UP3 PADANG"],
          ["UP02", "UP3 SOLOK"],
          ["UP03", "UP3 BUKITTINGGI"],
          ["UP04", "UP3 PAYAKUMBUH"]
        ];
      }
      setUp3List(finalUp3);

      let finalPosko = rawPosko;
      if (finalPosko.length <= 1) {
        finalPosko = [
          ["id", "name", "up3Id"],
          ["PBK01", "POSKO ULP BUKITTINGGI", "UP03"],
          ["PBK02", "POSKO ULP PADANG PANJANG", "UP03"],
          ["PBK03", "POSKO ULP LUBUK SIKAPING", "UP03"],
          ["PBK04", "POSKO ULP LUBUK BASUNG", "UP03"],
          ["PBK05", "POSKO ULP SIMPANG EMPAT", "UP03"],
          ["PBK06", "POSKO ULP BASO", "UP03"],
          ["PBK07", "POSKO ULP KOTO TUO", "UP03"]
        ];
      }
      setPoskoList(finalPosko);

      if (finalUlp.length > 1) {
        setNewPetugasUlpId(finalUlp[1][0]);
      }
      if (finalUp3.length > 1) {
        setNewReguCctvUp3Id(finalUp3[1][0]);
      }
      if (finalPosko.length > 1) {
        setNewReguCctvPoskoId(finalPosko[1][0]);
      }

    } catch (e: any) {
      console.error("Gagal memuat data pengaturan", e);
      setSettingsError("Gagal mengambil data master dari Google Sheets.");
      
      const storedPetugas = localStorage.getItem('local_petugas');
      const storedRegu = localStorage.getItem('local_regu_cctv');
      
      if (storedPetugas) setPetugasList(JSON.parse(storedPetugas));
      if (storedRegu) setReguCctvList(JSON.parse(storedRegu));
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && adminSubTab === 'SETTING') {
      loadSettingsData();
    }
  }, [isAuthenticated, adminSubTab]);

  const handleAddPetugas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPetugasName.trim() || !newPetugasUlpId) return;

    setAddingPetugas(true);
    const petugasName = newPetugasName.trim().toUpperCase();
    
    try {
      let isSynced = false;
      let nextId = "k" + (petugasList.length > 0 ? petugasList.length : 1);

      if (petugasList.length > 1) {
        const lastRow = petugasList[petugasList.length - 1];
        const lastIdVal = String(lastRow[0]).trim();
        if (lastIdVal.startsWith("k")) {
          const numeric = parseInt(lastIdVal.split("_")[0].substring(1), 10);
          if (!isNaN(numeric)) {
            nextId = "k" + (numeric + 1);
          }
        }
      }

      if (gasUrl) {
        const proxyUrl = `/api/gas-proxy?gasUrl=${encodeURIComponent(gasUrl.trim())}`;
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'add_petugas',
            name: petugasName,
            ulpId: newPetugasUlpId,
            spreadsheetId: spreadsheetId
          })
        });

        if (response.ok) {
          const resText = await response.text();
          const resData = JSON.parse(resText);
          if (resData.success) {
            isSynced = true;
            if (resData.addedRow && resData.addedRow[0]) {
              nextId = resData.addedRow[0];
            }
          } else {
            throw new Error(resData.error || "Gagal sinkronisasi ke spreadsheet.");
          }
        } else {
          throw new Error("Proxy error: " + response.statusText);
        }
      }

      const updatedList = [...petugasList, [nextId, petugasName, newPetugasUlpId]];
      setPetugasList(updatedList);
      localStorage.setItem('local_petugas', JSON.stringify(updatedList));
      setNewPetugasName('');
      setShowAddPetugasForm(false);

      if (isSynced) {
        alert(`Sukses! Petugas '${petugasName}' berhasil ditambahkan dan disinkronisasi ke Google Sheets.`);
      } else {
        alert(`Sukses! Petugas '${petugasName}' ditambahkan secara lokal. (Belum sinkron ke Google Sheets karena Web App URL kosong / bermasalah).`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error menambahkan petugas: ${err.message || err}`);
    } finally {
      setAddingPetugas(false);
    }
  };

  const handleDeletePetugas = async (idToDelete: string, name: string) => {
    try {
      let isSynced = false;
      if (gasUrl) {
        const proxyUrl = `/api/gas-proxy?gasUrl=${encodeURIComponent(gasUrl.trim())}`;
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'delete_petugas',
            id: idToDelete,
            spreadsheetId: spreadsheetId
          })
        });

        if (response.ok) {
          const resText = await response.text();
          const resData = JSON.parse(resText);
          if (resData.success) {
            isSynced = true;
          } else {
            throw new Error(resData.error || "Gagal menghapus dari spreadsheet.");
          }
        } else {
          throw new Error("Proxy error: " + response.statusText);
        }
      }

      const updatedList = petugasList.filter(row => String(row[0]).trim() !== idToDelete.trim());
      setPetugasList(updatedList);
      localStorage.setItem('local_petugas', JSON.stringify(updatedList));

      if (isSynced) {
        alert(`Sukses! Petugas '${name}' (ID: ${idToDelete}) berhasil dihapus dari Google Sheets.`);
      } else {
        alert(`Sukses! Petugas '${name}' (ID: ${idToDelete}) dihapus secara lokal.`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error menghapus petugas: ${err.message || err}`);
    }
  };

  const handleAddReguCctv = async (e: React.FormEvent) => {
    e.preventDefault();
    const poskoIdToUse = newReguCctvPoskoId || newReguCctvUp3Id;
    if (!newReguCctvName.trim() || !poskoIdToUse) return;

    setAddingReguCctv(true);
    const reguName = newReguCctvName.trim().toUpperCase();
    
    try {
      let isSynced = false;
      let nextId = "RC" + (reguCctvList.length > 0 ? reguCctvList.length : 1);

      if (reguCctvList.length > 1) {
        const lastRow = reguCctvList[reguCctvList.length - 1];
        const lastIdVal = String(lastRow[0]).trim();
        if (lastIdVal.startsWith("RC")) {
          const numeric = parseInt(lastIdVal.substring(2), 10);
          if (!isNaN(numeric)) {
            nextId = "RC" + (numeric + 1);
          }
        }
      }

      if (gasUrl) {
        const proxyUrl = `/api/gas-proxy?gasUrl=${encodeURIComponent(gasUrl.trim())}`;
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'add_regu_cctv',
            name: reguName,
            up3Id: poskoIdToUse,
            spreadsheetId: spreadsheetId
          })
        });

        if (response.ok) {
          const resText = await response.text();
          const resData = JSON.parse(resText);
          if (resData.success) {
            isSynced = true;
            if (resData.addedRow && resData.addedRow[0]) {
              nextId = resData.addedRow[0];
            }
          } else {
            throw new Error(resData.error || "Gagal sinkronisasi ke spreadsheet.");
          }
        } else {
          throw new Error("Proxy error: " + response.statusText);
        }
      }

      const updatedList = [...reguCctvList, [nextId, reguName, poskoIdToUse]];
      setReguCctvList(updatedList);
      localStorage.setItem('local_regu_cctv', JSON.stringify(updatedList));
      setNewReguCctvName('');
      setShowAddReguForm(false);

      if (isSynced) {
        alert(`Sukses! Regu CCTV '${reguName}' berhasil ditambahkan dan disinkronisasi ke Google Sheets.`);
      } else {
        alert(`Sukses! Regu CCTV '${reguName}' ditambahkan secara lokal.`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error menambahkan regu CCTV: ${err.message || err}`);
    } finally {
      setAddingReguCctv(false);
    }
  };

  const handleDeleteReguCctv = async (idToDelete: string, name: string) => {
    try {
      let isSynced = false;
      if (gasUrl) {
        const proxyUrl = `/api/gas-proxy?gasUrl=${encodeURIComponent(gasUrl.trim())}`;
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'delete_regu_cctv',
            id: idToDelete,
            spreadsheetId: spreadsheetId
          })
        });

        if (response.ok) {
          const resText = await response.text();
          const resData = JSON.parse(resText);
          if (resData.success) {
            isSynced = true;
          } else {
            throw new Error(resData.error || "Gagal menghapus dari spreadsheet.");
          }
        } else {
          throw new Error("Proxy error: " + response.statusText);
        }
      }

      const updatedList = reguCctvList.filter(row => String(row[0]).trim() !== idToDelete.trim());
      setReguCctvList(updatedList);
      localStorage.setItem('local_regu_cctv', JSON.stringify(updatedList));

      if (isSynced) {
        alert(`Sukses! Regu CCTV '${name}' (ID: ${idToDelete}) berhasil dihapus dari Google Sheets.`);
      } else {
        alert(`Sukses! Regu CCTV '${name}' (ID: ${idToDelete}) dihapus secara lokal.`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error menghapus regu CCTV: ${err.message || err}`);
    }
  };

  const handleEditPetugas = async (id: string) => {
    if (!editPetugasName.trim() || !editPetugasUlpId) return;
    setSavingPetugasId(id);
    const updatedName = editPetugasName.trim().toUpperCase();
    
    try {
      let isSynced = false;
      if (gasUrl) {
        const proxyUrl = `/api/gas-proxy?gasUrl=${encodeURIComponent(gasUrl.trim())}`;
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'edit_petugas',
            id: id,
            name: updatedName,
            ulpId: editPetugasUlpId,
            spreadsheetId: spreadsheetId
          })
        });

        if (response.ok) {
          const resText = await response.text();
          const resData = JSON.parse(resText);
          if (resData.success) {
            isSynced = true;
          } else {
            throw new Error(resData.error || "Gagal mengupdate data di spreadsheet.");
          }
        } else {
          throw new Error("Proxy error: " + response.statusText);
        }
      }

      const updatedList = petugasList.map(row => {
        if (String(row[0]).trim() === id.trim()) {
          return [row[0], updatedName, editPetugasUlpId];
        }
        return row;
      });
      setPetugasList(updatedList);
      localStorage.setItem('local_petugas', JSON.stringify(updatedList));

      setEditingPetugasId(null);
      if (isSynced) {
        alert(`Sukses! Data Petugas berhasil diperbarui dan disinkronisasi ke Google Sheets.`);
      } else {
        alert(`Sukses! Data Petugas berhasil diperbarui secara lokal.`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error memperbarui petugas: ${err.message || err}`);
    } finally {
      setSavingPetugasId(null);
    }
  };

  const handleEditReguCctv = async (id: string) => {
    const poskoIdToUse = editReguPoskoId || editReguUp3Id;
    if (!editReguName.trim() || !poskoIdToUse) return;
    setSavingReguId(id);
    const updatedName = editReguName.trim().toUpperCase();

    try {
      let isSynced = false;
      if (gasUrl) {
        const proxyUrl = `/api/gas-proxy?gasUrl=${encodeURIComponent(gasUrl.trim())}`;
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'edit_regu_cctv',
            id: id,
            name: updatedName,
            up3Id: poskoIdToUse,
            spreadsheetId: spreadsheetId
          })
        });

        if (response.ok) {
          const resText = await response.text();
          const resData = JSON.parse(resText);
          if (resData.success) {
            isSynced = true;
          } else {
            throw new Error(resData.error || "Gagal mengupdate data di spreadsheet.");
          }
        } else {
          throw new Error("Proxy error: " + response.statusText);
        }
      }

      const updatedList = reguCctvList.map(row => {
        if (String(row[0]).trim() === id.trim()) {
          return [row[0], updatedName, poskoIdToUse];
        }
        return row;
      });
      setReguCctvList(updatedList);
      localStorage.setItem('local_regu_cctv', JSON.stringify(updatedList));

      setEditingReguId(null);
      if (isSynced) {
        alert(`Sukses! Data Regu CCTV berhasil diperbarui dan disinkronisasi ke Google Sheets.`);
      } else {
        alert(`Sukses! Data Regu CCTV berhasil diperbarui secara lokal.`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error memperbarui regu CCTV: ${err.message || err}`);
    } finally {
      setSavingReguId(null);
    }
  };

  // Active uploading states
  const [uploadingState, setUploadingState] = useState<{ [key: string]: boolean }>({});
  const [uploadMessage, setUploadMessage] = useState<{ [key: string]: { type: 'success' | 'error', text: string } }>({});

  const folderUrl = `https://drive.google.com/drive/folders/${folderId || '1NvIw5QLalD-eK1u7Hv6vhW5PS0JWjwK2'}?usp=sharing`;

  // Load auth state on init (using sessionStorage so it expires on tab close)
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('admin_authenticated');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }

    // Load GAS configurations from localStorage
    const savedGasUrl = localStorage.getItem('gas_web_app_url');
    if (savedGasUrl) {
      setGasUrl(savedGasUrl);
    }
    const savedFolderId = localStorage.getItem('gdrive_folder_id');
    if (savedFolderId) {
      setFolderId(savedFolderId);
    }
    const savedSpreadsheetId = localStorage.getItem('google_spreadsheet_id');
    if (savedSpreadsheetId) {
      setSpreadsheetId(savedSpreadsheetId);
    }
    const savedMethod = localStorage.getItem('upload_method') || 'gdrive';
    setUploadMethod(savedMethod as 'server' | 'gdrive');

    // Load Supabase Client-side Settings
    const metaEnv = (import.meta as any).env || {};
    const savedSupabaseUrl = localStorage.getItem('client_supabase_url') || metaEnv.VITE_SUPABASE_URL || 'https://bicyhoavntfuwaesqwwf.supabase.co';
    setSupabaseUrl(savedSupabaseUrl);

    const savedSupabaseKey = localStorage.getItem('client_supabase_key') || metaEnv.VITE_SUPABASE_KEY || '';
    setSupabaseKey(savedSupabaseKey);

    const savedSupabaseBucket = localStorage.getItem('client_supabase_bucket') || metaEnv.VITE_SUPABASE_BUCKET || 'EVIDEN';
    setSupabaseBucket(savedSupabaseBucket);

    // Load Eviden mappings
    const savedEviden = localStorage.getItem('anomali_evidens');
    if (savedEviden) {
      try {
        setEvidenMap(JSON.parse(savedEviden));
      } catch (e) {
        console.error("Gagal membaca anomali_evidens dari localStorage", e);
      }
    }
  }, []);

  // Save eviden map helper
  const saveEvidenMap = (newMap: EvidenMap) => {
    setEvidenMap(newMap);
    localStorage.setItem('anomali_evidens', JSON.stringify(newMap));
    
    // Dispatch custom event to notify AnomaliPage
    window.dispatchEvent(new Event('anomali_evidens_updated'));
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'ADMIND') {
      setIsAuthenticated(true);
      setAuthError('');
      sessionStorage.setItem('admin_authenticated', 'true');
    } else {
      setAuthError('Password salah! Coba lagi.');
      setPassword('');
      // Autoclear error after 3s
      setTimeout(() => setAuthError(''), 3000);
    }
  };

  const filteredPetugas = useMemo(() => {
    const rows = petugasList.length > 0 ? petugasList.slice(1) : [];
    return rows.filter(row => {
      const id = String(row[0] || '').toLowerCase();
      const name = String(row[1] || '').toLowerCase();
      const ulpId = String(row[2] || '').toLowerCase();
      
      const ulpRow = ulpList.find(r => String(r[0]).trim() === String(row[2]).trim());
      const ulpName = ulpRow ? String(ulpRow[1]).toLowerCase() : '';

      const search = settingPetugasSearch.toLowerCase().trim();
      return !search || id.includes(search) || name.includes(search) || ulpId.includes(search) || ulpName.includes(search);
    });
  }, [petugasList, settingPetugasSearch, ulpList]);

  const getPoskoName = (row: any[]) => {
    const poskoId = String(row[2] || '').trim();
    const foundPosko = poskoList.find(p => String(p[0]).trim() === poskoId);
    if (foundPosko) {
      return foundPosko[1];
    }

    // Fallback based on name matching
    const reguName = String(row[1] || '').toUpperCase().trim();
    if (reguName.includes("LUBUK SIKAPING")) return "POSKO ULP LUBUK SIKAPING";
    if (reguName.includes("BUKITTINGGI")) return "POSKO ULP BUKITTINGGI";
    if (reguName.includes("BASO")) return "POSKO ULP BASO";
    if (reguName.includes("LUBUK BASUNG")) return "POSKO ULP LUBUK BASUNG";
    if (reguName.includes("KOTO TUO") || reguName.includes("KOTOTUO")) return "POSKO ULP KOTO TUO";
    if (reguName.includes("PADANG PANJANG")) return "POSKO ULP PADANG PANJANG";
    if (reguName.includes("SIMPANG EMPAT")) return "POSKO ULP SIMPANG EMPAT";

    const up3Row = up3List.find(r => String(r[0]).trim() === poskoId);
    if (up3Row) {
      return up3Row[1];
    }

    return poskoId || "-";
  };

  const filteredReguCctv = useMemo(() => {
    const rows = reguCctvList.length > 0 ? reguCctvList.slice(1) : [];
    return rows.filter(row => {
      const id = String(row[0] || '').toLowerCase();
      const name = String(row[1] || '').toLowerCase();
      const poskoId = String(row[2] || '').toLowerCase();

      const poskoName = getPoskoName(row).toLowerCase();

      const search = settingReguSearch.toLowerCase().trim();
      return !search || id.includes(search) || name.includes(search) || poskoId.includes(search) || poskoName.includes(search);
    });
  }, [reguCctvList, settingReguSearch, poskoList, up3List]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
    setPassword('');
  };

  const [showSupabaseKey, setShowSupabaseKey] = useState(false);

  // Connections saving handler
  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('client_supabase_url', supabaseUrl.trim());
    localStorage.setItem('client_supabase_key', supabaseKey.trim());
    localStorage.setItem('client_supabase_bucket', supabaseBucket.trim());
    alert('Konfigurasi koneksi Supabase (client-side) berhasil disimpan!');
    setShowSettings(false);
  };

  const handleResetSupabaseConfig = () => {
    localStorage.removeItem('client_supabase_url');
    localStorage.removeItem('client_supabase_key');
    localStorage.removeItem('client_supabase_bucket');
    setSupabaseUrl('https://bicyhoavntfuwaesqwwf.supabase.co');
    setSupabaseKey('');
    setSupabaseBucket('EVIDEN');
    alert('Konfigurasi koneksi Supabase direset ke setelan awal!');
  };

  // Save GAS config
  const handleSaveGasConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gas_web_app_url', gasUrl);
    localStorage.setItem('gdrive_folder_id', folderId);
    localStorage.setItem('google_spreadsheet_id', spreadsheetId);
    localStorage.setItem('upload_method', uploadMethod);
    setShowSettings(false);
  };

  // Reset GAS config
  const handleResetGasConfig = () => {
    setGasUrl('');
    setFolderId('1NvIw5QLalD-eK1u7Hv6vhW5PS0JWjwK2');
    setSpreadsheetId('1UUxU8soJuTeB_kMk0XFqHY8UaPcISnWto9MOp960-mo');
    setUploadMethod('server');
    setTestResult(null);
    localStorage.removeItem('gas_web_app_url');
    localStorage.removeItem('gdrive_folder_id');
    localStorage.removeItem('google_spreadsheet_id');
    localStorage.removeItem('upload_method');
  };

  // Test connection to Google Apps Script URL
  const handleTestConnection = async () => {
    if (!gasUrl) {
      setTestResult({ type: 'error', text: 'Masukkan Web App URL terlebih dahulu!' });
      return;
    }
    
    setTestingConnection(true);
    setTestResult(null);
    
    try {
      const urlLower = gasUrl.toLowerCase().trim();
      if (urlLower.includes('drive.google.com')) {
        throw new Error('URL yang dimasukkan adalah link Google Drive Folder, bukan URL Web App Google Apps Script hasil deploy.');
      }
      if (urlLower.includes('/edit') && !urlLower.includes('/exec')) {
        throw new Error('URL yang dimasukkan adalah link Google Apps Script Editor. Anda harus melakukan Deploy -> New Deployment sebagai Web App dan menyalin URL hasil deploy yang berakhiran "/exec".');
      }
      if (!urlLower.startsWith('https://script.google.com/')) {
        throw new Error('URL Web App tidak valid. Harus diawali dengan "https://script.google.com/macros/s/.../exec".');
      }

      // We send a ping packet through our backend proxy to bypass browser-level CORS/redirect blocks
      const proxyUrl = `/api/gas-proxy?gasUrl=${encodeURIComponent(gasUrl.trim())}`;
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: 'ping' })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} (${response.statusText})`);
      }

      const responseText = await response.text();
      let resData: any;
      try {
        resData = JSON.parse(responseText);
      } catch (err) {
        const lowerRes = responseText.toLowerCase();
        if (lowerRes.includes('permission') || lowerRes.includes('driveapp') || lowerRes.includes('auth/drive') || lowerRes.includes('authorization') || lowerRes.includes('exception')) {
          throw new Error('Google Apps Script Anda mendeteksi error izin (Google Drive / Spreadsheet). Anda wajib mengizinkan akses (otorisasi) terlebih dahulu di dalam editor Apps Script Anda.\n\nSOLUSI CARA OTORISASI:\n1. Buka editor Google Apps Script Anda.\n2. Di bar dropdown toolbar atas editor, ubah pilihan fungsi dari "doPost" menjadi "otorisasiIzinDrive".\n3. Klik tombol "Run" atau "Jalankan" di sebelahnya.\n4. Klik tombol "Review Permissions" atau "Tinjau Izin" pada popup yang muncul.\n5. Pilih akun Google Anda.\n6. Klik tulisan kecil "Advanced" atau "Lanjutan" di bagian bawah kiri.\n7. Klik "Go to Untitled project (unsafe)" atau "Buka Untitled project (tidak aman)".\n8. Klik tombol "Allow" atau "Izinkan" untuk mematangkan akses.\n9. Langkah Terakhir: Wajib DEPLOY ULANG sebagai Web App (Klik "Deploy" -> "New Deployment" -> setel "Who has access" ke "Anyone") lalu salin URL Web App ("/exec") yang baru ke kolom input di atas!');
        }
        
        if (lowerRes.includes('google accounts') || lowerRes.includes('login') || lowerRes.includes('sign in')) {
          throw new Error('Web App meminta otorisasi login akun Google. Hal ini terjadi karena Anda lupa mengatur opsi "Who has access" (Siapa yang memiliki akses) ke "Anyone" (Siapa Saja) sewaktu melakukan Deploy Web App.\n\nSOLUSI:\nBuka kembali editor Apps Script Anda, klik tombol Deploy -> New Deployment (atau Manage Deployments -> Edit), pastikan di bagian bawah pada opsi "Who has access" disetel ke "Anyone" (Siapa Saja). Klik tombol Deploy/Update dan salin kembali URL "/exec" baru yang diterbitkan.');
        }

        throw new Error(`Respons dari Web App Google Apps Script bukan format JSON. Silakan periksa kembali apakah URL Web App yang Anda masukkan sudah benar dan di-deploy dengan benar.\n\nDetail respons: ${responseText.substring(0, 500)}`);
      }
      
      if (resData.success) {
        setTestResult({
          type: 'success',
          text: resData.message || 'KONEKSI SUKSES! Web App Anda berhasil terhubung dengan Google Drive dan siap digunakan.'
        });
      } else if (resData.error && (resData.error.includes('DriveApp') || resData.error.includes('permission') || resData.error.includes('createFile') || resData.error.includes('tidak memiliki izin'))) {
        setTestResult({
          type: 'warning',
          text: `TERHUBUNG DENGAN CATATAN: Web App terkoneksi, tetapi Google Drive belum diotorisasi. Error: ${resData.error}. Solusi: Buka editor Apps Script Anda, pilih fungsi "otorisasiIzinDrive" di dropdown atas lalu klik Run/Jalankan.`
        });
      } else if (resData.error && resData.error.includes('substring')) {
        // Old deployed script version without action handling, but CORS and route are working!
        setTestResult({
          type: 'success',
          text: 'KONEKSI SUKSES UNTUK VERSI SEBELUMNYA! Web App Anda menyambung dengan baik. (Disarankan salin CODETEMPLATE.gs terbaru di panel sebelah kanan untuk mendapatkan pembaruan fungsi ping jika ingin fitur PING yang diperbarui).'
        });
      } else {
        setTestResult({
          type: 'error',
          text: resData.error || 'Server Apps Script mengembalikan error tidak dikenal.'
        });
      }
    } catch (err: any) {
      console.error("Test connection failure:", err);
      let errorMsg = err.message || 'Koneksi gagal!';
      
      if (err.message === 'Failed to fetch') {
        errorMsg = 'Kors / Jaringan diblokir (Failed to fetch). Pastikan saat Anda melakukan Klik "Deploy -> New Deployment" di Google Apps Script, setel kolom "Who has access" (Siapa yang memiliki akses) menjadi "Anyone" (Siapa Saja) serta status deployment dalam kondisi Aktif.';
      }
      
      setTestResult({
        type: 'error',
        text: 'KONEKSI GAGAL: ' + errorMsg
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Google Apps Script template for the user to copy-paste
  const gasTemplateCode = `function doPost(e) {
  // Jika dijalankan manual di editor Apps Script atau data POST kosong
  if (!e || !e.postData || !e.postData.contents) {
    var errorMsg = "PENTING: Jangan klik tombol 'Run' / 'Debug' langsung di dalam editor Google Apps Script! Fungsi doPost(e) memerlukan parameter event HTTP POST yang dikirim oleh web. Silakan lakukan 'Deploy > New deployment' sebagai Web App, lalu salin URL yang berakhiran '/exec' ke Halaman Admin web.";
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: errorMsg,
      message: errorMsg
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (e.parameter && e.parameter.OPTIONS) {
    return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
  }
  
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Fitur cek koneksi (ping)
    if (data && data.action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "KONEKSI SUKSES! Google Apps Script milik Anda siap menerima file."
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // Spreadsheet ID target yang ditentukan user (bisa dikirim dari web atau fallback ke default)
    var spreadsheetId = data.spreadsheetId || "${spreadsheetId}";

    // Tambah Petugas (Sheet PETUGAS)
    if (data && data.action === 'add_petugas') {
      var ss = SpreadsheetApp.openById(spreadsheetId.trim());
      var sheet = ss.getSheetByName("PETUGAS");
      if (!sheet) {
        throw new Error("Sheet 'PETUGAS' tidak ditemukan di Spreadsheet.");
      }
      var lastRow = sheet.getLastRow();
      
      var nextId = "k1";
      if (lastRow > 1) {
        var lastIdVal = String(sheet.getRange(lastRow, 1).getValue()).trim();
        if (lastIdVal.startsWith("k")) {
          var cleanId = lastIdVal.split("_")[0].substring(1);
          var numeric = parseInt(cleanId, 10);
          if (!isNaN(numeric)) {
            nextId = "k" + (numeric + 1);
          }
        }
      }
      
      var name = data.name || "";
      var ulpId = data.ulpId || "";
      
      sheet.appendRow([nextId, name, ulpId]);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Petugas '" + name + "' berhasil ditambahkan dengan ID " + nextId + "!",
        addedRow: [nextId, name, ulpId]
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Hapus Petugas (Sheet PETUGAS)
    if (data && data.action === 'delete_petugas') {
      var ss = SpreadsheetApp.openById(spreadsheetId.trim());
      var sheet = ss.getSheetByName("PETUGAS");
      if (!sheet) {
        throw new Error("Sheet 'PETUGAS' tidak ditemukan di Spreadsheet.");
      }
      var lastRow = sheet.getLastRow();
      var idToDelete = data.id || "";
      var foundRow = -1;
      
      if (lastRow > 1) {
        var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var r = 0; r < values.length; r++) {
          if (String(values[r][0] || "").trim() === idToDelete.trim()) {
            foundRow = r + 2;
            break;
          }
        }
      }
      
      if (foundRow !== -1) {
        sheet.deleteRow(foundRow);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Petugas dengan ID '" + idToDelete + "' berhasil dihapus!"
        }))
        .setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Petugas dengan ID '" + idToDelete + "' tidak ditemukan.");
      }
    }

    // Edit Petugas (Sheet PETUGAS)
    if (data && data.action === 'edit_petugas') {
      var ss = SpreadsheetApp.openById(spreadsheetId.trim());
      var sheet = ss.getSheetByName("PETUGAS");
      if (!sheet) {
        throw new Error("Sheet 'PETUGAS' tidak ditemukan di Spreadsheet.");
      }
      var lastRow = sheet.getLastRow();
      var idToEdit = data.id || "";
      var newName = data.name || "";
      var newUlpId = data.ulpId || "";
      var foundRow = -1;
      
      if (lastRow > 1) {
        var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var r = 0; r < values.length; r++) {
          if (String(values[r][0] || "").trim() === idToEdit.trim()) {
            foundRow = r + 2;
            break;
          }
        }
      }
      
      if (foundRow !== -1) {
        sheet.getRange(foundRow, 2).setValue(newName);
        sheet.getRange(foundRow, 3).setValue(newUlpId);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Petugas '" + newName + "' berhasil diubah!"
        }))
        .setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Petugas dengan ID '" + idToEdit + "' tidak ditemukan.");
      }
    }
    
    // Tambah Regu CCTV (Sheet REGU-CCTV)
    if (data && data.action === 'add_regu_cctv') {
      var ss = SpreadsheetApp.openById(spreadsheetId.trim());
      var sheet = ss.getSheetByName("REGU-CCTV");
      if (!sheet) {
        throw new Error("Sheet 'REGU-CCTV' tidak ditemukan di Spreadsheet.");
      }
      var lastRow = sheet.getLastRow();
      
      var nextId = "RC1";
      if (lastRow > 1) {
        var lastIdVal = String(sheet.getRange(lastRow, 1).getValue()).trim();
        if (lastIdVal.startsWith("RC")) {
          var cleanId = lastIdVal.substring(2);
          var numeric = parseInt(cleanId, 10);
          if (!isNaN(numeric)) {
            nextId = "RC" + (numeric + 1);
          }
        }
      }
      
      var name = data.name || "";
      var up3Id = data.up3Id || "";
      
      sheet.appendRow([nextId, name, up3Id]);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Regu CCTV '" + name + "' berhasil ditambahkan dengan ID " + nextId + "!",
        addedRow: [nextId, name, up3Id]
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Hapus Regu CCTV (Sheet REGU-CCTV)
    if (data && data.action === 'delete_regu_cctv') {
      var ss = SpreadsheetApp.openById(spreadsheetId.trim());
      var sheet = ss.getSheetByName("REGU-CCTV");
      if (!sheet) {
        throw new Error("Sheet 'REGU-CCTV' tidak ditemukan di Spreadsheet.");
      }
      var lastRow = sheet.getLastRow();
      var idToDelete = data.id || "";
      var foundRow = -1;
      
      if (lastRow > 1) {
        var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var r = 0; r < values.length; r++) {
          if (String(values[r][0] || "").trim() === idToDelete.trim()) {
            foundRow = r + 2;
            break;
          }
        }
      }
      
      if (foundRow !== -1) {
        sheet.deleteRow(foundRow);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Regu CCTV dengan ID '" + idToDelete + "' berhasil dihapus!"
        }))
        .setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Regu CCTV dengan ID '" + idToDelete + "' tidak ditemukan.");
      }
    }

    // Edit Regu CCTV (Sheet REGU-CCTV)
    if (data && data.action === 'edit_regu_cctv') {
      var ss = SpreadsheetApp.openById(spreadsheetId.trim());
      var sheet = ss.getSheetByName("REGU-CCTV");
      if (!sheet) {
        throw new Error("Sheet 'REGU-CCTV' tidak ditemukan di Spreadsheet.");
      }
      var lastRow = sheet.getLastRow();
      var idToEdit = data.id || "";
      var newName = data.name || "";
      var newUp3Id = data.up3Id || "";
      var foundRow = -1;
      
      if (lastRow > 1) {
        var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var r = 0; r < values.length; r++) {
          if (String(values[r][0] || "").trim() === idToEdit.trim()) {
            foundRow = r + 2;
            break;
          }
        }
      }
      
      if (foundRow !== -1) {
        sheet.getRange(foundRow, 2).setValue(newName);
        sheet.getRange(foundRow, 3).setValue(newUp3Id);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Regu CCTV '" + newName + "' berhasil diubah!"
        }))
        .setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Regu CCTV dengan ID '" + idToEdit + "' tidak ditemukan.");
      }
    }
    
    var base64Data = data.base64;
    var fileName = data.fileName;
    var noTugas = data.noTugas || "";
    var evidenIdx = data.evidenIdx || 1; // 1 atau 2
    var resultUrl = data.fileUrl || ""; // Menggunakan URL foto yang sudah disimpan di server jika ada
    var hasFileObject = false;
    var fileUrlResponse = "";
    
    // Folder ID target yang ditentukan user (bisa dikirim dari web atau fallback ke default)
    var folderId = data.folderId || "${folderId}";
    
    // 1. Upload File ke Google Drive HANYA jika link foto belum ada (Metode GDrive Aktif)
    if (!resultUrl && base64Data) {
      var contentType = base64Data.substring(5, base64Data.indexOf(';'));
      var byteCharacters = Utilities.base64Decode(base64Data.split(',')[1]);
      var blob = Utilities.newBlob(byteCharacters, contentType, fileName);
      
      var folder;
      try {
        if (folderId && folderId.trim() !== "") {
          folder = DriveApp.getFolderById(folderId.trim());
        } else {
          throw new Error("Folder ID kosong");
        }
      } catch (e) {
        // Fallback: cari atau buat folder bernama "EVIDEN_ANOMALI" di Google Drive user
        try {
          var folderName = "EVIDEN_ANOMALI";
          var folders = DriveApp.getFoldersByName(folderName);
          if (folders.hasNext()) {
            folder = folders.next();
          } else {
            folder = DriveApp.createFolder(folderName);
          }
        } catch (errFallback) {
          // Fallback terakhir: gunakan Root Folder jika pembuatan folder gagal
          folder = DriveApp.getRootFolder();
        }
      }
      
      var file = folder.createFile(blob);
      // Ubah izin agar siapa saja yang memiliki link bisa melihat file
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      var fileId = file.getId();
      resultUrl = "https://lh3.googleusercontent.com/d/" + fileId;
      fileUrlResponse = file.getUrl();
      hasFileObject = true;
    } else {
      fileUrlResponse = resultUrl;
    }
    
    // 2. Tulis Link ke Google Spreadsheet di Sheet ANOMALI pada kolom FOTO EVIDEN 1 / FOTO EVIDEN 2
    var sheetWriteStatus = "Spreadsheet ID tidak dikonfigurasi";
    if (spreadsheetId) {
      try {
        var ss;
        try {
          ss = SpreadsheetApp.openById(spreadsheetId.trim());
        } catch (openErr) {
          // Fallback: Jika ID berbeda atau tidak berizin, buka spreadsheet yang terikat
          try {
            ss = SpreadsheetApp.getActiveSpreadsheet();
          } catch (activeErr) {
            throw new Error("Tidak dapat membuka Spreadsheet ID " + spreadsheetId + " maupun Active Spreadsheet. Detail: " + openErr.toString());
          }
        }
        
        var sheet = ss.getSheetByName("ANOMALI");
        if (sheet) {
          var lastCol = sheet.getLastColumn();
          var lastRow = sheet.getLastRow();
          
          // Baca baris header pertama untuk mendeteksi posisi kolom
          var headersValues = [];
          if (lastCol > 0) {
            headersValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          }
          
          var noTugasColIdx = -1;
          var foto1ColIdx = -1;
          var foto2ColIdx = -1;
          
          for (var c = 0; c < headersValues.length; c++) {
            var h = String(headersValues[c] || "").toUpperCase().trim();
            // Mendeteksi kolom Nomor WO
            if (h.indexOf("NOMOR WO YANTEK DENGAN CCTV") !== -1 || h.indexOf("NOMOR WO") !== -1 || h.indexOf("NO LAPORAN") !== -1 || h.indexOf("NO. LAPORAN") !== -1 || h.indexOf("NO REFERENSI") !== -1) {
              noTugasColIdx = c + 1; // 1-based index
            }
            if (h === "FOTO EVIDEN 1") {
              foto1ColIdx = c + 1;
            }
            if (h === "FOTO EVIDEN 2") {
              foto2ColIdx = c + 1;
            }
          }
          
          // Jika kolom No Tugas tidak terdeteksi, default ke kolom 2 (B)
          if (noTugasColIdx === -1) {
            noTugasColIdx = 2; 
          }
          
          // Jika kolom FOTO EVIDEN 1 atau 2 belum ada di header, tambahkan di kolom baru di ujung kanan
          if (foto1ColIdx === -1) {
            lastCol++;
            sheet.getRange(1, lastCol).setValue("FOTO EVIDEN 1");
            foto1ColIdx = lastCol;
          }
          if (foto2ColIdx === -1) {
            lastCol++;
            sheet.getRange(1, lastCol).setValue("FOTO EVIDEN 2");
            foto2ColIdx = lastCol;
          }
          
          // Cari baris yang No Tugas-nya cocok
          var foundRow = -1;
          if (lastRow > 1) {
            var values = sheet.getRange(2, noTugasColIdx, lastRow - 1, 1).getValues();
            for (var r = 0; r < values.length; r++) {
              var cellVal = String(values[r][0] || "").trim();
              if (cellVal.toUpperCase() === String(noTugas || "").trim().toUpperCase()) {
                foundRow = r + 2; // +2 karena index dimulai dari baris ke-2 (1-based index)
                break;
              }
            }
          }
          
          if (foundRow !== -1) {
            var targetCol = (evidenIdx == 2) ? foto2ColIdx : foto1ColIdx;
            sheet.getRange(foundRow, targetCol).setValue(resultUrl);
            sheetWriteStatus = "Berhasil memperbarui tautan gambar di baris " + foundRow + " kolom " + targetCol;
          } else {
            sheetWriteStatus = "Peringatan: Nomor tugas '" + noTugas + "' tidak ditemukan dalam baris data sheet ANOMALI.";
          }
        } else {
          sheetWriteStatus = "Gagal: Sheet bernama 'ANOMALI' tidak ditemukan di database.";
        }
      } catch (writeErr) {
        sheetWriteStatus = "Error menulis ke spreadsheet: " + writeErr.toString();
      }
    }
    
    var response = {
      success: true,
      url: resultUrl,
      fileUrl: fileUrlResponse,
      sheetWriteStatus: sheetWriteStatus
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// PENTING: CARA MENGATASI ERROR "IZIN DRIVE" (DriveApp.Folder.createFile)
// ==========================================
// Jika Anda mendapatkan Error "Anda tidak memiliki izin untuk memanggil DriveApp...":
// 1. Pada bagian atas editor Apps Script, ganti pilihan fungsi dari 'doPost' menjadi 'otorisasiIzinDrive'.
// 2. Klik tombol 'Run' (Jalankan) atau segitiga play di sebelahnya.
// 3. Jendela persetujuan dari Google akan muncul. Klik 'Review Permissions' (Tinjau Izin).
// 4. Pilih akun Google Anda.
// 5. Akan muncul tulisan 'Google hasn't verified this app'. Klik tulisan 'Advanced' (Lanjutan) kecil di kiri bawah.
// 6. Klik 'Go to Untitled project (unsafe)' atau 'Buka [Nama Project] (tidak aman)'.
// 7. Klik 'Allow' (Izinkan).
// 8. Otorisasi selesai! Silakan LAKUKAN DEPLOY ULANG (New Deployment) agar versi Web App diperbarui.
function otorisasiIzinDrive() {
  Logger.log("Memulai otorisasi izin Drive...");
  DriveApp.getRootFolder();
  SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("SUKSES! Google Drive & Spreadsheet berhasil diotorisasi. Sekarang silakan lakukan New Deployment.");
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(gasTemplateCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // File upload processing
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, noTugas: string, evidenIdx: 1 | 2) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadMessage(prev => ({
        ...prev,
        [`${noTugas}_${evidenIdx}`]: { type: 'error', text: 'Ukuran file terlalu besar! Maksimal 5MB.' }
      }));
      return;
    }

    const stateKey = `${noTugas}_${evidenIdx}`;
    setUploadingState(prev => ({ ...prev, [stateKey]: true }));
    setUploadMessage(prev => {
      const copy = { ...prev };
      delete copy[stateKey];
      return copy;
    });

    try {
      // Validate GAS URL if present
      if (gasUrl) {
        const urlLower = gasUrl.toLowerCase().trim();
        if (urlLower.includes('drive.google.com')) {
          throw new Error('URL yang dimasukkan adalah link Google Drive Folder, bukan URL Web App Google Apps Script hasil deploy. Silakan periksa kembali langkah-langkah setup.');
        }
        if (urlLower.includes('/edit') && !urlLower.includes('/exec')) {
          throw new Error('URL yang dimasukkan adalah link Google Apps Script Editor. Anda harus melakukan Deploy -> New Deployment sebagai Web App dan menyalin URL hasil deploy yang berakhiran "/exec".');
        }
        if (!urlLower.startsWith('https://script.google.com/')) {
          throw new Error('URL Web App Google Apps Script tidak valid. URL resmi harus diawali dengan "https://script.google.com/macros/s/.../exec".');
        }
      }

      // Compress file to keep size optimized (avoid limits of Supabase or Payload Too Large server-side)
      const { base64, blob: compressedBlob } = await compressImage(file);

      const extension = file.type.startsWith('image/') ? 'jpg' : (file.name.split('.').pop() || 'jpg');
      const fileName = `EVIDEN_${evidenIdx}_${noTugas}_${Date.now()}.${extension}`;

      let imageUrl = '';

      if (uploadMethod === 'server') {
        // NATIVE Server-side Upload (NO GDrive permissions required! Zero custom configuration, zero-permission, instant!)
        const nativeResponse = await fetch('/api/upload-native', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            base64: base64,
            fileName: fileName,
            noTugas: noTugas,
            evidenIdx: evidenIdx
          })
        });

        if (!nativeResponse.ok) {
          throw new Error(`Portal server returned an error: ${nativeResponse.status} (${nativeResponse.statusText})`);
        }

        const nativeData = await nativeResponse.json();
        if (!nativeData.success) {
          throw new Error(nativeData.error || "Gagal menyimpan file ke server portal");
        }

        imageUrl = nativeData.url;

        // If GAS URL is configured, sync the link directly to Google Sheets with NO Drive permission needed!
        if (gasUrl) {
          try {
            const proxyUrl = `/api/gas-proxy?gasUrl=${encodeURIComponent(gasUrl.trim())}`;
            const response = await fetch(proxyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain;charset=utf-8'
              },
              body: JSON.stringify({
                fileUrl: imageUrl, // Pass pre-uploaded photo link
                fileName: fileName,
                noTugas: noTugas,
                evidenIdx: evidenIdx,
                spreadsheetId: spreadsheetId
              })
            });

            if (response.ok) {
              const responseText = await response.text();
              const resData = JSON.parse(responseText);
              if (!resData.success) {
                console.warn("Spreadsheet Sync failed:", resData.error);
                // We keep the image since it's uploaded to server, but warn about sheets
                setUploadMessage(prev => ({
                  ...prev,
                  [stateKey]: { 
                    type: 'error', 
                    text: `Foto sukses disimpan di portal, tetapi gagal sinkron ke Spreadsheet: ${resData.error || 'Periksa Spreadsheet ID'}` 
                  }
                }));
              }
            } else {
              console.warn("GAS server returned status error:", response.status);
            }
          } catch (syncErr: any) {
            console.error("Sheets sync error:", syncErr);
          }
        }
      } else {
        // Direct Supabase Storage API Upload
        let uploadedSuccess = false;
        try {
          const supabaseResponse = await fetch('/api/upload-supabase', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              base64: base64,
              fileName: fileName,
              noTugas: noTugas,
              evidenIdx: evidenIdx
            })
          });

          if (supabaseResponse.ok) {
            const supabaseData = await supabaseResponse.json();
            if (supabaseData.success) {
              imageUrl = supabaseData.url;
              uploadedSuccess = true;
            } else {
              throw new Error(supabaseData.error || "Gagal mengunggah foto ke Supabase Storage via backend");
            }
          } else {
            throw new Error(`Server backend merespon error: ${supabaseResponse.status}`);
          }
        } catch (backendError: any) {
          console.warn("Backend Supabase upload failed or is unavailable (expected on Cloudflare Pages). Falling back to direct browser-to-supabase client upload:", backendError);
          
          // Fallback to client-side direct upload
          try {
            if (!supabaseKey) {
              throw new Error(
                "Koneksi Supabase Gagal (Cloudflare Fallback): Variabel 'SUPABASE_KEY' belum dikonfigurasi di pengaturan Admin Panel. Silakan klik tombol 'Setup Kunci Supabase' untuk memasukkan kunci Anda."
              );
            }

            // Lazy instantiate Supabase client on client-side
            const clientSupabase = createClient(supabaseUrl, supabaseKey);

            // Use the pre-computed compressedBlob directly!
            const blob = compressedBlob;

            const { data: uploadData, error: uploadError } = await clientSupabase.storage
              .from(supabaseBucket)
              .upload(fileName, blob, {
                contentType: blob.type,
                upsert: true
              });

            if (uploadError) {
              console.error("Direct browser Supabase upload error detail:", uploadError);
              throw new Error(`[Direct Upload Error] ${uploadError.message}`);
            }

            const { data: publicUrlData } = clientSupabase.storage
              .from(supabaseBucket)
              .getPublicUrl(fileName);

            if (!publicUrlData || !publicUrlData.publicUrl) {
              throw new Error("Gagal mengambil URL publik dari Storage Supabase (Client-Side).");
            }

            imageUrl = publicUrlData.publicUrl;
            uploadedSuccess = true;
          } catch (clientError: any) {
            console.error("Direct client-side upload error too:", clientError);
            throw new Error(
              `Kesalahan koneksi ke Supabase (baik Backend maupun Client-Side gagal):\n` +
              `Backend: ${backendError.message || backendError}\n` +
              `Client: ${clientError.message || clientError}`
            );
          }
        }

        // If GAS URL is configured, sync the link directly to Google Sheets
        if (gasUrl) {
          try {
            const proxyUrl = `/api/gas-proxy?gasUrl=${encodeURIComponent(gasUrl.trim())}`;
            const response = await fetch(proxyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain;charset=utf-8'
              },
              body: JSON.stringify({
                fileUrl: imageUrl, // Pass Supabase public link
                fileName: fileName,
                noTugas: noTugas,
                evidenIdx: evidenIdx,
                spreadsheetId: spreadsheetId
              })
            });

            if (response.ok) {
              const responseText = await response.text();
              const resData = JSON.parse(responseText);
              if (!resData.success) {
                console.warn("Spreadsheet Sync failed:", resData.error);
                setUploadMessage(prev => ({
                  ...prev,
                  [stateKey]: { 
                    type: 'error', 
                    text: `Foto sukses disimpan di Supabase, tetapi gagal sinkron ke Spreadsheet: ${resData.error || 'Periksa Spreadsheet ID'}` 
                  }
                }));
              }
            } else {
              console.warn("GAS server returned status error:", response.status);
            }
          } catch (syncErr: any) {
            console.error("Sheets sync error:", syncErr);
          }
        }
      }

      // Update local storage mappings
      const existingUpload = evidenMap[noTugas] || {};
      const newUpload: EvidenUpload = {
        ...existingUpload,
        ...(evidenIdx === 1 
          ? { fotoEviden1: imageUrl, uploadedAt1: new Date().toLocaleString('id-ID'), fileName1: file.name }
          : { fotoEviden2: imageUrl, uploadedAt2: new Date().toLocaleString('id-ID'), fileName2: file.name }
        )
      };

      const newMap = {
        ...evidenMap,
        [noTugas]: newUpload
      };

      saveEvidenMap(newMap);

      setUploadMessage(prev => ({
        ...prev,
        [stateKey]: { 
          type: 'success', 
          text: gasUrl ? 'Foto berhasil diunggah ke Google Drive!' : 'Materi berhasil diunggah (Mode Simulasi)!' 
        }
      }));

    } catch (err: any) {
      console.error("Upload error details:", err);
      let errorMsg = err.message || 'Koneksi gagal!';
      
      const isDriveError = err.message && (
        err.message.includes('DriveApp') || 
        err.message.includes('createFile') || 
        err.message.includes('permission') || 
        err.message.includes('tidak memiliki izin') ||
        err.message.includes('Exception')
      );

      if (isDriveError) {
        errorMsg = 'Error Izin Drive: Google Apps Script Anda belum diotorisasi untuk mengakses Google Drive Anda. Solusi: Buka editor Apps Script Anda, ganti pilihan fungsi di toolbar atas dari "doPost" menjadi "otorisasiIzinDrive", lalu klik "Run/Jalankan". Selesaikan popup izin Google (Review Permissions -> Lanjutan -> Go to [Project] -> Allow), lalu DEPLOY ULANG (New Deployment) Web App Anda.';
      } else if (err.message === 'Failed to fetch') {
        errorMsg = 'Upload Gagal (Failed to fetch). Pastikan saat Deploy Google Apps Script, kolom "Who has access" disetel ke "Anyone" (Siapa Saja) serta status Web App adalah aktif. Bila salah disetel, browser akan menolak koneksi karena kendala CORS.';
      }
      
      setUploadMessage(prev => ({
        ...prev,
        [stateKey]: { type: 'error', text: errorMsg }
      }));
    } finally {
      setUploadingState(prev => ({ ...prev, [stateKey]: false }));
    }
  };

  // Delete uploaded photo
  const handleDeletePhoto = (noTugas: string, evidenIdx: 1 | 2) => {
    const existingUpload = evidenMap[noTugas];
    if (!existingUpload) return;

    const newUpload = { ...existingUpload };
    if (evidenIdx === 1) {
      delete newUpload.fotoEviden1;
      delete newUpload.uploadedAt1;
      delete newUpload.fileName1;
    } else {
      delete newUpload.fotoEviden2;
      delete newUpload.uploadedAt2;
      delete newUpload.fileName2;
    }

    const newMap = { ...evidenMap };
    if (Object.keys(newUpload).length === 0) {
      delete newMap[noTugas];
    } else {
      newMap[noTugas] = newUpload;
    }

    saveEvidenMap(newMap);

    const stateKey = `${noTugas}_${evidenIdx}`;
    setUploadMessage(prev => ({
      ...prev,
      [stateKey]: { type: 'success', text: 'Foto berhasil dihapus dari daftar lokal.' }
    }));
  };

  // Submit manual URL link as fallback
  const handleManualUrlSubmit = (noTugas: string, evidenIdx: 1 | 2, urlUrl: string) => {
    if (!urlUrl.trim()) return;

    const existingUpload = evidenMap[noTugas] || {};
    const newUpload: EvidenUpload = {
      ...existingUpload,
      ...(evidenIdx === 1 
        ? { fotoEviden1: urlUrl.trim(), uploadedAt1: new Date().toLocaleString('id-ID'), fileName1: 'Pautan Link Manual' }
        : { fotoEviden2: urlUrl.trim(), uploadedAt2: new Date().toLocaleString('id-ID'), fileName2: 'Pautan Link Manual' }
      )
    };

    const newMap = {
      ...evidenMap,
      [noTugas]: newUpload
    };

    saveEvidenMap(newMap);

    const stateKey = `${noTugas}_${evidenIdx}`;
    setUploadMessage(prev => ({
      ...prev,
      [stateKey]: { type: 'success', text: 'Tautan manual berhasil dipasang!' }
    }));
  };

  // Process bottom officers similarly to YantekOptimitationPage
  const bottomOfficers = useMemo(() => {
    const rawRows = vccData || [];
    const hasRealRows = rawRows.length > 1;

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
          pctYo = parseNum(row[idxPersentaseSkor]);
        }
        if (idxTotalSkor !== -1) {
          totalSkor = parseNum(row[idxTotalSkor]);
        }

        // Fallbacks if percentage is missing
        if (idxPersentaseSkor === -1 && idxTotalSkor !== -1) {
          pctYo = (totalSkor / 15) * 100;
        }
        
        // Filter: % PENCAPAIAN KINERJA YO kecil dari pada 60%
        if (pctYo < 60 && pctYo > 0) {
          list.push({
            name,
            ulp: cleanUlp || "ULP BUKITTINGGI",
            targetScore: 15,
            score: totalSkor,
            percent: parseFloat(pctYo.toFixed(2))
          });
        }
      });
    }

    // Fallback if no real rows or list is empty
    if (!hasRealRows && list.length === 0) {
      const fallbackList = [
        { name: "ABADI RAHMAD", ulp: "ULP LUBUK SIKAPING", targetScore: 15, score: 8.00, percent: 53.33 },
        { name: "ABDUL HAMID", ulp: "ULP LUBUK BASUNG", targetScore: 15, score: 7.00, percent: 46.67 },
        { name: "AHMAD SALIM", ulp: "ULP KOTO TUO", targetScore: 15, score: 8.50, percent: 56.67 },
        { name: "ADE ANDRI", ulp: "ULP SIMPANG EMPAT", targetScore: 15, score: 6.00, percent: 40.00 },
        { name: "BUDI SANTOSO", ulp: "ULP BUKITTINGGI", targetScore: 15, score: 8.00, percent: 53.33 },
      ];
      list = fallbackList;
    }

    list.sort((a, b) => a.percent - b.percent);
    return list;
  }, [vccData]);

  // Filter & Search rows
  const filteredRows = useMemo(() => {
    if (adminSubTab === 'ANOMALI') {
      return anomaliList.filter(row => {
        const noTugas = String(row[0] || '').toLowerCase();
        const tgl = String(row[1] || '').toLowerCase();
        const petugas = String(row[2] || '').toLowerCase();
        const ulp = String(row[3] || '').toLowerCase();
        const jenis = String(row[4] || '').toLowerCase();
        const search = searchTerm.toLowerCase().trim();

        return !search ||
          noTugas.includes(search) ||
          tgl.includes(search) ||
          petugas.includes(search) ||
          ulp.includes(search) ||
          jenis.includes(search);
      });
    } else {
      return bottomOfficers.filter(officer => {
        const name = String(officer.name || '').toLowerCase();
        const ulp = String(officer.ulp || '').toLowerCase();
        const search = searchTerm.toLowerCase().trim();

        return !search ||
          name.includes(search) ||
          ulp.includes(search);
      });
    }
  }, [adminSubTab, anomaliList, bottomOfficers, searchTerm]);

  // Pagination rows
  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;

  // Reset page when search or subtab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, adminSubTab]);

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/20 rounded-3xl min-h-[600px]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
          id="admin_login_box"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-700 to-[#102a43] p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <ShieldCheck size={160} />
            </div>
            
            <div className="mx-auto w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-4 shadow-inner">
              <Lock size={28} className="text-[#00e5ff]" />
            </div>
            <h2 className="text-lg font-black tracking-widest uppercase">OTENTIKASI ADMIN</h2>
            <p className="text-[10px] text-cyan-200 font-extrabold uppercase tracking-wide mt-1">DASHBOARD MONITORING YANDAL</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 flex flex-col gap-5">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Password Admin</label>
              <div className="relative mt-1.5 flex items-center">
                <Key className="absolute left-3.5 text-slate-400" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password admin..."
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-bold text-slate-800 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 hover:text-blue-500 text-slate-400 font-bold text-[10px] uppercase cursor-pointer"
                >
                  {showPassword ? "Sembunyi" : "Lihat"}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 text-rose-600 border border-rose-100 p-3 rounded-lg flex items-center gap-2"
                >
                  <AlertTriangle size={15} className="shrink-0 animate-bounce" />
                  <span className="text-[10px] font-bold uppercase">{authError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs tracking-widest uppercase shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              LOG IN SEKARANG
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // AUTHENTICATED PANEL
  return (
    <div id="admin_dashboard_root" className="flex flex-col gap-6 p-6 bg-slate-50/50 rounded-2xl min-h-full">
      
      {/* Simple Status & Logout Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-3xl p-5 border border-slate-200 shadow-sm gap-4 transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner">
            <ShieldCheck size={22} className="text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Akun Admin Aktif</span>
              <span className="bg-emerald-500/10 text-emerald-700 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase font-sans">TEROTENTIKASI</span>
            </div>
            <p className="text-[9.5px] text-slate-450 font-bold uppercase mt-1">
              Sistem Unggah Eviden: Terkoneksi Otomatis ke Storage Supabase bucket <span className="text-blue-600 font-mono text-[9.5px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{supabaseBucket}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Cloudflare Supabase Setup Trigger */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-95 ${
              showSettings 
                ? "bg-slate-800 text-white shadow-md font-bold"
                : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
            }`}
          >
            <Settings2 size={13} />
            {showSettings ? "Tutup Setup" : "Setup Kunci Supabase"}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 px-4 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all cursor-pointer active:scale-95"
          >
            <LogOut size={13} className="stroke-[2.5]" />
            Keluar Admin
          </button>
        </div>
      </div>

      {/* Supabase Connection Setup Panel overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            id="supabase_client_settings_panel"
          >
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-md flex flex-col gap-5">
              <div>
                <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase flex items-center gap-1.5 mb-1.5">
                  <Settings2 size={14} className="text-blue-600" />
                  KONFIGURASI KONEKSI DIRECT SUPABASE (SOLUSI CLOUDFLARE)
                </h3>
                <p className="text-[9.5px] text-slate-500 font-bold uppercase leading-relaxed">
                  Gunakan panel ini jika website Anda di-deploy di Cloudflare Pages/Workers (di mana backend Node.js tidak tersedia). Masukkan kredensial API Supabase Anda agar browser dapat mengunggah file langsung secara aman tanpa perantara server backend!
                </p>
              </div>

              <form onSubmit={handleSaveSupabaseConfig} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">SUPABASE URL</label>
                    <input
                      type="url"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyz.supabase.co"
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 text-[10px] font-bold text-slate-800 rounded-lg border border-slate-200 focus:border-blue-500 outline-none placeholder:text-slate-400 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">STORAGE BUCKET NAME</label>
                    <input
                      type="text"
                      value={supabaseBucket}
                      onChange={(e) => setSupabaseBucket(e.target.value)}
                      placeholder="EVIDEN"
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 text-[10px] font-bold text-slate-800 rounded-lg border border-slate-200 focus:border-blue-500 outline-none placeholder:text-slate-400 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">SUPABASE KEY / SERVICE KEY</label>
                  <div className="relative mt-1">
                    <input
                      type={showSupabaseKey ? "text" : "password"}
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="Masukkan Anon/Service API Key Supabase Anda..."
                      className="w-full px-4 py-2.5 bg-slate-50 text-[10px] pr-12 font-bold text-slate-800 rounded-lg border border-slate-200 focus:border-blue-500 outline-none placeholder:text-slate-400 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-black tracking-widest cursor-pointer"
                    >
                      {showSupabaseKey ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase mt-1.5 block">
                    Saran Keamanan: Setelan disimpan secara lokal di browser Anda (Local Storage) dan aman karena tidak dikirim ke pihak luar mana pun.
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] tracking-widest uppercase shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    SIMPAN KREDENSIAL SUPABASE
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSupabaseConfig}
                    className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-[9px] tracking-widest uppercase border border-rose-200 transition-all cursor-pointer"
                  >
                    RESET DEFAULT
                  </button>
                </div>
              </form>

              <div className="bg-sky-50 border border-sky-100 text-sky-850 p-4 rounded-2xl text-[9.5px] font-semibold leading-relaxed flex items-start gap-2.5">
                <Info size={14} className="shrink-0 mt-0.5 text-sky-600" />
                <div>
                  <p className="font-extrabold uppercase text-[10px] text-sky-900 leading-snug">💬 TIPS DEPLOY CLOUDFLARE PAGES:</p>
                  <p className="mt-1 font-bold">
                    Untuk menghindari memasukkan kunci secara manual di setiap perangkat, Anda sangat disarankan untuk mendeklarasikan Variable Lingkungan (Environment Variables) di panel kontrol Cloudflare Pages Anda:
                  </p>
                  <ul className="list-disc list-inside mt-1.5 space-y-1 font-medium pl-1 text-slate-600">
                    <li><strong className="text-slate-800">VITE_SUPABASE_URL</strong>: Masukkan url project Supabase Anda</li>
                    <li><strong className="text-slate-800">VITE_SUPABASE_KEY</strong>: Masukkan API key anon/service Supabase Anda</li>
                  </ul>
                  <p className="mt-1.5 text-[8.5px] font-black text-blue-700">Aplikasi akan mendeteksi variabel di atas secara otomatis saat pertama kali dibuka!</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtab Switcher for Admin Upload types */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-300/30 gap-1.5" id="admin_sub_tabs_bar">
        <button
          onClick={() => setAdminSubTab('ANOMALI')}
          className={`flex-1 py-3 text-center text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${
            adminSubTab === 'ANOMALI'
              ? 'bg-slate-800 text-white shadow-md font-bold'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
          }`}
        >
          📁 EVIDEN KASUS ANOMALI ({anomaliList.length})
        </button>
        <button
          onClick={() => setAdminSubTab('TINDAK_LANJUT')}
          className={`flex-1 py-3 text-center text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${
            adminSubTab === 'TINDAK_LANJUT'
              ? 'bg-slate-800 text-white shadow-md font-bold'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
          }`}
        >
          🔴 TINDAK LANJUT PETUGAS TERBAWAH {"<60%"} ({bottomOfficers.length})
        </button>
        <button
          onClick={() => setAdminSubTab('SETTING')}
          className={`flex-1 py-3 text-center text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${
            adminSubTab === 'SETTING'
              ? 'bg-slate-800 text-white shadow-md font-bold'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
          }`}
        >
          ⚙️ SETTING MASTER DATA
        </button>
      </div>

      {adminSubTab === 'SETTING' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="admin_settings_view">
          
          {/* CARD 1: TABEL PETUGAS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                  <User size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wider uppercase text-white">MASTER DATA PETUGAS YANTEK</h4>
                  <p className="text-[9px] text-slate-300 font-bold uppercase mt-0.5 opacity-80">
                    Total: {petugasList.length > 0 ? petugasList.length - 1 : 0} Petugas Terdaftar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddPetugasForm(!showAddPetugasForm)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
              >
                {showAddPetugasForm ? 'BATAL' : '+ TAMBAH'}
              </button>
            </div>

            {/* Adding Form Section */}
            <AnimatePresence>
              {showAddPetugasForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b border-slate-100 bg-slate-50"
                >
                  <form onSubmit={handleAddPetugas} className="p-4 flex flex-col gap-3">
                    <h5 className="text-[9px] font-black uppercase text-slate-500 tracking-wider">FORMULIR TAMBAH PETUGAS BARU</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">NAMA LENGKAP</label>
                        <input
                          type="text"
                          value={newPetugasName}
                          onChange={(e) => setNewPetugasName(e.target.value)}
                          placeholder="Contoh: 13226_NAMA"
                          className="w-full mt-1 px-3 py-2 bg-white text-[10px] font-bold text-slate-800 rounded-lg border border-slate-200 focus:border-blue-500 outline-none uppercase"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">UNIT (ULP)</label>
                        <select
                          value={newPetugasUlpId}
                          onChange={(e) => setNewPetugasUlpId(e.target.value)}
                          className="w-full mt-1 px-3 py-2 bg-white text-[10px] font-bold text-slate-800 rounded-lg border border-slate-200 focus:border-blue-500 outline-none cursor-pointer"
                        >
                          {ulpList.slice(1).map((row, idx) => (
                            <option key={idx} value={row[0]}>{row[1]} ({row[0]})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingPetugas}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] tracking-widest uppercase rounded-lg shadow-sm disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {addingPetugas ? 'MENYIMPAN...' : 'SIMPAN DATA PETUGAS'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Bar */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Search size={12} className="text-slate-400" />
              <input
                type="text"
                value={settingPetugasSearch}
                onChange={(e) => setSettingPetugasSearch(e.target.value)}
                placeholder="Cari ID, Nama, atau ULP Petugas..."
                className="bg-transparent text-slate-700 text-[10px] font-bold outline-none w-full placeholder:text-slate-400"
              />
              {settingPetugasSearch && (
                <button
                  onClick={() => setSettingPetugasSearch('')}
                  className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {loadingSettings ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="animate-spin text-blue-500" size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Memuat Master Data...</span>
                </div>
              ) : filteredPetugas.length > 0 ? (
                <div className="overflow-x-auto border border-slate-150 rounded-xl">
                  <table className="w-full text-left border-collapse text-[10px] font-semibold text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black text-[8px] tracking-wider">
                        <th className="px-3 py-2 text-center w-10">No</th>
                        <th className="px-3 py-2 w-20">ID</th>
                        <th className="px-3 py-2">NAMA PETUGAS</th>
                        <th className="px-3 py-2 w-32">ULP UNIT</th>
                        <th className="px-3 py-2 text-center w-12">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredPetugas.map((row, idx) => {
                        const isEditing = editingPetugasId === row[0];
                        const ulpRow = ulpList.find(r => String(r[0]).trim() === String(row[2]).trim());
                        const ulpName = ulpRow ? ulpRow[1] : row[2];

                        if (isEditing) {
                          return (
                            <tr key={idx} className="bg-blue-50/40">
                              <td className="px-3 py-2 text-center text-slate-400 font-extrabold">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono font-black text-slate-500">{row[0]}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={editPetugasName}
                                  onChange={(e) => setEditPetugasName(e.target.value)}
                                  className="w-full px-2 py-1 bg-white text-[10px] font-bold text-slate-850 rounded border border-slate-200 focus:border-blue-500 outline-none uppercase"
                                  placeholder="Nama Petugas"
                                  required
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={editPetugasUlpId}
                                  onChange={(e) => setEditPetugasUlpId(e.target.value)}
                                  className="w-full px-2 py-1 bg-white text-[10px] font-bold text-slate-850 rounded border border-slate-200 focus:border-blue-500 outline-none cursor-pointer"
                                >
                                  {ulpList.slice(1).map((u, uIdx) => (
                                    <option key={uIdx} value={u[0]}>{u[1]} ({u[0]})</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleEditPetugas(row[0])}
                                    disabled={savingPetugasId === row[0]}
                                    className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer disabled:opacity-50"
                                    title="Simpan"
                                  >
                                    {savingPetugasId === row[0] ? (
                                      <RefreshCw className="animate-spin" size={10} />
                                    ) : (
                                      <Check size={10} />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setEditingPetugasId(null)}
                                    disabled={savingPetugasId === row[0]}
                                    className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 transition-all cursor-pointer disabled:opacity-50"
                                    title="Batal"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-3 py-2.5 text-center text-slate-400 font-extrabold">{idx + 1}</td>
                            <td className="px-3 py-2.5 font-mono font-black text-slate-500">{row[0]}</td>
                            <td className="px-3 py-2.5 font-black text-slate-850 uppercase">{row[1]}</td>
                            <td className="px-3 py-2.5 font-bold text-blue-800 uppercase text-[9px]">{ulpName}</td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingPetugasId(row[0]);
                                    setEditPetugasName(row[1]);
                                    setEditPetugasUlpId(row[2]);
                                  }}
                                  className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer"
                                  title="Edit Petugas"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  onClick={() => setConfirmModal({
                                    isOpen: true,
                                    type: 'petugas',
                                    id: row[0],
                                    name: row[1]
                                  })}
                                  className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                                  title="Hapus Petugas"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center uppercase p-4">
                  <span className="text-[10px] font-black tracking-widest">Tidak ada data petugas yang cocok</span>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: TABEL REGU CCTV */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
                  <Camera size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wider uppercase text-white">MASTER DATA REGU MONITORING CCTV</h4>
                  <p className="text-[9px] text-slate-300 font-bold uppercase mt-0.5 opacity-80">
                    Total: {reguCctvList.length > 0 ? reguCctvList.length - 1 : 0} Regu Terdaftar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddReguForm(!showAddReguForm)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
              >
                {showAddReguForm ? 'BATAL' : '+ TAMBAH'}
              </button>
            </div>

            {/* Adding Form Section */}
            <AnimatePresence>
              {showAddReguForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b border-slate-100 bg-slate-50"
                >
                  <form onSubmit={handleAddReguCctv} className="p-4 flex flex-col gap-3">
                    <h5 className="text-[9px] font-black uppercase text-slate-500 tracking-wider">FORMULIR TAMBAH REGU CCTV BARU</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">NAMA REGU / ULP</label>
                        <input
                          type="text"
                          value={newReguCctvName}
                          onChange={(e) => setNewReguCctvName(e.target.value)}
                          placeholder="Contoh: KOTO TUO"
                          className="w-full mt-1 px-3 py-2 bg-white text-[10px] font-bold text-slate-800 rounded-lg border border-slate-200 focus:border-blue-500 outline-none uppercase"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">POSKO</label>
                        <select
                          value={newReguCctvPoskoId || newReguCctvUp3Id}
                          onChange={(e) => {
                            setNewReguCctvPoskoId(e.target.value);
                            setNewReguCctvUp3Id(e.target.value);
                          }}
                          className="w-full mt-1 px-3 py-2 bg-white text-[10px] font-bold text-slate-800 rounded-lg border border-slate-200 focus:border-blue-500 outline-none cursor-pointer"
                        >
                          {poskoList.slice(1).map((row, idx) => (
                            <option key={idx} value={row[0]}>{row[1]} ({row[0]})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingReguCctv}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] tracking-widest uppercase rounded-lg shadow-sm disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {addingReguCctv ? 'MENYIMPAN...' : 'SIMPAN DATA REGU CCTV'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Bar */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Search size={12} className="text-slate-400" />
              <input
                type="text"
                value={settingReguSearch}
                onChange={(e) => setSettingReguSearch(e.target.value)}
                placeholder="Cari ID, Nama Regu, atau Posko..."
                className="bg-transparent text-slate-700 text-[10px] font-bold outline-none w-full placeholder:text-slate-400"
              />
              {settingReguSearch && (
                <button
                  onClick={() => setSettingReguSearch('')}
                  className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {loadingSettings ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="animate-spin text-blue-500" size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Memuat Master Data...</span>
                </div>
              ) : filteredReguCctv.length > 0 ? (
                <div className="overflow-x-auto border border-slate-150 rounded-xl">
                  <table className="w-full text-left border-collapse text-[10px] font-semibold text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black text-[8px] tracking-wider">
                        <th className="px-3 py-2 text-center w-10">No</th>
                        <th className="px-3 py-2 w-20">ID</th>
                        <th className="px-3 py-2">NAMA REGU</th>
                        <th className="px-3 py-2 w-32">POSKO</th>
                        <th className="px-3 py-2 text-center w-12">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredReguCctv.map((row, idx) => {
                        const isEditing = editingReguId === row[0];
                        const poskoName = getPoskoName(row);

                        if (isEditing) {
                          return (
                            <tr key={idx} className="bg-blue-50/40">
                              <td className="px-3 py-2 text-center text-slate-400 font-extrabold">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono font-black text-slate-500">{row[0]}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={editReguName}
                                  onChange={(e) => setEditReguName(e.target.value)}
                                  className="w-full px-2 py-1 bg-white text-[10px] font-bold text-slate-850 rounded border border-slate-200 focus:border-blue-500 outline-none uppercase"
                                  placeholder="Nama Regu"
                                  required
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={editReguPoskoId || editReguUp3Id}
                                  onChange={(e) => {
                                    setEditReguPoskoId(e.target.value);
                                    setEditReguUp3Id(e.target.value);
                                  }}
                                  className="w-full px-2 py-1 bg-white text-[10px] font-bold text-slate-850 rounded border border-slate-200 focus:border-blue-500 outline-none cursor-pointer"
                                >
                                  {poskoList.slice(1).map((u, uIdx) => (
                                    <option key={uIdx} value={u[0]}>{u[1]} ({u[0]})</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleEditReguCctv(row[0])}
                                    disabled={savingReguId === row[0]}
                                    className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer disabled:opacity-50"
                                    title="Simpan"
                                  >
                                    {savingReguId === row[0] ? (
                                      <RefreshCw className="animate-spin" size={10} />
                                    ) : (
                                      <Check size={10} />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setEditingReguId(null)}
                                    disabled={savingReguId === row[0]}
                                    className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 transition-all cursor-pointer disabled:opacity-50"
                                    title="Batal"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-3 py-2.5 text-center text-slate-400 font-extrabold">{idx + 1}</td>
                            <td className="px-3 py-2.5 font-mono font-black text-slate-500">{row[0]}</td>
                            <td className="px-3 py-2.5 font-black text-slate-850 uppercase">{row[1]}</td>
                            <td className="px-3 py-2.5 font-bold text-cyan-800 uppercase text-[9px]">{poskoName}</td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingReguId(row[0]);
                                    setEditReguName(row[1]);
                                    setEditReguPoskoId(row[2]);
                                    setEditReguUp3Id(row[2]);
                                  }}
                                  className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer"
                                  title="Edit Regu"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  onClick={() => setConfirmModal({
                                    isOpen: true,
                                    type: 'regu_cctv',
                                    id: row[0],
                                    name: row[1]
                                  })}
                                  className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                                  title="Hapus Regu"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center uppercase p-4">
                  <span className="text-[10px] font-black tracking-widest">Tidak ada data regu yang cocok</span>
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col gap-4">
        
        {/* Table Header Filter */}
        <div className="px-5 py-4 bg-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-black tracking-widest text-[#00e5ff] uppercase flex items-center gap-1.5">
              <ShieldCheck size={14} />
              {adminSubTab === 'ANOMALI' ? 'TABEL MATRIX DATA EVIDEN ANOMALI' : 'TABEL TINDAK LANJUT PETUGAS TERBAWAH'}
            </h3>
            <p className="text-[9px] text-slate-300 font-bold uppercase mt-0.5 opacity-80">
              {adminSubTab === 'ANOMALI' 
                ? `Total Temuan Kasus Terbaca: ${filteredRows.length} Anomali` 
                : `Total Petugas Performa di Bawah Target (<60%): ${filteredRows.length} Orang`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-56 flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
              <Search size={11} className="text-white/75" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={adminSubTab === 'ANOMALI' ? "Cari No Tugas/Petugas/ULP..." : "Cari Nama Petugas/ULP..."}
                className="bg-transparent text-white placeholder-white/50 text-[10px] font-bold outline-none w-full"
              />
            </div>
          </div>
        </div>

        {/* Real Table */}
        <div className="p-5 flex flex-col gap-4">
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            {adminSubTab === 'ANOMALI' ? (
              <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-800 min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[8.5px] tracking-wider">
                    <th scope="col" className="px-4 py-3 text-center w-12">No</th>
                    <th scope="col" className="px-4 py-3 w-36">No Tugas</th>
                    <th scope="col" className="px-4 py-3 w-36">ULP</th>
                    <th scope="col" className="px-4 py-3 w-40">Petugas</th>
                    <th scope="col" className="px-4 py-3">Jenis Kerawanan (Anomali)</th>
                    <th scope="col" className="px-4 py-3 text-center w-56">Foto Eviden 1</th>
                    <th scope="col" className="px-4 py-3 text-center w-56">Foto Eviden 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row, idx) => {
                      const runningNo = (currentPage - 1) * itemsPerPage + idx + 1;
                      const noTugas = row[0] || "-";
                      const tgl = row[1] || "-";
                      const petugas = row[2] || "-";
                      const ulp = row[3] || "-";
                      const jenis = row[4] || "-";
                      const desc = row[5] || "-";

                      const eviden = evidenMap[noTugas] || {};

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-400 tabular-nums font-extrabold">{runningNo}</td>
                          <td className="px-4 py-3 font-mono font-black text-slate-700">
                            <span className="bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-1 rounded text-[10px]">
                              {noTugas}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-black text-[#1b3d5d] truncate uppercase max-w-[140px]" title={ulp}>
                            {ulp}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-600 truncate uppercase max-w-[150px]" title={petugas}>
                            {petugas}
                          </td>
                          <td className="px-4 py-3 max-w-[250px]">
                            <div className="flex flex-wrap gap-1 max-h-[40px] overflow-y-auto custom-scrollbar">
                              {jenis.split(",").map((v: string, vIdx: number) => (
                                <span key={vIdx} className="px-1.5 py-0.5 text-[7px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-100 rounded">
                                  {v.trim()}
                                </span>
                              ))}
                            </div>
                            {desc && desc !== "-" && (
                              <p className="text-[7.5px] font-bold text-slate-400 mt-1 truncate" title={desc}>{desc}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 border-l border-slate-100 bg-slate-50/20">
                            <EvidenUploadCell 
                              noTugas={noTugas}
                              evidenIdx={1}
                              evidenData={eviden}
                              isUploading={uploadingState[`${noTugas}_1`] || false}
                              msg={uploadMessage[`${noTugas}_1`]}
                              onUploadChange={(e) => handleFileUpload(e, noTugas, 1)}
                              onDelete={() => handleDeletePhoto(noTugas, 1)}
                              onManualSubmit={(url) => handleManualUrlSubmit(noTugas, 1, url)}
                              onSetUploadMethod={setUploadMethod}
                              currentUploadMethod={uploadMethod}
                            />
                          </td>
                          <td className="px-4 py-3 border-l border-slate-100 bg-slate-100/5">
                            <EvidenUploadCell 
                              noTugas={noTugas}
                              evidenIdx={2}
                              evidenData={eviden}
                              isUploading={uploadingState[`${noTugas}_2`] || false}
                              msg={uploadMessage[`${noTugas}_2`]}
                              onUploadChange={(e) => handleFileUpload(e, noTugas, 2)}
                              onDelete={() => handleDeletePhoto(noTugas, 2)}
                              onManualSubmit={(url) => handleManualUrlSubmit(noTugas, 2, url)}
                              onSetUploadMethod={setUploadMethod}
                              currentUploadMethod={uploadMethod}
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 font-extrabold uppercase tracking-widest bg-slate-50/50">
                        Tidak ada data yang cocok dengan kriteria pencarian
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-800 min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[8.5px] tracking-wider">
                    <th scope="col" className="px-4 py-3 text-center w-12">No</th>
                    <th scope="col" className="px-4 py-3 w-44">Nama Petugas</th>
                    <th scope="col" className="px-4 py-3 w-40">Nama ULP</th>
                    <th scope="col" className="px-4 py-3 text-center w-36">Target Skor YO</th>
                    <th scope="col" className="px-4 py-3 text-center w-36">Pencapaian Skor YO</th>
                    <th scope="col" className="px-4 py-3 text-center w-32">% Kinerja YO</th>
                    <th scope="col" className="px-4 py-3 text-center w-56">Eviden Tindak Lanjut 1</th>
                    <th scope="col" className="px-4 py-3 text-center w-56">Eviden Tindak Lanjut 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((officer, idx) => {
                      const runningNo = (currentPage - 1) * itemsPerPage + idx + 1;
                      const name = officer.name;
                      const ulp = officer.ulp;
                      const targetScore = officer.targetScore;
                      const score = officer.score;
                      const percent = officer.percent;

                      const eviden = evidenMap[name] || {};

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-400 tabular-nums font-extrabold">{runningNo}</td>
                          <td className="px-4 py-3 font-black text-slate-900 uppercase">{name}</td>
                          <td className="px-4 py-3 font-bold text-[#1b3d5d] uppercase">{ulp}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-400">{targetScore}.00</td>
                          <td className="px-4 py-3 text-center font-extrabold text-slate-800">{score.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 rounded-full text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100">
                              {percent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 border-l border-slate-100 bg-slate-50/20">
                            <EvidenUploadCell 
                              noTugas={name}
                              evidenIdx={1}
                              evidenData={eviden}
                              isUploading={uploadingState[`${name}_1`] || false}
                              msg={uploadMessage[`${name}_1`]}
                              onUploadChange={(e) => handleFileUpload(e, name, 1)}
                              onDelete={() => handleDeletePhoto(name, 1)}
                              onManualSubmit={(url) => handleManualUrlSubmit(name, 1, url)}
                              onSetUploadMethod={setUploadMethod}
                              currentUploadMethod={uploadMethod}
                            />
                          </td>
                          <td className="px-4 py-3 border-l border-slate-100 bg-slate-100/5">
                            <EvidenUploadCell 
                              noTugas={name}
                              evidenIdx={2}
                              evidenData={eviden}
                              isUploading={uploadingState[`${name}_2`] || false}
                              msg={uploadMessage[`${name}_2`]}
                              onUploadChange={(e) => handleFileUpload(e, name, 2)}
                              onDelete={() => handleDeletePhoto(name, 2)}
                              onManualSubmit={(url) => handleManualUrlSubmit(name, 2, url)}
                              onSetUploadMethod={setUploadMethod}
                              currentUploadMethod={uploadMethod}
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 font-extrabold uppercase tracking-widest bg-slate-50/50">
                        Tidak ada petugas berkinerja rendah yang cocok dengan kriteria pencarian
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-3 gap-3" id="admin_pagination_bar">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase">
              Menampilkan <span className="text-slate-800 font-black">{filteredRows.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> - <span className="text-slate-800 font-black">{Math.min(currentPage * itemsPerPage, filteredRows.length)}</span> dari <span className="text-blue-600 font-black">{filteredRows.length}</span> baris
            </span>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 px-1.5 bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 text-[8px] font-black uppercase disabled:opacity-45 transition-colors cursor-pointer"
                >
                  Prev
                </button>
                <span className="text-[10px] font-black text-slate-500 min-w-[60px] text-center">
                  Hlm {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 px-1.5 bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 text-[8px] font-black uppercase disabled:opacity-45 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-rose-500 text-white px-6 py-5 flex items-center gap-3">
                <AlertTriangle className="animate-pulse" size={24} />
                <h4 className="text-xs font-black tracking-widest uppercase text-white">KONFIRMASI PENGHAPUSAN</h4>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <p className="text-xs font-bold text-slate-600 uppercase leading-relaxed">
                  Apakah Anda yakin ingin menghapus data berikut dari sistem master? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-[10px] text-slate-800 space-y-1">
                  <p><strong className="text-slate-500 uppercase">TIPE:</strong> {confirmModal.type === 'petugas' ? 'PETUGAS YANTEK' : 'REGU CCTV'}</p>
                  <p><strong className="text-slate-500 uppercase">ID:</strong> {confirmModal.id}</p>
                  <p><strong className="text-slate-500 uppercase">NAMA:</strong> {confirmModal.name}</p>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, type: 'petugas', id: '', name: '' })}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 bg-white border border-slate-200 hover:bg-slate-150 cursor-pointer transition-all"
                >
                  BATALKAN
                </button>
                <button
                  onClick={async () => {
                    const { type, id, name } = confirmModal;
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    if (type === 'petugas') {
                      await handleDeletePetugas(id, name);
                    } else {
                      await handleDeleteReguCctv(id, name);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white bg-rose-600 hover:bg-rose-700 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={12} />
                  YA, HAPUS SEKARANG
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

// COMPACT CELL COMPONENT FOR UPLOADING
interface EvidenCellProps {
  noTugas: string;
  evidenIdx: 1 | 2;
  evidenData: EvidenUpload;
  isUploading: boolean;
  msg?: { type: 'success' | 'error', text: string };
  onUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: () => void;
  onManualSubmit: (url: string) => void;
  onSetUploadMethod?: (method: 'server' | 'gdrive') => void;
  currentUploadMethod?: 'server' | 'gdrive';
}

const EvidenUploadCell: React.FC<EvidenCellProps> = ({
  noTugas,
  evidenIdx,
  evidenData,
  isUploading,
  msg,
  onUploadChange,
  onDelete,
  onManualSubmit,
  onSetUploadMethod,
  currentUploadMethod
}) => {
  const photoUrl = evidenIdx === 1 ? evidenData.fotoEviden1 : evidenData.fotoEviden2;
  const fileName = evidenIdx === 1 ? evidenData.fileName1 : evidenData.fileName2;
  const uploadedAt = evidenIdx === 1 ? evidenData.uploadedAt1 : evidenData.uploadedAt2;
  
  const uniqueId = `file_input_${noTugas}_${evidenIdx}`;
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  const submitManual = () => {
    if (manualUrl.trim()) {
      onManualSubmit(manualUrl.trim());
      setIsManualInput(false);
      setManualUrl('');
    }
  };

  const isDrivePermissionError = msg && msg.type === 'error' && (
    msg.text.toLowerCase().includes('permission') ||
    msg.text.toLowerCase().includes('driveapp') ||
    msg.text.toLowerCase().includes('auth/drive') ||
    msg.text.toLowerCase().includes('authorization') ||
    msg.text.toLowerCase().includes('izin') ||
    msg.text.toLowerCase().includes('exception')
  );

  const isRlsPolicyError = msg && msg.type === 'error' && (
    msg.text.toLowerCase().includes('row-level security policy') ||
    msg.text.toLowerCase().includes('rls') ||
    msg.text.toLowerCase().includes('kebijakan keamanan') ||
    msg.text.toLowerCase().includes('keamanan tambahan')
  );

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {photoUrl ? (
        // IMAGE ALREADY UPLOADED VIEW
        <div className="flex items-center justify-between gap-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl p-2">
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Miniature thumbnail */}
            <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0 relative group/thumb">
              {photoUrl.startsWith('http') ? (
                <img 
                  src={photoUrl} 
                  alt="Eviden" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-cyan-150 flex items-center justify-center text-[8px] font-black text-cyan-800">
                  LINK
                </div>
              )}
              <a 
                href={photoUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity text-[8px] font-black"
                title="Buka Link Foto"
              >
                LIHAT
              </a>
            </div>
            
            <div className="overflow-hidden">
              <div className="flex items-center gap-1">
                <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                <span className="text-[8px] font-black text-emerald-800 uppercase tracking-tight truncate">SIAP TAMPIL</span>
              </div>
              <p className="text-[7px] text-slate-400 font-extrabold truncate mt-0.5" title={fileName}>
                {fileName || "File gambar"}
              </p>
              <p className="text-[6.5px] text-slate-650 font-semibold truncate">
                {uploadedAt || "-"}
              </p>
            </div>
          </div>

          <button
            onClick={onDelete}
            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors border border-rose-100 shrink-0 cursor-pointer"
            title="Hapus foto eviden ini"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ) : isManualInput ? (
        // MANUAL LINK ENTRY BOX
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col gap-1.5">
          <input 
            type="text"
            className="w-full bg-white px-2 py-1 text-[8.5px] font-bold text-slate-800 border border-slate-200 outline-none rounded focus:border-blue-500"
            placeholder="Tempel URL Direct Foto (HTTP/HTTPS)..."
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
          />
          <div className="flex items-center gap-1">
            <button
              onClick={submitManual}
              disabled={!manualUrl.trim()}
              className="flex-1 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[7.5px] font-black uppercase tracking-wider disabled:opacity-45 cursor-pointer"
            >
              Simpan
            </button>
            <button
              onClick={() => {
                setIsManualInput(false);
                setManualUrl('');
              }}
              className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 text-[7.5px] font-bold uppercase cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        // FILE UPLOADER INPUT VIEW WITH ALTERNATIVE MANUAL INPUT
        <div className="flex flex-col gap-1.5 w-full">
          <label 
            htmlFor={uniqueId}
            className={`border border-dashed rounded-xl px-3 py-2 flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
              isUploading 
                ? "bg-slate-50 border-blue-350 pointer-events-none" 
                : "bg-slate-50/50 hover:bg-slate-50 border-slate-300 hover:border-blue-400"
            }`}
          >
            {isUploading ? (
              <RefreshCw size={12} className="text-blue-500 animate-spin" />
            ) : (
              <Camera size={12} className="text-slate-400 shrink-0" />
            )}
            <span className={`text-[8px] uppercase tracking-wider font-extrabold ${isUploading ? "text-blue-500 font-black animate-pulse" : "text-slate-500"}`}>
              {isUploading ? "Mengunggah..." : "Upload Foto"}
            </span>
            <input 
              id={uniqueId}
              type="file" 
              accept="image/*"
              onChange={onUploadChange}
              disabled={isUploading}
              className="hidden" 
            />
          </label>
          
          {!isUploading && (
            <button
              onClick={() => setIsManualInput(true)}
              className="text-[7.5px] text-blue-600 hover:text-blue-700 font-black tracking-wider uppercase text-center mt-0.5"
            >
              Atau Input Link Manual
            </button>
          )}
        </div>
      )}

      {/* Upload response status messages */}
      {isRlsPolicyError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-2 mt-1 flex flex-col gap-1.5 text-left">
          <div className="flex items-start gap-1">
            <AlertTriangle size={11} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[7.5px] font-black text-rose-800 uppercase tracking-wide leading-tight">RLS Kebijakan Supabase</p>
              <p className="text-[7px] text-rose-650 font-bold leading-normal uppercase mt-0.5">
                Bucket "EVIDEN" Anda menolak unggahan anonim. Jalankan ini di SQL Editor Supabase Anda:
              </p>
            </div>
          </div>
          
          <pre className="text-[6px] leading-normal select-all bg-slate-900 text-emerald-400 p-1 rounded font-mono tracking-tight whitespace-pre-wrap max-h-[75px] overflow-y-auto">
{`CREATE POLICY "Buka Upload EVIDEN" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'EVIDEN');
CREATE POLICY "Buka Baca EVIDEN" ON storage.objects FOR SELECT TO public USING (bucket_id = 'EVIDEN');`}
          </pre>

          <button 
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`CREATE POLICY "Buka Upload EVIDEN" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'EVIDEN');\nCREATE POLICY "Buka Baca EVIDEN" ON storage.objects FOR SELECT TO public USING (bucket_id = 'EVIDEN');`);
              alert('Berhasil menyalin SQL! Buka SQL Editor di panel Supabase, tempel, lalu klik Run.');
            }}
            className="w-full py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[6.5px] font-black uppercase tracking-wider transition-all"
          >
            Salin Kode SQL
          </button>

          <div className="text-[6.5px] text-slate-500 uppercase leading-snug font-bold bg-white p-1.5 rounded border border-slate-100">
            <strong>Atau:</strong> Masuk ke tab Storage Supabase, ubah bucket <b>EVIDEN</b> menjadi <b>Public Bucket</b> di Bucket Settings, lalu Save.
          </div>
        </div>
      ) : isDrivePermissionError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex flex-col gap-2 mt-1">
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={12} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[8px] font-black text-rose-800 uppercase tracking-wide leading-tight">Izin Google Drive Ditolak</p>
              <p className="text-[7.5px] text-rose-650 font-bold leading-normal uppercase mt-0.5">
                Apps Script Anda tidak memiliki izin untuk menyimpan file ke Google Drive (DriveApp).
              </p>
            </div>
          </div>
          
          <div className="text-[7px] text-slate-500 uppercase leading-snug font-semibold bg-white p-2 rounded-lg border border-slate-100">
            <strong>Solusi Instan (Rekomendasi):</strong> Klik tombol di bawah untuk beralih ke <span className="text-blue-600 font-black">Portal Server (Utama)</span>. 100% langsung berhasil & bebas hambatan tanpa otorisasi!
          </div>

          {onSetUploadMethod && (
            <button
              onClick={() => {
                onSetUploadMethod('server');
                localStorage.setItem('upload_method', 'server');
              }}
              className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[7.5px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm text-center"
            >
              Gunakan Portal Server Sekarang
            </button>
          )}

          <div className="text-[7px] text-slate-500 uppercase leading-snug font-semibold bg-white p-2 rounded-lg border border-slate-100">
            <strong>Solusi Alternatif:</strong> Jalankan fungsi <code className="bg-slate-150 px-1 rounded text-blue-700 font-bold">otorisasiIzinDrive</code> secara manual di editor Google Apps Script Anda untuk memberikan izin DriveApp.
          </div>
        </div>
      ) : msg && (
        <span className={`text-[7px] font-black uppercase tracking-tight px-1 py-0.5 rounded ${
          msg.type === 'success' 
            ? "bg-emerald-50 text-emerald-600 line-clamp-2" 
            : "bg-rose-50 text-rose-600 line-clamp-3"
        }`}>
          {msg.text}
        </span>
      )}
    </div>
  );
};

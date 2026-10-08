'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Sparkles,
  Flame,
  Activity,
  ArrowRightLeft,
  Download,
  CloudCheck,
  AlertTriangle,
  Server,
  Layers,
  Compass,
  Bell,
  Video,
  Users,
  FolderKanban,
  Clock,
  Square,
  FileSpreadsheet,
  Sliders,
  ShieldCheck,
  Volume2,
  GraduationCap,
  ShieldAlert,
  Wind,
  Droplets,
  RotateCw,
  Zap,
  Power
} from 'lucide-react';
import { UserRole } from '@/types';

export interface TourStep {
  id: string;
  targetId: string;
  tab: 'dashboard' | 'control' | 'cctv' | 'logs' | 'alarms' | 'users' | 'sessions';
  title: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  tips?: string;
}

// ─── PANDUAN KHUSUS OPERATOR (MAHASISWA) ───
export const OPERATOR_TOUR_STEPS: TourStep[] = [
  // TAB 1: DASHBOARD
  {
    id: 'welcome-operator',
    targetId: 'tour-header-title',
    tab: 'dashboard',
    badge: 'Panduan Praktikum',
    icon: <GraduationCap className="w-5 h-5 text-sky-600" />,
    title: 'Selamat Datang di FluidHE',
    description: 'Platform IoT real-time untuk praktikum Heat Exchanger Laboratorium Teknik Kimia UAD.',
    tips: 'Ikuti panduan singkat ini untuk memahami alur operasi dan kontrol alat.'
  },
  {
    id: 'iot-status-operator',
    targetId: 'tour-iot-badge',
    tab: 'dashboard',
    badge: 'Koneksi Alat',
    icon: <Server className="w-5 h-5 text-emerald-500" />,
    title: 'Status Koneksi Alat',
    description: 'Menampilkan koneksi alat ke cloud. Hijau (ONLINE) menandakan data telemetri aktif diperbarui setiap detik.',
    tips: 'Jika OFFLINE, pastikan rig alat di lab tersambung listrik & WiFi.'
  },
  {
    id: 'system-status-operator',
    targetId: 'tour-system-status',
    tab: 'dashboard',
    badge: 'Sesi Praktikum',
    icon: <Clock className="w-5 h-5 text-sky-600" />,
    title: 'Mulai & Selesai Praktikum',
    description: '• Klik untuk mulai sesi dan mengisi nama kelompok.\n• Klik lagi saat selesai untuk mematikan sistem secara aman.',
    tips: 'Sisa batas waktu praktikum operator terpantau di bilah atas.'
  },
  {
    id: 'temp-cards-operator',
    targetId: 'tour-temp-cards',
    tab: 'dashboard',
    badge: 'Sensor Suhu (TI1 - TI4)',
    icon: <Activity className="w-5 h-5 text-orange-500" />,
    title: '4 Titik Sensor Suhu Utama',
    description: '• TI-1: Masuk Panas | TI-2: Keluar Panas\n• TI-3: Masuk Dingin | TI-4: Keluar Dingin',
    tips: 'Data utama untuk perhitungan efisiensi kalor dan nilai LMTD.'
  },
  {
    id: 'live-chart-operator',
    targetId: 'tour-live-chart',
    tab: 'dashboard',
    badge: 'Grafik Real-Time',
    icon: <Activity className="w-5 h-5 text-sky-600" />,
    title: 'Grafik Gelombang Suhu',
    description: 'Pantau respons termal live untuk memastikan sistem mencapai kondisi tunak (steady-state).',
    tips: 'Pilih rentang waktu (15m s/d 120m) sesuai kebutuhan pengujian.'
  },
  {
    id: 'flow-mode-operator',
    targetId: 'tour-flow-mode',
    tab: 'dashboard',
    badge: 'Pola Aliran',
    icon: <ArrowRightLeft className="w-5 h-5 text-sky-500" />,
    title: 'Pola Aliran Fluida (Flow Mode)',
    description: '• Co-Current: Aliran searah.\n• Counter-Current: Aliran berlawanan (efisiensi panas lebih tinggi).',
    tips: 'Katup solenoid SV1–SV4 otomatis berganti posisi saat dipilih.'
  },
  {
    id: 'pid-diagram-operator',
    targetId: 'tour-pid-diagram',
    tab: 'dashboard',
    badge: 'Skematik P&ID',
    icon: <Layers className="w-5 h-5 text-indigo-500" />,
    title: 'Visualisasi Aliran & Diagram P&ID',
    description: 'Diagram live jalur pipa, katup solenoid (SV1–SV4), heater, dan pompa sirkulasi.',
    tips: 'Pipa merah = fluida panas, pipa biru = fluida pendingin.'
  },

  // TAB 2: CONTROL PANEL (URUTAN OPERASIONAL 1 s/d 7)
  {
    id: 'ctrl-1-mode-operator',
    targetId: 'tour-control-mode',
    tab: 'control',
    badge: 'Langkah 1',
    icon: <Sparkles className="w-5 h-5 text-sky-600" />,
    title: '1. Mode Operasi (AUTO / MANUAL)',
    description: '• AUTO: PID mengatur suhu & katup otomatis.\n• MANUAL: Kendali mandiri tiap aktuator.',
    tips: 'Gunakan mode AUTO untuk praktikum modul standar.'
  },
  {
    id: 'ctrl-2-flow-operator',
    targetId: 'tour-flow-mode-control',
    tab: 'control',
    badge: 'Langkah 2',
    icon: <ArrowRightLeft className="w-5 h-5 text-sky-500" />,
    title: '2. Arah Aliran Fluida',
    description: 'Pilih Counter-Current atau Co-Current untuk mengatur konfigurasi katup solenoid.',
    tips: 'Perintah langsung terkirim otomatis ke mesin tanpa putar valve manual.'
  },
  {
    id: 'ctrl-3-temp-operator',
    targetId: 'tour-target-temp',
    tab: 'control',
    badge: 'Langkah 3',
    icon: <Flame className="w-5 h-5 text-amber-500" />,
    title: '3. Target Suhu & Heater 1',
    description: 'Atur target suhu (stepper +/-) lalu nyalakan Heater 1 (Pemanas Utama 500W).',
    tips: 'Heater 1 adalah pemanas primer di tangki air panas.'
  },
  {
    id: 'ctrl-4-heater2-operator',
    targetId: 'tour-heater-control',
    tab: 'control',
    badge: 'Langkah 4',
    icon: <Zap className="w-5 h-5 text-amber-600" />,
    title: '4. Booster Heater 2',
    description: 'Aktifkan Heater 2 (500W) untuk pemanasan cepat (daya total 1000W).',
    tips: 'Pada mode AUTO, Heater 2 otomatis mati saat mendekati target suhu.'
  },
  {
    id: 'ctrl-5-pump-operator',
    targetId: 'tour-pump-control',
    tab: 'control',
    badge: 'Langkah 5',
    icon: <RotateCw className="w-5 h-5 text-sky-600" />,
    title: '5. Pompa Sirkulasi Air Panas',
    description: 'Nyalakan pompa untuk mengalirkan air panas ke modul pipa Heat Exchanger.',
    tips: 'Pastikan pompa menyala agar distribusi panas merata.'
  },
  {
    id: 'ctrl-6-cold-operator',
    targetId: 'tour-cold-valve',
    tab: 'control',
    badge: 'Langkah 6',
    icon: <Droplets className="w-5 h-5 text-blue-600" />,
    title: '6. Katup Solenoid Air Dingin',
    description: 'Membuka pasokan air pendingin ke bagian jacket penukar panas.',
    tips: 'Mode AUTO membuka katup ini secara otomatis sebagai proteksi.'
  },

  // TAB 3: DATA LOGS & LAPORAN
  {
    id: 'logs-export-operator',
    targetId: 'tour-logs-tab',
    tab: 'logs',
    badge: 'Laporan & Ekspor',
    icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
    title: 'Tabel Telemetri & Unduh Excel',
    description: 'Data tercatat otomatis per detik. Unduh file spreadsheet Excel (.xlsx) untuk analisis data.',
    tips: 'Format Excel sudah rapi dengan lebar kolom yang otomatis teratur.'
  },

  // TAB 4: ALARM SYSTEM
  {
    id: 'alarms-operator',
    targetId: 'tour-alarm-settings',
    tab: 'alarms',
    badge: 'Alarm Keamanan',
    icon: <Bell className="w-5 h-5 text-rose-500" />,
    title: 'Sistem Alarm & Sirene',
    description: 'Sirene dan notifikasi aktif jika suhu TI-1 atau beda tekanan ΔP melebihi batas aman.',
    tips: 'Klik "Mengerti" pada popup untuk membisukan sirene sementara.'
  }
];

// ─── PANDUAN KHUSUS MASTER ADMIN (DOSEN / LABORAN) ───
export const ADMIN_TOUR_STEPS: TourStep[] = [
  // TAB 1: DASHBOARD
  {
    id: 'welcome-admin',
    targetId: 'tour-header-title',
    tab: 'dashboard',
    badge: 'Master Admin',
    icon: <ShieldCheck className="w-5 h-5 text-sky-600" />,
    title: 'Portal Master Admin',
    description: 'Akses penuh kendali hardware, pengawasan seluruh kelas, CCTV, dan manajemen pengguna.',
    tips: 'Gunakan panel ini untuk mengelola jalannya praktikum di laboratorium.'
  },
  {
    id: 'system-status-admin',
    targetId: 'tour-system-status',
    tab: 'dashboard',
    badge: 'Status Operasional',
    icon: <Clock className="w-5 h-5 text-emerald-600" />,
    title: 'Kontrol Status Mesin',
    description: 'Pantau status rig live dan lakukan safe shutdown kapan saja tanpa batasan waktu.',
    tips: 'Safe shutdown mematikan heater dan mengarsipkan data secara otomatis.'
  },
  {
    id: 'temp-cards-admin',
    targetId: 'tour-temp-cards',
    tab: 'dashboard',
    badge: 'Master Telemetri',
    icon: <Activity className="w-5 h-5 text-orange-500" />,
    title: 'Monitoring Multivariat Sensor',
    description: 'Pantau 4 sensor suhu (TI1-TI4), 4 sensor tekanan (PI1-PI4), dan 2 flow meter (FC1, FC2).',
    tips: 'Data tersinkronisasi dengan delay sub-detik ke cloud database.'
  },
  {
    id: 'live-chart-admin',
    targetId: 'tour-live-chart',
    tab: 'dashboard',
    badge: 'Grafik Termal',
    icon: <Activity className="w-5 h-5 text-sky-600" />,
    title: 'Grafik Gelombang Suhu',
    description: 'Analisis tren multi-kanal real-time untuk evaluasi kondisi tunak dan transfer kalor.',
    tips: 'Pilih durasi sesi untuk melihat kurva kenaikan suhu.'
  },
  {
    id: 'flow-mode-admin',
    targetId: 'tour-flow-mode',
    tab: 'dashboard',
    badge: 'Pola Aliran',
    icon: <ArrowRightLeft className="w-5 h-5 text-sky-500" />,
    title: 'Pola Aliran Fluida (Flow Mode)',
    description: 'Beralih instan antara Counter-Current (efisiensi maksimal) dan Co-Current (searah).',
    tips: 'Relay 4 katup solenoid SV1–SV4 otomatis berpindah posisi secara live.'
  },
  {
    id: 'pid-diagram-admin',
    targetId: 'tour-pid-diagram',
    tab: 'dashboard',
    badge: 'P&ID Digital Twin',
    icon: <Layers className="w-5 h-5 text-indigo-500" />,
    title: 'Visualisasi Aliran Fluida & Diagram P&ID',
    description: 'Skematik live status 4 Solenoid Valve (SV1-SV4), Dual Heater, pompa, dan jalur fluida.',
    tips: 'Arah aliran pipa menyesuaikan secara real-time dengan mode yang dipilih.'
  },

  // TAB 2: CONTROL PANEL (URUTAN OPERASIONAL 1 s/d 7)
  {
    id: 'ctrl-1-mode-admin',
    targetId: 'tour-control-mode',
    tab: 'control',
    badge: 'Langkah 1',
    icon: <Sparkles className="w-5 h-5 text-sky-600" />,
    title: '1. Mode Operasi (AUTO / MANUAL)',
    description: '• AUTO: Sistem mengatur daya pemanas & katup secara otomatis.\n• MANUAL: Uji mandiri tiap aktuator.',
    tips: 'Mode kendali langsung tersinkron ke mesin di lab.'
  },
  {
    id: 'ctrl-2-flow-admin',
    targetId: 'tour-flow-mode-control',
    tab: 'control',
    badge: 'Langkah 2',
    icon: <ArrowRightLeft className="w-5 h-5 text-sky-500" />,
    title: '2. Arah Aliran Fluida',
    description: 'Konfigurasi Counter-Current / Co-Current tersinkron langsung ke relay katup SV1-SV4.',
    tips: 'Dapat diubah saat sesi berjalan untuk studi komparasi termal.'
  },
  {
    id: 'ctrl-3-temp-admin',
    targetId: 'tour-target-temp',
    tab: 'control',
    badge: 'Langkah 3',
    icon: <Flame className="w-5 h-5 text-amber-500" />,
    title: '3. Setpoint Suhu & Heater 1',
    description: 'Tetapkan target suhu (30°C - 90°C) dan aktifkan saklar Heater 1 (500W).',
    tips: 'Sensor TI-1 menjadi feedback loop utama algoritma PID.'
  },
  {
    id: 'ctrl-4-heater2-admin',
    targetId: 'tour-heater-control',
    tab: 'control',
    badge: 'Langkah 4',
    icon: <Zap className="w-5 h-5 text-amber-600" />,
    title: '4. Booster Heater 2 (Daya 1000W)',
    description: 'Aktifkan Heater 2 (500W) untuk kapasitas ganda 1000W pemanasan cepat.',
    tips: 'Mencegah overshoot suhu dengan cutoff otomatis saat mendekati setpoint.'
  },
  {
    id: 'ctrl-5-pump-admin',
    targetId: 'tour-pump-control',
    tab: 'control',
    badge: 'Langkah 5',
    icon: <RotateCw className="w-5 h-5 text-sky-600" />,
    title: '5. Pompa Sirkulasi Fluida Panas',
    description: 'Nyalakan pompa untuk mendistribusikan air panas menuju modul penukar panas.',
    tips: 'Debit fluida terpantau pada flow meter FC-1.'
  },
  {
    id: 'ctrl-6-cold-admin',
    targetId: 'tour-cold-valve',
    tab: 'control',
    badge: 'Langkah 6',
    icon: <Droplets className="w-5 h-5 text-blue-600" />,
    title: '6. Katup Solenoid Air Dingin',
    description: 'Mengatur pasokan air pendingin dari tangki reservoir.',
    tips: 'Mode AUTO membuka katup otomatis sebagai proteksi interlock pendingin.'
  },
  {
    id: 'ctrl-7-steam-admin',
    targetId: 'tour-steam-valve',
    tab: 'control',
    badge: 'Langkah 7',
    icon: <Wind className="w-5 h-5 text-teal-600" />,
    title: '7. Katup Solenoid Pelepas Uap',
    description: 'Mengatur pelepasan uap berkala dari tangki pemanas untuk mencegah overpressure.',
    tips: 'Safety Open aktif otomatis jika tekanan tangki melebihi batas aman.'
  },

  // TAB 3: DATA LOGS & LAPORAN
  {
    id: 'logs-admin',
    targetId: 'tour-logs-tab',
    tab: 'logs',
    badge: 'Master Dataset',
    icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
    title: 'Master Excel Seluruh Kelas',
    description: 'Akses seluruh rekaman praktikum dan unduh Master Excel agregat semua kelompok.',
    tips: 'Format spreadsheet sudah otomatis rapi tanpa teks terpotong.'
  },

  // TAB 4: ALARM SYSTEM
  {
    id: 'alarms-admin',
    targetId: 'tour-alarm-settings',
    tab: 'alarms',
    badge: 'Proteksi TRIP',
    icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
    title: 'Ambang Batas Alarm & TRIP',
    description: 'Atur batas kritis suhu maksimum (TI1) dan beda tekanan maksimum ΔP.',
    tips: 'Tombol Emergency Stop di header siaga memutus daya seketika.'
  },

  // TAB 5: DATA PRAKTIKUM (SESSIONS)
  {
    id: 'session-manager-admin',
    targetId: 'tour-session-manager',
    tab: 'sessions',
    badge: 'Kelola Praktikum',
    icon: <FolderKanban className="w-5 h-5 text-sky-600" />,
    title: 'Manajemen Arsip Praktikum',
    description: 'Edit judul sesi, seleksi massal checkbox, unduh multi-file Excel, atau hapus sesi.',
    tips: 'Sesi yang sedang berjalan terlindungi otomatis dari penghapusan.'
  },

  // TAB 6: CCTV FEED
  {
    id: 'cctv-admin',
    targetId: 'tour-cctv-tab',
    tab: 'cctv',
    badge: 'CCTV Live Lab',
    icon: <Video className="w-5 h-5 text-purple-600" />,
    title: 'CCTV WebRTC & Kendali PTZ',
    description: 'Streaming video HD WebRTC lab ultra-low latency dilengkapi kendali arah kamera (PTZ).',
    tips: 'Gunakan preset arah untuk melihat tangki, katup, atau rig alat.'
  },

  // TAB 7: USER MANAGEMENT
  {
    id: 'user-manager-admin',
    targetId: 'tour-user-manager',
    tab: 'users',
    badge: 'Manajemen Akun',
    icon: <Users className="w-5 h-5 text-blue-600" />,
    title: 'Manajemen Pengguna & Batas Waktu',
    description: 'Tambah akun dosen/mahasiswa, atur durasi batas sesi praktikum, dan hak akses jadwal.',
    tips: 'Dapat membatasi jadwal praktikum sesuai jadwal kelas mahasiswa.'
  }
];

export interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  userRole?: UserRole;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

function checkOverlap(
  boxA: { top: number; left: number; width: number; height: number },
  boxB: { top: number; left: number; width: number; height: number },
  margin = 12
): boolean {
  return !(
    boxA.left + boxA.width + margin < boxB.left ||
    boxA.left > boxB.left + boxB.width + margin ||
    boxA.top + boxA.height + margin < boxB.top ||
    boxA.top > boxB.top + boxB.height + margin
  );
}

export default function GuidedTour({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  userRole = 'operator'
}: GuidedTourProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(userRole);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [bubblePosition, setBubblePosition] = useState<{ top: number; left: number }>({
    top: 100,
    left: 100
  });
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const bubbleRef = useRef<HTMLDivElement>(null);

  const currentSteps = selectedRole === 'admin' ? ADMIN_TOUR_STEPS : OPERATOR_TOUR_STEPS;
  const step = currentSteps[currentStepIndex] || currentSteps[0];

  // Sync initial role when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(userRole);
      setCurrentStepIndex(0);
      setIsCompleted(false);
    }
  }, [isOpen, userRole]);

  // Smart non-overlapping position calculator
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !step) return;

    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

      const rect = el.getBoundingClientRect();
      const padding = 8;

      const tRect: TargetRect = {
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        right: rect.right + padding,
        bottom: rect.bottom + padding
      };
      setTargetRect(tRect);

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardW = Math.min(410, vw - 32);
      const cardH = bubbleRef.current ? bubbleRef.current.offsetHeight : 360;

      const safeLeft = vw >= 768 ? 276 : 16;
      const safeTop = 72;
      const safeRight = vw - 16;
      const safeBottom = vh - 16;

      let finalTop = safeBottom - cardH - 12;
      let finalLeft = safeRight - cardW - 12;

      if (vw < 768) {
        const targetCenterY = tRect.top + tRect.height / 2;
        if (targetCenterY < vh / 2) {
          finalTop = Math.max(safeTop, vh - cardH - 16);
        } else {
          finalTop = safeTop + 8;
        }
        finalLeft = Math.max(16, (vw - cardW) / 2);
      } else {
        const tCenterX = tRect.left + tRect.width / 2;
        const mainContentCenterX = safeLeft + (vw - safeLeft) / 2;
        const isTargetOnRightSide = tCenterX >= mainContentCenterX;
        const isTargetInUpperHalf = tRect.top + tRect.height / 2 < vh / 2;

        const candidates: { left: number; top: number; score: number }[] = [];

        if (isTargetOnRightSide) {
          const adjLeft = tRect.left - cardW - 24;
          if (adjLeft >= safeLeft) {
            candidates.push({
              left: adjLeft,
              top: Math.max(safeTop, Math.min(safeBottom - cardH, tRect.top)),
              score: 100
            });
          }

          candidates.push({
            left: safeLeft + 12,
            top: safeBottom - cardH - 12,
            score: 80
          });

          candidates.push({
            left: safeLeft + 12,
            top: safeTop + 12,
            score: 70
          });

          if (tRect.bottom + cardH + 20 <= safeBottom) {
            candidates.push({
              left: Math.max(safeLeft, Math.min(safeRight - cardW, tRect.left)),
              top: tRect.bottom + 16,
              score: 60
            });
          }
        } else {
          const adjRight = tRect.right + 24;
          if (adjRight + cardW <= safeRight) {
            candidates.push({
              left: adjRight,
              top: Math.max(safeTop, Math.min(safeBottom - cardH, tRect.top)),
              score: 100
            });
          }

          candidates.push({
            left: safeRight - cardW - 12,
            top: safeBottom - cardH - 12,
            score: 80
          });

          candidates.push({
            left: safeRight - cardW - 12,
            top: safeTop + 12,
            score: 70
          });

          if (tRect.bottom + cardH + 20 <= safeBottom) {
            candidates.push({
              left: Math.max(safeLeft, Math.min(safeRight - cardW, tRect.left)),
              top: tRect.bottom + 16,
              score: 60
            });
          }
        }

        candidates.push({
          left: isTargetOnRightSide ? safeLeft + 12 : safeRight - cardW - 12,
          top: isTargetInUpperHalf ? safeBottom - cardH - 12 : safeTop + 12,
          score: 40
        });

        let bestCandidate = candidates.find((c) => {
          return !checkOverlap({ top: c.top, left: c.left, width: cardW, height: cardH }, tRect, 16);
        });

        if (!bestCandidate && candidates.length > 0) {
          bestCandidate = candidates[0];
        }

        if (bestCandidate) {
          finalLeft = bestCandidate.left;
          finalTop = bestCandidate.top;
        }
      }

      const clampedTop = Math.max(safeTop, Math.min(finalTop, safeBottom - cardH));
      const clampedLeft = Math.max(16, Math.min(finalLeft, vw - cardW - 16));

      setBubblePosition({ top: clampedTop, left: clampedLeft });
    } else {
      setTargetRect(null);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardW = Math.min(410, vw - 32);
      const cardH = bubbleRef.current ? bubbleRef.current.offsetHeight : 360;
      setBubblePosition({
        top: Math.max(80, vh - cardH - 24),
        left: Math.max(16, vw - cardW - 24)
      });
    }
  }, [isOpen, step]);

  // Tab switching sync
  useEffect(() => {
    if (!isOpen || !step) return;

    if (activeTab !== step.tab) {
      setActiveTab(step.tab);
    }

    const timer1 = setTimeout(() => {
      updateTargetPosition();
    }, 80);

    const timer2 = setTimeout(() => {
      updateTargetPosition();
    }, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, currentStepIndex, step, activeTab, setActiveTab, updateTargetPosition]);

  // Window resize & scroll sync
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => updateTargetPosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, updateTargetPosition]);

  // Re-calculate after bubble DOM renders
  useEffect(() => {
    if (isOpen && bubbleRef.current) {
      updateTargetPosition();
    }
  }, [isOpen, currentStepIndex, selectedRole, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIndex < currentSteps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          setIsCompleted(true);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, currentSteps.length, onClose]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setCurrentStepIndex(0);
    setIsCompleted(false);
  };

  const handleFinish = () => {
    setIsCompleted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto overflow-hidden font-sans">
      {/* ─── CRYSTAL-CLEAR SVG SPOTLIGHT CUTOUT ─── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && !isCompleted && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>

        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.55)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto cursor-pointer"
          onClick={onClose}
        />
      </svg>

      {/* ─── HIGHLIGHT BORDER OVER THE TARGET FEATURE ─── */}
      {targetRect && !isCompleted && (
        <div
          className="absolute transition-all duration-300 ease-out rounded-2xl pointer-events-none z-20 ring-4 ring-sky-400/90 shadow-[0_0_35px_rgba(56,189,248,0.75)]"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`
          }}
        >
          <div className="absolute inset-0 rounded-2xl border-2 border-white/90 animate-pulse" />
        </div>
      )}

      {/* ─── COMPLETION CARD ─── */}
      {isCompleted ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-30">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200 space-y-3.5">
            <div className="w-11 h-11 bg-gradient-to-tr from-emerald-400 to-teal-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/25">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200 uppercase tracking-wider">
                Panduan Selesai
              </span>
              <h3 className="text-base font-black text-slate-900">
                Siap Memulai Praktikum!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {selectedRole === 'admin'
                  ? 'Anda siap mengontrol alat, memantau telemetri, dan mengelola arsip data.'
                  : 'Anda siap menjalankan sesi praktikum, mengoperasikan alat, dan mengunduh data laporan.'}
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                Panduan dapat dibuka kembali lewat tombol <strong>"Panduan"</strong> di atas.
              </span>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition active:scale-[0.98] cursor-pointer"
            >
              Mulai Eksplorasi Dashboard
            </button>
          </div>
        </div>
      ) : (
        /* ─── DOCKED TOUR CARD ─── */
        <div
          ref={bubbleRef}
          className="absolute transition-all duration-300 ease-out z-30 pointer-events-auto max-h-[calc(100vh-80px)] flex flex-col"
          style={{
            top: `${bubblePosition.top}px`,
            left: `${bubblePosition.left}px`,
            maxWidth: '410px',
            width: 'calc(100vw - 32px)'
          }}
        >
          <div className="relative bg-white/98 backdrop-blur-md rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-100 ring-1 ring-slate-900/10 space-y-3 overflow-y-auto max-h-[calc(100vh-80px)]">
            
            {/* Role Switcher Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => handleRoleChange('operator')}
                className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  selectedRole === 'operator'
                    ? 'bg-white text-sky-800 shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
                <span>Operator (Mahasiswa)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'bg-white text-sky-800 shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Master Admin (Dosen)</span>
              </button>
            </div>

            {/* Header: Badge Step & Close Button */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-50 rounded-xl border border-sky-100 shrink-0">
                  {step.icon}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 block">
                    {step.badge}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Langkah {currentStepIndex + 1} dari {currentSteps.length}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Tutup Panduan (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                {step.title}
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {step.description}
              </p>

              {step.tips && (
                <div className="mt-1.5 p-2.5 bg-sky-50/90 rounded-xl border border-sky-200/80 text-[10px] sm:text-[10.5px] text-sky-950 leading-relaxed font-medium">
                  {step.tips}
                </div>
              )}
            </div>

            {/* Progress Dots Indicator */}
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {currentSteps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-5 bg-sky-600'
                      : idx < currentStepIndex
                      ? 'w-2 bg-sky-300'
                      : 'w-1.5 bg-slate-200'
                  }`}
                  title={`Lompat ke Langkah ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 transition cursor-pointer"
              >
                Lewati
              </button>

              <div className="flex items-center gap-1.5">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition active:scale-95 cursor-pointer"
                >
                  {currentStepIndex === currentSteps.length - 1 ? (
                    <>
                      Selesai <CheckCircle2 className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Lanjut <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

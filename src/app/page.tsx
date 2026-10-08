'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { uploadToCloud } from '@/lib/supabase-upload';
import { uploadToDrive } from '@/lib/drive-upload';
import { useSupabaseIntegration } from '@/hooks/useSupabaseIntegration';
import GuidedTour from '@/components/GuidedTour';
import CCTVHistory from '@/components/CCTVHistory';
import {
  Droplets,
  Thermometer,
  Gauge,
  Activity,
  Shield,
  ShieldAlert,
  Users,
  Video,
  FileText,
  FileSpreadsheet,
  Sliders,
  Power,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Download,
  Cloud,
  CloudCheck,
  Calendar,
  Database,
  HardDrive,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  UserPlus,
  HelpCircle,
  RefreshCw,
  LogOut,
  ChevronRight,
  Eye,
  EyeOff,
  Camera,
  Play,
  Pause,
  Maximize2,
  Folder,
  FolderKanban,
  Volume2,
  VolumeX,
  X,
  Plus,
  Edit2,
  Trash2,
  Server,
  Layers,
  ArrowRightLeft,
  Columns,
  Sparkles,
  Lock,
  Cpu,
  Info,
  Clock,
  Settings,
  Flame,
  Sun,
  Moon,
  Code,
  Terminal,
  Zap,
  Check,
  Menu,
  Radio,
  Mail,
  Key,
  Send,
  Mic,
  MicOff,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Compass,
  Film,
  Square,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Disc,
  Volume1
} from 'lucide-react';
import {
  TelemetryCards,
  PidDiagram,
  LiveChart,
  StatCards
} from '@/components/dashboard';
import {
  HeaterControl,
  DualHeatersControl,
  FlowModeSelector,
  ServoControl,
  TargetTempSlider,
  SteamValveControl,
  FlowAndValvesControl,
  PumpControl
} from '@/components/control';
import {
  SystemStatusBadge,
  SystemStandbyScreen,
  SystemStartupModal,
  SessionSummaryModal,
  LogoutConfirmModal
} from '@/components/system';
import { LoginScreen } from '@/components/auth';
import { CctvTab } from '@/components/cctv';
import { LogsTab } from '@/components/logs';
import { AlarmsTab } from '@/components/alarms';
import { UsersTab } from '@/components/users';
import { SessionManagerTab } from '@/components/sessions';
import {
  calculateLMTD,
  calculateAutoControlParameters,
  calculatePressureDrop
} from '@/lib/calculations';
import {
  exportSessionToExcel,
  exportMasterAllClassesExcel
} from '@/lib/excel-export';
import {
  UserRole,
  UserItem,
  TelemetryPoint,
  AlarmEvent,
  FlowMode,
  SystemOperationalStatus,
  SystemSession,
  ControlMode
} from '@/types';




export default function FluidHEDashboard() {
  // ─── SUPABASE INTEGRATION HOOK (REALTIME MONITORING & BIDIRECTIONAL CONTROL) ───
  const {
    connectionStatus: supabaseStatus,
    isHardwareOnline,
    errorMessage: supabaseError,
    currentAnonKey,
    saveAnonKey,
    latestTelemetry: supabaseTelemetry,
    telemetryStream,
    deviceControls: supabaseControls,
    activeMomentaryButtons,
    isUpdatingControl,
    handleFlowModeChange,
    handleControlModeChange,
    handleHeaterPowerToggle,
    handleHeater1PowerToggle,
    handleHeater2PowerToggle,
    handleTargetTempChange,
    handleThermostatLimitsChange,
    handleThermostatSetupChange,
    handleSensorCalibrationChange,
    handleServoAngleChange,
    handleValve1Change,
    handleValve2Change,
    handleTargetFlowChange,
    handleUapStatusToggle,
    handleUapAutoToggle,
    handleUapIntervalChange,
    handleAirDinginToggle,
    handlePompaToggle,
    handleStepButtonPress,
    handleSystemStart,
    handleSystemShutdown,
    handleEmergencyShutdown,
    handleTriggerPowerPush
  } = useSupabaseIntegration();

  // Dynamic Temperature Labels based on Active flow_mode ("COUNTER" vs "CO-CURRENT")
  const tempLabels = useMemo(() => {
    const isCounter = (supabaseControls?.flow_mode || 'COUNTER') === 'COUNTER';
    if (isCounter) {
      return {
        t1: 'Termostat T1 (Hot In)',
        t2: 'Termostat T2 (Cold Out)',
        t3: 'Termostat T3 (Cold In)',
        t4: 'Termostat T4 (Hot Out)',
      };
    } else {
      return {
        t1: 'Termostat T1 (Hot Out)',
        t2: 'Termostat T2 (Cold Out)',
        t3: 'Termostat T3 (Cold In)',
        t4: 'Termostat T4 (Hot In)',
      };
    }
  }, [supabaseControls?.flow_mode]);

  useEffect(() => {
    if (supabaseControls?.flow_mode) {
      setOperationMode(supabaseControls.flow_mode === 'CO-CURRENT' ? 'Co-Current' : 'Counter-Current');
    }
  }, [supabaseControls?.flow_mode]);

  useEffect(() => {
    if (supabaseControls?.servo_angle !== undefined) {
      setFc1Valve(supabaseControls.servo_angle);
    }
  }, [supabaseControls?.servo_angle]);

  useEffect(() => {
    if (supabaseControls?.servo_angle_2 !== undefined) {
      setFc2Valve(supabaseControls.servo_angle_2);
    }
  }, [supabaseControls?.servo_angle_2]);

  const [inputAnonKey, setInputAnonKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  // ─── VISUAL IOT SYNC TRANSMISSION FEEDBACK ───
  const [syncFeedback, setSyncFeedback] = useState<{
    active: boolean;
    message: string;
    detail: string;
    type: 'syncing' | 'success' | 'idle';
  }>({
    active: false,
    message: 'Tersinkronisasi',
    detail: 'Semua perintah terkirim ke mesin',
    type: 'idle'
  });

  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSyncFeedback = (commandName: string, valueStr: string) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    // Step 1: Visual sending status
    setSyncFeedback({
      active: true,
      message: `Mengirim: ${commandName} (${valueStr})`,
      detail: `Data sedang dikirim ke mesin laboratorium...`,
      type: 'syncing'
    });

    // Step 2: Smooth transition to Success Ack after 500ms
    setTimeout(() => {
      setSyncFeedback({
        active: true,
        message: `Tersinkron: ${commandName}`,
        detail: `Nilai ${valueStr} berhasil diterima & aktif di mesin.`,
        type: 'success'
      });
    }, 500);

    // Step 3: Hold visibly for 3 seconds then fade out
    syncTimerRef.current = setTimeout(() => {
      setSyncFeedback((prev) => ({ ...prev, active: false, type: 'idle' }));
    }, 3200);
  };

  // ─── AUTO-CONTROL PARAMETER REGULATION FUNCTION ───
  const applyAutoControl = (targetTemp: number) => {
    const { autoServo, autoFc1, autoFc2 } = calculateAutoControlParameters(targetTemp);
    setFc1Valve(autoFc1);
    setFc2Valve(autoFc2);
    setHeaterMasterPower(true);
    handleServoAngleChange(autoServo);
    handleHeaterPowerToggle(true);
  };


  // ─── CLIENT HYDRATION MOUNT SHIELD ───
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // ─── AUTH & ROLE STATE (PERSISTENT ACROSS PAGE REFRESH) ───
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: UserRole }>({
    name: '',
    email: '',
    role: 'operator'
  });
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>('operator');

  // ─── NAVIGATION & TOUR STATE (PERSISTENT ACTIVE TAB) ───
  const [activeTab, setActiveTabState] = useState<'dashboard' | 'control' | 'cctv' | 'cctv-history' | 'logs' | 'alarms' | 'users' | 'sessions'>('dashboard');

  const setActiveTab = useCallback((tab: 'dashboard' | 'control' | 'cctv' | 'cctv-history' | 'logs' | 'alarms' | 'users' | 'sessions') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('fluidhe_active_tab', tab);
    } catch (e) {}
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isCloudDriveModalOpen, setIsCloudDriveModalOpen] = useState<boolean>(false);
  const [cloudLastSyncTime, setCloudLastSyncTime] = useState<string>(new Date().toLocaleTimeString('id-ID'));
  useEffect(() => {
    try {
      localStorage.removeItem('fluidhe_theme');
      document.documentElement.classList.remove('dark');
    } catch (e) { }
  }, []);

  // ─── 24/7 CCTV HISTORY RECORDINGS STATES ───
  const [recordings, setRecordings] = useState<any[]>([]);
  const [activeRecording, setActiveRecording] = useState<string | null>(null);

  const fetchRecordings = async () => {
    try {
      const res = await fetch('/api/cctv/recordings');
      const data = await res.json();
      setRecordings(data.recordings || []);
    } catch (err) {
      console.error('Fetch recordings error:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'cctv-history') {
      fetchRecordings();
    }
  }, [activeTab]);

  // ─── OPERATOR PRACTICE SESSION COUNTDOWN STATE (ADMIN MANAGED) ───
  const [operatorSessionLimit, setOperatorSessionLimit] = useState<number>(30); // minutes
  const [operatorSessionRemaining, setOperatorSessionRemaining] = useState<number>(1800); // seconds
  const [isSessionInfoModalOpen, setIsSessionInfoModalOpen] = useState<boolean>(false);
  const [sessionExpiredModal, setSessionExpiredModal] = useState<boolean>(false);
  const [scheduleRestrictionNotice, setScheduleRestrictionNotice] = useState<string | null>(null);

  // ─── CONTROL STATES ───
  const [heaterMasterPower, setHeaterMasterPower] = useState<boolean>(true);
  const [tc1Setpoint, setTc1Setpoint] = useState<number>(65); // 30 - 90 °C
  const [fc1Valve, setFc1Valve] = useState<number>(100); // 0 - 100 % (Hot Valve)
  const [fc2Valve, setFc2Valve] = useState<number>(100); // 0 - 100 % (Cold Valve)
  const [operationMode, setOperationMode] = useState<'Counter-Current' | 'Co-Current'>('Counter-Current');
  const [emergencyStopped, setEmergencyStopped] = useState<boolean>(false);

  // ─── SAFETY & WARNING SYSTEM STATES ───
  const [primingNotice, setPrimingNotice] = useState<string | null>(null);
  const [heatingTimerSeconds, setHeatingTimerSeconds] = useState<number>(0);
  const [show1MinWarning, setShow1MinWarning] = useState<boolean>(false);
  const [isCriticalWarningDismissed, setIsCriticalWarningDismissed] = useState<boolean>(false);

  // ─── ALARM THRESHOLDS & AUDIO ───
  const [ti1MaxThreshold, setTi1MaxThreshold] = useState<number>(75.0);
  const [deltaPMaxThreshold, setDeltaPMaxThreshold] = useState<number>(2.0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);

  // ─── DATA & HISTORY STATES ───
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);

  // ─── SYSTEM OPERATIONAL READINESS & SESSION LIFECYCLE (ANTI-DATA TERCAMPUR) ───
  const [systemState, setSystemState] = useState<SystemOperationalStatus>('OFF');
  const [currentSession, setCurrentSession] = useState<SystemSession | null>(null);
  const [archivedSessions, setArchivedSessions] = useState<SystemSession[]>([]);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [isStartupModalOpen, setIsStartupModalOpen] = useState<boolean>(false);
  const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState<boolean>(false);
  const [isLogoutConfirmModalOpen, setIsLogoutConfirmModalOpen] = useState<boolean>(false);
  const [isLoggingOutWithShutdown, setIsLoggingOutWithShutdown] = useState<boolean>(false);
  const [selectedLogsSessionId, setSelectedLogsSessionId] = useState<string>('CURRENT');

  // Role-based Master Classes Filtering (Admin can view all classes or filter per class)
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [classesList, setClassesList] = useState<Array<{ operatorEmail: string; operatorName: string; classGroup?: string; count: number }>>([]);

  // Fetch role-isolated sessions from server (Server Master Database)
  const fetchSessions = useCallback(async (role: string, email: string, classFilterVal?: string) => {
    try {
      const q = new URLSearchParams({
        role: role || 'operator',
        email: email || '',
        classFilter: classFilterVal || 'ALL'
      });
      const res = await fetch(`/api/sessions?${q.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setArchivedSessions(data.sessions);
        if (data.classesList) {
          setClassesList(data.classesList);
        }

        // Jika user memilih filter kelas spesifik, langsung pilih sesi pertama dari kelas tersebut
        if (classFilterVal && classFilterVal !== 'ALL') {
          if (data.sessions.length > 0) {
            setSelectedLogsSessionId(data.sessions[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch sessions from server:', err);
    }
  }, []);

  // Sync sessions whenever user identity or classFilter changes
  useEffect(() => {
    if (isLoggedIn && currentUser?.email) {
      fetchSessions(currentUser.role, currentUser.email, classFilter);
    }
  }, [isLoggedIn, currentUser?.email, currentUser?.role, classFilter, fetchSessions]);

  // ─── RESTORE RUNNING SESSION & AUTH ON PAGE LOAD (ANTI KELUAR / ANTI DATA HILANG SAAT REFRESH) ───
  useEffect(() => {
    try {
      // Bersihkan data legacy auth dari localStorage agar setiap membuka browser / tab baru selalu dimulai dari Login
      try {
        localStorage.removeItem('fluidhe_auth_user');
        localStorage.removeItem('fluidhe_is_logged_in');
      } catch (e) {}

      // 1. Sinkronkan status autentikasi dari sessionStorage (hanya aktif per tab yang sedang dibuka, aman saat reload F5)
      const savedAuth = sessionStorage.getItem('fluidhe_auth_user');
      const savedIsLoggedIn = sessionStorage.getItem('fluidhe_is_logged_in');
      if (savedIsLoggedIn === 'true' && savedAuth) {
        try {
          const parsedUser = JSON.parse(savedAuth);
          if (parsedUser?.email) {
            setCurrentUser(parsedUser);
            setIsLoggedIn(true);
          }
        } catch (e) {}
      }

      // 2. Pulihkan tab aktif terakhir
      const savedTab = localStorage.getItem('fluidhe_active_tab') as any;
      if (savedTab && ['dashboard', 'control', 'cctv', 'cctv-history', 'logs', 'alarms', 'users', 'sessions'].includes(savedTab)) {
        setActiveTabState(savedTab);
      }

      // 3. Pulihkan sesi pengukuran yang sedang berjalan (jika belum diselesaikan)
      const savedState = localStorage.getItem('fluidhe_system_state') as SystemOperationalStatus | null;
      const savedSessionRaw = localStorage.getItem('fluidhe_current_session');

      if (savedState === 'ACTIVE' && savedSessionRaw) {
        try {
          const parsedSession: SystemSession = JSON.parse(savedSessionRaw);
          const todayStr = new Date().toISOString().slice(0, 10);
          const isStaleSession = !parsedSession.date || parsedSession.date !== todayStr;

          if (parsedSession && parsedSession.id && !isStaleSession) {
            // Bersihkan baris stale/stuck dari bug device_controls sebelumnya
            if (Array.isArray(parsedSession.data)) {
              parsedSession.data = parsedSession.data.filter((d) => {
                if (d.created_at && d.created_at.startsWith('2026-09-18')) return false;
                if (d.timestamp === '13.30.29') return false;
                return true;
              });
              parsedSession.pointsCount = parsedSession.data.length;
            }
            setCurrentSession(parsedSession);
            setSystemState('ACTIVE');

            // Hitung durasi akumulatif yang akurat berdasarkan waktu mulai sesi
            if (parsedSession.startTimeMs) {
              const elapsedSec = Math.max(0, Math.floor((Date.now() - parsedSession.startTimeMs) / 1000));
              setSessionDuration(elapsedSec);
            }

            // Pulihkan riwayat telemetri sesi aktif ke chart
            if (parsedSession.data && parsedSession.data.length > 0) {
              setTelemetryHistory(parsedSession.data.slice(-1500));
            }
          } else {
            // Sesi kedaluwarsa dari hari sebelumnya, bersihkan agar tidak rancu
            setSystemState('OFF');
            setCurrentSession(null);
            setSessionDuration(0);
            try {
              localStorage.removeItem('fluidhe_current_session');
              localStorage.setItem('fluidhe_system_state', 'OFF');
            } catch (e) {}
          }
        } catch (err) {
          console.warn('Gagal memulihkan sesi aktif dari localStorage:', err);
        }
      } else {
        setSystemState('OFF');
        setCurrentSession(null);
        setSessionDuration(0);
      }

      // 4. Pulihkan konfigurasi threshold alarm & audio dari localStorage
      const savedTi1Threshold = localStorage.getItem('fluidhe_ti1_max_threshold');
      if (savedTi1Threshold) {
        const val = parseFloat(savedTi1Threshold);
        if (!isNaN(val) && val > 0) {
          setTi1MaxThreshold(val);
        }
      }

      const savedDpThreshold = localStorage.getItem('fluidhe_deltap_max_threshold');
      if (savedDpThreshold) {
        const val = parseFloat(savedDpThreshold);
        if (!isNaN(val) && val > 0) {
          setDeltaPMaxThreshold(val);
        }
      }

      const savedSound = localStorage.getItem('fluidhe_sound_enabled');
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }
    } catch (err) {
      console.warn('Could not initialize system session state:', err);
    } finally {
      setIsMounted(true);
    }
  }, []);

  // ─── AUTO-SAVE ALARM THRESHOLDS & SETTINGS TO LOCALSTORAGE ───
  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('fluidhe_ti1_max_threshold', String(ti1MaxThreshold));
      } catch (e) {}
    }
  }, [ti1MaxThreshold, isMounted]);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('fluidhe_deltap_max_threshold', String(deltaPMaxThreshold));
      } catch (e) {}
    }
  }, [deltaPMaxThreshold, isMounted]);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('fluidhe_sound_enabled', String(soundEnabled));
      } catch (e) {}
    }
  }, [soundEnabled, isMounted]);

  // ─── LIVE SESSION DURATION TICKER ───
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (systemState === 'ACTIVE' && currentSession) {
      timer = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [systemState, currentSession]);

  // ─── HARDWARE / IOT SUPABASE SYSTEM STATE SYNCHRONIZATION ───
  useEffect(() => {
    if (!supabaseControls) return;
    const mode = supabaseControls.control_mode;
    const isActuatorActive = Boolean(
      supabaseControls.heater_status ||
      supabaseControls.heater_1_status ||
      supabaseControls.heater_2_status ||
      supabaseControls.btn_onoff
    );
    // Sistem IoT hardware dianggap aktif jika mode AUTO/MANUAL/KALIBRASI atau ada aktuator heater ON
    const isIotActive = (mode === 'AUTO' || mode === 'MANUAL' || mode === 'KALIBRASI') || isActuatorActive;

    if (isIotActive) {
      if (systemState !== 'ACTIVE') {
        setSystemState('ACTIVE');
        try {
          localStorage.setItem('fluidhe_system_state', 'ACTIVE');
        } catch (e) {}

        // Buat atau pulihkan wadah sesi jika belum ada
        setCurrentSession((prev) => {
          if (prev) return prev;
          const now = new Date();
          const dateStr = now.toISOString().slice(0, 10);
          const timeStr = now.toLocaleTimeString('id-ID');
          const timeCompact = now.toTimeString().slice(0, 8).replace(/:/g, '');
          const flow = supabaseControls.flow_mode === 'CO-CURRENT' ? 'Co-Current' : 'Counter-Current';
          const autoSession: SystemSession = {
            id: `SES-${dateStr.replace(/-/g, '')}-${timeCompact}`,
            title: `Praktikum ${flow} (${mode || 'AUTO'})`,
            date: dateStr,
            startTime: timeStr,
            startTimeMs: Date.now(),
            operatorName: currentUser?.name || 'Operator',
            operatorEmail: currentUser?.email,
            operatorRole: currentUser?.role,
            classGroup: currentUser?.name,
            pointsCount: 0,
            flowMode: flow,
            data: []
          };
          try {
            localStorage.setItem('fluidhe_current_session', JSON.stringify(autoSession));
            fetch('/api/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session: autoSession })
            }).catch(() => {});
          } catch (e) {}
          return autoSession;
        });
      }
    } else if (mode === 'SHUTDOWN' || mode === 'STANDBY') {
      if (systemState === 'ACTIVE' || systemState === 'STOPPING') {
        setSystemState('OFF');
        try {
          localStorage.setItem('fluidhe_system_state', 'OFF');
        } catch (e) {}
      }
    }
  }, [
    supabaseControls?.control_mode,
    supabaseControls?.heater_status,
    supabaseControls?.heater_1_status,
    supabaseControls?.heater_2_status,
    supabaseControls?.btn_onoff,
    supabaseControls?.flow_mode,
    systemState,
    currentUser
  ]);

  // ─── CONFIRM SYSTEM STARTUP (INITIALIZE SESSION & HARDWARE) ───
  const handleConfirmStartup = async (sessionTitle: string, mode: ControlMode = 'AUTO') => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString('id-ID');
    const timeCompact = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const newSessionId = `SES-${dateStr.replace(/-/g, '')}-${timeCompact}`;

    const newSession: SystemSession = {
      id: newSessionId,
      title: sessionTitle || `Praktikum ${operationMode}`,
      date: dateStr,
      startTime: timeStr,
      startTimeMs: Date.now(),
      operatorName: currentUser?.name || 'Operator',
      operatorEmail: currentUser?.email,
      operatorRole: currentUser?.role,
      classGroup: currentUser?.name,
      pointsCount: 0,
      flowMode: operationMode,
      data: []
    };

    setCurrentSession(newSession);
    setSystemState('ACTIVE');
    setSessionDuration(0);
    setSelectedLogsSessionId('CURRENT');
    setIsStartupModalOpen(false);

    try {
      localStorage.setItem('fluidhe_system_state', 'ACTIVE');
      localStorage.setItem('fluidhe_current_session', JSON.stringify(newSession));
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: newSession })
      });
    } catch (e) {}

    // Kirim perintah aktifasi serentak ke database & ESP32
    await handleSystemStart(mode);

    triggerSyncFeedback('Sistem Dihidupkan', `Mode ${mode} Aktif - Sinyal Terkirim ke Alat`);
  };

  // ─── CONFIRM SYSTEM SHUTDOWN (SAFE SHUTDOWN & ARCHIVE SESSION) ───
  const handleConfirmEndSession = async () => {
    setSystemState('STOPPING');
    setIsEndSessionModalOpen(false);

    // 1. Matikan pemanas & aktuator secara aman via siklus SHUTDOWN ke ESP32
    setHeaterMasterPower(false);
    await handleSystemShutdown();

    // 2. Arsipkan sesi praktikum
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const finalSession: SystemSession | null = currentSession
      ? {
          ...currentSession,
          endTime: now.toLocaleTimeString('id-ID'),
          endTimeMs: Date.now(),
          durationSeconds: sessionDuration,
          pointsCount: currentSession.data.length
        }
      : null;

    if (finalSession) {
      setArchivedSessions((prev) => {
        const updated = [finalSession, ...prev.filter((s) => s.id !== finalSession.id)];
        return updated;
      });

      // Simpan permanen ke server backend master (data/sessions.json)
      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: finalSession })
        });
        if (currentUser?.email) {
          fetchSessions(currentUser.role, currentUser.email, classFilter);
        }
      } catch (err) {
        console.error('Gagal menyimpan sesi ke server master:', err);
      }
    }

    setCurrentSession(null);
    setSessionDuration(0);
    try {
      localStorage.setItem('fluidhe_system_state', 'OFF');
      localStorage.removeItem('fluidhe_current_session');
    } catch (e) {}

    setTimeout(() => {
      setSystemState('OFF');
      triggerSyncFeedback('Sistem Dimatikan', 'Shutdown Berhasil - Sesi Tersimpan Permanen di Server');
    }, 1200);
  };

  // ─── RESET & HAPUS SESI AKTIF SECARA TOTAL DARI APLIKASI & SUPABASE ───
  const handleClearActiveSession = async () => {
    // 1. Hapus data telemetri di Supabase untuk sesi aktif jika ada rentang waktu
    if (currentSession) {
      let minTime: string | null = null;
      let maxTime: string | null = null;
      if (currentSession.data && currentSession.data.length > 0) {
        minTime = currentSession.data[0].created_at || (currentSession.startTimeMs ? new Date(currentSession.startTimeMs - 2000).toISOString() : null);
        maxTime = currentSession.data[currentSession.data.length - 1].created_at || (currentSession.endTimeMs ? new Date(currentSession.endTimeMs + 2000).toISOString() : null);
      }
      if (!minTime && currentSession.startTimeMs) {
        minTime = new Date(currentSession.startTimeMs - 2000).toISOString();
        maxTime = new Date(Date.now() + 2000).toISOString();
      }
      if (minTime && maxTime) {
        try {
          await fetch(`/api/supabase/telemetry?minTime=${encodeURIComponent(minTime)}&maxTime=${encodeURIComponent(maxTime)}`, {
            method: 'DELETE'
          });
        } catch (e) {}
      }
      // Hapus sesi aktif dari database server master
      try {
        await fetch(`/api/sessions?sessionId=${encodeURIComponent(currentSession.id)}&role=admin`, {
          method: 'DELETE'
        });
      } catch (e) {}
    }

    // 2. Matikan aktuator & pemanas secara aman
    setHeaterMasterPower(false);
    try {
      await handleSystemShutdown();
    } catch (e) {}

    // 3. Reset state & storage
    setCurrentSession(null);
    setSessionDuration(0);
    setTelemetryHistory([]);
    setSystemState('OFF');
    try {
      localStorage.setItem('fluidhe_system_state', 'OFF');
      localStorage.removeItem('fluidhe_current_session');
    } catch (e) {}

    triggerSyncFeedback('Sesi Aktif Dikosongkan', 'Sesi berjalan telah dihentikan dan seluruh data telemetrinya dibersihkan.');
  };

  // ─── EXPORT CURRENT SESSION EXCEL HANDLER ───
  const handleExportCurrentSessionExcel = () => {
    const isCurrentSelected = selectedLogsSessionId === 'CURRENT' || (currentSession && selectedLogsSessionId === currentSession.id);
    const sessionToExport = (isCurrentSelected && currentSession)
      ? currentSession
      : archivedSessions.find((s) => s.id === selectedLogsSessionId) || currentSession;

    if (!sessionToExport || !sessionToExport.data || sessionToExport.data.length === 0) {
      triggerCctvToast('Tidak ada data telemetri pada sesi ini untuk diekspor', 'warning');
      return;
    }

    try {
      const { fileName } = exportSessionToExcel(sessionToExport);
      triggerCctvToast(`Berhasil mengekspor sesi (${fileName})`, 'success');
    } catch (err) {
      console.error('Failed to export session Excel:', err);
      triggerCctvToast('Gagal mengekspor file Excel sesi', 'warning');
    }
  };

  // ─── EXPORT ALL CLASSES MASTER EXCEL HANDLER (ADMIN ONLY) ───
  const handleExportAllClassesExcel = () => {
    if (currentUser?.role !== 'admin') return;
    const sessionMap = new Map<string, SystemSession>();
    archivedSessions.forEach((s) => { if (s?.id) sessionMap.set(s.id, s); });
    if (currentSession?.id) {
      const existing = sessionMap.get(currentSession.id);
      sessionMap.set(currentSession.id, { ...(existing || {}), ...currentSession });
    }
    const allSessionsToExport = Array.from(sessionMap.values());
    if (allSessionsToExport.length === 0 || allSessionsToExport.every((s) => !s.data || s.data.length === 0)) {
      triggerCctvToast('Belum ada arsip sesi kelas untuk diekspor', 'warning');
      return;
    }

    try {
      const fileName = exportMasterAllClassesExcel(allSessionsToExport, currentUser);
      triggerCctvToast(`Master Dataset seluruh kelas berhasil diunduh (${fileName})`, 'success');
    } catch (err) {
      console.error('Failed to export master Excel:', err);
      triggerCctvToast('Gagal mengekspor Master Dataset', 'warning');
    }
  };


  const [alarmLogs, setAlarmLogs] = useState<AlarmEvent[]>([
    {
      id: 'ALM-101',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('id-ID'),
      sensor: 'TI1',
      metric: 'Hot Inlet Temperature',
      value: 76.8,
      threshold: 75.0,
      severity: 'Critical',
      acknowledged: true
    },
    {
      id: 'ALM-102',
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString('id-ID'),
      sensor: 'PI1',
      metric: 'Hot Pressure Drop (P1 - P2)',
      value: 2.15,
      threshold: 2.00,
      severity: 'Warning',
      acknowledged: false
    }
  ]);

  // ─── USER MANAGEMENT STATE (2-TIER: ADMIN, OPERATOR) ───
  const todayStr = new Date().toISOString().slice(0, 10);
  const [usersList, setUsersList] = useState<UserItem[]>([
    { id: 'USR-01', name: 'Admin Lab (Anugrah)', email: 'anugrahtriplecycle@gmail.com', role: 'admin', status: 'Active', lastLogin: 'Belum Pernah', isScheduleRestricted: false }
  ]);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('operator');
  const [newUserRestricted, setNewUserRestricted] = useState<boolean>(true);
  const [newUserStartDate, setNewUserStartDate] = useState<string>(todayStr);
  const [newUserEndDate, setNewUserEndDate] = useState<string>(todayStr);
  const [newUserStartTime, setNewUserStartTime] = useState<string>('07:00');
  const [newUserEndTime, setNewUserEndTime] = useState<string>('18:00');
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  // ─── AUTH & SECURE EMAIL OTP PASSWORD RESET STATES ───
  const DEFAULT_PASSWORDS: Record<string, string> = {
    'admin@uad.ac.id': 'admin123',
    'anugrahtriplecycle@gmail.com': 'admin123',
    'operator@uad.ac.id': 'operator123',
    'dev@uad.ac.id': 'dev123',
    'admin.a@uad.ac.id': '1234.Admin',
    'admin a': '1234.Admin',
    'Admin A': '1234.Admin',
    'admin.b@itenas.ac.id': 'zW8QDCw7',
    'admin.b@uad.ac.id': 'zW8QDCw7',
    'admin b': 'zW8QDCw7',
    'Admin B': 'zW8QDCw7',
    'operator.b@itenas.ac.id': 'emmrBXaG',
    'operator.b@uad.ac.id': 'emmrBXaG',
    'operator b': 'emmrBXaG',
    'Operator B': 'emmrBXaG',
    'dwi.melianti@mhs.itenas.ac.id': 'dfCXY6JJ',
    'operator kelas a': 'dfCXY6JJ',
    'Operator Kelas A': 'dfCXY6JJ'
  };
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>(DEFAULT_PASSWORDS);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Email OTP Reset Password Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetStep, setResetStep] = useState<'INPUT_EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'SUCCESS'>('INPUT_EMAIL');
  const [resetEmailInput, setResetEmailInput] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [otpResendCountdown, setOtpResendCountdown] = useState<number>(0);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpTimeLeft, setOtpTimeLeft] = useState<number>(0);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [smtpStatusInfo, setSmtpStatusInfo] = useState<string | null>(null);

  // Load user accounts & passwords from Central Server API (/api/users)
  const fetchUsersFromServer = async () => {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsersList(data.users);
        if (data.passwords) {
          setUserPasswords((prev) => ({ ...prev, ...data.passwords }));
        }
      }
    } catch (e) {
      console.error('Failed to load user credentials from server API', e);
    }
  };

  useEffect(() => {
    fetchUsersFromServer();
    const uInterval = setInterval(() => {
      fetchUsersFromServer();
    }, 4000);
    return () => clearInterval(uInterval);
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsersFromServer();
    }
  }, [activeTab]);

  // Real-time active user presence heartbeat
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.email) return;

    const pingPresence = () => {
      fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, lastSeen: Date.now() })
      }).catch(() => { });
    };

    pingPresence();
    const interval = setInterval(pingPresence, 5000);

    const handleBeforeUnload = () => {
      if (currentUser?.email) {
        fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentUser.email, lastSeen: 0 }),
          keepalive: true
        }).catch(() => { });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLoggedIn, currentUser?.email]);

  // Real-time schedule enforcement: If admin changed schedule while operator is active
  useEffect(() => {
    if (!isLoggedIn || !currentUser || currentUser.role !== 'operator') return;

    const interval = setInterval(() => {
      const freshUser = usersList.find((u) => u.email.toLowerCase() === currentUser.email.toLowerCase());
      if (freshUser) {
        const check = validateScheduleAccess(freshUser);
        if (!check.allowed) {
          setScheduleRestrictionNotice(check.reason || 'Masa izin praktikum Anda telah berakhir.');
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser, usersList]);

  // ─── REAL-TIME INTEGRATION: SINKRONISASI AKUN AKTIF DENGAN USERS LIST ───
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.email) return;
    const matchedUser = usersList.find(
      (u) => u.email.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (matchedUser) {
      if (currentUser.name !== matchedUser.name || currentUser.role !== matchedUser.role) {
        setCurrentUser((prev) => ({
          ...prev,
          name: matchedUser.name,
          role: matchedUser.role
        }));
      }
    }
  }, [usersList, isLoggedIn, currentUser?.email, currentUser?.name, currentUser?.role]);

  // Schedule Access Validation Helper Function (Validation for Date Range & Operational Hours)
  const validateScheduleAccess = (user: UserItem): { allowed: boolean; reason?: string } => {
    if (!user.isScheduleRestricted || user.role === 'admin') {
      return { allowed: true };
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD format

    // 1. Validasi Rentang Tanggal (Date Range Check)
    if (user.allowedStartDate && todayStr < user.allowedStartDate) {
      return { allowed: false, reason: `Masa izin praktikum Anda belum dimulai. (Tanggal Mulai: ${user.allowedStartDate})` };
    }
    if (user.allowedEndDate && todayStr > user.allowedEndDate) {
      return { allowed: false, reason: `Masa izin praktikum Anda telah berakhir pada ${user.allowedEndDate}.` };
    }

    // 2. Validasi Jam Operasional (Operational Hours Check)
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (user.allowedStartTime || '07:00').split(':').map(Number);
    const startMinutes = startH * 60 + (startM || 0);

    const [endH, endM] = (user.allowedEndTime || '18:00').split(':').map(Number);
    const endMinutes = endH * 60 + (endM || 0);

    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      return {
        allowed: false,
        reason: `Saat ini (${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB) berada di luar jam operasional praktikum. Jam yang diizinkan Admin: ${user.allowedStartTime || '07:00'} s.d. ${user.allowedEndTime || '18:00'} WIB.`
      };
    }

    return { allowed: true };
  };

  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
  const [addUserSuccessMsg, setAddUserSuccessMsg] = useState<string | null>(null);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [lastCreatedUserCredentials, setLastCreatedUserCredentials] = useState<{ email: string; name: string; password: string; role: string } | null>(null);

  // Handler for Admin adding a new user (generates random password and dispatches email)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const email = newUserEmail.toLowerCase().trim();

    if (usersList.some(u => u.email.toLowerCase() === email)) {
      setAddUserError(`Email ${email} sudah terdaftar di sistem!`);
      return;
    }

    // Generate secure 8-character random password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let randomPassword = '';
    for (let i = 0; i < 8; i++) {
      randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newUser: UserItem = {
      id: `USR-0${usersList.length + 1}`,
      name: newUserName.trim(),
      email: email,
      role: newUserRole,
      status: 'Active',
      lastLogin: 'Belum Pernah',
      isScheduleRestricted: newUserRole === 'operator' ? newUserRestricted : false,
      allowedStartDate: newUserStartDate || todayStr,
      allowedEndDate: newUserEndDate || todayStr,
      allowedDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      allowedStartTime: newUserStartTime || '07:00',
      allowedEndTime: newUserEndTime || '18:00'
    };

    const updatedUsers = [...usersList, newUser];
    setUsersList(updatedUsers);

    const updatedPasswords = { ...userPasswords, [email]: randomPassword };
    setUserPasswords(updatedPasswords);

    // Save to Central Server API
    try {
      const apiRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: email,
          role: newUserRole,
          password: randomPassword,
          isScheduleRestricted: newUserRole === 'operator' ? newUserRestricted : false,
          allowedStartDate: newUserStartDate || todayStr,
          allowedEndDate: newUserEndDate || todayStr,
          allowedStartTime: newUserStartTime || '07:00',
          allowedEndTime: newUserEndTime || '18:00'
        })
      });
      const apiData = await apiRes.json();
      if (apiData.success && Array.isArray(apiData.users)) {
        setUsersList(apiData.users);
        if (apiData.passwords) {
          setUserPasswords((prev) => ({ ...prev, ...apiData.passwords }));
        }
      }
    } catch (err) {
      console.error('Failed to save user to server API', err);
    }

    setLastCreatedUserCredentials({
      email: email,
      name: newUserName.trim(),
      password: randomPassword,
      role: newUserRole
    });

    setIsAddingUser(true);
    try {
      await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          type: 'NEW_ACCOUNT',
          initialPassword: randomPassword,
          name: newUserName.trim(),
          role: newUserRole
        })
      });
    } catch (err) {
      console.error('Failed to send welcome email', err);
    } finally {
      setIsAddingUser(false);
    }

    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('operator');
  };

  const [resendingEmailFor, setResendingEmailFor] = useState<string | null>(null);

  const handleResendUserCredentials = async (user: UserItem) => {
    const email = user.email.toLowerCase().trim();
    const currentPass = userPasswords[email] || (user.role === 'admin' ? 'admin123' : 'operator123');

    setResendingEmailFor(user.id);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          type: 'NEW_ACCOUNT',
          initialPassword: currentPass,
          name: user.name,
          role: user.role
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerCctvToast(`Email kredensial berhasil dikirim ke: ${email}`, 'success');
      } else {
        triggerCctvToast(`Gagal mengirim email: ${data.message || 'Error tidak diketahui'}`, 'warning');
      }
    } catch (err) {
      triggerCctvToast(`Terjadi kesalahan pengiriman email: ${err}`, 'warning');
    } finally {
      setResendingEmailFor(null);
    }
  };

  // OTP Resend Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpResendCountdown > 0) {
      timer = setTimeout(() => setOtpResendCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpResendCountdown]);

  // Real-time OTP Expiration Countdown (Strict 5 minutes limit)
  useEffect(() => {
    if (resetStep !== 'VERIFY_OTP' || !otpExpiresAt) return;

    const checkExpiration = () => {
      const remainingSec = Math.max(0, Math.floor((otpExpiresAt - Date.now()) / 1000));
      setOtpTimeLeft(remainingSec);
      if (remainingSec === 0) {
        setResetError('Kode OTP telah kedaluwarsa (lebih dari 5 menit). Silakan klik "Kirim Ulang OTP" untuk mendapatkan kode baru.');
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 1000);
    return () => clearInterval(interval);
  }, [resetStep, otpExpiresAt]);

  // ─── REAL CCTV & IP CAMERA STATES (EZVIZ C6N FULL INTEGRATION) ───
  const [selectedCamera, setSelectedCamera] = useState<'cam1' | 'cam2' | 'cam3'>('cam1');
  const [cctvRecording, setCctvRecording] = useState<boolean>(true);
  const [cctvPublicUrl, setCctvPublicUrl] = useState<string>('');
  const [cctvIpUrl, setCctvIpUrl] = useState<string>('http://127.0.0.1:8889/stream.html?src=he_cctv&mode=mse');
  const [cctvStreamSource, setCctvStreamSource] = useState<'local' | 'custom' | 'demo'>('custom');
  const [isEditingCctvUrl, setIsEditingCctvUrl] = useState<boolean>(false);
  const [tempCctvUrl, setTempCctvUrl] = useState<string>('');

  // Auto-detect Cloudflare tunnel URL (from API, localStorage, or query params)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const paramCctv = params.get('cctv');
        const paramTab = params.get('tab');
        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1';

        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const isRemote = isHttps || !isLocal;

        const applyCctvUrl = (url: string) => {
          if (!url) return;
          const clean = url.trim().replace(/\/+$/, '');
          setCctvPublicUrl(clean);
          localStorage.setItem('fluidhe_cctv_public_url', clean);
          const fullStream = clean.includes('/stream.html')
            ? clean
            : `${clean}/stream.html?src=he_cctv&mode=mse`;
          setCctvIpUrl(fullStream);
          setTempCctvUrl(fullStream);
          if (isRemote) {
            setCctvStreamSource('custom');
          }
        };

        // Default mode: jika lokal gunakan WebRTC direct, jika remote gunakan multi-protocol stream
        setCctvStreamSource(isRemote ? 'custom' : 'local');

        const savedLocal = localStorage.getItem('fluidhe_cctv_public_url');
        if (savedLocal && savedLocal.includes('screenshot-night-assists-baseball')) {
          localStorage.removeItem('fluidhe_cctv_public_url');
        }

        if (isLocal) {
          applyCctvUrl('http://127.0.0.1:8889');
        } else if (paramCctv) {
          applyCctvUrl(paramCctv);
        } else if (savedLocal && !savedLocal.includes('screenshot-night-assists-baseball')) {
          applyCctvUrl(savedLocal);
        }

        // 1. Tarik langsung dari database Supabase Cloud (Otomatis & Real-Time)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkxfbjpbaxnmgsnxrbpj.supabase.co';
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_IzezoiU9oZxnS4LmMONYsg__y3vG6-K';
        fetch(`${supabaseUrl}/rest/v1/telemetry_data?warning_status=like.CCTV_URL:*&order=id.desc&limit=1`, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          }
        })
          .then((res) => res.json())
          .then((rows) => {
            if (Array.isArray(rows) && rows.length > 0 && typeof rows[0]?.warning_status === 'string') {
              const url = rows[0].warning_status.replace(/^CCTV_URL:/i, '').trim();
              if (url.startsWith('http')) {
                applyCctvUrl(url);
              }
            }
          })
          .catch(() => {});

        // 2. Cadangan: Tarik dari internal proxy /api/cctv/tunnel
        fetch('/api/cctv/tunnel')
          .then((res) => res.json())
          .then((data) => {
            if (data?.success && data?.publicUrl) {
              applyCctvUrl(data.publicUrl);
            }
          })
          .catch(() => {});

        if (paramTab === 'cctv') {
          setActiveTab('cctv');
        }
      } catch (err) {
        console.warn('CCTV Param parse notice:', err);
      }
    }
  }, []);

  // EZVIZ Mobile App Style Controls
  const [cctvAudioMuted, setCctvAudioMuted] = useState<boolean>(true);
  const [audioUserActivated, setAudioUserActivated] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [cctvVolume, setCctvVolume] = useState<number>(85);
  const [cctvMicActive, setCctvMicActive] = useState<boolean>(false);
  const [cctvDefinition, setCctvDefinition] = useState<'1080p' | '720p' | 'auto'>('1080p');
  const [isPtzDrawerOpen, setIsPtzDrawerOpen] = useState<boolean>(false);
  const [ptzSpeed, setPtzSpeed] = useState<number>(60);
  const [ptzMoving, setPtzMoving] = useState<string | null>(null);

  // Digital Interactive PTZ States (Scale & Viewport Pan)
  const [digitalZoom, setDigitalZoom] = useState<number>(1.0);
  const [digitalPanX, setDigitalPanX] = useState<number>(0);
  const [digitalPanY, setDigitalPanY] = useState<number>(0);

  const [isManualRecording, setIsManualRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [cctvToast, setCctvToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  // ─── WEBRTC NATIVE VIDEO PLAYER REFS & STATES ───
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioTransceiverRef = useRef<RTCRtpTransceiver | null>(null);
  const webrtcStreamRef = useRef<MediaStream | null>(null);
  const [webrtcConnected, setWebrtcConnected] = useState<boolean>(false);
  const [webrtcError, setWebrtcError] = useState<string | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<'all' | 'snapshot' | 'video'>('all');
  const [previewMediaItem, setPreviewMediaItem] = useState<{ id: string; type: 'snapshot' | 'video'; title: string; timestamp: string; url?: string; thumbnail?: string; metadata?: any } | null>(null);
  const [cctvMediaList, setCctvMediaList] = useState<Array<{ id: string; type: 'snapshot' | 'video'; title: string; timestamp: string; url?: string; thumbnail?: string; metadata?: any }>>([
    {
      id: 'snap-demo-1',
      type: 'snapshot',
      title: 'Snapshot Kalibrasi Suhu Rig HE',
      timestamp: '18/08/2026 19:25:48 WIB',
      url: '',
      metadata: { ti1: 25.0, ti2: 25.0, ti3: 25.0, ti4: 25.0, flow: 0.0 }
    }
  ]);

  // ─── DATA LOG FILTER STATES (INCLUDES 2s, 30s INTERVAL) ───
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logInterval, setLogInterval] = useState<'1s' | '2s' | '5s' | '30s' | '1m'>('2s');
  const [dateFilter, setDateFilter] = useState<string>('All');

  // ─── P&ID HOVER TOOLTIP ───
  const [activePidHover, setActivePidHover] = useState<string | null>(null);

  // ─── SOLENOID VALVE CONFIGURATION & FAIL-SAFE MAPPING (4 VALVES) ───
  const solenoidValves = useMemo(() => {
    if (operationMode === 'Counter-Current') {
      return {
        sv1: { name: 'Solenoid Valve 1', type: 'NC' as const, state: 'OFF (Closed)', active: false, badgeClass: 'bg-red-100 text-red-700 border-red-300' },
        sv2: { name: 'Solenoid Valve 2', type: 'NO' as const, state: 'ON (Open)', active: true, badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
        sv3: { name: 'Solenoid Valve 3', type: 'NC' as const, state: 'OFF (Closed)', active: false, badgeClass: 'bg-red-100 text-red-700 border-red-300' },
        sv4: { name: 'Solenoid Valve 4', type: 'NO' as const, state: 'ON (Open)', active: true, badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
        isFailSafeActive: true,
        modeNotice: 'Mode Aktif Secara Otomatis (Passive Fail-Safe: Tanpa Listrik kembali ke Counter-Current)'
      };
    } else {
      return {
        sv1: { name: 'Solenoid Valve 1', type: 'NC' as const, state: 'ON (Open)', active: true, badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
        sv2: { name: 'Solenoid Valve 2', type: 'NO' as const, state: 'OFF (Closed)', active: false, badgeClass: 'bg-red-100 text-red-700 border-red-300' },
        sv3: { name: 'Solenoid Valve 3', type: 'NC' as const, state: 'ON (Open)', active: true, badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
        sv4: { name: 'Solenoid Valve 4', type: 'NO' as const, state: 'OFF (Closed)', active: false, badgeClass: 'bg-red-100 text-red-700 border-red-300' },
        isFailSafeActive: false,
        modeNotice: 'Memerlukan Daya Listrik Aktif (Co-Current Flow)'
      };
    }
  }, [operationMode]);

  // ─── DUAL HEATER STAGED CONTROL LOGIC & REALTIME SENSOR PRIORITIZATION ───
  const latestData = useMemo(() => {
    // 1. Cek apakah baris telemetri merupakan data hardware asli (bukan sinyal CCTV / PTZ)
    const isHardwareValid = (r: any) => {
      if (!r) return false;
      const ws = String(r.warning_status || '');
      if (ws.startsWith('CCTV_URL:') || ws.startsWith('PTZ_CMD:')) return false;
      if (r.temp_1 === 0 && r.temp_2 === 0 && r.temp_3 === 0 && r.temp_4 === 0 && r.pressure === 0 && ws !== 'NORMAL') return false;
      return true;
    };

    // Prioritaskan telemetri real-time tercepat langsung dari sensor Supabase HANYA JIKA HARDWARE ONLINE
    if (isHardwareOnline && supabaseTelemetry && isHardwareValid(supabaseTelemetry)) {
      const isHeaterOn = supabaseTelemetry.heater_status === 'ON' || Boolean(supabaseControls?.heater_1_status || supabaseControls?.heater_2_status);
      return {
        timestamp: supabaseTelemetry.created_at
          ? new Date(supabaseTelemetry.created_at).toLocaleTimeString('id-ID')
          : new Date().toLocaleTimeString('id-ID'),
        created_at: supabaseTelemetry.created_at,
        ti1: Number(supabaseTelemetry.temp_1 || 0),
        ti2: Number(supabaseTelemetry.temp_2 || 0),
        ti3: Number(supabaseTelemetry.temp_3 || 0),
        ti4: Number(supabaseTelemetry.temp_4 || 0),
        ti5: parseFloat(((Number(supabaseTelemetry.temp_3 || 0) + Number(supabaseTelemetry.temp_4 || 0)) / 2).toFixed(1)),
        ti6: parseFloat(((Number(supabaseTelemetry.temp_1 || 0) + Number(supabaseTelemetry.temp_2 || 0)) / 2).toFixed(1)),
        pi1: parseFloat(Number(supabaseTelemetry.pressure || 0).toFixed(2)),
        pi2: supabaseTelemetry.pressure_outlet !== undefined ? parseFloat(Number(supabaseTelemetry.pressure_outlet).toFixed(2)) : parseFloat((Number(supabaseTelemetry.pressure || 0) * 0.82).toFixed(2)),
        pi3: supabaseTelemetry.pressure_inlet_2 !== undefined ? parseFloat(Number(supabaseTelemetry.pressure_inlet_2).toFixed(2)) : parseFloat((Number(supabaseTelemetry.pressure || 0) * 0.90).toFixed(2)),
        pi4: supabaseTelemetry.pressure_outlet_2 !== undefined ? parseFloat(Number(supabaseTelemetry.pressure_outlet_2).toFixed(2)) : parseFloat((Number(supabaseTelemetry.pressure || 0) * 0.72).toFixed(2)),
        fc1: parseFloat(Number(supabaseTelemetry.flow_rate || 0).toFixed(2)),
        fc2: supabaseTelemetry.flow_rate_2 !== undefined ? parseFloat(Number(supabaseTelemetry.flow_rate_2).toFixed(2)) : parseFloat((Number(supabaseTelemetry.flow_rate || 0) * 1.15).toFixed(2)),
        tc1Setpoint: supabaseControls?.target_temp || tc1Setpoint,
        heater1Active: Boolean(supabaseControls?.heater_1_status ?? isHeaterOn),
        heater2Active: Boolean(supabaseControls?.heater_2_status ?? isHeaterOn),
        mode: (supabaseControls?.flow_mode === 'COUNTER' ? 'Counter-Current' : 'Co-Current') as any
      };
    }

    // 2. Default state saat hardware offline: Seluruh pembacaan sensor adalah 0 (tidak ada data masuk)
    return {
      timestamp: new Date().toLocaleTimeString('id-ID'),
      ti1: 0,
      ti2: 0,
      ti3: 0,
      ti4: 0,
      ti5: 0,
      ti6: 0,
      pi1: 0,
      pi2: 0,
      pi3: 0,
      pi4: 0,
      fc1: 0,
      fc2: 0,
      tc1Setpoint: supabaseControls?.target_temp || tc1Setpoint,
      heater1Active: false,
      heater2Active: false,
      mode: operationMode
    };
  }, [isHardwareOnline, supabaseTelemetry, supabaseControls, tc1Setpoint, operationMode]);

  const dualHeaterState = useMemo(() => {
    const isPrimed = fc1Valve > 0;
    const isMasterOn = heaterMasterPower && !emergencyStopped && isPrimed;

    if (!isMasterOn) {
      return {
        h1: false,
        h2: false,
        stage: 'OFF',
        powerWatt: 0,
        description: 'OFF (Pemanas Dimatikan / Belum Priming)'
      };
    }

    // In MANUAL Mode: Directly respect user's manual toggles
    if (supabaseControls?.control_mode === 'MANUAL') {
      const isH1 = supabaseControls?.heater_1_status ?? true;
      const isH2 = supabaseControls?.heater_2_status ?? false;
      const power = (isH1 ? 1000 : 0) + (isH2 ? 500 : 0);
      const stage = (isH1 && isH2) ? 'STAGE_1' : isH2 ? 'STAGE_2' : isH1 ? 'STAGE_1' : 'OFF';
      return {
        h1: isH1,
        h2: isH2,
        stage,
        powerWatt: power,
        description: isH1 && isH2
          ? 'Dual Heater Aktif Penuh (H1: 1000W + H2: 500W = 1500W)'
          : isH1
            ? 'Heater 1 Aktif (1000W)'
            : isH2
              ? 'Heater 2 Aktif (500W)'
              : 'Pemanas Standby (0W)'
      };
    }

    // In AUTO Mode: Follows ESP32 Firmware logic based on avgTempPanas = (TI1 + TI2) / 2
    const tHotIn = latestData.ti1;
    const tHotOut = latestData.ti2;
    const avgTempPanas = (tHotIn + tHotOut) / 2.0;
    const targetUpper = supabaseControls?.target_upper ?? 60.0;
    const targetLower = supabaseControls?.target_lower ?? 45.0;

    if (avgTempPanas <= targetLower) {
      // Suhu <= targetLower: Kedua Heater (H1 1000W + H2 500W = 1500W) Aktif
      return {
        h1: true,
        h2: true,
        stage: 'STAGE_1',
        powerWatt: 1500,
        description: `AUTO (ESP32): Kedua Heater ON (Suhu ${avgTempPanas.toFixed(1)}°C ≤ ${targetLower}°C)`
      };
    } else if (avgTempPanas <= targetUpper) {
      // Suhu targetLower - targetUpper: Heater 1 Aktif (1000W), Heater 2 Dimatikan
      return {
        h1: true,
        h2: false,
        stage: 'STAGE_2',
        powerWatt: 1000,
        description: `AUTO (ESP32): Heater 1 ON, Heater 2 OFF (Suhu ${avgTempPanas.toFixed(1)}°C: ${targetLower}°C - ${targetUpper}°C)`
      };
    } else {
      // Suhu > targetUpper: Melebihi batas atas -> Kedua Heater AUTO MATI
      return {
        h1: false,
        h2: false,
        stage: 'OFF',
        powerWatt: 0,
        description: `AUTO (ESP32): Kedua Heater Auto-MATI (Suhu ${avgTempPanas.toFixed(1)}°C > ${targetUpper}°C Melebihi Batas)`
      };
    }
  }, [heaterMasterPower, emergencyStopped, fc1Valve, supabaseControls?.control_mode, supabaseControls?.heater_1_status, supabaseControls?.heater_2_status, latestData.ti1, latestData.ti2]);

  const deltaPHot = useMemo(() => {
    if (!isHardwareOnline) return 0;
    return parseFloat((latestData.pi1 - latestData.pi2).toFixed(2));
  }, [isHardwareOnline, latestData.pi1, latestData.pi2]);

  const deltaPCold = useMemo(() => {
    if (!isHardwareOnline) return 0;
    return parseFloat((latestData.pi3 - latestData.pi4).toFixed(2));
  }, [isHardwareOnline, latestData.pi3, latestData.pi4]);

  const currentDeltaP = useMemo(() => {
    return Math.max(Math.abs(deltaPHot), Math.abs(deltaPCold));
  }, [deltaPHot, deltaPCold]);

  const isCriticalUapCondition = useMemo(() => {
    return Boolean(
      supabaseTelemetry?.warning_status === 'WARN_BKA_UAP' ||
      currentDeltaP > (deltaPMaxThreshold || 2.0)
    );
  }, [supabaseTelemetry?.warning_status, currentDeltaP, deltaPMaxThreshold]);

  // Reset status dismiss jika parameter delta telah normal kembali di bawah batas aman
  useEffect(() => {
    if (!isCriticalUapCondition) {
      setIsCriticalWarningDismissed(false);
    }
  }, [isCriticalUapCondition]);

  const isAlarmActive = useMemo(() => {
    // Sirine & peringatan alarm HANYA AKTIF jika user sudah LOGIN, sistem IoT AKTIF, dan alat ESP32 ONLINE
    if (!isHardwareOnline || !isLoggedIn || systemState !== 'ACTIVE') {
      return false;
    }
    return latestData.ti1 > ti1MaxThreshold || currentDeltaP > (deltaPMaxThreshold || 2.0);
  }, [isHardwareOnline, isLoggedIn, systemState, latestData.ti1, ti1MaxThreshold, currentDeltaP, deltaPMaxThreshold]);

  // ─── OPERATOR SESSION TIMER EFFECT ───
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isLoggedIn && currentUser.role === 'operator') {
      timer = setInterval(() => {
        setOperatorSessionRemaining((prev) => {
          if (prev <= 1) {
            setSessionExpiredModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setOperatorSessionRemaining(operatorSessionLimit * 60);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoggedIn, currentUser.role, operatorSessionLimit]);

  // ─── 1-MINUTE TARGET TEMPERATURE WARNING TIMER EFFECT (WITH 30s SNOOZE) ───
  const warningSnoozeUntilRef = useRef<number>(0);

  const handleAcknowledgeHeatingWarning = () => {
    setShow1MinWarning(false);
    warningSnoozeUntilRef.current = Date.now() + 30000; // Sembunyikan & tunda selama 30 detik
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const isHeating = isHardwareOnline && (heaterMasterPower || supabaseControls?.heater_1_status || supabaseControls?.btn_onoff) && !emergencyStopped && fc1Valve > 0;

    if (isHeating && latestData.ti2 < tc1Setpoint - 1.5) {
      timer = setInterval(() => {
        setHeatingTimerSeconds((prev) => {
          const next = prev + 1;
          const isSnoozed = Date.now() < warningSnoozeUntilRef.current;
          if (next >= 60 && !isSnoozed) {
            setShow1MinWarning(true);
          }
          return next;
        });
      }, 1000);
    } else {
      setHeatingTimerSeconds(0);
      setShow1MinWarning(false);
      warningSnoozeUntilRef.current = 0;
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isHardwareOnline, heaterMasterPower, supabaseControls?.heater_1_status, supabaseControls?.btn_onoff, emergencyStopped, fc1Valve, latestData.ti2, tc1Setpoint]);

  // ─── AUDIO SYNTHESIZER SIREN FOR ALARM ───
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenOscRef = useRef<OscillatorNode | null>(null);

  const startSirenSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      if (sirenOscRef.current) return;

      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.15, audioCtxRef.current.currentTime);

      const now = audioCtxRef.current.currentTime;
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
      osc.frequency.linearRampToValueAtTime(800, now + 0.8);

      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      sirenOscRef.current = osc;
    } catch {
      // Audio synth fallback silence
    }
  };

  const stopSirenSound = () => {
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop();
        sirenOscRef.current.disconnect();
      } catch {
        // ignore
      }
      sirenOscRef.current = null;
    }
  };

  useEffect(() => {
    if (isAlarmActive && soundEnabled && isLoggedIn && systemState === 'ACTIVE') {
      startSirenSound();
    } else {
      stopSirenSound();
    }
    return () => {
      stopSirenSound();
    };
  }, [isAlarmActive, soundEnabled, isLoggedIn, systemState]);

  // ─── TELEMETRY DATA HANDLER (REAL-TIME SUPABASE TELEMETRY_DATA ONLY) ───
  useEffect(() => {
    const streamToUse = (telemetryStream && telemetryStream.length > 0)
      ? telemetryStream
      : (supabaseTelemetry ? [supabaseTelemetry] : []);

    if (streamToUse.length === 0) {
      return;
    }

    // Filter data hari ini agar riwayat telemetri akurat sesuai sesi berjalan dan bebas dari sinyal dummy
    const latestRow = streamToUse[streamToUse.length - 1];
    const todayStr = new Date().toDateString();
    const latestRowDateStr = latestRow.created_at ? new Date(latestRow.created_at).toDateString() : '';

    // Jika telemetri di database adalah arsip hari-hari sebelumnya dan bukan hari ini, jangan tampilkan sebagai kurva live hari ini
    if (!latestRow.created_at || latestRowDateStr !== todayStr) {
      setTelemetryHistory([]);
      return;
    }

    const filteredStream = streamToUse.filter((row) => {
      const ws = String(row.warning_status || '');
      if (ws.startsWith('CCTV_URL:') || ws.startsWith('PTZ_CMD:')) return false;
      if (row.temp_1 === 0 && row.temp_2 === 0 && row.temp_3 === 0 && row.temp_4 === 0 && row.pressure === 0 && ws !== 'NORMAL') return false;
      if (!row.created_at) return true;
      return new Date(row.created_at).toDateString() === todayStr;
    });

    const realHistory: TelemetryPoint[] = filteredStream.map((row) => {
      const isHeaterOn = row.heater_status === 'ON' || Boolean(supabaseControls?.heater_1_status || supabaseControls?.heater_2_status);
      const rowDate = row.created_at ? new Date(row.created_at) : new Date();
      return {
        timestamp: rowDate.toLocaleTimeString('id-ID'),
        created_at: row.created_at || rowDate.toISOString(),
        ti1: Number(row.temp_1 || 0),
        ti2: Number(row.temp_2 || 0),
        ti3: Number(row.temp_3 || 0),
        ti4: Number(row.temp_4 || 0),
        ti5: parseFloat(((Number(row.temp_3 || 0) + Number(row.temp_4 || 0)) / 2).toFixed(1)),
        ti6: parseFloat(((Number(row.temp_1 || 0) + Number(row.temp_2 || 0)) / 2).toFixed(1)),
        pi1: parseFloat(Number(row.pressure || 0).toFixed(2)),
        pi2: row.pressure_outlet !== undefined ? parseFloat(Number(row.pressure_outlet).toFixed(2)) : parseFloat((Number(row.pressure || 0) * 0.82).toFixed(2)),
        pi3: row.pressure_inlet_2 !== undefined ? parseFloat(Number(row.pressure_inlet_2).toFixed(2)) : parseFloat((Number(row.pressure || 0) * 0.90).toFixed(2)),
        pi4: row.pressure_outlet_2 !== undefined ? parseFloat(Number(row.pressure_outlet_2).toFixed(2)) : parseFloat((Number(row.pressure || 0) * 0.72).toFixed(2)),
        fc1: parseFloat(Number(row.flow_rate || 0).toFixed(2)),
        fc2: row.flow_rate_2 !== undefined ? parseFloat(Number(row.flow_rate_2).toFixed(2)) : parseFloat((Number(row.flow_rate || 0) * 1.15).toFixed(2)),
        tc1Setpoint: supabaseControls?.target_temp || tc1Setpoint,
        heater1Active: Boolean(supabaseControls?.heater_1_status ?? isHeaterOn),
        heater2Active: Boolean(supabaseControls?.heater_2_status ?? isHeaterOn),
        mode: (supabaseControls?.flow_mode === 'COUNTER' ? 'Counter-Current' : 'Co-Current') as any
      };
    });

    setTelemetryHistory(realHistory);

    // ─── RECORD REAL-TIME TELEMETRY INTO ACTIVE PRACTICUM SESSION ───
    if (systemState === 'ACTIVE' && realHistory.length > 0) {
      setCurrentSession((prev) => {
        if (!prev) return prev;
        const currentData = prev.data || [];
        const existingKeys = new Set(
          currentData.map((d) => d.created_at || d.timestamp)
        );

        // Ambil point-point baru dari realHistory yang terjadi setelah sesi dimulai
        const newPointsToAdd: TelemetryPoint[] = [];
        for (const pt of realHistory) {
          const ptKey = pt.created_at || pt.timestamp;
          if (existingKeys.has(ptKey)) {
            continue;
          }
          // Verifikasi waktu: jangan masukkan data lama dari sebelum sesi dimulai (toleransi 5s)
          if (prev.startTimeMs && pt.created_at) {
            const ptTime = new Date(pt.created_at).getTime();
            if (ptTime < prev.startTimeMs - 5000) {
              continue;
            }
          }
          existingKeys.add(ptKey);
          newPointsToAdd.push(pt);
        }

        if (newPointsToAdd.length === 0) {
          return prev;
        }

        const updatedData = [...currentData, ...newPointsToAdd];
        const updatedSession: SystemSession = {
          ...prev,
          data: updatedData,
          pointsCount: updatedData.length
        };
        try {
          localStorage.setItem('fluidhe_current_session', JSON.stringify(updatedSession));
        } catch (e) {}
        return updatedSession;
      });
    }
  }, [isHardwareOnline, supabaseStatus, supabaseTelemetry, telemetryStream, supabaseControls, tc1Setpoint, operationMode, systemState]);

  // ─── AUTO-SYNC RUNNING SESSION TO MASTER SERVER (/api/sessions) SO ADMIN SEES IT IN REAL TIME ───
  const lastAutoSyncedCountRef = useRef<number>(-1);
  const sessionDurationRef = useRef<number>(sessionDuration);
  useEffect(() => {
    sessionDurationRef.current = sessionDuration;
  }, [sessionDuration]);

  useEffect(() => {
    if (!currentSession || !currentSession.id || systemState !== 'ACTIVE') return;
    const count = currentSession.data ? currentSession.data.length : 0;
    if (count === lastAutoSyncedCountRef.current) return;

    const timer = setTimeout(async () => {
      try {
        lastAutoSyncedCountRef.current = count;
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session: {
              ...currentSession,
              durationSeconds: sessionDurationRef.current,
              pointsCount: count
            }
          })
        });
      } catch (err) {
        console.warn('Auto-sync session to server error:', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentSession?.data?.length, currentSession?.id, systemState]);

  // Standing periodic sync every 5 seconds for active session duration & points
  useEffect(() => {
    if (!currentSession || !currentSession.id || systemState !== 'ACTIVE') return;
    const interval = setInterval(async () => {
      try {
        const count = currentSession.data ? currentSession.data.length : 0;
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session: {
              ...currentSession,
              durationSeconds: sessionDurationRef.current,
              pointsCount: count
            }
          })
        });
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [currentSession?.id, systemState]);

  // ─── PERIODIC SYNC SESSIONS POLLING FROM SERVER (SO ADMIN AUTOMATICALLY RECEIVES OPERATOR SESSIONS) ───
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.email) return;
    const interval = setInterval(() => {
      fetchSessions(currentUser.role, currentUser.email, classFilter);
    }, 8000);
    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser?.role, currentUser?.email, classFilter, fetchSessions]);

  // ─── OTP PASSWORD RESET HANDLERS (SECURE EMAIL VERIFICATION FOR ALL REGISTERED USERS) ───
  const handleRequestOtp = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setResetError(null);

    const email = resetEmailInput.toLowerCase().trim();
    if (!email) {
      setResetError('Silakan masukkan alamat email akun Anda.');
      return;
    }

    // Always fetch latest server users from central API first
    let activeUsersList = usersList;
    let activePasswords = userPasswords;
    try {
      const uRes = await fetch('/api/users', { cache: 'no-store' });
      const uData = await uRes.json();
      if (uData.success && Array.isArray(uData.users)) {
        activeUsersList = uData.users;
        setUsersList(uData.users);
        if (uData.passwords) {
          activePasswords = { ...DEFAULT_PASSWORDS, ...uData.passwords };
          setUserPasswords(activePasswords);
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Security Check: Whitelist verification (User must be registered in usersList, stored passwords, or system accounts)
    const isRegisteredUser =
      activeUsersList.some((u) => u.email.toLowerCase() === email) ||
      usersList.some((u) => u.email.toLowerCase() === email) ||
      Boolean(activePasswords[email]) ||
      email === 'admin@uad.ac.id' ||
      email === 'anugrahtriplecycle@gmail.com' ||
      email === 'operator@uad.ac.id' ||
      email === 'dev@uad.ac.id';

    if (!isRegisteredUser) {
      setResetError('Akses Ditolak: Alamat email ini tidak terdaftar di sistem Laboratorium. Silakan hubungi Dosen atau Kepala Laboratorium.');
      return;
    }

    // Generate 6-Digit OTP Code (Strict 5-minute validity)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    setGeneratedOtp(code);
    setOtpExpiresAt(expiresAt);
    setOtpTimeLeft(300);
    setEnteredOtp('');
    setOtpResendCountdown(60);

    // Call API /api/send-otp to send actual email
    setIsSendingEmail(true);
    setSmtpStatusInfo(null);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, otp: code, type: 'OTP' })
      });
      const data = await res.json();
      if (data.method === 'UNCONFIGURED_SMTP') {
        setSmtpStatusInfo('UNCONFIGURED');
      } else if (data.success) {
        setSmtpStatusInfo('SENT');
      }
    } catch (err) {
      console.warn('API send-otp call:', err);
    } finally {
      setIsSendingEmail(false);
    }

    setResetStep('VERIFY_OTP');
  };

  // ─── CCTV MANUAL RECORDING TIMER & HANDLERS ───
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isManualRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isManualRecording]);

  // ─── WEBRTC CONNECTION TO go2rtc (ULTRA-LOW LATENCY REAL-TIME) ───
  const connectWebRTC = async () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setWebrtcConnected(false);
    setWebrtcError(null);

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    const isLocal = host === 'localhost' || host === '127.0.0.1';

    try {

      const pc = new RTCPeerConnection(
        isLocal
          ? { iceServers: [] }
          : { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      );
      pcRef.current = pc;

      const videoTransceiver = pc.addTransceiver('video', { direction: 'recvonly' });
      const audioTransceiver = pc.addTransceiver('audio', { direction: 'recvonly' });
      audioTransceiverRef.current = audioTransceiver;

      // Ultra-Low Latency: Minimalkan Jitter Buffer Playout Delay ke 0 detik
      const setZeroDelayHint = (receiver: any) => {
        if (!receiver) return;
        try {
          if ('playoutDelayHint' in receiver) {
            receiver.playoutDelayHint = 0;
          }
          if ('jitterBufferDelayHint' in receiver) {
            receiver.jitterBufferDelayHint = 0;
          }
        } catch (e) {}
      };

      if (videoTransceiver.receiver) setZeroDelayHint(videoTransceiver.receiver);
      if (audioTransceiver.receiver) setZeroDelayHint(audioTransceiver.receiver);

      pc.ontrack = (event) => {
        if (event.receiver) setZeroDelayHint(event.receiver);

        let stream = webrtcStreamRef.current;
        if (!stream) {
          stream = new MediaStream();
          webrtcStreamRef.current = stream;
        }
        if (event.track && !stream.getTracks().some(t => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach(track => {
            if (!stream!.getTracks().some(t => t.id === track.id)) {
              stream!.addTrack(track);
            }
          });
        }

        if (videoRef.current) {
          if (videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream;
          }
          videoRef.current.muted = cctvAudioMuted;
          videoRef.current.volume = (cctvVolume || 100) / 100;
          videoRef.current.play().catch(() => { });
        }
        setWebrtcConnected(true);
        setWebrtcError(null);
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          setWebrtcConnected(true);
          setWebrtcError(null);
          try {
            pc.getReceivers().forEach((r) => setZeroDelayHint(r));
          } catch (e) {}
          if (videoRef.current) {
            if (!videoRef.current.srcObject && webrtcStreamRef.current) {
              videoRef.current.srcObject = webrtcStreamRef.current;
            }
            videoRef.current.play().catch(() => { });
          }
        } else if (state === 'failed') {
          setWebrtcConnected(false);
          setWebrtcError('Koneksi kamera sedang menghubungkan ulang...');
          if (!isLocal && cctvPublicUrl) {
            setCctvStreamSource('custom');
          }
        } else if (state === 'disconnected' || state === 'closed') {
          setWebrtcConnected(false);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const endpoints: string[] = [];
      // Jika diakses lokal, dahulukan selalu localhost:8889
      if (isLocal) {
        endpoints.push('http://localhost:8889/api/webrtc?src=he_cctv');
      }
      if (cctvPublicUrl && cctvPublicUrl.trim().startsWith('http')) {
        endpoints.push(`${cctvPublicUrl.trim().replace(/\/+$/, '')}/api/webrtc?src=he_cctv`);
      }
      if (!isLocal && !isHttps) {
        endpoints.push(`http://${host}:8889/api/webrtc?src=he_cctv`);
        endpoints.push('http://localhost:8889/api/webrtc?src=he_cctv');
      }

      let resp: Response | null = null;
      for (const endpoint of endpoints) {
        try {
          const r = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain'
            },
            body: pc.localDescription?.sdp || offer.sdp,
          });
          if (r && r.ok) {
            resp = r;
            break;
          }
        } catch (ignored) { }
      }

      if (!resp || !resp.ok) {
        setWebrtcError('Koneksi kamera sedang menghubungkan...');
        setWebrtcConnected(false);
        if (!isLocal && cctvPublicUrl) {
          setCctvStreamSource('custom');
        }
        return;
      }

      const answer = await resp.text();
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));
      setWebrtcConnected(true);
      setWebrtcError(null);
    } catch (err: any) {
      console.warn('WebRTC connect notice:', err?.message || err);
      setWebrtcError('Koneksi kamera terputus. Mencoba menyambung...');
      setWebrtcConnected(false);
      if (!isLocal && cctvPublicUrl) {
        setCctvStreamSource('custom');
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'cctv' && cctvStreamSource === 'local') {
      connectWebRTC();
    }
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cctvStreamSource, activeTab, cctvPublicUrl]);

  // Anti-Delay Sync: Segera sinkronkan ulang live stream jika tab browser aktif kembali
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeTab === 'cctv' && cctvStreamSource === 'local') {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, cctvStreamSource]);

  // Sync audio mute with video element — uses ref to bypass browser autoplay restrictions
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = cctvAudioMuted;
      if (!cctvAudioMuted) {
        videoRef.current.volume = cctvVolume / 100;
        // Force play to resume audio after unmuting
        videoRef.current.play().catch(() => { });
      }
    }
  }, [cctvAudioMuted, cctvVolume]);

  // Scheduler Otomatis untuk Katup Uap Berjadwal (Auto Interval)
  useEffect(() => {
    if (!supabaseControls.uap_auto_status || emergencyStopped) return;

    const intervalMinutes = supabaseControls.uap_interval_min || 10;
    const intervalMs = intervalMinutes * 60 * 1000;

    const timer = setInterval(async () => {
      triggerSyncFeedback('Katup Uap Otomatis', `Membuka Katup (${intervalMinutes}m cycle)...`);
      await handleUapStatusToggle(true);
      setTimeout(async () => {
        await handleUapStatusToggle(false);
        triggerSyncFeedback('Katup Uap Otomatis', 'Menutup Katup Uap');
      }, 15000);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [supabaseControls.uap_auto_status, supabaseControls.uap_interval_min, emergencyStopped, handleUapStatusToggle, triggerSyncFeedback]);

  // Sync volume with video element
  useEffect(() => {
    if (videoRef.current && !cctvAudioMuted) {
      videoRef.current.volume = cctvVolume / 100;
    }
  }, [cctvVolume, cctvAudioMuted]);

  const triggerCctvToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setCctvToast({ message, type });
    setTimeout(() => setCctvToast(null), 3500);
  };

  const handlePtzAction = async (action: string) => {
    setPtzMoving(action);

    const actionLabels: Record<string, string> = {
      up: 'Memutar Kamera ke Atas',
      down: 'Memutar Kamera ke Bawah',
      left: 'Memutar Kamera ke Kiri',
      right: 'Memutar Kamera ke Kanan',
      zoomIn: 'Zoom In Lensa Kamera',
      zoomOut: 'Zoom Out Lensa Kamera',
      center: 'Memutar Kamera ke Posisi Awal',
    };

    triggerCctvToast(actionLabels[action] || `Perintah PTZ: ${action.toUpperCase()}`, 'info');

    try {
      const res = await fetch('/api/cctv/ptz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, speed: ptzSpeed })
      });
      const data = await res.json();
      if (data.success) {
        triggerCctvToast(`Motor Kamera Berputar: ${action.toUpperCase()}`, 'success');
      }
    } catch (err) {
      console.warn('PTZ Background Dispatch:', err);
    } finally {
      setTimeout(() => setPtzMoving(null), 600);
    }
  };

  const handlePtzPreset = async (presetTitle: string, presetKey: string) => {
    triggerCctvToast(`Mengarahkan Kamera ke: ${presetTitle}`, 'info');
    try {
      const res = await fetch('/api/cctv/ptz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: presetKey, speed: ptzSpeed })
      });
      const data = await res.json();
      if (data.success) {
        triggerCctvToast(`Kamera Mengarah ke: ${presetTitle}`, 'success');
      }
    } catch (err) {
      console.warn('PTZ Preset Dispatch:', err);
    }
  };

  const handleTakeSnapshot = async () => {
    const timeStr = new Date().toLocaleTimeString('id-ID').replace(/:/g, '-');
    const dateStr = new Date().toLocaleDateString('id-ID');
    const fileName = `Snapshot_HE_${dateStr.replace(/\//g, '-')}_${timeStr}.jpg`;

    triggerCctvToast('Mengambil snapshot HD dari kamera...', 'info');

    try {
      // 1. Fetch real camera frame from /api/cctv/snapshot
      const res = await fetch('/api/cctv/snapshot');
      if (!res.ok) throw new Error('Gagal mengambil snapshot dari kamera');
      const blob = await res.blob();
      const localUrl = URL.createObjectURL(blob);

      // 2. Direct browser download so user immediately gets the file
      const downloadLink = document.createElement('a');
      downloadLink.href = localUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // 3. Save to media gallery list
      const newSnap = {
        id: 'snap-' + Date.now(),
        type: 'snapshot' as const,
        title: `Snapshot Lab HE (${timeStr})`,
        timestamp: `${dateStr} ${timeStr} WIB`,
        url: localUrl,
        metadata: {
          ti1: latestData.ti1,
          ti2: latestData.ti2,
          ti3: latestData.ti3,
          ti4: latestData.ti4,
          flow: latestData.fc1,
          heater: dualHeaterState.powerWatt > 0 ? `${dualHeaterState.powerWatt}W` : 'OFF'
        }
      };

      setCctvMediaList((prev) => [newSnap, ...prev]);
      uploadToCloud(blob, fileName, 'cctv-snapshots').catch(() => {});
      triggerCctvToast('Snapshot HD berhasil diambil & diunduh!', 'success');
    } catch (err: any) {
      console.error('Snapshot capture error:', err);
      triggerCctvToast('Gagal mengambil snapshot dari kamera', 'warning');
    }
  };

  const handleToggleManualRecord = async () => {
    if (!isManualRecording) {
      // START RECORDING
      try {
        const res = await fetch('/api/cctv/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' })
        });
        const data = await res.json();
        if (data.success) {
          setIsManualRecording(true);
          setRecordingSeconds(0);
          triggerCctvToast('Perekaman video MP4 live dimulai...', 'warning');
        } else {
          triggerCctvToast('Gagal memulai perekaman video', 'warning');
        }
      } catch (err) {
        console.error('Record start error:', err);
        triggerCctvToast('Gagal memulai perekaman video', 'warning');
      }
    } else {
      // STOP RECORDING
      try {
        triggerCctvToast('Menyimpan rekaman video MP4...', 'info');
        const res = await fetch('/api/cctv/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stop' })
        });
        const data = await res.json();
        setIsManualRecording(false);

        if (data.success && data.fileName) {
          const dur = data.durationSeconds || recordingSeconds;
          const timeStr = new Date().toLocaleTimeString('id-ID').replace(/:/g, '-');
          const dateStr = new Date().toLocaleDateString('id-ID');
          const videoUrl = data.url || `/api/cctv/recordings/stream?file=${encodeURIComponent(data.fileName)}`;

          // Direct browser download of MP4 file!
          const downloadLink = document.createElement('a');
          downloadLink.href = videoUrl;
          downloadLink.download = data.fileName;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);

          const newVideo = {
            id: 'rec-' + Date.now(),
            type: 'video' as const,
            title: `Rekaman Lab HE (${dur}s)`,
            timestamp: `${dateStr} ${timeStr} WIB`,
            url: videoUrl,
            metadata: {
              ti1: latestData.ti1,
              ti2: latestData.ti2,
              ti3: latestData.ti3,
              ti4: latestData.ti4,
              flow: latestData.fc1,
              duration: `${dur} Detik`,
              size: data.fileSize || 'MP4',
              heater: dualHeaterState.powerWatt > 0 ? `${dualHeaterState.powerWatt}W` : 'OFF'
            }
          };

          setCctvMediaList((prev) => [newVideo, ...prev]);
          triggerCctvToast(`Rekaman video (${dur}s) berhasil disimpan & diunduh!`, 'success');
        } else {
          triggerCctvToast('Gagal menyelesaikan rekaman', 'warning');
        }
      } catch (err) {
        console.error('Record stop error:', err);
        setIsManualRecording(false);
        triggerCctvToast('Gagal menyimpan rekaman video', 'warning');
      }
    }
  };

  const handleToggleMic = async () => {
    if (!cctvMicActive) {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('BROWSER_INSECURE_CONTEXT');
        }
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
        const audioTrack = micStream.getAudioTracks()[0];

        if (audioTransceiverRef.current) {
          await audioTransceiverRef.current.sender.replaceTrack(audioTrack);
        } else if (pcRef.current) {
          pcRef.current.addTrack(audioTrack, micStream);
        }

        setCctvMicActive(true);
        triggerCctvToast('Mikrofon Interkom aktif', 'success');
      } catch (err: any) {
        console.error('Mic access error:', err);
        if (err?.message === 'BROWSER_INSECURE_CONTEXT') {
          triggerCctvToast('Browser memblokir mikrofon pada IP HTTP non-lokal. Buka melalui http://localhost:3000 atau aktifkan SSL/HTTPS.', 'warning');
        } else if (err?.name === 'NotAllowedError') {
          triggerCctvToast('Akses mikrofon ditolak browser. Izinkan akses mikrofon di pengaturan browser.', 'warning');
        } else {
          triggerCctvToast(`Gagal mengaktifkan mikrofon (${err?.name || err?.message || 'Error'})`, 'warning');
        }
      }
    } else {
      if (audioTransceiverRef.current) {
        try { await audioTransceiverRef.current.sender.replaceTrack(null); } catch { }
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      setCctvMicActive(false);
      triggerCctvToast('Mikrofon Interkom dinonaktifkan', 'info');
    }
  };


  const handleDeleteMediaItem = (id: string) => {
    if (!window.confirm('Hapus file media ini dari galeri?')) return;
    setCctvMediaList((prev) => prev.filter((item) => item.id !== id));
    triggerCctvToast('Media berhasil dihapus', 'info');
  };

  const handleVerifyOtp = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setResetError(null);

    // 1. Validasi Batas Waktu OTP (Maksimal 5 Menit)
    if (!otpExpiresAt || Date.now() > otpExpiresAt) {
      setResetError('Kode OTP telah kedaluwarsa (lebih dari 5 menit). Silakan klik "Kirim Ulang OTP" untuk mendapatkan kode baru.');
      setGeneratedOtp('');
      return;
    }

    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      setResetError('Silakan masukkan 6 digit kode OTP yang telah dikirim ke email Anda.');
      return;
    }

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setResetError('Kode OTP tidak sesuai. Pastikan Anda memasukkan kode 6-digit terbaru dari email Anda.');
      return;
    }

    setResetStep('NEW_PASSWORD');
  };

  // ─── PASSWORD SECURITY & STRENGTH EVALUATOR ───
  const getPasswordStrength = (pass: string) => {
    const hasMinLength = pass.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);

    let score = 0;
    if (hasMinLength) score++;
    if (hasUpperCase) score++;
    if (hasLowerCase) score++;
    if (hasNumber) score++;

    return {
      score,
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber
    };
  };

  const handleSaveNewPassword = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setResetError(null);

    const strength = getPasswordStrength(newPasswordInput);

    if (!strength.hasMinLength) {
      setResetError('Keamanan Kurang: Kata sandi baru minimal harus terdiri dari 8 karakter.');
      return;
    }
    if (!strength.hasUpperCase) {
      setResetError('Keamanan Kurang: Kata sandi harus mengandung setidaknya 1 huruf besar / kapital (A-Z).');
      return;
    }
    if (!strength.hasLowerCase) {
      setResetError('Keamanan Kurang: Kata sandi harus mengandung setidaknya 1 huruf kecil (a-z).');
      return;
    }
    if (!strength.hasNumber) {
      setResetError('Keamanan Kurang: Kata sandi harus mengandung setidaknya 1 angka (0-9).');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setResetError('Konfirmasi kata sandi tidak cocok. Silakan ketik ulang kata sandi dengan benar.');
      return;
    }

    const email = resetEmailInput.toLowerCase().trim();
    const updated = { ...userPasswords, [email]: newPasswordInput.trim() };
    setUserPasswords(updated);

    // Save updated password to central server API
    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, newPassword: newPasswordInput.trim() })
      });
    } catch (err) {
      console.error('Failed to save new password to server API', err);
    }

    // Auto-fill login form with new credentials
    setLoginEmail(email);
    setLoginPassword(newPasswordInput.trim());
    setResetStep('SUCCESS');
  };

  // ─── LOGIN HANDLER (WITH STRICT GATEKEEPING & PASSWORD VALIDATION) ───
  const handleLogin = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);

    // Pertahankan status sesi jika pengguna memiliki sesi aktif yang sedang berjalan
    const existingSession = typeof window !== 'undefined' ? localStorage.getItem('fluidhe_current_session') : null;
    const existingState = typeof window !== 'undefined' ? localStorage.getItem('fluidhe_system_state') : null;
    if (!existingSession || existingState !== 'ACTIVE') {
      setSystemState('OFF');
      setCurrentSession(null);
      setSessionDuration(0);
      try {
        localStorage.setItem('fluidhe_system_state', 'OFF');
        localStorage.removeItem('fluidhe_current_session');
      } catch (e) {}
    }

    const inputEmail = loginEmail.toLowerCase().trim();
    const inputPass = (loginPassword || '').trim();

    // ─── AKSES CEPAT / DEMO LOGIN (DINAMIS DARI DATABASE USER) ───
    if (inputEmail === '1' || (inputEmail === 'anugrahtriplecycle@gmail.com' && inputPass === '')) {
      if (selectedDemoRole !== 'admin') {
        setLoginError('Akun ini terdaftar sebagai Admin. Silakan klik tab "Admin" di atas untuk masuk.');
        return;
      }

      const nowIso = new Date().toISOString();
      const targetEmail = 'anugrahtriplecycle@gmail.com';
      const userInList = usersList.find((u) => u.email.toLowerCase() === targetEmail);
      const displayName = userInList?.name || 'Admin';

      setUsersList((prev) =>
        prev.map((u) => (u.email.toLowerCase() === targetEmail ? { ...u, lastLogin: nowIso } : u))
      );

      try {
        fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail, lastLogin: nowIso, lastSeen: Date.now() })
        }).catch(() => { });
      } catch (e) { }

      const userObj = {
        name: displayName,
        email: targetEmail,
        role: 'admin' as UserRole
      };
      setCurrentUser(userObj);
      setIsLoggedIn(true);
      setActiveTab('dashboard');
      try {
        sessionStorage.setItem('fluidhe_auth_user', JSON.stringify(userObj));
        sessionStorage.setItem('fluidhe_is_logged_in', 'true');
        localStorage.setItem('fluidhe_active_tab', 'dashboard');
      } catch (e) {}
      return;
    }

    if (inputEmail === '2' || inputEmail === 'operator' || (inputEmail === 'dwimeliantiistiqomah55@gmail.com' && inputPass === '')) {
      if (selectedDemoRole !== 'operator') {
        setLoginError('Akun ini terdaftar sebagai Operator. Silakan klik tab "Operator" di atas untuk masuk.');
        return;
      }

      const nowIso = new Date().toISOString();
      const targetEmail = 'dwimeliantiistiqomah55@gmail.com';
      const userInList = usersList.find((u) => u.email.toLowerCase() === targetEmail);
      const displayName = userInList?.name || 'Operator 1';

      setUsersList((prev) =>
        prev.map((u) => (u.email.toLowerCase() === targetEmail ? { ...u, lastLogin: nowIso } : u))
      );

      try {
        fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail, lastLogin: nowIso, lastSeen: Date.now() })
        }).catch(() => { });
      } catch (e) { }

      const userObj = {
        name: displayName,
        email: targetEmail,
        role: 'operator' as UserRole
      };
      setCurrentUser(userObj);
      setOperatorSessionRemaining(operatorSessionLimit * 60);
      setIsLoggedIn(true);
      setActiveTab('dashboard');
      try {
        sessionStorage.setItem('fluidhe_auth_user', JSON.stringify(userObj));
        sessionStorage.setItem('fluidhe_is_logged_in', 'true');
        localStorage.setItem('fluidhe_active_tab', 'dashboard');
      } catch (e) {}
      return;
    }

    if (!loginEmail || !loginEmail.trim()) {
      setLoginError('Silakan masukkan email / username akun Anda.');
      return;
    }
    const email = loginEmail.toLowerCase().trim();

    // STRICT: Password is required to log in for normal users!
    if (!loginPassword || !loginPassword.trim()) {
      setLoginError('Silakan masukkan kata sandi akun Anda untuk masuk ke sistem.');
      return;
    }

    let activePasswords: Record<string, string> = { ...DEFAULT_PASSWORDS, ...userPasswords };
    let activeUsers: UserItem[] = usersList;
    try {
      const uRes = await fetch('/api/users', { cache: 'no-store' });
      const uData = await uRes.json();
      if (uData.success && Array.isArray(uData.users)) {
        activeUsers = uData.users;
        if (uData.passwords) {
          activePasswords = { ...DEFAULT_PASSWORDS, ...uData.passwords };
        }
      }
    } catch (err) {
      console.error('Fetch users error on login:', err);
    }

    const found = activeUsers.find(u => u.email.toLowerCase() === email || u.name.toLowerCase() === email) || usersList.find(u => u.email.toLowerCase() === email || u.name.toLowerCase() === email);

    // 1. Account existence validation
    if (!found && email !== 'admin@uad.ac.id' && email !== 'operator@uad.ac.id' && email !== 'anugrahtriplecycle@gmail.com' && email !== 'dwimeliantiistiqomah55@gmail.com') {
      setLoginError('Akun dengan email / username ini belum terdaftar di sistem. Silakan hubungi Administrator Lab.');
      return;
    }

    const actualRole: UserRole = found
      ? found.role
      : (email === 'admin@uad.ac.id' || email === 'anugrahtriplecycle@gmail.com')
        ? 'admin'
        : 'operator';

    // 2. Strict Role-Tab Matching Check (Prevent Operator from logging in via Admin tab and vice-versa)
    if (selectedDemoRole !== actualRole) {
      if (actualRole === 'operator') {
        setLoginError('Akun ini terdaftar sebagai Operator (Mahasiswa). Silakan klik tab "Operator" di atas untuk masuk.');
      } else {
        setLoginError('Akun ini terdaftar sebagai Admin (Dosen/KaLab). Silakan klik tab "Admin" di atas untuk masuk.');
      }
      return;
    }

    const targetEmail = found ? found.email.toLowerCase() : email;
    const defaultFallback = (targetEmail === 'admin@uad.ac.id' || actualRole === 'admin')
      ? 'admin123'
      : (targetEmail === 'operator@uad.ac.id' || actualRole === 'operator')
        ? 'operator123'
        : 'dev123';

    const expectedPassword = (
      activePasswords[targetEmail] ||
      (found && activePasswords[found.name]) ||
      (found && activePasswords[found.name.toLowerCase()]) ||
      activePasswords[email] ||
      userPasswords[targetEmail] ||
      defaultFallback
    ).trim();
    const enteredPassword = loginPassword.trim();

    // STRICT: Password match check
    if (enteredPassword !== expectedPassword) {
      setLoginError('Kata sandi yang Anda masukkan salah. Silakan coba lagi atau gunakan verifikasi email di bawah untuk mereset kata sandi Anda.');
      return;
    }

    // JADWAL AKSES HARI & JAM CHECK (Schedule-Based Access Control)
    if (found) {
      const scheduleStatus = validateScheduleAccess(found);
      if (!scheduleStatus.allowed) {
        setLoginError(`⏰ AKSES DITOLAK (DILUAR JADWAL LAB): ${scheduleStatus.reason}`);
        return;
      }
    }

    const nowIso = new Date().toISOString();

    // Update lastLogin locally and to central server database
    setUsersList((prev) =>
      prev.map((u) => (u.email.toLowerCase() === targetEmail ? { ...u, lastLogin: nowIso } : u))
    );

    try {
      const patchRes = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, lastLogin: nowIso })
      });
      const patchData = await patchRes.json();
      if (patchData.success && Array.isArray(patchData.users)) {
        setUsersList(patchData.users);
      }
    } catch (e) {
      console.error('Failed to update lastLogin on server', e);
    }

    let loggedInUser: { name: string; email: string; role: UserRole };
    if (found) {
      loggedInUser = {
        name: found.name,
        email: found.email,
        role: found.role
      };
      setCurrentUser(loggedInUser);
      if (found.role === 'operator') {
        setOperatorSessionRemaining(operatorSessionLimit * 60);
      }
    } else if (actualRole === 'admin') {
      loggedInUser = {
        name: 'Admin Lab (Anugrah)',
        email: targetEmail,
        role: 'admin'
      };
      setCurrentUser(loggedInUser);
    } else {
      loggedInUser = {
        name: 'Operator Lab',
        email: targetEmail,
        role: 'operator'
      };
      setCurrentUser(loggedInUser);
      setOperatorSessionRemaining(operatorSessionLimit * 60);
    }
    setIsLoggedIn(true);
    setActiveTab('dashboard');
    try {
      sessionStorage.setItem('fluidhe_auth_user', JSON.stringify(loggedInUser));
      sessionStorage.setItem('fluidhe_is_logged_in', 'true');
      localStorage.setItem('fluidhe_active_tab', 'dashboard');
    } catch (e) {}
  };

  const handleLogout = () => {
    stopSirenSound();
    setShowAlarmModal(false);
    if (currentUser?.email) {
      fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, lastSeen: 0 })
      }).catch(() => { });
    }
    setIsLoggedIn(false);
    setSystemState('OFF');
    setCurrentSession(null);
    setSessionDuration(0);
    try {
      sessionStorage.removeItem('fluidhe_auth_user');
      sessionStorage.removeItem('fluidhe_is_logged_in');
      localStorage.removeItem('fluidhe_auth_user');
      localStorage.removeItem('fluidhe_is_logged_in');
      localStorage.removeItem('fluidhe_active_tab');
      localStorage.setItem('fluidhe_system_state', 'OFF');
      localStorage.removeItem('fluidhe_current_session');
    } catch (e) {}
  };

  const handleConfirmShutdownAndLogout = async () => {
    setIsLoggingOutWithShutdown(true);
    setSystemState('STOPPING');

    // 1. Matikan pemanas & aktuator secara aman via siklus SHUTDOWN ke ESP32 & Supabase
    setHeaterMasterPower(false);
    try {
      await handleSystemShutdown();
    } catch (e) {
      console.error('Gagal shutdown saat logout:', e);
    }

    // 2. Arsipkan sesi praktikum jika ada
    const now = new Date();
    const finalSession: SystemSession | null = currentSession
      ? {
          ...currentSession,
          endTime: now.toLocaleTimeString('id-ID'),
          endTimeMs: Date.now(),
          durationSeconds: sessionDuration,
          pointsCount: currentSession.data.length
        }
      : null;

    if (finalSession) {
      setArchivedSessions((prev) => {
        const updated = [finalSession, ...prev.filter((s) => s.id !== finalSession.id)];
        return updated;
      });

      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: finalSession })
        });
        if (currentUser?.email) {
          fetchSessions(currentUser.role, currentUser.email, classFilter);
        }
      } catch (err) {
        console.error('Gagal menyimpan sesi saat logout:', err);
      }
    }

    setIsLoggingOutWithShutdown(false);
    setIsLogoutConfirmModalOpen(false);
    handleLogout();
    triggerSyncFeedback('Sistem Dimatikan & Keluar', 'Sistem berhasil dimatikan secara aman dan Anda telah logout.');
  };

  const handleLogoutOnly = () => {
    setIsLogoutConfirmModalOpen(false);
    handleLogout();
  };

  // ─── EMERGENCY STOP HANDLER ───
  const triggerEmergencyStop = async () => {
    setEmergencyStopped(true);
    setHeaterMasterPower(false);
    setFc1Valve(0);
    await handleEmergencyShutdown();
    setAlarmLogs((prev) => [
      {
        id: `ALM-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        sensor: 'EMERGENCY_BUTTON',
        metric: 'Manual Emergency Stop Trip Activated',
        value: 0,
        threshold: 0,
        severity: 'Critical',
        acknowledged: false
      },
      ...prev
    ]);
    triggerSyncFeedback('EMERGENCY STOP', 'Perintah Matikan Darurat Dikirim ke Alat');
  };

  const resetEmergencyStop = async () => {
    setEmergencyStopped(false);
    setHeaterMasterPower(true);
    setFc1Valve(100);
    setFc2Valve(100);
    await handleControlModeChange('MANUAL');
  };

  // ─── ACTIVE SESSION DATA SELECTION (ANTI DATA TERCAMPUR) ───
  const activeSessionData = useMemo(() => {
    const isCurrentSelected = selectedLogsSessionId === 'CURRENT' || (currentSession && selectedLogsSessionId === currentSession.id);
    if (isCurrentSelected) {
      return (currentSession && currentSession.data && currentSession.data.length > 0)
        ? currentSession.data
        : telemetryHistory;
    }
    const archived = archivedSessions.find((s) => s.id === selectedLogsSessionId);
    if (archived && archived.data && archived.data.length > 0) {
      return archived.data;
    }
    // Fallback: jika sesi spesifik belum ditemukan tapi ada list archivedSessions
    if (archivedSessions.length > 0 && selectedLogsSessionId !== 'CURRENT') {
      return archivedSessions[0].data || [];
    }
    if (currentSession && currentSession.data && currentSession.data.length > 0) {
      return currentSession.data;
    }
    return [];
  }, [selectedLogsSessionId, currentSession, telemetryHistory, archivedSessions]);

  // ─── DOWNSAMPLED LOGS FOR INTERVAL EXPORT & TABLE (1s, 2s, 5s, 30s, 1m) ───
  const filteredLogsData = useMemo(() => {
    const isCurrentSelected = selectedLogsSessionId === 'CURRENT' || (currentSession && selectedLogsSessionId === currentSession.id);
    if (isCurrentSelected && (dateFilter === 'Yesterday' || dateFilter === '7Days')) {
      return [];
    }

    // 2. Multi-column search filter (Timestamp, Temperatures TI1-TI4, Heater Status, Mode)
    const q = logSearchQuery.trim().toLowerCase();
    const queryFiltered = activeSessionData.filter((d) => {
      if (!q) return true;
      return (
        d.timestamp.toLowerCase().includes(q) ||
        d.ti1.toFixed(2).includes(q) ||
        d.ti2.toFixed(2).includes(q) ||
        d.ti3.toFixed(2).includes(q) ||
        d.ti4.toFixed(2).includes(q) ||
        (d.heater1Active ? 'on' : 'off').includes(q) ||
        (d.heater2Active ? 'on' : 'off').includes(q) ||
        d.mode.toLowerCase().includes(q)
      );
    });

    // 3. Downsampling based on logInterval
    // Data dari ESP32 dikirim per ~4-5 detik, sehingga untuk 1s, 2s, dan 5s tampilkan 100% data tanpa eliminasi
    if (logInterval === '1s' || logInterval === '2s' || logInterval === '5s') {
      return queryFiltered;
    } else if (logInterval === '30s') {
      return queryFiltered.filter((_, idx) => idx % 6 === 0);
    } else if (logInterval === '1m') {
      return queryFiltered.filter((_, idx) => idx % 12 === 0);
    }
    return queryFiltered;
  }, [activeSessionData, logSearchQuery, logInterval, dateFilter]);

  // ─── CLOUD DRIVE AUTO-SYNC & FLASHDISK DISABLE HANDLERS ───
  const getFormattedDateStr = (date: Date) => {
    const d = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const t = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '.');
    return `${d}, ${t} WIB`;
  };

  const handleCloudDriveAccess = () => {
    setIsCloudDriveModalOpen(true);
    setCloudLastSyncTime(new Date().toLocaleTimeString('id-ID'));
  };

  const handleExportAndUpload = async () => {
    try {
      setIsUploading(true);
      triggerCctvToast('⏳ Mengolah data & mengunggah file ke Cloud Storage...', 'info');

      const currentOrDummySession: SystemSession = {
        id: currentSession?.id || `SES-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        title: currentSession?.title || 'Log Telemetri Heat Exchanger',
        date: currentSession?.date || new Date().toISOString().slice(0, 10),
        startTime: currentSession?.startTime || new Date().toLocaleTimeString('id-ID'),
        startTimeMs: currentSession?.startTimeMs || Date.now(),
        operatorName: currentUser?.name || 'Operator',
        operatorEmail: currentUser?.email,
        classGroup: currentUser?.name,
        flowMode: operationMode,
        pointsCount: filteredLogsData.length,
        data: filteredLogsData,
        durationSeconds: sessionDuration
      };

      const { blob, fileName } = exportSessionToExcel(currentOrDummySession, { returnBlob: true });
      if (!blob) throw new Error('Gagal menghasilkan file spreadsheet');

      // 2. Upload
      const { uploadToCloud } = await import('@/lib/upload-helper');
      const result = await uploadToCloud(blob, fileName, 'telemetry-logs');

      triggerCctvToast('File Excel tersimpan di Cloud Storage', 'success');

      // 3. Berhasil!
      if (result.url) {
        window.open(result.url, '_blank');
      }

    } catch (err: any) {
      console.error('Excel upload error:', err);
      triggerCctvToast('Gagal upload: ' + (err?.message || 'Error'), 'warning');
    } finally {
      setIsUploading(false);
    }
  };

  // ─── ADD USER HANDLER ───
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    const newUser: UserItem = {
      id: `USR-0${usersList.length + 1}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: 'Active',
      lastLogin: 'Baru saja',
      isScheduleRestricted: newUserRole === 'operator' ? newUserRestricted : false,
      allowedStartDate: newUserStartDate,
      allowedEndDate: newUserEndDate,
      allowedStartTime: newUserStartTime,
      allowedEndTime: newUserEndTime
    };
    const updatedUsers = [...usersList, newUser];
    setUsersList(updatedUsers);
    try {
      localStorage.setItem('fluidhe_user_accounts', JSON.stringify(updatedUsers));
    } catch (err) {
      console.error(err);
    }
    setNewUserName('');
    setNewUserEmail('');
    setShowAddUserModal(false);
  };

  // ─── REUSABLE P&ID SCHEMATIC RENDERER WITH DUAL HEATER & SOLENOID VALVES ───
  const renderPIDDiagram = (diagramMode: 'Counter-Current' | 'Co-Current', titleExtra: string = '') => {
    return (
      <PidDiagram
        diagramMode={diagramMode}
        titleExtra={titleExtra}
        latestData={latestData}
        heaterMasterPower={heaterMasterPower}
        emergencyStopped={emergencyStopped}
        fc1Valve={supabaseControls?.servo_angle ?? fc1Valve}
        fc2Valve={supabaseControls?.servo_angle_2 ?? fc2Valve}
        uapStatus={supabaseControls?.uap_status}
        airDinginStatus={supabaseControls?.air_dingin}
        pompaStatus={supabaseControls?.pompa_ekstra ?? false}
        dualHeaterState={dualHeaterState}
        solenoidValves={solenoidValves}
        deltaPHot={deltaPHot}
        onHoverSensor={setActivePidHover}
        isHardwareOnline={isHardwareOnline}
      />
    );
  };

  // ─── RENDER: HYDRATION MOUNT SHIELD (PREVENT SSR MISMATCH ON RELOAD) ───
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold tracking-widest text-slate-300 uppercase">Memuat FluidHE IoT System...</p>
        </div>
      </div>
    );
  }

  // ─── RENDER: LOGIN SCREEN (SUPPORTING ADMIN & OPERATOR ROLES) ───
  if (!isLoggedIn) {
    return (
      <LoginScreen
        selectedDemoRole={selectedDemoRole}
        setSelectedDemoRole={setSelectedDemoRole}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        setLoginError={setLoginError}
        showLoginPassword={showLoginPassword}
        setShowLoginPassword={setShowLoginPassword}
        handleLogin={handleLogin}
        isResetModalOpen={isResetModalOpen}
        setIsResetModalOpen={setIsResetModalOpen}
        resetStep={resetStep}
        setResetStep={setResetStep}
        resetEmailInput={resetEmailInput}
        setResetEmailInput={setResetEmailInput}
        enteredOtp={enteredOtp}
        setEnteredOtp={setEnteredOtp}
        newPasswordInput={newPasswordInput}
        setNewPasswordInput={setNewPasswordInput}
        confirmPasswordInput={confirmPasswordInput}
        setConfirmPasswordInput={setConfirmPasswordInput}
        showNewPassword={showNewPassword}
        setShowNewPassword={setShowNewPassword}
        resetError={resetError}
        setResetError={setResetError}
        isSendingEmail={isSendingEmail}
        otpResendCountdown={otpResendCountdown}
        otpTimeLeft={otpTimeLeft}
        smtpStatusInfo={smtpStatusInfo}
        handleRequestOtp={handleRequestOtp}
        handleVerifyOtp={handleVerifyOtp}
        handleSaveNewPassword={handleSaveNewPassword}
        getPasswordStrength={getPasswordStrength}
      />
    );
  }

  // ─── RENDER MAIN APP DASHBOARD ───
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* ─── ALARM SIREN POPUP MODAL ─── */}
      {showAlarmModal && isAlarmActive && isLoggedIn && systemState === 'ACTIVE' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="asklepios-card max-w-md w-full p-6 bg-white rounded-3xl shadow-2xl border-2 border-red-500 animate-pulse">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-3 bg-red-100 rounded-2xl animate-bounce">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">PERINGATAN SUHU TINGGI!</h3>
                <p className="text-xs text-red-600 font-semibold">Bahaya Temperatur / Tekanan Melampaui Batas</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm space-y-2 mb-6">
              <div className="flex justify-between text-slate-700">
                <span>Sensor Hot Inlet (TI1):</span>
                <strong className="text-red-700 font-bold">{latestData.ti1}°C</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Batas Maksimum Aman:</span>
                <strong>{ti1MaxThreshold}°C</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Pressure Drop Hot Fluid (ΔP):</span>
                <strong className={deltaPHot > deltaPMaxThreshold ? 'text-red-700 font-bold' : ''}>{deltaPHot} atm-g</strong>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                {soundEnabled ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {soundEnabled ? 'Matikan Siren' : 'Bunyikan Siren'}
              </button>

              <button
                onClick={() => setShowAlarmModal(false)}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Tutup & Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OPERATOR SESSION EXPIRED MODAL ─── */}
      {sessionExpiredModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="asklepios-card max-w-md w-full p-6 bg-white rounded-3xl shadow-2xl border-2 border-amber-500 text-center space-y-4">
            <div className="p-4 bg-amber-100 text-amber-700 rounded-full w-16 h-16 mx-auto flex items-center justify-center animate-bounce">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Durasi Sesi Praktikum Selesai!</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Batas waktu durasi sesi pengoperasian mahasiswa (Operator) yang diizinkan Admin ({operatorSessionLimit} menit) telah berakhir.
            </p>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              Harap hubungi <strong>Dosen / Asisten Lab (Admin)</strong> untuk memperpanjang durasi praktikum.
            </div>
            <button
              onClick={() => {
                setSessionExpiredModal(false);
                handleLogout();
              }}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </div>
      )}

      {/* ─── OPERATOR SCHEDULE EXPIRED / ACCESS RESTRICTED MODAL ─── */}
      {scheduleRestrictionNotice && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="asklepios-card max-w-md w-full p-6 sm:p-7 bg-white rounded-3xl shadow-2xl border-2 border-rose-500 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-rose-100 text-rose-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center animate-bounce shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">Akses Ditutup Administrator</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {scheduleRestrictionNotice}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2 text-left">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Silakan hubungi <strong>Dosen / Kepala Laboratorium (Admin)</strong> untuk pembaruan jadwal praktikum.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setScheduleRestrictionNotice(null);
                handleLogout();
              }}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </div>
      )}

      {/* ─── ADD USER MODAL ─── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="asklepios-card max-w-md w-full p-6 bg-white rounded-3xl shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-600" /> Tambah User Baru
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Contoh: Ir. Hendra Suputra"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Pengguna</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="hendra@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Hak Akses</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800"
                >
                  <option value="operator">Operator (Mahasiswa - Monitoring & Control)</option>
                  <option value="admin">Admin (Dosen / KaLab - Akses Penuh + User Mgmt)</option>
                </select>
              </div>

              {newUserRole === 'operator' && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between bg-white p-2.5 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <div>
                        <span className="block text-xs font-bold text-slate-800">Batasi Jadwal Login</span>
                        <span className="block text-[10px] text-slate-500">Hanya bisa login pada jadwal tertentu</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={newUserRestricted} onChange={(e) => setNewUserRestricted(e.target.checked)} />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {newUserRestricted && (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" /> Mulai Tanggal
                          </label>
                          <input type="date" value={newUserStartDate} onChange={(e) => setNewUserStartDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800" />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" /> S.d Tanggal
                          </label>
                          <input type="date" value={newUserEndDate} onChange={(e) => setNewUserEndDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-600" /> Jam Mulai
                          </label>
                          <input type="time" value={newUserStartTime} onChange={(e) => setNewUserStartTime(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800" />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-600" /> Jam Selesai
                          </label>
                          <input type="time" value={newUserEndTime} onChange={(e) => setNewUserEndTime(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20"
                >
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TOP HEADER BAR ─── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-2.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between no-print gap-1 sm:gap-3">
        {/* Left Section: Menu Toggle + Logo + Title */}
        <div id="tour-header-title" className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition focus:outline-none shrink-0 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-8 h-8 sm:w-11 sm:h-11 relative flex items-center justify-center p-1 bg-white rounded-xl shadow-xs border border-slate-200/80 shrink-0">
            <img src="/uad-logo.png" alt="Logo UAD" className="w-full h-full object-contain scale-105" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                FluidHE<span className="hidden sm:inline"> Dashboard</span>
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold rounded-full whitespace-nowrap">
                UAD Kampus IV
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block leading-tight mt-0.5">Laboratorium Teknik Kimia - Universitas Ahmad Dahlan</p>
          </div>
        </div>

        {/* Right Section: Status Badges & User Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Interactive Guided Tour Button - Hanya muncul ketika sistem sudah AKTIF (bukan saat standby/inisialisasi) */}
          {systemState === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => setIsTourOpen(true)}
              className="hidden sm:flex items-center gap-1 p-1.5 sm:px-3 sm:py-1 bg-gradient-to-r from-sky-50 to-indigo-50 hover:from-sky-100 hover:to-indigo-100 text-sky-800 border border-sky-200/80 rounded-full text-[10px] sm:text-xs font-extrabold shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer ring-1 ring-sky-500/10"
              title="Buka Panduan Tutorial Interaktif"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
              <span>Panduan</span>
            </button>
          )}

          {/* ─── SYSTEM READINESS & STATUS BADGE (MATI / STANDBY / AKTIF) ─── */}
          <SystemStatusBadge
            status={systemState}
            sessionDuration={sessionDuration}
            sessionId={currentSession?.id || null}
            onOpenStartup={() => setIsStartupModalOpen(true)}
            onOpenEndSession={() => setIsEndSessionModalOpen(true)}
          />

          {/* Hardware Connection Status Badge */}
          <div
            id="tour-iot-badge"
            title={
              isHardwareOnline
                ? 'Mesin laboratorium aktif mengirimkan data telemetri secara real-time.'
                : 'Mesin Belum Terhubung - Data telemetri tidak masuk dari mesin laboratorium.'
            }
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold border transition whitespace-nowrap shrink-0 ${
              isHardwareOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                : supabaseStatus === 'CONNECTING'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                  : 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                isHardwareOnline
                  ? 'bg-emerald-500 animate-pulse'
                  : supabaseStatus === 'CONNECTING'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-rose-500'
              }`}
            />
            <span className="hidden xs:inline sm:inline font-extrabold tracking-wide">
              {isHardwareOnline
                ? 'ONLINE'
                : supabaseStatus === 'CONNECTING'
                  ? 'CONNECTING...'
                  : 'OFFLINE'}
            </span>
          </div>

          {currentUser.role === 'operator' && (
            <button
              type="button"
              onClick={() => setIsSessionInfoModalOpen(true)}
              title="Klik untuk informasi batas waktu sesi praktikum"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
              <span>Sesi: {Math.floor(operatorSessionRemaining / 60)}m</span>
              <Info className="w-3 h-3 text-amber-600/70 hidden xs:inline shrink-0" />
            </button>
          )}

          {/* User Profile Pill & Logout */}
          <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200 shrink-0">
            <div className="text-right hidden lg:block">
              <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
              <span className={`inline-block text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${currentUser.role === 'admin'
                ? 'bg-sky-100 text-sky-700 border border-sky-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                {currentUser.role}
              </span>
            </div>

            <button
              onClick={() => setIsLogoutConfirmModalOpen(true)}
              title="Keluar Sesi"
              className="p-1 sm:p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── CONDITIONAL RENDER: STANDBY SCREEN (WHEN MACHINE IS OFF) VS ACTIVE DASHBOARD ─── */}
      {systemState !== 'ACTIVE' ? (
        <SystemStandbyScreen
          systemState={systemState}
          operatorName={currentUser?.name || 'Operator'}
          defaultFlowMode={operationMode}
          onStartSystem={handleConfirmStartup}
          recentArchivesCount={archivedSessions.length}
        />
      ) : (
        /* ─── BODY CONTAINER (SIDEBAR + MAIN CONTENT) ─── */
        <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto relative min-w-0">

        {/* ─── MOBILE BACKDROP OVERLAY ─── */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden transition-opacity"
          />
        )}

        {/* ─── SIDEBAR NAVIGATION (RESPONSIVE DRAWER ON MOBILE, STICKY ON DESKTOP) ─── */}
        <aside
          className={`fixed md:sticky md:top-[61px] md:h-[calc(100vh-61px)] md:overflow-y-auto inset-y-0 left-0 z-40 w-72 md:w-64 bg-white border-r border-slate-200/80 p-4 space-y-2 no-print shrink-0 transform transition-all duration-300 ease-in-out md:transform-none ${isSidebarOpen ? 'translate-x-0 pointer-events-auto shadow-2xl' : '-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto'
            }`}
        >
          <div className="flex items-center justify-between px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>Menu Utama</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dashboard'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <Activity className="w-4 h-4" /> Real-Time Monitoring
            </button>

            <button
              onClick={() => {
                setActiveTab('control');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'control'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <Sliders className="w-4 h-4" /> Control Panel
            </button>

            <button
              onClick={() => {
                setActiveTab('logs');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'logs'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <FileText className="w-4 h-4" /> Data Logs & Laporan
            </button>

            <button
              onClick={() => {
                setActiveTab('alarms');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'alarms'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <div className="relative">
                <Bell className="w-4 h-4" />
                {alarmLogs.some(a => !a.acknowledged) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                )}
              </div>
              Alarm System
            </button>

            <button
              onClick={() => {
                setActiveTab('cctv');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'cctv'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Video className="w-4 h-4 shrink-0" />
                <span className="truncate">CCTV Feed</span>
              </div>
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-extrabold border border-emerald-200 shrink-0">Live</span>
            </button>
          </nav>

          {currentUser.role === 'admin' && (
            <div className="pt-4 border-t border-slate-100 space-y-1">
              <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Administrasi & Lab Control (Admin)
              </div>

              <button
                onClick={() => {
                  setActiveTab('sessions');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'sessions'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">Data Praktikum</span>
                </div>
                <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded text-[10px] font-extrabold border border-sky-200 shrink-0">Admin</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('users');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'users'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate">User Management</span>
                </div>
                <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded text-[10px] font-extrabold border border-sky-200 shrink-0">Admin</span>
              </button>
            </div>
          )}

          <div className="mt-8 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Server className="w-4 h-4 text-sky-600" /> Specs Hardware
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dual Heater (H1 &amp; H2), 4 Solenoid Valve (SV1–SV4), 4 Sensor Suhu (T1–T4), 4 Sensor Tekanan (P1–P4), 2 Flow Meter (FC1–FC2), &amp; Katup Manual (VL).
            </p>
          </div>
        </aside>

        {/* ─── MAIN CONTENT VIEW SWITCHER ─── */}
        <main className="flex-1 min-w-0 max-w-full overflow-x-hidden p-3.5 sm:p-4 md:p-6 space-y-6 overflow-y-auto pb-24 md:pb-6">

          {/* SAFETY / WARNING BANNERS (HANYA MUNCUL DI TAB MONITORING AKTIF & TIDAK MUNCUL DI LAPORAN / PRINT) */}
          {/* 🚨 CRITICAL WARNING SYSTEM POP-UP BANNER (WARN_BKA_UAP / DELTA PRESSURE ALERT) */}
          {(activeTab === 'dashboard' || activeTab === 'control') &&
            !isCriticalWarningDismissed &&
            isCriticalUapCondition && (
              <div className="no-print print:hidden p-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-2 border-red-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-red-600/30 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
                    <AlertTriangle className="w-7 h-7 text-white animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-white tracking-wide uppercase flex items-center gap-2 flex-wrap">
                      PERINGATAN BAHAYA: Beda Tekanan (ΔP) Kritis!
                      {supabaseControls.uap_status && (
                        <span className="text-[10px] font-black bg-emerald-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Katup Uap Aktif Terbuka
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-red-100 font-medium mt-0.5">
                      {supabaseControls.uap_status
                        ? 'Katup uap telah dibuka untuk membuang tekanan & uap panas. Pantau penurunan sensor.'
                        : `Harap Buka Katup Uap Sekarang! Nilai beda tekanan terdeteksi ΔP > ${(deltaPMaxThreshold || 2.0).toFixed(1)} atm-g (Saat ini: ${currentDeltaP.toFixed(2)} atm-g).`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {!supabaseControls.uap_status ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleUapStatusToggle(true);
                        triggerSyncFeedback('Katup Uap', 'DIBUKA (DARURAT BAHAYA)');
                        setIsCriticalWarningDismissed(true);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-red-50 text-red-700 rounded-xl text-xs font-black shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-red-200"
                    >
                      <Power className="w-4 h-4 text-red-600" />
                      BUKA KATUP UAP SEKARANG
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCriticalWarningDismissed(true)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400"
                    >
                      <Check className="w-4 h-4" />
                      TUTUP NOTIFIKASI
                    </button>
                  )}
                  <button
                    type="button"
                    title="Tutup Peringatan"
                    onClick={() => setIsCriticalWarningDismissed(true)}
                    className="p-2 hover:bg-white/20 rounded-xl text-white/90 hover:text-white transition cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

          {(activeTab === 'dashboard' || activeTab === 'control') && primingNotice && (
            <div className="no-print print:hidden p-4 bg-gradient-to-r from-sky-50 via-blue-50 to-sky-50 border border-sky-300 rounded-2xl flex justify-between items-center text-xs text-sky-950 shadow-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-sky-600 shrink-0" />
                <div>
                  <strong className="font-bold">Peringatan Keselamatan Kerja (Dry Heating Prevention):</strong>
                  <p className="mt-0.5">{primingNotice}</p>
                </div>
              </div>
              <button onClick={() => setPrimingNotice(null)} className="p-1 hover:bg-sky-100 rounded-lg text-sky-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {(activeTab === 'dashboard' || activeTab === 'control') && show1MinWarning && isHardwareOnline && (
            <div className="no-print print:hidden p-4 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50/50 border border-sky-300 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-sky-950 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <strong className="font-extrabold text-sky-900 block text-xs sm:text-sm">Peringatan Waktu Pemanasan (Target Suhu Belum Tercapai)</strong>
                  <p className="mt-0.5 text-slate-600">
                    Pemanas aktif selama {heatingTimerSeconds} detik. Disarankan menyesuaikan laju aliran (Flow Rate) agar perpindahan panas lebih optimal mencapai {tc1Setpoint}°C.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAcknowledgeHeatingWarning}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer shrink-0"
              >
                Mengerti
              </button>
            </div>
          )}

          {/* TAB 1: MAIN REALTIME DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 1. Summary Cards (Tappable to jump to controls) */}
              <TelemetryCards
                latestData={latestData}
                tempLabels={tempLabels}
                tc1Setpoint={tc1Setpoint}
                ti1MaxThreshold={ti1MaxThreshold}
                deltaPHot={deltaPHot}
                deltaPCold={deltaPCold}
                fc1Valve={supabaseControls?.servo_angle !== undefined ? supabaseControls.servo_angle : fc1Valve}
                fc2Valve={supabaseControls?.servo_angle_2 !== undefined ? supabaseControls.servo_angle_2 : fc2Valve}
                onCardClick={() => setActiveTab('control')}
                isHardwareOnline={isHardwareOnline}
              />

              {/* 2. Real-Time Temperature & Pressure Multi-Line Chart */}
              <LiveChart
                telemetryHistory={telemetryHistory}
                operatorSessionLimit={operatorSessionLimit}
                isHardwareOnline={isHardwareOnline}
              />

              {/* 3. Interactive Digital Twin P&ID Visual Diagram */}
              <div id="tour-pid-diagram" className="asklepios-card p-3.5 sm:p-6 bg-white relative overflow-hidden space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-sky-600 shrink-0" /> Visualisasi Aliran Fluida & Diagram P&ID
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Menampilkan posisi 4 Katup Solenoid (SV1-SV4) & Dual Heater secara real-time
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] sm:text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" /> Live Telemetry
                    </span>
                  </div>
                </div>

                <FlowModeSelector
                  variant="dashboard"
                  currentFlowMode={operationMode}
                  disabled={emergencyStopped}
                  onSelectMode={(modeCode, friendlyMode) => {
                    setOperationMode(friendlyMode);
                    handleFlowModeChange(modeCode);
                    triggerSyncFeedback('Arah Aliran', modeCode === 'CO-CURRENT' ? 'CO-CURRENT' : 'COUNTER-CURRENT');
                  }}
                />

                {renderPIDDiagram(operationMode)}
              </div>
            </div>
          )}

          {/* TAB 2: UNIFIED REAL-TIME CONTROL PANEL & TELEMETRY */}
          {activeTab === 'control' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="asklepios-card p-3.5 sm:p-6 bg-white shadow-xl rounded-2xl sm:rounded-3xl border border-slate-200 space-y-4 sm:space-y-6">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 border-b border-slate-100 pb-3 sm:pb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" /> Pusat Kendali Operasi
                    </h2>
                  </div>
                </div>

                {/* ─── LIVE VISUAL IOT TRANSMISSION ACTIVITY BAR ─── */}
                <div className={`p-3 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${syncFeedback.active
                  ? syncFeedback.type === 'syncing'
                    ? 'bg-sky-500/10 border-sky-400/50 shadow-md shadow-sky-500/10'
                    : 'bg-emerald-500/10 border-emerald-400/50 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-50 border-slate-200'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border shrink-0 transition-all ${syncFeedback.active
                      ? syncFeedback.type === 'syncing'
                        ? 'bg-sky-600 text-white border-sky-500 animate-spin'
                        : 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                      {syncFeedback.active ? (
                        syncFeedback.type === 'syncing' ? <RefreshCw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Radio className="w-4 h-4 text-sky-600" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-slate-900">
                        {syncFeedback.active ? syncFeedback.message : 'Sinkronisasi Data Otomatis'}
                      </strong>
                      {syncFeedback.active && (
                        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider ${syncFeedback.type === 'syncing'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200 animate-pulse'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                          {syncFeedback.type === 'syncing' ? 'Mengirim...' : 'Terkirim'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 shrink-0 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${syncFeedback.active && syncFeedback.type === 'syncing'
                      ? 'bg-sky-500 animate-ping'
                      : supabaseStatus === 'ONLINE'
                        ? isHardwareOnline
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-amber-500'
                        : 'bg-red-500'
                      }`} />
                    <span>Status: <strong>{supabaseStatus === 'ONLINE' ? (isHardwareOnline ? 'ONLINE' : 'STANDBY (OFFLINE)') : supabaseStatus}</strong></span>
                  </div>
                </div>

                {/* Emergency Stop Active Banner */}
                {emergencyStopped && (
                  <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-3 text-red-700">
                      <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-sm text-red-900">EMERGENCY STOP DIBEKUKAN</h4>
                        <p className="text-xs text-red-700">Pemanas dimatikan demi keselamatan.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetEmergencyStop}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-md transition active:scale-95 shrink-0"
                    >
                      Reset & Pulihkan
                    </button>
                  </div>
                )}

                {supabaseError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{supabaseError}</span>
                  </div>
                )}

                {/* 1. Real-Time Read Telemetry Sensor Cards */}
                <StatCards
                  tempLabels={tempLabels}
                  supabaseTelemetry={supabaseTelemetry}
                  latestData={latestData}
                  dualHeaterState={dualHeaterState}
                  isHardwareOnline={isHardwareOnline}
                />

                {/* 2. Unified Control Command Inputs */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-sky-600" /> Panel Pengaturan & Perintah Kontrol
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-4">

                    {/* Switch Control Mode (AUTO / MANUAL) */}
                    <div id="tour-control-mode" className="p-2.5 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 space-y-1.5 sm:space-y-2.5">
                      <div className="flex justify-between items-center gap-2">
                        <label className="text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 shrink-0" />
                          <span className="truncate">Mode Kendali Operasi</span>
                        </label>
                        <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-semibold shrink-0 whitespace-nowrap">
                          Status: <strong className="text-sky-700">{supabaseControls.control_mode}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 p-1 sm:p-1.5 bg-gradient-to-r from-slate-200/80 via-slate-100 to-slate-200/80 rounded-xl sm:rounded-2xl border border-slate-300/60 shadow-inner gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleControlModeChange('AUTO');
                            setOperationMode('Counter-Current');
                            triggerSyncFeedback('Mode Operasi AUTO', 'Sistem Mengelola Heater & Katup Otomatis');
                          }}
                          disabled={emergencyStopped}
                          className={`py-2 sm:py-3 px-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${supabaseControls.control_mode === 'AUTO'
                              ? 'bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20 border border-sky-400/40'
                              : 'bg-white/70 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/60'
                            }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          <span>AUTO</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleControlModeChange('MANUAL');
                            triggerSyncFeedback('Mode Operasi MANUAL', 'Kendali Bebas Operator Aktif');
                          }}
                          disabled={emergencyStopped}
                          className={`py-2 sm:py-3 px-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${supabaseControls.control_mode === 'MANUAL'
                              ? 'bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20 border border-sky-400/40'
                              : 'bg-white/70 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/60'
                            }`}
                        >
                          <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          <span>MANUAL</span>
                        </button>
                      </div>
                    </div>

                    {/* Switch Mode Aliran (COUNTER / CO-CURRENT) */}
                    <FlowModeSelector
                      variant="control"
                      currentFlowMode={supabaseControls.flow_mode}
                      disabled={emergencyStopped}
                      onSelectMode={(modeCode, friendlyMode) => {
                        setOperationMode(friendlyMode);
                        handleFlowModeChange(modeCode);
                        triggerSyncFeedback('Arah Aliran', modeCode === 'CO-CURRENT' ? 'CO-CURRENT' : 'COUNTER-CURRENT');
                      }}
                    />

                    {/* BARIS 1: SISTEM DUAL HEATER (HEATER 1 & HEATER 2) + THERMOSTAT SETUP & PANEL KALIBRASI */}
                    <DualHeatersControl
                      controlMode={supabaseControls.control_mode}
                      targetTemp={supabaseControls.target_temp ?? tc1Setpoint ?? 50}
                      targetTempHot={supabaseControls.target_temp_hot ?? supabaseControls.target_temp ?? 50.0}
                      toleranceLevel={supabaseControls.tolerance_level ?? 1}
                      upperLimit={supabaseControls.upper_limit}
                      lowerLimit={supabaseControls.lower_limit}
                      flowCalibrationFactor={supabaseControls.flow_calibration_factor ?? 7.90}
                      flowCalibrationFactor1={supabaseControls.flow_calibration_factor_1 ?? supabaseControls.flow_calibration_factor ?? 7.90}
                      flowCalibrationFactor2={supabaseControls.flow_calibration_factor_2 ?? 7.90}
                      tempOffset={supabaseControls.temp_offset ?? 0.0}
                      pressureOffset={supabaseControls.pressure_offset ?? 0.0}
                      heater1Status={supabaseControls.btn_onoff !== undefined ? supabaseControls.btn_onoff : (supabaseControls.heater_1_status ?? false)}
                      heater2Status={supabaseControls.heater_2_status !== undefined ? supabaseControls.heater_2_status : false}
                      emergencyStopped={emergencyStopped}
                      isBtnUpActive={activeMomentaryButtons.btn_up}
                      isBtnDownActive={activeMomentaryButtons.btn_down}
                      isUpdatingControl={isUpdatingControl}
                      onToggleHeater1={async (nextState) => {
                        triggerSyncFeedback('Heater 1', nextState ? 'ON' : 'OFF');
                        await handleHeater1PowerToggle(nextState);
                      }}
                      onToggleHeater2={async (nextState) => {
                        triggerSyncFeedback('Heater 2 (Booster)', nextState ? 'ON' : 'OFF');
                        await handleHeater2PowerToggle(nextState);
                      }}
                      onAdjustSetPoint={async (delta) => {
                        const currentSp = supabaseControls.target_temp_hot ?? supabaseControls.target_temp ?? 50.0;
                        const currentTol = supabaseControls.tolerance_level ?? 1;
                        const newSp = Math.min(90, Math.max(20, currentSp + delta));
                        triggerSyncFeedback('Kontrol Point Utama', `${newSp.toFixed(1)}°C`);
                        await handleThermostatSetupChange(newSp, currentTol);
                      }}
                      onAdjustTolerance={async (delta) => {
                        const currentSp = supabaseControls.target_temp_hot ?? supabaseControls.target_temp ?? 50.0;
                        const currentTol = supabaseControls.tolerance_level ?? 1;
                        const newTol = Math.min(7, Math.max(1, currentTol + delta));
                        triggerSyncFeedback('Level Toleransi', `P${newTol} (±${newTol}.0°C)`);
                        await handleThermostatSetupChange(currentSp, newTol);
                      }}
                      onSaveThermostatSetup={async (sp, tol) => {
                        triggerSyncFeedback('Thermostat Setup', `KP: ${sp}°C | P${tol}`);
                        await handleThermostatSetupChange(sp, tol);
                      }}
                      onSaveCalibration={async (flowCal1, flowCal2, tOffset, pOffset) => {
                        triggerSyncFeedback('Kalibrasi Sensor', `Flow Dingin: ${flowCal1} | Flow Panas: ${flowCal2} | Temp: ${tOffset}°C | Press: ${pOffset}bar`);
                        await handleSensorCalibrationChange(flowCal1, flowCal2, tOffset, pOffset);
                      }}
                      targetUpper={supabaseControls.target_upper ?? 60}
                      targetLower={supabaseControls.target_lower ?? 45}
                      onSaveThermostatLimits={async (up, low) => {
                        triggerSyncFeedback('Thermostat Limit', `H2 OFF: ${up}°C | H2 ON: ${low}°C`);
                        await handleThermostatLimitsChange(up, low);
                      }}
                    />

                    {/* BARIS 2: POMPA SIRKULASI (KIRI), KATUP SOLENOID UAP (TENGAH - ADMIN ONLY), KATUP AIR DINGIN (KANAN) */}
                    <div className={`col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 ${currentUser.role === 'admin' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-3.5 sm:gap-4 items-stretch`}>
                      {/* 1. Pompa Sirkulasi (KIRI) */}
                      <PumpControl
                        controlMode={supabaseControls.control_mode}
                        pompaStatus={supabaseControls.pompa_ekstra ?? false}
                        emergencyStopped={emergencyStopped}
                        onTogglePompa={(nextState) => {
                          handlePompaToggle(nextState);
                          triggerSyncFeedback('Pompa Sirkulasi', nextState ? 'POMPA NYALA (ON)' : 'POMPA MATI (OFF)');
                        }}
                      />

                      {/* 2. Katup Solenoid Uap (TENGAH - HANYA ADMIN) */}
                      {currentUser.role === 'admin' && (
                        <SteamValveControl
                          controlMode={supabaseControls.control_mode}
                          uapStatus={supabaseControls.uap_status ?? false}
                          uapAutoStatus={supabaseControls.control_mode === 'AUTO' ? true : (supabaseControls.uap_auto_status ?? false)}
                          uapIntervalMin={supabaseControls.uap_interval_min ?? 5}
                          emergencyStopped={emergencyStopped}
                          isPressureDangerous={latestData.pi1 >= 2.0 || latestData.pi3 >= 2.0}
                          onToggleUapManual={(nextVal: boolean) => {
                            handleUapStatusToggle(nextVal);
                            triggerSyncFeedback('Katup Uap Manual', nextVal ? 'DIBUKA' : 'DITUTUP');
                          }}
                          onToggleUapAuto={(nextVal: boolean) => {
                            handleUapAutoToggle(nextVal);
                            triggerSyncFeedback('Katup Uap Otomatis', nextVal ? 'AKTIF' : 'NONAKTIF');
                          }}
                          onChangeUapInterval={(min: number) => {
                            handleUapIntervalChange(min);
                            triggerSyncFeedback('Interval Katup Uap', `${min} Menit`);
                          }}
                        />
                      )}

                      {/* 3. Katup Solenoid Air Dingin (KANAN) */}
                      <div id="tour-cold-valve" className="flex flex-col h-full">
                        <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between h-full shadow-2xs">
                          <div className="flex justify-between items-center gap-2">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                              <Droplets className="w-4 h-4 text-sky-600 shrink-0" />
                              <span className="truncate font-extrabold">Katup Solenoid Air Dingin</span>
                            </label>
                            {supabaseControls.control_mode === 'AUTO' ? (
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border bg-sky-50 text-sky-700 border-sky-200 shadow-2xs">
                                AUTO: OPEN
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                                  supabaseControls.air_dingin
                                    ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {supabaseControls.air_dingin ? 'OPEN' : 'CLOSED'}
                              </span>
                            )}
                          </div>

                          <div className="space-y-3 flex-1 flex flex-col justify-between">
                            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-slate-700">Pasokan Air Dingin</span>
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    supabaseControls.control_mode === 'AUTO' || supabaseControls.air_dingin
                                      ? 'bg-sky-500 animate-pulse ring-2 ring-sky-200'
                                      : 'bg-slate-300'
                                  }`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextVal = !supabaseControls.air_dingin;
                                  handleAirDinginToggle(nextVal);
                                  triggerSyncFeedback('Katup Air Dingin', nextVal ? 'DIBUKA' : 'DITUTUP');
                                }}
                                disabled={emergencyStopped}
                                className={`w-full py-2 min-h-[38px] rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 ${
                                  supabaseControls.air_dingin
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5 text-sky-500" />
                                <span>{supabaseControls.air_dingin ? 'Tutup Katup Dingin' : 'Buka Katup Dingin'}</span>
                                {supabaseControls.control_mode === 'AUTO' && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                                    Override Manual
                                  </span>
                                )}
                              </button>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                  <Droplets className="w-3.5 h-3.5 text-sky-600" /> Pendingin Shell/Tube
                                </span>
                                <span
                                  className={`font-black text-[10.5px] ${
                                    supabaseControls.control_mode === 'AUTO' || supabaseControls.air_dingin
                                      ? 'text-sky-700'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {supabaseControls.control_mode === 'AUTO' || supabaseControls.air_dingin ? 'AKTIF' : 'TERTUTUP'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium pt-1">
                                Mengatur aliran air pendingin masuk ke pipa penukar panas.
                              </p>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-500 font-medium px-0.5">
                            *Pasokan fluida dingin untuk menyerap panas dari sirkuit utama.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pengaturan Katup Aliran (Katup Panas & Katup Dingin: 0, 20, 40, 60, 80, 100%) */}
                    <FlowAndValvesControl
                      controlMode={supabaseControls.control_mode}
                      emergencyStopped={emergencyStopped}
                      fc1Valve={supabaseControls.servo_angle !== undefined ? supabaseControls.servo_angle : fc1Valve}
                      onChangeFc1Valve={(val) => {
                        setFc1Valve(val);
                        handleValve1Change(val);
                        triggerSyncFeedback('Katup FC1 (Air Panas)', `${val}%`);
                      }}
                      fc2Valve={supabaseControls.servo_angle_2 !== undefined ? supabaseControls.servo_angle_2 : fc2Valve}
                      onChangeFc2Valve={(val) => {
                        setFc2Valve(val);
                        handleValve2Change(val);
                        triggerSyncFeedback('Katup FC2 (Air Dingin)', `${val}%`);
                      }}
                    />

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: CCTV LIVE MONITORING */}
          {activeTab === 'cctv' && (
            <CctvTab
              selectedCamera={selectedCamera}
              setSelectedCamera={setSelectedCamera}
              cctvStreamSource={cctvStreamSource}
              setCctvStreamSource={setCctvStreamSource}
              cctvIpUrl={cctvIpUrl}
              setCctvIpUrl={setCctvIpUrl}
              cctvPublicUrl={cctvPublicUrl}
              setCctvPublicUrl={setCctvPublicUrl}
              cctvAudioMuted={cctvAudioMuted}
              setCctvAudioMuted={setCctvAudioMuted}
              audioUserActivated={audioUserActivated}
              setAudioUserActivated={setAudioUserActivated}
              cctvVolume={cctvVolume}
              setCctvVolume={setCctvVolume}
              cctvRecording={cctvRecording}
              setCctvRecording={setCctvRecording}
              isManualRecording={isManualRecording}
              recordingSeconds={recordingSeconds}
              cctvToast={cctvToast}
              webrtcConnected={webrtcConnected}
              webrtcError={webrtcError}
              videoRef={videoRef}
              connectWebRTC={connectWebRTC}
              handleTakeSnapshot={handleTakeSnapshot}
              handleToggleManualRecord={handleToggleManualRecord}
              triggerCctvToast={triggerCctvToast}
              handlePtzAction={handlePtzAction}
              handlePtzPreset={handlePtzPreset}
              ptzMoving={ptzMoving}
              latestData={latestData}
              isHardwareOnline={isHardwareOnline}
              tempLabels={tempLabels}
              cctvMediaList={cctvMediaList}
            />
          )}

          {/* TAB 4: DATA LOGS & EXPORT LAPORAN */}
          {activeTab === 'logs' && (
            <LogsTab
              filteredLogsData={filteredLogsData}
              logInterval={logInterval}
              setLogInterval={setLogInterval}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              logSearchQuery={logSearchQuery}
              setLogSearchQuery={setLogSearchQuery}
              isUploading={isUploading}
              handleExportAndUpload={handleExportAndUpload}
              handleExportCurrentSessionExcel={handleExportCurrentSessionExcel}
              handleExportAllClassesExcel={handleExportAllClassesExcel}
              handleCloudDriveAccess={handleCloudDriveAccess}
              systemStatus={systemState}
              currentSession={currentSession}
              archivedSessions={archivedSessions}
              selectedSessionId={selectedLogsSessionId}
              setSelectedSessionId={setSelectedLogsSessionId}
              onOpenStartup={() => setIsStartupModalOpen(true)}
              currentUser={currentUser}
              classFilter={classFilter}
              setClassFilter={setClassFilter}
              classesList={classesList}
              onClearActiveSession={handleClearActiveSession}
            />
          )}

          {/* TAB 5: ALARM SYSTEM */}
          {activeTab === 'alarms' && (
            <AlarmsTab
              ti1MaxThreshold={ti1MaxThreshold}
              setTi1MaxThreshold={setTi1MaxThreshold}
              deltaPMaxThreshold={deltaPMaxThreshold}
              setDeltaPMaxThreshold={setDeltaPMaxThreshold}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              alarmLogs={alarmLogs}
              setAlarmLogs={setAlarmLogs}
            />
          )}

          {/* TAB 6: USER MANAGEMENT & SESSION LIMITS (2-TIER ROLE ACCESS) */}
          {activeTab === 'users' && (
            <UsersTab
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              usersList={usersList}
              setUsersList={setUsersList}
              operatorSessionLimit={operatorSessionLimit}
              setOperatorSessionLimit={setOperatorSessionLimit}
              setOperatorSessionRemaining={setOperatorSessionRemaining}
              resendingEmailFor={resendingEmailFor}
              handleResendUserCredentials={handleResendUserCredentials}
              onOpenResetPasswordModal={(email) => {
                setIsResetModalOpen(true);
                setResetEmailInput(email);
                setResetStep('INPUT_EMAIL');
                setResetError(null);
              }}
              showAddUserModal={showAddUserModal}
              setShowAddUserModal={setShowAddUserModal}
              newUserName={newUserName}
              setNewUserName={setNewUserName}
              newUserEmail={newUserEmail}
              setNewUserEmail={setNewUserEmail}
              newUserRole={newUserRole}
              setNewUserRole={setNewUserRole}
              isAddingUser={isAddingUser}
              lastCreatedUserCredentials={lastCreatedUserCredentials}
              setLastCreatedUserCredentials={setLastCreatedUserCredentials}
              setAddUserSuccessMsg={setAddUserSuccessMsg}
              handleCreateUser={handleCreateUser}
              userToDelete={userToDelete}
              setUserToDelete={setUserToDelete}
            />
          )}

          {/* TAB 7: MASTER DATA & SESSION MANAGER (ADMIN ONLY) */}
          {activeTab === 'sessions' && currentUser.role === 'admin' && (
            <SessionManagerTab
              archivedSessions={archivedSessions}
              currentSession={currentSession}
              onRefreshSessions={() => fetchSessions(currentUser.role, currentUser.email, classFilter)}
              onSelectSessionForLogs={(sessionId) => {
                if (currentSession && sessionId === currentSession.id) {
                  setSelectedLogsSessionId('CURRENT');
                } else {
                  setSelectedLogsSessionId(sessionId);
                }
                setActiveTab('logs');
              }}
              onExportMasterExcel={handleExportAllClassesExcel}
              onExportSessionExcel={handleExportCurrentSessionExcel}
              onClearActiveSession={handleClearActiveSession}
            />
          )}

        </main>
      </div>
      )}

      {/* ─── SECURE EMAIL OTP PASSWORD RESET MODAL (ACCESSIBLE FROM USER MANAGEMENT & PROFILE) ─── */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 text-slate-800 animate-in zoom-in-95 duration-200 space-y-4">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Verifikasi & Ganti Sandi Akun
                  </h3>
                  <p className="text-[10.5px] text-slate-500">Verifikasi OTP dikirim ke email resmi pengguna</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Steps Header */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
              <div className={`p-1.5 rounded-xl border transition ${resetStep === 'INPUT_EMAIL' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                1. Email Akun
              </div>
              <div className={`p-1.5 rounded-xl border transition ${resetStep === 'VERIFY_OTP' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                2. Kode OTP
              </div>
              <div className={`p-1.5 rounded-xl border transition ${resetStep === 'NEW_PASSWORD' || resetStep === 'SUCCESS' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                3. Sandi Baru
              </div>
            </div>

            {/* Error Notice */}
            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {/* STEP 1: INPUT REGISTERED EMAIL */}
            {resetStep === 'INPUT_EMAIL' && (
              <form onSubmit={handleRequestOtp} className="space-y-3.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Masukkan email terdaftar akun Anda untuk menerima kode verifikasi OTP.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Resmi Terdaftar</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={resetEmailInput}
                      onChange={(e) => setResetEmailInput(e.target.value)}
                      placeholder="nama@webmail.uad.ac.id"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengirim Email OTP...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Kirim Kode OTP ke Email
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: ENTER 6-DIGIT OTP CODE */}
            {resetStep === 'VERIFY_OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <span>Kode verifikasi 6-digit telah dikirim ke: <strong>{resetEmailInput}</strong>.</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Buka email Anda, lalu masukkan 6-digit kode OTP.</p>

                    <div className="mt-2 pt-2 border-t border-emerald-200/70 flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-500" /> Batas Waktu OTP:
                      </span>
                      {otpTimeLeft > 0 ? (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          ⏱ {Math.floor(otpTimeLeft / 60)}:{(otpTimeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                          ⚠️ Kedaluwarsa (&gt;5 mnt)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 849201"
                    className="w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Tidak menerima email?</span>
                  <button
                    type="button"
                    disabled={otpResendCountdown > 0}
                    onClick={handleRequestOtp}
                    className={`font-bold transition ${otpResendCountdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-sky-600 hover:text-sky-800 underline'
                      }`}
                  >
                    {otpResendCountdown > 0 ? `Kirim ulang (${otpResendCountdown}s)` : 'Kirim Ulang OTP'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetStep('INPUT_EMAIL')}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Verifikasi OTP
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: SET NEW PASSWORD WITH SECURITY CHECKLIST */}
            {resetStep === 'NEW_PASSWORD' && (() => {
              const strength = getPasswordStrength(newPasswordInput);
              return (
                <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>Verifikasi Berhasil! Buat kata sandi baru untuk <strong>{resetEmailInput}</strong>.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi Baru</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Min. 8 karakter (Huruf besar, kecil, angka)"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                      />
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Live Password Security Strength Indicator */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-600">Kekuatan Keamanan Sandi:</span>
                      <span className={`font-black ${strength.score <= 1
                        ? 'text-rose-600'
                        : strength.score <= 3
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                        }`}>
                        {strength.score <= 1 ? 'Sangat Lemah' : strength.score <= 3 ? 'Sedang' : 'Kuat & Aman ✓'}
                      </span>
                    </div>

                    {/* Strength Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex gap-1">
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 1 ? (strength.score <= 2 ? 'bg-rose-500' : strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 2 ? (strength.score === 2 ? 'bg-rose-500' : strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 3 ? (strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 4 ? 'bg-emerald-500' : 'bg-transparent'
                        }`} />
                    </div>

                    {/* Security Requirements Checklist */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10.5px]">
                      <div className={`flex items-center gap-1.5 ${strength.hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Minimal 8 karakter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${strength.hasUpperCase ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasUpperCase ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Huruf besar (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${strength.hasLowerCase ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasLowerCase ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Huruf kecil (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${strength.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Angka (0-9)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                      />
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!strength.isValid}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" /> Simpan Kata Sandi Baru
                  </button>
                </form>
              );
            })()}

            {/* STEP 4: SUCCESS CONFIRMATION */}
            {resetStep === 'SUCCESS' && (
              <div className="text-center space-y-3.5 py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900">Kata Sandi Berhasil Diperbarui!</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kata sandi baru untuk akun <strong>{resetEmailInput}</strong> telah tersimpan dengan aman di sistem.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer"
                >
                  Tutup & Lanjutkan
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ─── MOBILE BOTTOM TAB NAVIGATION BAR (SMARTPHONE FRIENDLY & HIGH TOUCH PRIORITY) ─── */}
      {systemState === 'ACTIVE' && (
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/98 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-2 flex md:hidden justify-between items-center shadow-[0_-4px_25px_rgba(0,0,0,0.10)] no-print touch-manipulation select-none pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${activeTab === 'dashboard'
              ? 'text-sky-600 font-black bg-sky-50/90 shadow-2xs'
              : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
              }`}
          >
            <Activity className="w-4.5 h-4.5 shrink-0" />
            <span className="text-[9.5px] leading-none truncate w-full text-center">Monitoring</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('control');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${activeTab === 'control'
              ? 'text-sky-600 font-black bg-sky-50/90 shadow-2xs'
              : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
              }`}
          >
            <Sliders className="w-4.5 h-4.5 shrink-0" />
            <span className="text-[9.5px] leading-none truncate w-full text-center">Kontrol</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('logs');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${activeTab === 'logs'
              ? 'text-sky-600 font-black bg-sky-50/90 shadow-2xs'
              : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
              }`}
          >
            <FileText className="w-4.5 h-4.5 shrink-0" />
            <span className="text-[9.5px] leading-none truncate w-full text-center">Laporan</span>
          </button>

          {currentUser.role === 'admin' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('sessions');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${activeTab === 'sessions'
                  ? 'text-sky-600 font-black bg-sky-50/90 shadow-2xs'
                  : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
                  }`}
              >
                <FolderKanban className="w-4.5 h-4.5 shrink-0" />
                <span className="text-[9.5px] leading-none truncate w-full text-center">Data Lab</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('cctv');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${activeTab === 'cctv'
                  ? 'text-sky-600 font-black bg-sky-50/90 shadow-2xs'
                  : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
                  }`}
              >
                <Video className="w-4.5 h-4.5 shrink-0" />
                <span className="text-[9.5px] leading-none truncate w-full text-center">CCTV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('users');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${activeTab === 'users'
                  ? 'text-sky-600 font-black bg-sky-50/90 shadow-2xs'
                  : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
                  }`}
              >
                <Users className="w-4.5 h-4.5 shrink-0" />
                <span className="text-[9.5px] leading-none truncate w-full text-center">Users</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('cctv');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${activeTab === 'cctv'
                  ? 'text-sky-600 font-black bg-sky-50/90 shadow-2xs'
                  : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
                  }`}
              >
                <Video className="w-4.5 h-4.5 shrink-0" />
                <span className="text-[9.5px] leading-none truncate w-full text-center">CCTV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('alarms');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-xl transition-all active:scale-95 cursor-pointer ${activeTab === 'alarms'
                  ? 'text-sky-600 font-black bg-sky-50/90 shadow-2xs'
                  : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
                  }`}
              >
                <div className="relative">
                  <Bell className="w-4.5 h-4.5 shrink-0" />
                  {alarmLogs.some(a => !a.acknowledged) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  )}
                </div>
                <span className="text-[9.5px] leading-none truncate w-full text-center">Alarm</span>
              </button>
            </>
          )}
        </nav>
      )}

      {/* ─── MODAL CLOUD DRIVE EXPLORER & FLASHDISK PROTECTION NOTICE ─── */}
      {isCloudDriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/30 rounded-2xl border border-emerald-400/30">
                  <Cloud className="w-6 h-6 text-emerald-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    Google Drive Cloud Storage
                    <span className="px-2 py-0.5 bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold rounded-full">
                      Auto-Sync Active
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-200/90 mt-0.5">Repositori Penyimpanan Otomatis Data Heat Exchanger UAD</p>
                </div>
              </div>
              <button
                onClick={() => setIsCloudDriveModalOpen(false)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs text-slate-700">
              {/* Alert Banner Flashdisk Disabled */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-800 rounded-xl shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-amber-900 text-sm">Ambil Data via Flashdisk Dinonaktifkan</h4>
                  <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                    Sesuai standar operasional keamanan laboratorium, ekstraksi data manual menggunakan USB Flashdisk telah dinonaktifkan secara otomatis. Seluruh berkas telemetri HE diproteksi dan tersinkron langsung ke Cloud Drive institusi.
                  </p>
                </div>
              </div>


              {/* Status Sync Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block font-semibold">Status Koneksi</span>
                  <div className="flex items-center gap-1.5 mt-1 font-extrabold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Terhubung
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block font-semibold">Sinkron Terakhir</span>
                  <div className="font-extrabold text-slate-800 mt-1">{cloudLastSyncTime} WIB</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Total Log Terunggah</span>
                  <div className="font-extrabold text-sky-600 mt-1">{telemetryHistory.length} Baris Data</div>
                </div>
              </div>

              {/* Folder Location Info */}
              <div className="p-3 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-2 truncate">
                  <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">GoogleDrive://Lab_UAD/Heat_Exchanger_Data/2026/</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded text-[10px] whitespace-nowrap">
                  Protected
                </span>
              </div>

              {/* Auto Saved Files List */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                  <span>Berkas Otomatis Tersimpan di Cloud</span>
                  <span className="text-[10px] font-normal text-slate-400">Penyimpanan Terenkripsi</span>
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">HE_Telemetry_Logs_Realtime_AutoSave.xlsx</div>
                        <div className="text-[10px] text-slate-400">Spreadsheet • Auto-Updated tiap interval</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg flex items-center gap-1">
                      <CloudCheck className="w-3 h-3" /> Auto-Saved
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">HE_Master_Class_Dataset.xlsx</div>
                        <div className="text-[10px] text-slate-400">Ringkasan Data & Nilai LMTD Semua Kelas</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg flex items-center gap-1">
                      <CloudCheck className="w-3 h-3" /> Auto-Saved
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-purple-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">Supabase_Telemetry_Backup_Store</div>
                        <div className="text-[10px] text-slate-400">Tabel PostgreSQL Telemetri Realtime</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 font-bold text-[10px] rounded-lg flex items-center gap-1">
                      <CloudCheck className="w-3 h-3" /> Database Live
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText('https://drive.google.com/drive/folders/1f9bPwAzlAIIZa1EHQqm588U-bsiWh5hv?usp=sharing');
                  triggerCctvToast('Link repositori Google Drive berhasil disalin ke clipboard!', 'success');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Salin Link Drive
              </button>
              <button
                type="button"
                onClick={() => setIsCloudDriveModalOpen(false)}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-700/20 active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ─── OPERATOR PRACTICE SESSION INFO MODAL ─── */}
      {isSessionInfoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 text-slate-800 animate-in zoom-in-95 duration-200 space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-200 shadow-2xs">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Sisa Waktu Praktikum
                  </h3>
                  <p className="text-[10.5px] text-slate-500 font-medium">Batas sesi role Operator (Mahasiswa)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSessionInfoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Countdown Badge Display (Unified Single Color Tone) */}
            <div className="p-3 bg-sky-50/70 border border-sky-200/90 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-sky-800 block">Sisa Waktu Sesi</span>
                <div className="text-lg font-black text-sky-950 font-mono">
                  {Math.floor(operatorSessionRemaining / 60)} <span className="text-xs font-sans font-bold text-sky-700">menit</span> {operatorSessionRemaining % 60} <span className="text-xs font-sans font-bold text-sky-700">detik</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9.5px] text-sky-600/80 font-bold block">Limit</span>
                <span className="text-[11px] font-bold text-sky-800 bg-white px-2 py-0.5 rounded-md border border-sky-200 shadow-2xs">
                  {operatorSessionLimit}m
                </span>
              </div>
            </div>

            {/* Short Bullet Points */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2 text-[11px] text-slate-600">
              <div className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                <span>Otomatis <strong>logout</strong> saat waktu habis demi keselamatan pemanas & rig.</span>
              </div>
              <div className="flex items-start gap-2">
                <Settings className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                <span>Perpanjangan waktu dapat diatur oleh <strong>Admin / Dosen</strong>.</span>
              </div>
            </div>

            {/* Action Footer (Matching Single Sky Tone) */}
            <button
              type="button"
              onClick={() => setIsSessionInfoModalOpen(false)}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition active:scale-[0.98] cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* ─── SYSTEM STARTUP & READINESS MODAL ─── */}
      <SystemStartupModal
        isOpen={isStartupModalOpen}
        onClose={() => setIsStartupModalOpen(false)}
        onConfirmStartup={handleConfirmStartup}
        operatorName={currentUser?.name || 'Operator'}
        defaultFlowMode={operationMode}
      />

      {/* ─── SESSION SUMMARY & SAFE SHUTDOWN MODAL ─── */}
      <SessionSummaryModal
        isOpen={isEndSessionModalOpen}
        onClose={() => setIsEndSessionModalOpen(false)}
        onConfirmEndSession={handleConfirmEndSession}
        onExportExcel={handleExportCurrentSessionExcel}
        currentSession={currentSession}
        sessionDuration={sessionDuration}
      />

      {/* ─── LOGOUT & SYSTEM SHUTDOWN CONFIRMATION MODAL ─── */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmModalOpen}
        onClose={() => {
          if (!isLoggingOutWithShutdown) {
            setIsLogoutConfirmModalOpen(false);
          }
        }}
        onConfirmLogoutOnly={handleLogoutOnly}
        onConfirmShutdownAndLogout={handleConfirmShutdownAndLogout}
        systemState={systemState}
        currentSession={currentSession}
        sessionDuration={sessionDuration}
        userName={currentUser?.name}
        userRole={currentUser?.role}
        isShuttingDown={isLoggingOutWithShutdown}
      />

      <GuidedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser?.role || 'operator'}
      />

    </div>
  );
}

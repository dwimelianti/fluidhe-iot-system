'use client';

import React, { useState, useEffect } from 'react';
import {
  Power,
  Play,
  CheckCircle2,
  Loader2,
  X,
  Sparkles,
  Server,
  Thermometer,
  ShieldCheck,
  FileSpreadsheet,
  FastForward
} from 'lucide-react';

export interface SystemStartupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStartup: (sessionTitle: string) => void;
  operatorName: string;
  defaultFlowMode?: string;
  currentSessionTitle?: string;
}

interface StepItem {
  id: number;
  label: string;
  detail: string;
  icon: React.ElementType;
}

const STEPS: StepItem[] = [
  {
    id: 1,
    label: 'Koneksi Cloud & ESP32 Laboratorium',
    detail: 'Mengirim sinyal daya dan membuka jalur komunikasi IoT real-time.',
    icon: Server
  },
  {
    id: 2,
    label: 'Inisialisasi Termokopel & Sensor Tekanan',
    detail: 'Verifikasi pembacaan 4 termostat suhu (TI1-TI4) & transmitter tekanan (PI1-PI4).',
    icon: Thermometer
  },
  {
    id: 3,
    label: 'Safety Check Katup & Solenoid Fluida',
    detail: 'Memastikan katup uap SV & solenoid air dingin siap dalam konfigurasi aman.',
    icon: ShieldCheck
  },
  {
    id: 4,
    label: 'Sinkronisasi Kontrol Mesin & Pemanas',
    detail: 'Mengaktifkan master switch pemanas dan sinkronisasi telemetry Supabase.',
    icon: FileSpreadsheet
  }
];

export const SystemStartupModal: React.FC<SystemStartupModalProps> = ({
  isOpen,
  onClose,
  onConfirmStartup,
  operatorName,
  defaultFlowMode = 'Counter-Current',
  currentSessionTitle
}) => {
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setSessionTitle(currentSessionTitle || `Praktikum ${defaultFlowMode} - ${timeStr} WIB`);
      setIsStarting(false);
      setProgress(0);
      setCurrentStepIndex(0);
      setIsReady(false);
    } else {
      setIsStarting(false);
      setProgress(0);
      setCurrentStepIndex(0);
      setIsReady(false);
    }
  }, [isOpen, defaultFlowMode, currentSessionTitle]);

  // Handle simulated progress sequence only when modal is open and user clicked "Mulai"
  useEffect(() => {
    if (!isOpen || !isStarting || isReady) return;

    const intervalTime = 30; // ms
    const totalDuration = 2800; // ms
    const increment = (intervalTime / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setProgress(100);
          setCurrentStepIndex(4);
          setIsReady(true);
          // Auto complete after short celebration
          setTimeout(() => {
            onConfirmStartup(sessionTitle || `Sesi Praktikum ${defaultFlowMode}`);
          }, 600);
          return 100;
        }

        // Update step index based on progress
        if (next < 25) setCurrentStepIndex(0);
        else if (next < 50) setCurrentStepIndex(1);
        else if (next < 75) setCurrentStepIndex(2);
        else setCurrentStepIndex(3);

        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, isStarting, isReady, sessionTitle, defaultFlowMode, onConfirmStartup]);

  if (!isOpen) return null;

  const handleStartProcess = () => {
    setIsStarting(true);
  };

  const handleBypass = () => {
    onConfirmStartup(sessionTitle || `Sesi Praktikum ${defaultFlowMode}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-sky-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 rounded-2xl border border-sky-400/30 text-sky-400">
                <Power className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Persiapan & Inisialisasi Sistem
                </h3>
                <p className="text-xs text-sky-200/80 mt-0.5">
                  Laboratorium FluidHE — Heat Exchanger UAD
                </p>
              </div>
            </div>

            {!isStarting && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {!isStarting ? (
            <>
              {/* Form Input Sesi */}
              <div className="space-y-3">
                <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-100 text-xs text-sky-950 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-extrabold text-sky-900 block">Isolasi Rekaman Praktikum Baru:</strong>
                    <p className="text-[11.5px] text-sky-800 leading-relaxed mt-0.5">
                      Memulai sistem akan membuka sesi baru yang bersih. Data sensor hari ini tidak akan bercampur dengan uji coba sebelumnya.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Judul / Catatan Sesi Praktikum
                  </label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="Contoh: Pengujian Counter-Current Aliran 5 L/min"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Operator</span>
                    <strong className="text-slate-800 font-bold">{operatorName || 'Operator'}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Tanggal</span>
                    <strong className="text-slate-800 font-bold">{new Date().toLocaleDateString('id-ID')}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartProcess}
                  className="w-full py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-lg shadow-sky-600/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>Mulai & Hidupkan Sistem</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl sm:rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </>
          ) : (
            /* Progress Sequence View */
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-800 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                    <span>Inisialisasi Hardware & Sensor...</span>
                  </span>
                  <span className="font-mono font-bold text-sky-700">{Math.round(progress)}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 rounded-full transition-all duration-100 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Sequence Steps Checklist */}
              <div className="space-y-2.5 pt-2">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isFinished = idx < currentStepIndex || isReady;
                  const isCurrent = idx === currentStepIndex && !isReady;

                  return (
                    <div
                      key={step.id}
                      className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                        isFinished
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : isCurrent
                          ? 'bg-sky-50 border-sky-300 text-sky-950 shadow-sm'
                          : 'bg-slate-50/50 border-slate-200/60 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl border shrink-0 ${
                            isFinished
                              ? 'bg-emerald-500 text-white border-emerald-400'
                              : isCurrent
                              ? 'bg-sky-600 text-white border-sky-500 animate-pulse'
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold">{step.label}</p>
                          <p className="text-[10.5px] text-slate-500 leading-tight mt-0.5">{step.detail}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isFinished ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bypass button for fast start */}
              {!isReady && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleBypass}
                    className="text-[11px] font-bold text-slate-400 hover:text-sky-600 inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Lewati Proses (Langsung Aktifkan)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

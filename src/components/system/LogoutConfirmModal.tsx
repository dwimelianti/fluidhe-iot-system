'use client';

import React from 'react';
import {
  LogOut,
  PowerOff,
  X,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Database,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { SystemOperationalStatus, SystemSession } from '@/types';

export interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogoutOnly: () => void;
  onConfirmShutdownAndLogout: () => void | Promise<void>;
  systemState: SystemOperationalStatus;
  isHardwareOnline?: boolean;
  currentSession: SystemSession | null;
  sessionDuration: number;
  userName?: string;
  userRole?: string;
  isShuttingDown?: boolean;
}

const formatDurationLong = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs} Jam ${mins} Menit ${secs} Detik`;
  }
  return `${mins} Menit ${secs} Detik`;
};

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmLogoutOnly,
  onConfirmShutdownAndLogout,
  systemState,
  isHardwareOnline = false,
  currentSession,
  sessionDuration,
  userName = 'Pengguna',
  userRole = 'operator',
  isShuttingDown = false
}) => {
  if (!isOpen) return null;

  // Sistem fisik HANYA dianggap aktif jika hardware online dan mesin memang dihidupkan
  const isSystemActive = Boolean(isHardwareOnline) && (systemState === 'ACTIVE' || systemState === 'STOPPING');
  const dataPointsCount = currentSession?.data?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Ribbon */}
        <div
          className={`p-5 sm:p-6 text-white relative overflow-hidden ${
            isSystemActive
              ? 'bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900'
              : 'bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900'
          }`}
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl border ${
                  isSystemActive
                    ? 'bg-rose-500/20 border-rose-400/30 text-rose-400'
                    : 'bg-sky-500/20 border-sky-400/30 text-sky-400'
                }`}
              >
                {isSystemActive ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
                ) : (
                  <LogOut className="w-5 h-5 text-sky-400" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                  {isSystemActive ? 'Konfirmasi Keluar & Matikan Sistem' : 'Konfirmasi Keluar Akun'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 font-medium">
                  {userName} ({userRole.toUpperCase()})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isShuttingDown}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {isSystemActive ? (
            <>
              {/* Active System Warning Alert */}
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-950 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-xs sm:text-sm font-extrabold text-rose-900 block">
                    Peringatan: Sistem Heat Exchanger Masih Aktif!
                  </strong>
                  <p className="text-xs text-rose-800 leading-relaxed font-normal">
                    Pemanas dan sirkulasi fluida saat ini sedang berjalan. Demi keselamatan laboratorium dan keawetan komponen rig, Anda sangat disarankan untuk <strong>mematikan sistem secara aman</strong> sebelum keluar.
                  </p>
                </div>
              </div>

              {/* Running Session Info Card */}
              {currentSession && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Sesi Praktikum Berjalan
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full">
                      ● AKTIF
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-600" /> Durasi Sesi
                      </span>
                      <p className="font-mono font-extrabold text-slate-900 mt-0.5">
                        {formatDurationLong(sessionDuration)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Database className="w-3 h-3 text-emerald-600" /> Data Tersimpan
                      </span>
                      <p className="font-mono font-extrabold text-slate-900 mt-0.5">
                        {dataPointsCount} titik data
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons for Active System */}
              <div className="pt-2 space-y-2.5">
                {/* Safe Shutdown & Logout (Recommended) */}
                <button
                  type="button"
                  onClick={onConfirmShutdownAndLogout}
                  disabled={isShuttingDown}
                  className="w-full py-3.5 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 border border-rose-600 shadow-md shadow-rose-600/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isShuttingDown ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Mematikan Sistem & Menyimpan Sesi...</span>
                    </>
                  ) : (
                    <>
                      <PowerOff className="w-4 h-4 text-white" />
                      <span>Matikan Sistem & Keluar (Aman)</span>
                    </>
                  )}
                </button>

                {/* Logout Without Shutdown */}
                <button
                  type="button"
                  onClick={onConfirmLogoutOnly}
                  disabled={isShuttingDown}
                  className="w-full py-2.5 px-4 rounded-xl sm:rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>Keluar Saja (Biarkan Sistem Tetap Berjalan)</span>
                </button>

                {/* Cancel */}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isShuttingDown}
                  className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Batal & Lanjutkan
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Normal Logout Content */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Sistem Heat Exchanger dalam kondisi NONAKTIF (Aman).</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Apakah Anda yakin ingin mengakhiri sesi dan keluar dari akun <strong>{userName}</strong>?
                </p>
              </div>

              {/* Action Buttons for Inactive System */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={onConfirmLogoutOnly}
                  disabled={isShuttingDown}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 border border-slate-800 shadow-md shadow-slate-900/15 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 text-slate-300" />
                  <span>Ya, Keluar Akun</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isShuttingDown}
                  className="w-full sm:w-auto py-3 px-5 rounded-xl sm:rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

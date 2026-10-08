'use client';

import React from 'react';
import {
  Power,
  Play,
  Square,
  Loader2,
  Clock,
  Database,
  User,
  Activity,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SystemOperationalStatus, SystemSession } from '@/types';

export interface SystemReadinessBannerProps {
  status: SystemOperationalStatus;
  currentSession: SystemSession | null;
  sessionDuration: number;
  totalSessionPoints: number;
  onOpenStartup: () => void;
  onOpenEndSession: () => void;
}

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const SystemReadinessBanner: React.FC<SystemReadinessBannerProps> = ({
  status,
  currentSession,
  sessionDuration,
  totalSessionPoints,
  onOpenStartup,
  onOpenEndSession
}) => {
  if (status === 'OFF') {
    return (
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-rose-900/90 via-slate-900 to-slate-950 text-white border border-rose-500/40 shadow-xl shadow-rose-950/20 animate-fade-in">
        {/* Ambient subtle glow background */}
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="relative p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
              <Power className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  Status Operasional: <span className="text-rose-400 uppercase">Sistem Mati (Belum Siap)</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                  Data Terkunci
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Sistem belum diaktifkan untuk sesi praktikum hari ini. Pencatatan telemetri dibekukan agar riwayat data tidak tercampur.
                Silakan klik tombol <strong>Mulai Sistem</strong> untuk menginisialisasi hardware & memulai perekaman data bersih.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
            <button
              type="button"
              onClick={onOpenStartup}
              className="w-full md:w-auto px-5 py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/40 border border-emerald-400/40 transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-2 group ring-2 ring-emerald-400/20"
            >
              <Play className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform" />
              <span>Mulai / Hidupkan Sistem</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'STANDBY') {
    return (
      <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-amber-900/90 via-slate-900 to-slate-950 text-white border border-amber-500/40 shadow-xl shadow-amber-950/20 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  Status: <span className="text-amber-400 uppercase">Standby & Persiapan Sistem...</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase animate-pulse">
                  Warming Up
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Sedang memverifikasi komunikasi mesin laboratorium, memeriksa baseline sensor, dan mengalokasikan sesi baru.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'STOPPING') {
    return (
      <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-950 text-white border border-slate-700 shadow-xl animate-fade-in">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 shrink-0">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
              Mengakhiri Sesi & Pendinginan Sistem...
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Mematikan pemanas dual heater, mengamankan katup, dan mengarsipkan laporan data sesi praktikum.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 text-white border border-emerald-500/40 shadow-xl shadow-emerald-950/20 animate-fade-in">
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left Info: Status & Session ID */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                <span>Status:</span>
                <span className="text-emerald-400 uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  SISTEM AKTIF & SIAP
                </span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentSession?.id || 'SESI AKTIF'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-300 mt-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Durasi: <strong className="font-mono text-white">{formatDuration(sessionDuration)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Data Tercatat: <strong className="font-mono text-white">{totalSessionPoints}</strong> baris</span>
              </div>
              {currentSession?.operatorName && (
                <div className="flex items-center gap-1.5 hidden sm:flex">
                  <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Operator: <strong className="text-white">{currentSession.operatorName}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Action: End Session Button */}
        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
          <button
            type="button"
            onClick={onOpenEndSession}
            className="w-full lg:w-auto px-4 py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black text-rose-200 hover:text-white bg-rose-500/20 hover:bg-rose-600 border border-rose-500/40 transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <Square className="w-4 h-4 fill-rose-300 text-rose-300" />
            <span>Akhiri Sesi (Matikan Sistem)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

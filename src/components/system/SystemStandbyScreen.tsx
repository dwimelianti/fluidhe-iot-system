'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ChevronRight,
  Sparkles,
  User,
  Calendar
} from 'lucide-react';
import { SystemOperationalStatus } from '@/types';

export interface SystemStandbyScreenProps {
  systemState: SystemOperationalStatus;
  operatorName: string;
  defaultFlowMode?: string;
  onStartApp?: (sessionTitle: string) => void;
  onStartSystem?: (sessionTitle: string) => void;
  recentArchivesCount?: number;
}

export const SystemStandbyScreen: React.FC<SystemStandbyScreenProps> = ({
  systemState,
  operatorName,
  defaultFlowMode = 'Counter-Current',
  onStartApp,
  onStartSystem,
  recentArchivesCount = 0
}) => {
  const [sessionTitle, setSessionTitle] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setSessionTitle(`Praktikum ${defaultFlowMode} - ${timeStr} WIB`);
  }, [defaultFlowMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = sessionTitle.trim() || `Praktikum ${defaultFlowMode}`;
    if (onStartApp) {
      onStartApp(title);
    } else if (onStartSystem) {
      onStartSystem(title);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] w-full flex flex-col justify-between p-3 sm:p-6 md:p-8 bg-gradient-to-b from-[#90c5fd] via-[#3b82f6] to-[#1d4ed8] relative overflow-hidden font-sans text-slate-100 selection:bg-sky-400 selection:text-slate-900">

      {/* ─── SOFT AMBIENT LIGHTING & TOP GLOW ─── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.75)_0%,rgba(186,230,253,0.4)_40%,transparent_75%)] pointer-events-none z-0" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sky-300/25 rounded-full blur-3xl pointer-events-none z-0" />

      {/* ─── CRISP BLUEPRINT GRID PATTERN WITH GRADIENT MASK ─── */}
      <div className="absolute inset-0 blueprint-grid-pattern-lg opacity-70 grid-mask-fade pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(29,78,216,0.25)_100%)] pointer-events-none z-0" />

      {/* ─── 3D FLOATING LAYERED GLASS TILES ─── */}
      <div className="hidden sm:block absolute -bottom-16 -left-16 sm:-bottom-10 sm:-left-10 pointer-events-none select-none z-0">
        <div className="w-56 sm:w-72 h-56 sm:h-72 rounded-[2.5rem] sm:rounded-[3rem] spatial-glass-tile-subtle -rotate-[28deg] -translate-x-10 translate-y-12 opacity-50 animate-float-delayed" />
        <div className="absolute top-2 left-2 w-64 sm:w-84 h-64 sm:h-84 rounded-[2.8rem] sm:rounded-[3.2rem] spatial-glass-tile -rotate-[18deg] -translate-x-4 translate-y-6 opacity-75 animate-float-slow" />
        <div className="absolute top-8 left-8 w-56 sm:w-72 h-56 sm:h-72 rounded-[2.4rem] sm:rounded-[2.8rem] bg-gradient-to-tr from-white/25 via-white/10 to-transparent backdrop-blur-xl border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] -rotate-[10deg] opacity-90" />
      </div>

      <div className="hidden sm:block absolute -bottom-16 -right-16 sm:-bottom-10 sm:-right-10 pointer-events-none select-none z-0">
        <div className="w-56 sm:w-72 h-56 sm:h-72 rounded-[2.5rem] sm:rounded-[3rem] spatial-glass-tile-subtle rotate-[28deg] translate-x-10 translate-y-12 opacity-50 animate-float-delayed" />
        <div className="absolute top-2 right-2 w-64 sm:w-84 h-64 sm:h-84 rounded-[2.8rem] sm:rounded-[3.2rem] spatial-glass-tile rotate-[18deg] translate-x-4 translate-y-6 opacity-75 animate-float-slow" />
        <div className="absolute top-8 right-8 w-56 sm:w-72 h-56 sm:h-72 rounded-[2.4rem] sm:rounded-[2.8rem] bg-gradient-to-tl from-white/25 via-white/10 to-transparent backdrop-blur-xl border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] rotate-[10deg] opacity-90" />
      </div>

      {/* ─── CENTRAL CONTENT CONTAINER ─── */}
      <div className="relative z-10 w-full max-w-xl mx-auto my-auto py-2 sm:py-4">
        {/* Central Standby Card */}
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl sm:rounded-[2.25rem] p-6 sm:p-8 text-slate-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-white/80">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header: Logo UAD */}
            <div className="text-center space-y-2.5">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-sky-50 to-blue-100 border border-sky-200/80 p-2.5 shadow-sm flex items-center justify-center">
                  <img src="/uad-logo.png" alt="Logo UAD" className="w-full h-full object-contain" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500 border-2 border-white"></span>
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Sistem Belum Dimulai
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Sistem berada dalam kondisi siaga (Standby). Silakan inisialisasi sesi praktikum baru untuk membuka dashboard monitoring.
                </p>
              </div>
            </div>

            {/* Session Configuration & Anti Data Tercampur Info */}
            <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200/70 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-sky-950">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  Setiap memulai sistem, sesi baru akan dibuat sehingga rekaman data praktikum hari ini <strong>tidak akan tercampur</strong> dengan pengujian sebelumnya.
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Judul / Keterangan Sesi Praktikum
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Contoh: Pengujian Counter-Current 60°C"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Operator</span>
                    <strong className="text-slate-800 font-bold truncate block">{operatorName || 'Operator'}</strong>
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Tanggal</span>
                    <strong className="text-slate-800 font-bold block">{new Date().toLocaleDateString('id-ID')}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button: Masuk ke Dashboard Lab */}
            <div className="pt-1">
              <button
                type="submit"
                className="w-full py-3.5 sm:py-4 px-6 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-blue-600/30 border border-sky-300/30 transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 group ring-4 ring-sky-400/20"
              >
                <LayoutDashboard className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>MASUK KE DASHBOARD LAB</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── BOTTOM FOOTER ─── */}
      <footer className="text-center text-xs text-white/75 py-2 z-10 select-none">
        © 2026 Heat Exchanger Control System • Universitas Ahmad Dahlan
      </footer>

    </div>
  );
};

export default SystemStandbyScreen;

'use client';

import React, { useMemo } from 'react';
import {
  FileText,
  Search,
  Play,
  Layers,
  CheckCircle2,
  Database,
  ShieldCheck,
  Users,
  GraduationCap,
  Filter,
  Trash2
} from 'lucide-react';
import { SystemOperationalStatus, SystemSession, TelemetryPoint } from '@/types';
import { ExportButtons } from './ExportButtons';
import { DataTable } from './DataTable';
import { isSessionInDateFilter } from '@/lib/dateFormatter';

export interface ClassSummaryItem {
  operatorEmail: string;
  operatorName: string;
  classGroup?: string;
  count: number;
}

export interface LogsTabProps {
  filteredLogsData: TelemetryPoint[];
  logInterval: '1s' | '2s' | '5s' | '30s' | '1m' | '5m';
  setLogInterval: (interval: '1s' | '2s' | '5s' | '30s' | '1m' | '5m') => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  logSearchQuery: string;
  setLogSearchQuery: (query: string) => void;
  isUploading: boolean;
  handleExportAndUpload: () => void;
  handleExportCurrentSessionExcel?: () => void;
  handleExportAllClassesExcel?: () => void;
  handleCloudDriveAccess: () => void;
  // Session Isolation Props
  systemStatus?: SystemOperationalStatus;
  currentSession?: SystemSession | null;
  archivedSessions?: SystemSession[];
  selectedSessionId?: string;
  setSelectedSessionId?: (id: string) => void;
  onOpenStartup?: () => void;
  // Role-Based User Access Props
  currentUser?: { name: string; email: string; role: string };
  classFilter?: string;
  setClassFilter?: (filter: string) => void;
  classesList?: ClassSummaryItem[];
  onClearActiveSession?: () => void;
  // Steady State Thermostat Props
  targetTempHot?: number;
  toleranceLevel?: number;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  filteredLogsData,
  logInterval,
  setLogInterval,
  dateFilter,
  setDateFilter,
  logSearchQuery,
  setLogSearchQuery,
  isUploading,
  handleExportAndUpload,
  handleExportCurrentSessionExcel,
  handleExportAllClassesExcel,
  handleCloudDriveAccess,
  systemStatus = 'ACTIVE',
  currentSession,
  archivedSessions = [],
  selectedSessionId = 'CURRENT',
  setSelectedSessionId,
  onOpenStartup,
  currentUser,
  classFilter = 'ALL',
  setClassFilter,
  classesList = [],
  onClearActiveSession,
  targetTempHot = 50.0,
  toleranceLevel = 1
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Acuan evaluasi Steady State (Set Point & Toleransi P dari Thermostat)
  const steadyLower = targetTempHot - toleranceLevel;
  const steadyUpper = targetTempHot + toleranceLevel;

  const steadyCount = useMemo(() => {
    return filteredLogsData.filter(
      (d) => (d.ti1 !== undefined && d.ti1 !== null) && d.ti1 >= steadyLower && d.ti1 <= steadyUpper
    ).length;
  }, [filteredLogsData, steadyLower, steadyUpper]);

  // Filter archived sessions based on classFilter for Admin & dateFilter
  const visibleArchivedSessions = useMemo(() => {
    let list = archivedSessions;
    if (currentSession) {
      list = list.filter((s) => s.id !== currentSession.id);
    }
    if (isAdmin && classFilter !== 'ALL') {
      list = list.filter(
        (s) =>
          (s.operatorEmail && s.operatorEmail.toLowerCase() === classFilter.toLowerCase()) ||
          (s.classGroup && s.classGroup.toLowerCase() === classFilter.toLowerCase()) ||
          (s.operatorName && s.operatorName.toLowerCase() === classFilter.toLowerCase())
      );
    }
    if (dateFilter && dateFilter !== 'All') {
      list = list.filter((s) => isSessionInDateFilter(s.date, dateFilter));
    }
    return list;
  }, [isAdmin, classFilter, archivedSessions, currentSession, dateFilter]);

  // Deduplikasi total sesi unik
  const totalUniqueSessionsCount = useMemo(() => {
    const idSet = new Set<string>();
    archivedSessions.forEach((s) => { if (s?.id) idSet.add(s.id); });
    if (currentSession?.id) idSet.add(currentSession.id);
    return idSet.size;
  }, [archivedSessions, currentSession]);

  // Total telemetry points calculation for Admin Master Badge (hindari duplikasi jika sesi aktif sudah ada di arsip)
  const totalTelemetryCount = useMemo(() => {
    const currentId = currentSession?.id;
    const fromArchives = archivedSessions.reduce(
      (acc, s) => {
        if (currentId && s.id === currentId) return acc;
        return acc + (s.pointsCount || (s.data ? s.data.length : 0));
      },
      0
    );
    const fromCurrent = currentSession?.data ? currentSession.data.length : 0;
    return fromArchives + fromCurrent;
  }, [archivedSessions, currentSession]);

  // Selected session object for banner detail
  const activeSessionObj = useMemo(() => {
    if (selectedSessionId === 'ALL') {
      return {
        id: 'ALL',
        title: dateFilter === '7Days' ? 'Akumulasi Data 7 Hari Terakhir (Termasuk 08-10-2026)' : dateFilter === 'Today' ? 'Akumulasi Data Hari Ini' : 'Akumulasi Semua Riwayat Praktikum',
        date: dateFilter === '7Days' ? '7 Hari Terakhir' : dateFilter === 'Today' ? 'Hari Ini' : 'Semua Tanggal Arsip',
        operatorName: classFilter !== 'ALL' ? classFilter : (currentUser?.name || 'Seluruh Sesi Praktikum'),
        classGroup: 'Semua Praktikum Terdata',
        pointsCount: totalTelemetryCount,
        data: []
      } as any;
    }
    const isCurrentSelected = selectedSessionId === 'CURRENT' || (currentSession && selectedSessionId === currentSession.id);
    if (isCurrentSelected) return currentSession;
    return archivedSessions.find((s) => s.id === selectedSessionId) || null;
  }, [selectedSessionId, currentSession, archivedSessions, dateFilter, classFilter, currentUser, totalTelemetryCount]);

  return (
    <div className="space-y-6">
      <div id="tour-logs-tab" className="asklepios-card p-6 bg-white shadow-xl rounded-3xl border border-slate-200">
        {/* Top Header: Title & Export Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-sky-600" /> Laporan Monitoring Heat Exchanger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Penyimpanan data terpusat master laboratorium — Akses longitudinal semua kelas praktikum'
                : 'Laporan & rekaman data telemetri Heat Exchanger'}
            </p>
          </div>

          <ExportButtons
            isUploading={isUploading}
            onExportExcel={handleExportCurrentSessionExcel || handleExportAndUpload}
            onExportMasterExcel={handleExportAllClassesExcel}
            onCloudDriveAccess={handleCloudDriveAccess}
            isAdmin={isAdmin}
          />
        </div>

        {/* ROLE-BASED ACCESS BANNER */}
        {isAdmin ? (
          /* ADMIN MASTER DATA BANNER */
          <div className="no-print print:hidden mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50/70 to-indigo-50/50 border border-sky-200/80 text-sky-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 shadow-xs">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="p-2 sm:p-2.5 bg-sky-600 text-white rounded-2xl shadow-xs shrink-0 flex items-center justify-center">
                <Database className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-xs font-black text-sky-950 tracking-wide uppercase">
                    Data Berkepanjangan Laboratorium
                  </strong>
                </div>
                <p className="hidden md:block text-[11.5px] text-sky-800 mt-0.5">
                  Seluruh rekaman telemetri dari semua kelas dan kelompok tersimpan permanen di server untuk kebutuhan arsip kurikulum dan riset jangka panjang.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 w-full md:w-auto md:flex md:flex-wrap md:items-center md:gap-2 shrink-0">
              <div className="px-1.5 py-1.5 sm:px-3 sm:py-1.5 bg-white/95 rounded-xl border border-sky-200 text-center shadow-xs min-w-0 flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 block truncate">Total Sesi</span>
                <span className="text-[11.5px] sm:text-xs font-black text-sky-900 truncate">
                  {totalUniqueSessionsCount} Sesi
                </span>
              </div>
              <div className="px-1.5 py-1.5 sm:px-3 sm:py-1.5 bg-white/95 rounded-xl border border-sky-200 text-center shadow-xs min-w-0 flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 block truncate">Akumulasi Data</span>
                <span className="text-[11.5px] sm:text-xs font-black text-sky-900 truncate">{totalTelemetryCount} Baris</span>
              </div>
              <div className="px-1.5 py-1.5 sm:px-3 sm:py-1.5 bg-white/95 rounded-xl border border-sky-200 text-center shadow-xs min-w-0 flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 block truncate">Kelas Terdata</span>
                <span className="text-[11.5px] sm:text-xs font-black text-sky-900 truncate">
                  {classesList.length > 0 ? classesList.length : 1} Kelas
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* OPERATOR BANNER */
          <div className="no-print print:hidden mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-sky-50/40 to-slate-50 border border-slate-200 text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-600 text-white rounded-2xl shadow-xs shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-xs font-black text-slate-900 tracking-wide block">
                  Data Praktikum: {currentUser?.name || 'Operator'}
                </strong>
                <p className="text-[11.5px] text-slate-500 mt-0.5">
                  Rekaman data telemetri modul penukar panas Heat Exchanger
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-center shadow-xs shrink-0">
              <span className="text-[10px] font-bold text-slate-500 block">Total Sesi</span>
              <span className="text-xs font-black text-slate-900">
                {totalUniqueSessionsCount} Sesi
              </span>
            </div>
          </div>
        )}


        {/* Report Overview Meta Box */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/90 mb-6 space-y-1.5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2 mb-2">
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-wide">
                LAPORAN MONITORING HEAT EXCHANGER UAD
              </h1>
              {activeSessionObj && (
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  {activeSessionObj.title || 'Praktikum Heat Exchanger'} &bull; Operator:{' '}
                  <strong className="text-slate-800">{activeSessionObj.operatorName}</strong>
                  {activeSessionObj.classGroup && activeSessionObj.classGroup.trim().toLowerCase() !== (activeSessionObj.operatorName || '').trim().toLowerCase()
                    ? ` (${activeSessionObj.classGroup})`
                    : ''}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedSessionId === 'ALL' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                  Mode Akumulasi: {dateFilter === '7Days' ? '7 Hari Terakhir' : dateFilter === 'Today' ? 'Hari Ini' : 'Semua Arsip'}
                </span>
              ) : (selectedSessionId === 'CURRENT' || (currentSession && selectedSessionId === currentSession.id)) && currentSession ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Sesi Aktif: {currentSession.id}
                  </span>
                  {isAdmin && onClearActiveSession && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Hapus dan kosongkan rekaman Sesi Aktif (${currentSession.id}) ini beserta seluruh data sensornya secara permanen?`)) {
                          onClearActiveSession();
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer active:scale-95"
                      title="Hapus dan kosongkan sesi aktif beserta seluruh data sensornya secara permanen"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      Kosongkan Sesi Aktif
                    </button>
                  )}
                </>
              ) : (selectedSessionId !== 'CURRENT' && selectedSessionId !== currentSession?.id) ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  Arsip Sesi: {selectedSessionId}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-slate-200 text-slate-700">
                  Belum Ada Sesi Aktif
                </span>
              )}
            </div>
          </div>

          <p className="text-slate-600 font-medium">
            Sistem: <strong className="text-slate-800">Heat Exchanger Thermal Analytics (Interval Sampling: {logInterval})</strong>
          </p>
          <p className="text-slate-600 font-medium">
            Rentang Data:{' '}
            <strong className="text-slate-800">
              {filteredLogsData.length > 0
                ? `${activeSessionObj?.date || new Date().toLocaleDateString('id-ID')}, ${filteredLogsData[0]?.timestamp} WIB s.d. ${filteredLogsData[filteredLogsData.length - 1]?.timestamp} WIB (${filteredLogsData.length} baris telemetri)`
                : `Tidak ada data log (${dateFilter === 'Yesterday' ? 'Kemarin' : dateFilter === '7Days' ? '7 Hari Terakhir' : 'Kriteria Pencarian'})`}
            </strong>
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div
          className={`p-4 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
            } gap-4 mb-6 no-print shadow-sm`}
        >
          {/* Admin Class / Operator Filter (Khusus Admin) */}
          {isAdmin && setClassFilter && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-600" /> Filter Operator / User
              </label>
              <select
                value={classFilter}
                onChange={(e) => {
                  const newFilter = e.target.value;
                  setClassFilter(newFilter);
                  // Otomatis pilih sesi pertama dari kelas yang difilter agar data langsung tampil
                  if (newFilter !== 'ALL') {
                    const matches = archivedSessions.filter(
                      (s) =>
                        (s.operatorEmail && s.operatorEmail.toLowerCase() === newFilter.toLowerCase()) ||
                        (s.classGroup && s.classGroup.toLowerCase() === newFilter.toLowerCase()) ||
                        (s.operatorName && s.operatorName.toLowerCase() === newFilter.toLowerCase())
                    );
                    if (matches.length > 0) {
                      setSelectedSessionId?.(matches[0].id);
                    }
                  } else {
                    setSelectedSessionId?.('CURRENT');
                  }
                }}
                className="w-full px-3 py-1.5 bg-sky-50/50 border border-sky-200 rounded-xl text-xs text-sky-950 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
              >
                <option value="ALL">Semua Operator / User ({archivedSessions.length} sesi)</option>
                {classesList.map((c) => (
                  <option key={c.operatorEmail || c.operatorName} value={c.operatorEmail || c.operatorName}>
                    {c.operatorName} ({c.count} sesi)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Session Selector (Anti Data Tercampur & Akumulasi) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              Pilih Sesi Praktikum
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId?.(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
            >
              <option value="ALL">
                Semua Sesi Praktikum ({dateFilter === '7Days' ? '7 Hari Terakhir' : dateFilter === 'Today' ? 'Hari Ini' : 'Semua Tanggal'})
              </option>
              {currentSession && isSessionInDateFilter(currentSession.date, dateFilter) && (classFilter === 'ALL' || (currentSession.operatorEmail && currentSession.operatorEmail.toLowerCase() === classFilter.toLowerCase()) || (currentSession.operatorName && currentSession.operatorName.toLowerCase() === classFilter.toLowerCase())) && (
                <option value="CURRENT">
                  🟢 Sesi Aktif ({currentSession.date}) {isAdmin ? `[${currentSession.operatorName}]` : ''}
                </option>
              )}
              {visibleArchivedSessions.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  📁 {isAdmin ? `[${s.operatorName}] ` : ''}Sesi #{visibleArchivedSessions.length - idx}: {s.date} ({s.startTime || '-'})
                </option>
              ))}
              {!currentSession && visibleArchivedSessions.length === 0 && (
                <option value="CURRENT">Belum Ada Sesi Praktikum</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cari Waktu / Sensor</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Contoh: 12.31, 25.00, ON, Counter..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Interval Sampling</label>
            <select
              value={logInterval}
              onChange={(e) => setLogInterval(e.target.value as '1s' | '2s' | '5s' | '30s' | '1m' | '5m')}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
            >
              <option value="1s">1 Detik</option>
              <option value="2s">2 Detik</option>
              <option value="5s">5 Detik</option>
              <option value="30s">30 Detik</option>
              <option value="1m">1 Menit</option>
              <option value="5m">5 Menit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rentang Tanggal</label>
            <select
              value={dateFilter}
              onChange={(e) => {
                const val = e.target.value;
                setDateFilter(val);
                if (val === '7Days' || val === 'All') {
                  setSelectedSessionId?.('ALL');
                } else if (val === 'Today') {
                  setSelectedSessionId?.('CURRENT');
                }
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">Semua Tanggal Arsip</option>
              <option value="Today">Hari Ini ({new Date().toLocaleDateString('id-ID')})</option>
              <option value="Yesterday">Kemarin</option>
              <option value="7Days">7 Hari Terakhir</option>
            </select>
          </div>
        </div>

        <DataTable
          filteredLogsData={filteredLogsData}
          dateFilter={dateFilter}
          isAdmin={isAdmin}
          setPoint={targetTempHot}
          toleranceLevel={toleranceLevel}
        />

        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500 no-print border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Menampilkan {filteredLogsData.length} baris data telemetri (Sampling: {logInterval})</span>
            {steadyCount > 0 && (
              <span className="inline-flex items-center gap-1 font-bold text-sky-800 bg-sky-100/90 border border-sky-200 px-2 py-0.5 rounded-full text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                {steadyCount} baris data Steady State ({steadyLower.toFixed(0)}–{steadyUpper.toFixed(0)}°C)
              </span>
            )}
          </div>
          <span className="font-semibold text-slate-700">
            Sesi Terpilih:{' '}
            {selectedSessionId === 'ALL'
              ? `Semua Sesi (${dateFilter === '7Days' ? '7 Hari Terakhir' : 'Akumulasi'})`
              : (selectedSessionId === 'CURRENT' || (currentSession && selectedSessionId === currentSession.id))
                ? (currentSession?.id || 'Aktif')
                : selectedSessionId}
            {activeSessionObj?.operatorName && selectedSessionId !== 'ALL' ? ` (${activeSessionObj.operatorName})` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
export default LogsTab;

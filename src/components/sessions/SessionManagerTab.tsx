'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  FolderKanban,
  Edit3,
  Trash2,
  FileSpreadsheet,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Database,
  RefreshCw,
  ExternalLink,
  Download
} from 'lucide-react';
import { SystemSession } from '@/types';
import { calculateLMTD } from '@/lib/calculations';
import { exportSessionToExcel } from '@/lib/excel-export';

export interface SessionManagerTabProps {
  archivedSessions: SystemSession[];
  currentSession: SystemSession | null;
  onRefreshSessions: () => void;
  onSelectSessionForLogs: (sessionId: string) => void;
  onExportMasterExcel?: () => void;
  onExportSessionExcel?: (session: SystemSession) => void;
  onClearActiveSession?: () => void;
  onUpdateCurrentSession?: (updated: Partial<SystemSession>) => void;
}

export const SessionManagerTab: React.FC<SessionManagerTabProps> = ({
  archivedSessions,
  currentSession,
  onRefreshSessions,
  onSelectSessionForLogs,
  onExportMasterExcel,
  onExportSessionExcel,
  onClearActiveSession,
  onUpdateCurrentSession
}) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingSession, setEditingSession] = useState<SystemSession | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editClassGroup, setEditClassGroup] = useState('');
  const [editOperatorName, setEditOperatorName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Single Delete State
  const [sessionToDelete, setSessionToDelete] = useState<SystemSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-Select & Bulk Delete State
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Optimistic tracking for instant UI feedback
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [editedSessions, setEditedSessions] = useState<Record<string, Partial<SystemSession>>>({});

  // Feedback Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Deduplikasi sesi secara ketat berdasarkan ID: HANYA tampilkan sesi jika memperoleh data (alat aktif)
  const allSessions = useMemo(() => {
    const sessionMap = new Map<string, SystemSession>();
    // Taruh arsip terlebih dahulu (hanya yang memiliki data sensor dan belum dihapus)
    archivedSessions.forEach((rawS) => {
      if (deletedIds.includes(rawS?.id)) return;
      let s = { ...rawS };
      if (editedSessions[s.id]) {
        s = { ...s, ...editedSessions[s.id] };
      }
      const pts = typeof s?.pointsCount === 'number' ? s.pointsCount : (s?.data?.length || 0);
      if (s?.id && (pts > 0 || (s.data && s.data.length > 0))) {
        sessionMap.set(s.id, s);
      }
    });

    // Jika ada currentSession, masukkan HANYA jika data sudah masuk (alat aktif) dan belum dihapus
    if (currentSession?.id && !deletedIds.includes(currentSession.id)) {
      let activeS = { ...currentSession };
      if (editedSessions[activeS.id]) {
        activeS = { ...activeS, ...editedSessions[activeS.id] };
      }
      const currentPts = typeof activeS.pointsCount === 'number' ? activeS.pointsCount : (activeS.data?.length || 0);
      if (currentPts > 0 || (activeS.data && activeS.data.length > 0)) {
        const existing = sessionMap.get(activeS.id);
        if (!existing || (activeS.data && activeS.data.length >= (existing.data?.length || 0))) {
          sessionMap.set(activeS.id, { ...(existing || {}), ...activeS });
        }
      }
    }

    return Array.from(sessionMap.values()).sort((a, b) => {
      const timeA = a.startTimeMs || (a.date ? new Date(a.date).getTime() : 0);
      const timeB = b.startTimeMs || (b.date ? new Date(b.date).getTime() : 0);
      return timeB - timeA;
    });
  }, [currentSession, archivedSessions, deletedIds, editedSessions]);

  const filteredSessions = allSessions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.id.toLowerCase().includes(q) ||
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.operatorName && s.operatorName.toLowerCase().includes(q)) ||
      (s.operatorEmail && s.operatorEmail.toLowerCase().includes(q)) ||
      (s.classGroup && s.classGroup.toLowerCase().includes(q)) ||
      s.date.includes(q)
    );
  });

  // Sesi yang bisa dipilih (Admin dapat memilih semua sesi termasuk sesi aktif untuk dihapus)
  const selectableSessions = filteredSessions;
  const isAllSelected =
    selectableSessions.length > 0 && selectableSessions.every((s) => selectedSessionIds.includes(s.id));
  const isIndeterminate = selectedSessionIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const selectableSet = new Set(selectableSessions.map((s) => s.id));
      setSelectedSessionIds((prev) => prev.filter((id) => !selectableSet.has(id)));
    } else {
      const selectableIds = selectableSessions.map((s) => s.id);
      setSelectedSessionIds((prev) => Array.from(new Set([...prev, ...selectableIds])));
    }
  };

  const handleToggleSelectRow = (sessionId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    );
  };

  const handleOpenEdit = (session: SystemSession) => {
    setEditingSession(session);
    setEditTitle(session.title || '');
    setEditClassGroup(session.classGroup || '');
    setEditOperatorName(session.operatorName || '');
    setEditDate(session.date || '');
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    try {
      setIsSaving(true);
      const targetId = editingSession.id;
      const isTargetCurrent = targetId === currentSession?.id;

      const updatedPayload = {
        role: 'admin',
        sessionId: targetId,
        title: editTitle.trim(),
        classGroup: editClassGroup.trim(),
        operatorName: editOperatorName.trim(),
        date: editDate.trim()
      };

      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      const data = await res.json();

      if (data.success) {
        // Optimistic UI update
        setEditedSessions((prev) => ({
          ...prev,
          [targetId]: {
            title: editTitle.trim(),
            classGroup: editClassGroup.trim(),
            operatorName: editOperatorName.trim(),
            date: editDate.trim()
          }
        }));

        if (isTargetCurrent) {
          onUpdateCurrentSession?.({
            title: editTitle.trim(),
            classGroup: editClassGroup.trim(),
            operatorName: editOperatorName.trim(),
            date: editDate.trim()
          });
        }

        showToast(`Sesi ${targetId} berhasil diperbarui!`, 'success');
        setEditingSession(null);
        onRefreshSessions();
      } else {
        showToast(data.error || 'Gagal menyimpan perubahan', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saat menyimpan data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      setIsDeleting(true);
      const targetId = sessionToDelete.id;
      const isTargetCurrent = targetId === currentSession?.id;

      // Bersihkan telemetri dari supabase jika sesi memiliki rekaman
      if (sessionToDelete.data && sessionToDelete.data.length > 0) {
        const minTime = sessionToDelete.data[0].created_at || (sessionToDelete.startTimeMs ? new Date(sessionToDelete.startTimeMs - 2000).toISOString() : null);
        const maxTime = sessionToDelete.data[sessionToDelete.data.length - 1].created_at || (sessionToDelete.endTimeMs ? new Date(sessionToDelete.endTimeMs + 2000).toISOString() : null);
        if (minTime && maxTime) {
          try {
            await fetch(`/api/supabase/telemetry?minTime=${encodeURIComponent(minTime)}&maxTime=${encodeURIComponent(maxTime)}`, {
              method: 'DELETE'
            });
          } catch (e) { }
        }
      }

      // Jalankan hapus sesi di server
      const res = await fetch(`/api/sessions?sessionId=${encodeURIComponent(targetId)}&role=admin`, {
        method: 'DELETE'
      });
      const data = await res.json();

      // Jika target adalah sesi aktif, reset sesi aktif
      if (isTargetCurrent) {
        onClearActiveSession?.();
      }

      // Optimistic update: langsung hapus dari tampilan
      setDeletedIds((prev) => [...prev, targetId]);
      setSelectedSessionIds((prev) => prev.filter((id) => id !== targetId));
      setSessionToDelete(null);

      showToast(data.message || `Sesi ${targetId} & seluruh data sensornya berhasil dihapus secara permanen!`, 'success');
      onRefreshSessions();
    } catch (err: any) {
      showToast(err?.message || 'Error saat menghapus sesi', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSessionIds.length === 0) return;
    try {
      setIsBulkDeleting(true);
      const targetIds = [...selectedSessionIds];
      const includesCurrent = currentSession && targetIds.includes(currentSession.id);

      // Bersihkan telemetri dari supabase untuk sesi-sesi yang dipilih jika ada
      const targetSessions = allSessions.filter((s) => targetIds.includes(s.id));
      for (const s of targetSessions) {
        if (s.data && s.data.length > 0) {
          const minTime = s.data[0].created_at;
          const maxTime = s.data[s.data.length - 1].created_at;
          if (minTime && maxTime) {
            try {
              await fetch(`/api/supabase/telemetry?minTime=${encodeURIComponent(minTime)}&maxTime=${encodeURIComponent(maxTime)}`, {
                method: 'DELETE'
              });
            } catch (e) { }
          }
        }
      }

      const res = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'admin',
          sessionIds: targetIds
        })
      });
      const data = await res.json();

      if (includesCurrent) {
        onClearActiveSession?.();
      }

      // Optimistic update: langsung sembunyikan semua targetIds
      setDeletedIds((prev) => [...prev, ...targetIds]);
      setSelectedSessionIds([]);
      setShowBulkDeleteModal(false);

      showToast(data.message || `Berhasil menghapus ${targetIds.length} sesi praktikum!`, 'success');
      onRefreshSessions();
    } catch (err: any) {
      showToast(err?.message || 'Error saat menghapus sesi massal', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ─── Ekspor Excel Terpisah untuk Setiap Sesi yang Dipilih ───
  const exportSingleSessionToExcel = (session: SystemSession) => {
    exportSessionToExcel(session, { isAdmin: true });
  };

  const handleExportSelectedExcel = () => {
    if (selectedSessionIds.length === 0) return;

    try {
      const selectedSessions = allSessions.filter((s) => selectedSessionIds.includes(s.id));
      if (selectedSessions.length === 0) return;

      selectedSessions.forEach((sess, idx) => {
        setTimeout(() => {
          exportSingleSessionToExcel(sess);
        }, idx * 150);
      });

      showToast(`Mengunduh ${selectedSessions.length} file Excel sesi terpisah...`, 'success');
    } catch (err: any) {
      console.error('Error exporting selected sessions to Excel:', err);
      showToast('Gagal mengunduh file Excel', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification (Portal to body) */}
      {isMounted && typeof document !== 'undefined' && toastMsg && createPortal(
        <div
          className={`fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-extrabold text-white animate-fade-in ${
            toastMsg.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>,
        document.body
      )}

      {/* Header Card */}
      <div id="tour-session-manager" className="p-6 bg-white shadow-xl rounded-3xl border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-2xl shadow-md shadow-sky-500/20">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Kelola Arsip & Data Praktikum
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola riwayat sesi praktikum, perbarui judul modul, hapus sesi, dan ekspor laporan master
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onExportMasterExcel && (
              <button
                type="button"
                onClick={onExportMasterExcel}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Master Excel (Semua Sesi)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefreshSessions}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 cursor-pointer"
              title="Muat Ulang Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID sesi, nama user, operator, judul sesi..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
            <span>Total: <strong>{filteredSessions.length}</strong> sesi praktikum terarsip</span>
          </div>
        </div>

        {/* Bulk Action Toolbar Banner (Tema Soft Biru) */}
        {selectedSessionIds.length > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-sky-50 via-blue-50/70 to-indigo-50/50 border border-sky-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center px-2.5 py-0.5 rounded-full bg-sky-600 text-white text-xs font-black shadow-xs tracking-wide">
                {selectedSessionIds.length}
              </span>
              <span className="text-xs font-bold text-sky-950">
                {selectedSessionIds.length} sesi praktikum dipilih
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              {/* Batal Pilihan */}
              <button
                type="button"
                onClick={() => setSelectedSessionIds([])}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition cursor-pointer"
              >
                Batal Pilihan
              </button>

              {/* Unduh File Excel Terpisah */}
              <button
                type="button"
                onClick={handleExportSelectedExcel}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-extrabold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                title="Unduh file Excel terpisah untuk setiap sesi yang dipilih"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Excel ({selectedSessionIds.length} File)</span>
              </button>

              {/* Hapus Sesi Terpilih */}
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-extrabold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedSessionIds.length} Sesi</span>
              </button>
            </div>
          </div>
        )}

        {/* Sessions Table */}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10.5px] tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer accent-sky-600 align-middle"
                    title="Pilih Semua Sesi"
                  />
                </th>
                <th className="py-3 px-3.5">ID Sesi</th>
                <th className="py-3 px-3.5">Tanggal & Jam</th>
                <th className="py-3 px-3.5">Nama User</th>
                <th className="py-3 px-3.5">Judul Sesi</th>
                <th className="py-3 px-3.5 text-center">Data Points</th>
                <th className="py-3 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Tidak ada sesi praktikum yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const isCurrent = session.id === currentSession?.id;
                  const isSelected = selectedSessionIds.includes(session.id);
                  return (
                    <tr
                      key={session.id}
                      className={`transition ${isSelected ? 'bg-sky-50/70 hover:bg-sky-100/60' : 'hover:bg-slate-50'}`}
                    >
                      {/* Checkbox Kolom */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(session.id)}
                          className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer accent-sky-600 align-middle"
                          title={`Pilih ${session.id}${isCurrent ? ' (Sesi Aktif)' : ''}`}
                        />
                      </td>

                      {/* ID Sesi */}
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-800 flex items-center gap-1.5">
                        {isCurrent && (
                          <span className="relative flex h-2 w-2 mr-0.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                        <span>{session.id}</span>
                      </td>

                      {/* Tanggal & Jam */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        <span className="font-bold text-slate-800 block">{session.date}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{session.startTime} WIB</span>
                      </td>

                      {/* Operator / Akun */}
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-slate-800 block">
                          {session.classGroup || session.operatorName || 'Operator'}
                        </span>
                        {session.classGroup && session.operatorName && session.classGroup.toLowerCase() !== session.operatorName.toLowerCase() && (
                          <span className="text-[11px] text-slate-500 block">Op: {session.operatorName}</span>
                        )}
                        <span className="text-[11px] text-slate-400 block font-mono">{session.operatorEmail || '-'}</span>
                      </td>

                      {/* Judul Sesi */}
                      <td className="py-3 px-3.5 max-w-xs">
                        <p className="font-medium text-slate-700 truncate" title={session.title}>
                          {session.title || 'Praktikum Heat Exchanger'}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">{session.flowMode || 'Counter-Current'}</span>
                      </td>

                      {/* Data Points */}
                      <td className="py-3 px-3.5 text-center font-bold font-mono text-slate-800">
                        {session.pointsCount || (session.data ? session.data.length : 0)} baris
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(session);
                            }}
                            className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition active:scale-95 cursor-pointer"
                            title="Edit nama kelas, kelompok, atau judul sesi"
                          >
                            <Edit3 className="w-3.5 h-3.5 pointer-events-none" />
                          </button>

                          {/* Buka di Data Logs Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSessionForLogs(session.id);
                            }}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition active:scale-95 cursor-pointer"
                            title="Buka & Tampilkan di Data Logs"
                          >
                            <ExternalLink className="w-3.5 h-3.5 pointer-events-none" />
                          </button>

                          {/* Delete Button (Tersedia untuk semua sesi bagi Admin) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete(session);
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition active:scale-95 cursor-pointer"
                            title={isCurrent ? "Hentikan & Hapus sesi aktif ini secara permanen" : "Hapus sesi ini secara permanen"}
                          >
                            <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL EDIT SESI (Portal to document.body) ─── */}
      {isMounted && typeof document !== 'undefined' && editingSession && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditingSession(null)}
        >
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Edit Metadata Sesi</h3>
                  <p className="text-[11px] font-mono text-slate-400">{editingSession.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Modul / Sesi Praktikum</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Contoh: Praktikum Heat Exchanger Modul 1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kelompok / Kelas</label>
                <input
                  type="text"
                  value={editClassGroup}
                  onChange={(e) => setEditClassGroup(e.target.value)}
                  placeholder="Contoh: Kelompok 1 / Kelas Praktikum"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Operator</label>
                <input
                  type="text"
                  value={editOperatorName}
                  onChange={(e) => setEditOperatorName(e.target.value)}
                  placeholder="Nama operator"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Praktikum</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL HAPUS TUNGGAL SESI (Portal to document.body) ─── */}
      {isMounted && typeof document !== 'undefined' && sessionToDelete && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSessionToDelete(null)}
        >
          <div 
            className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {sessionToDelete.id === currentSession?.id ? 'Hentikan & Hapus Sesi Aktif?' : 'Hapus Sesi Praktikum?'}
                </h3>
                <p className="text-xs text-slate-500">
                  {sessionToDelete.id === currentSession?.id
                    ? 'Sesi ini sedang aktif berjalan. Menghapus sesi ini akan menghentikan perekaman mesin dan menghapus seluruh datanya secara permanen.'
                    : 'Tindakan ini akan menghapus data permanen.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 font-mono">
              <p className="font-bold text-slate-800">{sessionToDelete.id}</p>
              <p className="text-slate-500">{sessionToDelete.title || 'Praktikum'}</p>
              <p className="text-slate-500">Operator: {sessionToDelete.operatorName}</p>
              <p className="text-slate-500">Tanggal: {sessionToDelete.date}</p>
            </div>

            <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2 text-[11px] text-rose-800 leading-snug">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
              <span>Seluruh rekaman data sensor untuk sesi ini akan dihapus secara <strong>permanen</strong>.</span>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL HAPUS MASSAL SESI TERPILIH (Portal to document.body) ─── */}
      {isMounted && typeof document !== 'undefined' && showBulkDeleteModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowBulkDeleteModal(false)}
        >
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Hapus {selectedSessionIds.length} Sesi Terpilih?
                </h3>
                <p className="text-xs text-slate-500">
                  Data sesi praktikum yang dipilih akan dihapus secara permanen dari server.
                </p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono divide-y divide-slate-200/60">
              {selectedSessionIds.map((id) => {
                const s = allSessions.find((sess) => sess.id === id);
                return (
                  <div key={id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">{id}</span>
                    <span className="text-slate-500 truncate text-[11px]">
                      {s?.classGroup || s?.operatorName || 'Sesi Praktikum'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2 text-[11px] text-rose-800 leading-snug">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
              <span>Seluruh rekaman data sensor untuk {selectedSessionIds.length} sesi terpilih ini akan dihapus secara <strong>permanen</strong>.</span>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold rounded-xl text-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isBulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus {selectedSessionIds.length} Sesi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default SessionManagerTab;


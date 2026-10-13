'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { TelemetryPoint } from '@/types';
import { calculateLMTD } from '@/lib/calculations';

export interface DataTableProps {
  filteredLogsData: TelemetryPoint[];
  dateFilter: string;
  isAdmin?: boolean;
  setPoint?: number;
  toleranceLevel?: number;
}

export const DataTable: React.FC<DataTableProps> = ({
  filteredLogsData,
  dateFilter,
  isAdmin = false,
  setPoint = 50.0,
  toleranceLevel = 1.0
}) => {
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  // Rentang batas Steady State
  const lowerLimit = setPoint - toleranceLevel;
  const upperLimit = setPoint + toleranceLevel;

  const displayData = React.useMemo(() => {
    if (sortOrder === 'desc') {
      return [...filteredLogsData].reverse();
    }
    return filteredLogsData;
  }, [filteredLogsData, sortOrder]);

  return (
    <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-sm">
      <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
        <thead>
          <tr className="bg-[#0B2545] text-white font-bold text-center border-b border-slate-400">
            <th
              className="p-2.5 border-r border-slate-600 text-left cursor-pointer select-none hover:bg-slate-800 transition"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              title="Klik untuk membalik urutan waktu (Terbaru / Terlama)"
            >
              <div className="flex items-center gap-1.5">
                <span>Waktu</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-200 border border-sky-400/40">
                  {sortOrder === 'desc' ? 'Terbaru ↓' : 'Terlama ↑'}
                </span>
              </div>
            </th>
            <th className="p-2.5 border-r border-slate-600">TI-1 Hot In (°C)</th>
            <th className="p-2.5 border-r border-slate-600">TI-2 Hot Out (°C)</th>
            <th className="p-2.5 border-r border-slate-600">TI-3 Cold In (°C)</th>
            <th className="p-2.5 border-r border-slate-600">TI-4 Cold Out (°C)</th>
            <th className="p-2.5 border-r border-slate-600 bg-sky-950/80">ΔT Hot (°C)</th>
            <th className="p-2.5 border-r border-slate-600 bg-sky-950/80">ΔT Cold (°C)</th>

            {/* Kolom Informasi Status Steady (di sebelah kiri LMTD, di kanan ΔT Cold) */}
            <th className="p-2.5 border-r border-slate-600 bg-sky-900 text-sky-200" title={`Steady State: TI-1 di rentang ${lowerLimit.toFixed(1)}°C – ${upperLimit.toFixed(1)}°C`}>
              <div className="flex flex-col items-center">
                <span>Status Termal</span>
                <span className="text-[9.5px] font-bold text-sky-300">
                  Steady ({lowerLimit.toFixed(0)}–{upperLimit.toFixed(0)}°C)
                </span>
              </div>
            </th>

            {isAdmin && (
              <th className="p-2.5 border-r border-slate-600 bg-indigo-950/80">LMTD (°C)</th>
            )}
            <th className="p-2.5 border-r border-slate-600">FC-1 Hot (L/min)</th>
            <th className="p-2.5 border-r border-slate-600">FC-2 Cold (L/min)</th>
            <th className="p-2.5 border-r border-slate-600">PI-1 In (Bar)</th>
            <th className="p-2.5 border-r border-slate-600">PI-2 Out (Bar)</th>
            <th className="p-2.5 border-r border-slate-600">PI-3 In (Bar)</th>
            <th className="p-2.5 border-r border-slate-600">PI-4 Out (Bar)</th>
            <th className="p-2.5 border-r border-slate-600">Heater 1</th>
            <th className="p-2.5 border-r border-slate-600">Heater 2</th>
            <th className="p-2.5">Mode Aliran</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-center font-medium">
          {displayData.length === 0 ? (
            <tr>
              <td colSpan={isAdmin ? 18 : 17} className="p-10 text-center bg-slate-50/50">
                <div className="flex flex-col items-center justify-center gap-2 py-6">
                  <FileText className="w-9 h-9 text-slate-300" />
                  <span className="font-bold text-sm text-slate-800">Tidak Ada Data Telemetri Tercatat</span>
                  <span className="text-xs text-slate-500 max-w-sm">
                    {dateFilter === 'Yesterday'
                      ? 'Tidak ada rekaman sesi praktikum pada tanggal kemarin.'
                      : dateFilter === '7Days'
                        ? 'Tidak ada rekaman data pada rentang 7 hari terakhir.'
                        : 'Tidak ada data sensor yang sesuai dengan kriteria pencarian.'}
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            displayData.map((row, idx) => {
              const dtHot = Math.abs((row.ti1 || 0) - (row.ti2 || 0));
              const dtCold = Math.abs((row.ti4 || 0) - (row.ti3 || 0));
              const lmtdVal = calculateLMTD(
                row.ti1 || 0,
                row.ti2 || 0,
                row.ti3 || 0,
                row.ti4 || 0,
                row.mode === 'Counter-Current'
              );

              // Evaluasi Steady State: TI-1 Hot In berada dalam rentang Set Point ± Toleransi P
              const isSteady = (row.ti1 !== undefined && row.ti1 !== null) &&
                row.ti1 >= lowerLimit &&
                row.ti1 <= upperLimit;

              return (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    isSteady
                      ? 'bg-sky-50/90 hover:bg-sky-100 text-slate-900 border-l-4 border-l-sky-500 font-semibold shadow-2xs'
                      : idx % 2 === 1
                        ? 'bg-slate-50 hover:bg-sky-50/40 text-slate-700'
                        : 'bg-white hover:bg-sky-50/40 text-slate-700'
                  }`}
                >
                  <td className="p-2 border-r border-slate-200 text-left font-mono font-semibold text-slate-800">
                    {row.created_at ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1 py-0.5 rounded">
                          {new Date(row.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span>{row.timestamp}</span>
                      </div>
                    ) : (
                      row.timestamp
                    )}
                  </td>
                  <td className={`p-2 border-r border-slate-200 font-mono font-bold ${
                    isSteady ? 'text-sky-950 bg-sky-200/40' : 'text-rose-700'
                  }`}>
                    {(row.ti1 || 0).toFixed(2)}
                  </td>
                  <td className="p-2 border-r border-slate-200 font-mono font-semibold text-rose-600">{(row.ti2 || 0).toFixed(2)}</td>
                  <td className="p-2 border-r border-slate-200 font-mono font-semibold text-sky-700">{(row.ti3 || 0).toFixed(2)}</td>
                  <td className="p-2 border-r border-slate-200 font-mono font-semibold text-sky-600">{(row.ti4 || 0).toFixed(2)}</td>
                  <td className="p-2 border-r border-slate-200 font-mono font-bold text-amber-700 bg-amber-50/40">{dtHot.toFixed(2)}</td>
                  <td className="p-2 border-r border-slate-200 font-mono font-bold text-teal-700 bg-teal-50/40">{dtCold.toFixed(2)}</td>

                  {/* Status Termal (Steady / Unsteady): di kanan ΔT Cold, di kiri LMTD */}
                  <td className="p-2 border-r border-slate-200 text-center">
                    {isSteady ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-sky-600 text-white shadow-xs tracking-wide">
                        STEADY
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                        UNSTEADY
                      </span>
                    )}
                  </td>

                  {isAdmin && (
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-indigo-700 bg-indigo-50/40">{lmtdVal.toFixed(2)}</td>
                  )}
                  <td className="p-2 border-r border-slate-200 font-mono font-bold text-emerald-700">{(row.fc1 || 0).toFixed(2)}</td>
                  <td className="p-2 border-r border-slate-200 font-mono font-bold text-emerald-700">{(row.fc2 || 0).toFixed(2)}</td>
                  <td className="p-2 border-r border-slate-200 font-mono text-slate-700">{(row.pi1 || 0).toFixed(2)}</td>
                  <td className="p-2 border-r border-slate-200 font-mono text-slate-700">{(row.pi2 || 0).toFixed(2)}</td>
                  <td className="p-2 border-r border-slate-200 font-mono text-slate-700">{(row.pi3 || 0).toFixed(2)}</td>
                  <td className="p-2 border-r border-slate-200 font-mono text-slate-700">{(row.pi4 || 0).toFixed(2)}</td>
                  <td className="p-2 border-r border-slate-200">
                    {row.heater1Active ? (
                      <span className="text-emerald-600 font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 inline-block text-[10px]">ON</span>
                    ) : (
                      <span className="text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-100 inline-block text-[10px]">OFF</span>
                    )}
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    {row.heater2Active ? (
                      <span className="text-emerald-600 font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 inline-block text-[10px]">ON</span>
                    ) : (
                      <span className="text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-100 inline-block text-[10px]">OFF</span>
                    )}
                  </td>
                  <td className="p-2 font-bold text-slate-700 text-[11px]">{row.mode}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
export default DataTable;

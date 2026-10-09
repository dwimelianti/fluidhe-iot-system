'use client';

import React from 'react';
import { Wind, Clock, Power, ShieldAlert } from 'lucide-react';
import { ControlMode } from '@/types';

interface SteamValveControlProps {
  controlMode?: ControlMode;
  uapStatus: boolean;
  uapAutoStatus?: boolean;
  uapIntervalMin?: number;
  emergencyStopped?: boolean;
  isPressureDangerous?: boolean;
  onToggleUapManual: (nextState: boolean) => void;
  onToggleUapAuto: (nextState: boolean) => void;
  onChangeUapInterval: (min: number) => void;
}

export const SteamValveControl: React.FC<SteamValveControlProps> = ({
  controlMode = 'MANUAL',
  uapStatus,
  uapAutoStatus = false,
  uapIntervalMin = 10,
  emergencyStopped = false,
  isPressureDangerous = false,
  onToggleUapManual,
  onToggleUapAuto,
  onChangeUapInterval,
}) => {
  const isAuto = controlMode === 'AUTO';

  return (
    <div
      id="tour-steam-valve"
      className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between h-full shadow-2xs"
    >
      {/* Header */}
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
          <Wind className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="truncate font-extrabold">Katup Solenoid Uap</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {isPressureDangerous && (
            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200 animate-pulse flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              SAFETY OPEN
            </span>
          )}
          <span
            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
              uapStatus
                ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {uapStatus ? 'BUKA (OPEN)' : 'CLOSED'}
          </span>
        </div>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-between">
        {/* Kontrol 1: Status & Manual On-Demand */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-700">1. Status & Manual</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                uapStatus ? 'bg-sky-500 animate-pulse ring-2 ring-sky-200' : 'bg-slate-300'
              }`}
            />
          </div>
          <button
            type="button"
            onClick={() => onToggleUapManual(!uapStatus)}
            disabled={emergencyStopped}
            className={`w-full py-2 min-h-[38px] rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 ${
              uapStatus
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Power className="w-3.5 h-3.5 text-rose-500" />
            <span>{uapStatus ? 'Tutup Katup Uap' : 'Buka Katup Uap'}</span>
          </button>
        </div>

        {/* Kontrol 2: Interval Siklus Auto (Tutup -> Buka Periodik) */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" /> 2. Siklus Berjadwal
            </span>
            {isAuto ? (
              <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                AKTIF
              </span>
            ) : (
              <input
                type="checkbox"
                checked={uapAutoStatus}
                onChange={(e) => onToggleUapAuto(e.target.checked)}
                disabled={emergencyStopped}
                className="w-4 h-4 text-sky-600 rounded cursor-pointer accent-sky-600"
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] gap-2 pt-0.5">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Buka Setiap:</span>
            <select
              value={uapIntervalMin}
              onChange={(e) => {
                const val = Number(e.target.value);
                onChangeUapInterval(val);
              }}
              disabled={emergencyStopped}
              className="w-full max-w-[120px] px-2.5 py-1 bg-white border border-slate-300 hover:border-slate-400 rounded-lg font-extrabold text-slate-800 text-[11px] cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
            >
              <option value={5}>5 Menit</option>
              <option value={10}>10 Menit</option>
              <option value={15}>15 Menit</option>
              <option value={30}>30 Menit</option>
            </select>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 font-medium px-0.5">
        *Mode AUTO: Katup uap membuka periodik setiap {uapIntervalMin} menit. Kontrol manual dapat digunakan kapan saja (override on-demand).
      </p>
    </div>
  );
};

export default SteamValveControl;

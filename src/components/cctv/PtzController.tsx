'use client';

import React from 'react';
import {
  Compass,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Activity
} from 'lucide-react';
import { TelemetryPoint, TempLabels } from '@/types';

export interface PtzControllerProps {
  ptzMoving: string | null;
  onPtzAction: (direction: 'up' | 'down' | 'left' | 'right' | 'center' | 'rig' | 'tank' | 'valve') => void;
  onPtzPreset?: (label: string, presetKey: string) => void;
  latestData: TelemetryPoint;
  connected?: boolean;
  isHardwareOnline?: boolean;
  tempLabels?: TempLabels;
}

export const PtzController: React.FC<PtzControllerProps> = ({
  ptzMoving,
  onPtzAction,
  onPtzPreset,
  latestData,
  connected = false,
  isHardwareOnline = false,
  tempLabels,
}) => {
  return (
    <div className="space-y-6">
      {/* PTZ Rotasi Controller Card */}
      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
        <div className="flex justify-between items-center border-b border-slate-200/80 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-600" /> Kontrol Rotasi Kamera
          </h3>
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${
              connected
                ? 'text-sky-700 bg-sky-50 border-sky-200'
                : 'text-slate-500 bg-slate-100 border-slate-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'}`} />
            {connected ? 'Connected' : 'Offline'}
          </span>
        </div>

        {/* Minimalist Soft D-Pad */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-40 h-40 rounded-full bg-gradient-to-tr from-slate-200/80 via-slate-100 to-slate-200/80 border border-slate-300/80 shadow-inner flex items-center justify-center">

            {/* UP */}
            <button
              type="button"
              disabled={!connected}
              onClick={() => onPtzAction('up')}
              className={`absolute top-2 left-1/2 -translate-x-1/2 w-10 h-8 rounded-t-xl bg-white hover:bg-sky-600 text-slate-700 hover:text-white flex items-center justify-center transition active:scale-95 shadow-xs border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                ptzMoving === 'up' ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white scale-95' : ''
              }`}
              title={connected ? "Putar Atas" : "Kamera Offline"}
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* DOWN */}
            <button
              type="button"
              disabled={!connected}
              onClick={() => onPtzAction('down')}
              className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-8 rounded-b-xl bg-white hover:bg-sky-600 text-slate-700 hover:text-white flex items-center justify-center transition active:scale-95 shadow-xs border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                ptzMoving === 'down' ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white scale-95' : ''
              }`}
              title={connected ? "Putar Bawah" : "Kamera Offline"}
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* LEFT */}
            <button
              type="button"
              disabled={!connected}
              onClick={() => onPtzAction('left')}
              className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-10 rounded-l-xl bg-white hover:bg-sky-600 text-slate-700 hover:text-white flex items-center justify-center transition active:scale-95 shadow-xs border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                ptzMoving === 'left' ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white scale-95' : ''
              }`}
              title={connected ? "Putar Kiri" : "Kamera Offline"}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* RIGHT */}
            <button
              type="button"
              disabled={!connected}
              onClick={() => onPtzAction('right')}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-10 rounded-r-xl bg-white hover:bg-sky-600 text-slate-700 hover:text-white flex items-center justify-center transition active:scale-95 shadow-xs border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                ptzMoving === 'right' ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white scale-95' : ''
              }`}
              title={connected ? "Putar Kanan" : "Kamera Offline"}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* CENTER: Auto Reset */}
            <button
              type="button"
              disabled={!connected}
              onClick={() => onPtzAction('center')}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-md flex items-center justify-center text-[10px] font-bold transition active:scale-90 border border-sky-400/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={connected ? "Reset Posisi" : "Kamera Offline"}
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Live Data Card */}
      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
        <div className="flex justify-between items-center border-b border-slate-200/80 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" /> Sensor Terhubung
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${
            isHardwareOnline
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-amber-700 bg-amber-50 border-amber-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isHardwareOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            {isHardwareOnline ? 'Live Hardware' : 'Menunggu Alat'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-slate-500 text-[10.5px] font-semibold block truncate" title={tempLabels?.t1 || 'T1 (Hot In)'}>
              {tempLabels?.t1 ? 'T1' : 'T1 (Hot In)'}:
            </span>
            <strong className="text-slate-900 font-extrabold font-mono text-sm block mt-0.5">
              {isHardwareOnline ? `${latestData.ti1.toFixed(1)}°C` : '-- °C'}
            </strong>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-slate-500 text-[10.5px] font-semibold block truncate" title={tempLabels?.t2 || 'T2 (Hot Out)'}>
              {tempLabels?.t2 ? 'T2' : 'T2 (Hot Out)'}:
            </span>
            <strong className="text-slate-900 font-extrabold font-mono text-sm block mt-0.5">
              {isHardwareOnline ? `${latestData.ti2.toFixed(1)}°C` : '-- °C'}
            </strong>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-slate-500 text-[10.5px] font-semibold block truncate" title={tempLabels?.t3 || 'T3 (Cold In)'}>
              {tempLabels?.t3 ? 'T3' : 'T3 (Cold In)'}:
            </span>
            <strong className="text-sky-700 font-extrabold font-mono text-sm block mt-0.5">
              {isHardwareOnline ? `${latestData.ti3.toFixed(1)}°C` : '-- °C'}
            </strong>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-slate-500 text-[10.5px] font-semibold block truncate" title={tempLabels?.t4 || 'T4 (Cold Out)'}>
              {tempLabels?.t4 ? 'T4' : 'T4 (Cold Out)'}:
            </span>
            <strong className="text-sky-700 font-extrabold font-mono text-sm block mt-0.5">
              {isHardwareOnline ? `${latestData.ti4.toFixed(1)}°C` : '-- °C'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PtzController;

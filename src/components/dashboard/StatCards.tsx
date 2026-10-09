'use client';

import React from 'react';
import { Activity, Flame, Droplets, Gauge } from 'lucide-react';
import { TelemetryPoint, TelemetryRow, TempLabels, DualHeaterState } from '@/types';

interface StatCardsProps {
  tempLabels: TempLabels;
  supabaseTelemetry: TelemetryRow | null;
  latestData: TelemetryPoint;
  dualHeaterState?: Partial<DualHeaterState>;
  isHardwareOnline?: boolean;
}

export const StatCards: React.FC<StatCardsProps> = ({
  tempLabels,
  supabaseTelemetry,
  latestData,
  isHardwareOnline = false,
}) => {
  const [typingDots, setTypingDots] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTypingDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  const hasHardwareData = isHardwareOnline && (
    (supabaseTelemetry !== null && (supabaseTelemetry.temp_1 > 0 || supabaseTelemetry.temp_2 > 0)) ||
    (latestData.ti1 > 0 || latestData.ti2 > 0)
  );

  const t1 = supabaseTelemetry ? supabaseTelemetry.temp_1 : latestData.ti1;
  const t2 = supabaseTelemetry ? supabaseTelemetry.temp_2 : latestData.ti2;
  const t3 = supabaseTelemetry ? supabaseTelemetry.temp_3 : latestData.ti3;
  const t4 = supabaseTelemetry ? supabaseTelemetry.temp_4 : latestData.ti4;

  // Disesuaikan: nilai sensor hardware flow_rate_2 adalah panas (FC1), flow_rate adalah dingin (FC2)
  const fc1 = supabaseTelemetry?.flow_rate_2 !== undefined ? supabaseTelemetry.flow_rate_2 : latestData.fc1;
  const fc2 = supabaseTelemetry?.flow_rate !== undefined ? supabaseTelemetry.flow_rate : latestData.fc2;

  const pi1 = supabaseTelemetry?.pressure !== undefined ? supabaseTelemetry.pressure : latestData.pi1;
  const pi2 = supabaseTelemetry?.pressure_outlet !== undefined ? supabaseTelemetry.pressure_outlet : latestData.pi2;
  const deltaP1 = supabaseTelemetry?.delta_pressure !== undefined ? supabaseTelemetry.delta_pressure : (pi1 - pi2);

  const pi3 = supabaseTelemetry?.pressure_inlet_2 !== undefined ? supabaseTelemetry.pressure_inlet_2 : latestData.pi3;
  const pi4 = supabaseTelemetry?.pressure_outlet_2 !== undefined ? supabaseTelemetry.pressure_outlet_2 : latestData.pi4;
  const deltaP2 = supabaseTelemetry?.delta_pressure_2 !== undefined ? supabaseTelemetry.delta_pressure_2 : (pi3 - pi4);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 1. Baris Suhu (4 Sensor) & Debit Aliran (2 Sensor: Panas & Dingin) */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-sky-600" /> Suhu & Debit Aliran Real-Time
          </h3>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border transition-all ${hasHardwareData ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'}`}>
            {hasHardwareData ? 'Online' : 'Mesin Offline'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-xs">
          {/* T1 */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-all">
            <span className="text-[10px] text-slate-500 font-semibold block truncate">{tempLabels.t1}</span>
            <strong className="text-slate-900 font-extrabold text-sm sm:text-base">
              {hasHardwareData ? `${t1.toFixed(1)} °C` : <span className="text-slate-400 font-bold">-- °C</span>}
            </strong>
          </div>

          {/* T2 */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-all">
            <span className="text-[10px] text-slate-500 font-semibold block truncate">{tempLabels.t2}</span>
            <strong className="text-slate-900 font-extrabold text-sm sm:text-base">
              {hasHardwareData ? `${t2.toFixed(1)} °C` : <span className="text-slate-400 font-bold">-- °C</span>}
            </strong>
          </div>

          {/* T3 */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-all">
            <span className="text-[10px] text-slate-500 font-semibold block truncate">{tempLabels.t3}</span>
            <strong className="text-sky-700 font-extrabold text-sm sm:text-base">
              {hasHardwareData ? `${t3.toFixed(1)} °C` : <span className="text-slate-400 font-bold">-- °C</span>}
            </strong>
          </div>

          {/* T4 */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-all">
            <span className="text-[10px] text-slate-500 font-semibold block truncate">{tempLabels.t4}</span>
            <strong className="text-sky-700 font-extrabold text-sm sm:text-base">
              {hasHardwareData ? `${t4.toFixed(1)} °C` : <span className="text-slate-400 font-bold">-- °C</span>}
            </strong>
          </div>

          {/* FC1 Debit Panas */}
          <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 shadow-2xs hover:border-amber-400 transition-all">
            <div className="flex items-center gap-1 text-[10px] text-amber-700 font-semibold truncate">
              <Flame className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Debit Panas (FC1)</span>
            </div>
            <strong className="text-amber-900 font-extrabold text-sm sm:text-base">
              {hasHardwareData ? `${fc1.toFixed(2)} L/m` : <span className="text-slate-400 font-bold">-- L/m</span>}
            </strong>
          </div>

          {/* FC2 Debit Dingin */}
          <div className="p-3 bg-sky-50/60 rounded-2xl border border-sky-200/80 shadow-2xs hover:border-sky-400 transition-all">
            <div className="flex items-center gap-1 text-[10px] text-sky-700 font-semibold truncate">
              <Droplets className="w-3 h-3 text-sky-500 shrink-0" />
              <span>Debit Dingin (FC2)</span>
            </div>
            <strong className="text-sky-900 font-extrabold text-sm sm:text-base">
              {hasHardwareData ? `${fc2.toFixed(2)} L/m` : <span className="text-slate-400 font-bold">-- L/m</span>}
            </strong>
          </div>
        </div>
      </div>

      {/* 2. Baris Tekanan Fluida (4 Sensor) & Delta Tekanan (ΔP1 = P1 - P2, ΔP2 = P3 - P4) */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-emerald-600" /> Tekanan Fluida & Delta Tekanan (ΔP)
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-xs">
          {/* PI1 Panas Masuk */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <span className="text-[10px] text-slate-500 font-semibold block truncate">PI1 (Inlet Panas)</span>
            <strong className="text-slate-900 font-extrabold text-sm sm:text-base">
              {hasHardwareData ? `${pi1.toFixed(2)} Bar` : <span className="text-slate-400 font-bold">-- Bar</span>}
            </strong>
          </div>

          {/* PI2 Panas Keluar */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <span className="text-[10px] text-slate-500 font-semibold block truncate">PI2 (Outlet Panas)</span>
            <strong className="text-slate-900 font-extrabold text-sm sm:text-base">
              {hasHardwareData ? `${pi2.toFixed(2)} Bar` : <span className="text-slate-400 font-bold">-- Bar</span>}
            </strong>
          </div>

          {/* ΔP1 (Panas: PI1 - PI2) */}
          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs hover:border-emerald-300 transition-all">
            <span className="text-[10px] text-emerald-800 font-bold block truncate">ΔP1 (P1 – P2 Panas)</span>
            <strong className="text-emerald-700 font-black text-sm sm:text-base">
              {hasHardwareData ? (deltaP1 >= 0 ? `+${deltaP1.toFixed(2)} Bar` : `${deltaP1.toFixed(2)} Bar`) : <span className="text-slate-400 font-bold">-- Bar</span>}
            </strong>
          </div>

          {/* PI3 Dingin Masuk */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <span className="text-[10px] text-slate-500 font-semibold block truncate">PI3 (Inlet Dingin)</span>
            <strong className="text-slate-900 font-extrabold text-sm sm:text-base">
              {hasHardwareData ? `${pi3.toFixed(2)} Bar` : <span className="text-slate-400 font-bold">-- Bar</span>}
            </strong>
          </div>

          {/* PI4 Dingin Keluar */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <span className="text-[10px] text-slate-500 font-semibold block truncate">PI4 (Outlet Dingin)</span>
            <strong className="text-slate-900 font-extrabold text-sm sm:text-base">
              {hasHardwareData ? `${pi4.toFixed(2)} Bar` : <span className="text-slate-400 font-bold">-- Bar</span>}
            </strong>
          </div>

          {/* ΔP2 (Dingin: PI3 - PI4) */}
          <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-200 shadow-2xs hover:border-teal-300 transition-all">
            <span className="text-[10px] text-teal-800 font-bold block truncate">ΔP2 (P3 – P4 Dingin)</span>
            <strong className="text-teal-700 font-black text-sm sm:text-base">
              {hasHardwareData ? (deltaP2 >= 0 ? `+${deltaP2.toFixed(2)} Bar` : `${deltaP2.toFixed(2)} Bar`) : <span className="text-slate-400 font-bold">-- Bar</span>}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCards;

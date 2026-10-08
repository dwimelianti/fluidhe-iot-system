'use client';

import React from 'react';
import { Thermometer, Gauge, Activity, Loader2, WifiOff } from 'lucide-react';
import { TelemetryPoint, TempLabels } from '@/types';

interface TelemetryCardsProps {
  latestData: TelemetryPoint;
  tempLabels: TempLabels;
  tc1Setpoint: number;
  ti1MaxThreshold: number;
  deltaPHot: number;
  deltaPCold: number;
  fc1Valve: number;
  fc2Valve: number;
  onCardClick?: () => void;
  isHardwareOnline?: boolean;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  latestData,
  tempLabels,
  tc1Setpoint,
  ti1MaxThreshold,
  deltaPHot,
  deltaPCold,
  fc1Valve,
  fc2Valve,
  onCardClick,
  isHardwareOnline = false
}) => {
  // Sinkronisasi dinamis inlet/outlet sesuai mode arah aliran aktif (Counter vs Co-Current)
  const isT1In = tempLabels.t1.toLowerCase().includes('in');
  const isT4In = tempLabels.t4.toLowerCase().includes('in');

  // Animasi efek mengetik dinamis untuk status "Menunggu jaringan..."
  const [typingDots, setTypingDots] = React.useState('');
  React.useEffect(() => {
    const dotsArray = ['', '.', '..', '...'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % dotsArray.length;
      setTypingDots(dotsArray[idx]);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  // Evaluasi apakah data sensor hardware sudah valid (bukan 0 dan terhubung)
  const hasHardwareData = isHardwareOnline && (
    (latestData.ti1 > 0 || latestData.ti2 > 0 || latestData.ti3 > 0 || latestData.ti4 > 0)
  );

  return (
    <div id="tour-temp-cards" className="relative space-y-3 sm:space-y-4">
      {/* Container 8 Kartu dengan Efek Blur Halus saat Menunggu Jaringan */}
      <div className="relative rounded-3xl overflow-hidden p-0.5">
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 transition-all duration-500 ${!hasHardwareData ? 'filter blur-[5px] opacity-40 pointer-events-none select-none' : ''}`}>
          {/* Card 1: T1 */}
          <div
            onClick={onCardClick}
            className="asklepios-card p-3 sm:p-4 relative overflow-hidden cursor-pointer hover:border-orange-300 hover:shadow-md transition active:scale-[0.98] select-none flex flex-col justify-between h-full min-h-[148px]"
            title="Klik untuk membuka Kontrol Pemanas & Suhu"
          >
            <div className="flex justify-between items-start gap-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-800 truncate">{tempLabels.t1}</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0">T1</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
                  T1 = Sensor Suhu ({isT1In ? 'Inlet Panas' : 'Outlet Panas'})
                </span>
              </div>
              <span className="p-1.5 bg-orange-50 text-orange-600 rounded-xl shrink-0">
                <Thermometer className="w-4 h-4" />
              </span>
            </div>

            <div className="my-2 flex items-baseline gap-1.5 min-h-[38px]">
              {!hasHardwareData ? (
                <>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 tracking-tight">--</span>
                  <span className="text-xs font-semibold text-slate-400">°C</span>
                </>
              ) : latestData.ti1 <= 0 ? (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <span className="text-sm font-extrabold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">Periksa Sensor</span>
                </div>
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {latestData.ti1.toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">°C</span>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100/90 text-[10.5px] sm:text-[11px] text-slate-500 flex justify-between items-center gap-1">
              <span className="truncate">Target: {tc1Setpoint}°C</span>
              {!hasHardwareData ? (
                <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] border border-rose-200 shrink-0">
                  Offline
                </span>
              ) : (
                <span className={`font-bold shrink-0 ${latestData.ti1 > ti1MaxThreshold ? 'text-red-600' : 'text-emerald-600'}`}>
                  {latestData.ti1 > ti1MaxThreshold ? 'Warning' : 'Optimal'}
                </span>
              )}
            </div>
          </div>

        {/* Card 2: T2 (Air Dingin: Selalu Cold Outlet) */}
        <div
          onClick={onCardClick}
          className="asklepios-card p-3 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none flex flex-col justify-between h-full min-h-[148px]"
          title="Klik untuk membuka Kontrol Pemanas & Suhu"
        >
          <div className="flex justify-between items-start gap-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800 truncate">{tempLabels.t2}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 shrink-0">T2</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
                T2 = Sensor Suhu (Outlet Dingin)
              </span>
            </div>
            <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-xl shrink-0">
              <Thermometer className="w-4 h-4" />
            </span>
          </div>

          <div className="my-2 flex items-baseline gap-1.5 min-h-[38px]">
            {!hasHardwareData ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 tracking-tight">--</span>
                <span className="text-xs font-semibold text-slate-400">°C</span>
              </>
            ) : latestData.ti2 <= 0 ? (
              <div className="flex items-center gap-1.5 text-amber-600">
                <span className="text-sm font-extrabold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">Periksa Sensor</span>
              </div>
            ) : (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {latestData.ti2.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-500">°C</span>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100/90 text-[10.5px] sm:text-[11px] text-slate-500 flex justify-between items-center gap-1">
            <span className="truncate">Kenaikan Suhu:</span>
            <span className="font-bold shrink-0 text-slate-700">
              {hasHardwareData ? `+${Math.max(0, latestData.ti2 - latestData.ti3).toFixed(1)}°C` : '--'}
            </span>
          </div>
        </div>

        {/* Card 3: T3 (Air Dingin: Selalu Cold Inlet) */}
        <div
          onClick={onCardClick}
          className="asklepios-card p-3 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none flex flex-col justify-between h-full min-h-[148px]"
          title="Klik untuk membuka Kontrol Pemanas & Suhu"
        >
          <div className="flex justify-between items-start gap-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800 truncate">{tempLabels.t3}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 shrink-0">T3</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
                T3 = Sensor Suhu (Inlet Dingin)
              </span>
            </div>
            <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-xl shrink-0">
              <Thermometer className="w-4 h-4" />
            </span>
          </div>

          <div className="my-2 flex items-baseline gap-1.5 min-h-[38px]">
            {!hasHardwareData ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 tracking-tight">--</span>
                <span className="text-xs font-semibold text-slate-400">°C</span>
              </>
            ) : latestData.ti3 <= 0 ? (
              <div className="flex items-center gap-1.5 text-amber-600">
                <span className="text-sm font-extrabold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">Periksa Sensor</span>
              </div>
            ) : (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {latestData.ti3.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-500">°C</span>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100/90 text-[10.5px] sm:text-[11px] text-slate-500 flex justify-between items-center gap-1">
            <span className="truncate">Air Dingin Lab:</span>
            {hasHardwareData ? (
              <span className="font-bold shrink-0 text-slate-700">Normal</span>
            ) : (
              <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] border border-rose-200 shrink-0">Offline</span>
            )}
          </div>
        </div>

        {/* Card 4: T4 (Air Panas: Counter = Hot Out, Co-Current = Hot In) */}
        <div
          onClick={onCardClick}
          className="asklepios-card p-3 sm:p-4 relative overflow-hidden cursor-pointer hover:border-rose-300 hover:shadow-md transition active:scale-[0.98] select-none flex flex-col justify-between h-full min-h-[148px]"
          title="Klik untuk membuka Kontrol Pemanas & Suhu"
        >
          <div className="flex justify-between items-start gap-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800 truncate">{tempLabels.t4}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">T4</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
                T4 = Sensor Suhu ({isT4In ? 'Inlet Panas' : 'Outlet Panas'})
              </span>
            </div>
            <span className="p-1.5 bg-orange-50 text-orange-600 rounded-xl shrink-0">
              <Thermometer className="w-4 h-4" />
            </span>
          </div>

          <div className="my-2 flex items-baseline gap-1.5 min-h-[38px]">
            {!hasHardwareData ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 tracking-tight">--</span>
                <span className="text-xs font-semibold text-slate-400">°C</span>
              </>
            ) : latestData.ti4 <= 0 ? (
              <div className="flex items-center gap-1.5 text-amber-600">
                <span className="text-sm font-extrabold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">Periksa Sensor</span>
              </div>
            ) : (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {latestData.ti4.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-500">°C</span>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100/90 text-[10.5px] sm:text-[11px] text-slate-500 flex justify-between items-center gap-1">
            <span className="truncate">Penurunan Suhu:</span>
            <span className="font-bold shrink-0 text-slate-700">
              {hasHardwareData ? `${Math.abs(latestData.ti1 - latestData.ti4).toFixed(1)}°C` : '--'}
            </span>
          </div>
        </div>

        {/* Card 5: P1 / P2 */}
        <div
          onClick={onCardClick}
          className="asklepios-card p-3 sm:p-4 relative overflow-hidden cursor-pointer hover:border-sky-300 hover:shadow-md transition active:scale-[0.98] select-none flex flex-col justify-between h-full min-h-[148px]"
          title="Klik untuk membuka Kontrol Tekanan"
        >
          <div className="flex justify-between items-start gap-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800 truncate">Tekanan Panas</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 shrink-0">P1 &amp; P2</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
                P = Jalur Panas (P1 &amp; P2)
              </span>
            </div>
            <span className="p-1.5 bg-sky-50 text-sky-600 rounded-xl shrink-0">
              <Gauge className="w-4 h-4" />
            </span>
          </div>

          <div className="my-2 flex items-baseline gap-1.5 min-h-[38px]">
            {!hasHardwareData ? (
              <>
                <span className="text-lg sm:text-2xl font-extrabold text-slate-400 tracking-tight whitespace-nowrap">-- / --</span>
                <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">atm-g</span>
              </>
            ) : (
              <>
                <span className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                  {latestData.pi1.toFixed(2)} / {latestData.pi2.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">atm-g</span>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100/90 text-[10.5px] sm:text-[11px] text-slate-500 flex justify-between items-center gap-1">
            <span className="truncate">ΔP Hot:</span>
            <span className="font-bold shrink-0 text-sky-700">{hasHardwareData ? `${deltaPHot} atm-g` : '--'}</span>
          </div>
        </div>

        {/* Card 6: P3 / P4 */}
        <div
          onClick={onCardClick}
          className="asklepios-card p-3 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none flex flex-col justify-between h-full min-h-[148px]"
          title="Klik untuk membuka Kontrol Tekanan"
        >
          <div className="flex justify-between items-start gap-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800 truncate">Tekanan Dingin</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 shrink-0">P3 &amp; P4</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
                P = Jalur Dingin (P3 &amp; P4)
              </span>
            </div>
            <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-xl shrink-0">
              <Gauge className="w-4 h-4" />
            </span>
          </div>

          <div className="my-2 flex items-baseline gap-1.5 min-h-[38px]">
            {!hasHardwareData ? (
              <>
                <span className="text-lg sm:text-2xl font-extrabold text-slate-400 tracking-tight whitespace-nowrap">-- / --</span>
                <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">atm-g</span>
              </>
            ) : (
              <>
                <span className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                  {latestData.pi3.toFixed(2)} / {latestData.pi4.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">atm-g</span>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100/90 text-[10.5px] sm:text-[11px] text-slate-500 flex justify-between items-center gap-1">
            <span className="truncate">ΔP Cold:</span>
            <span className="font-bold shrink-0 text-cyan-700">{hasHardwareData ? `${deltaPCold} atm-g` : '--'}</span>
          </div>
        </div>

        {/* Card 7: FC1 */}
        <div
          onClick={onCardClick}
          className="asklepios-card p-3 sm:p-4 relative overflow-hidden cursor-pointer hover:border-orange-300 hover:shadow-md transition active:scale-[0.98] select-none flex flex-col justify-between h-full min-h-[148px]"
          title="Klik untuk membuka Kontrol Aliran"
        >
          <div className="flex justify-between items-start gap-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800 truncate">Laju Alir Panas</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0">FC1</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
                FC1 = Debit Aliran Panas
              </span>
            </div>
            <span className="p-1.5 bg-orange-50 text-orange-600 rounded-xl shrink-0">
              <Activity className="w-4 h-4" />
            </span>
          </div>

          <div className="my-2 flex items-baseline gap-1.5 min-h-[38px]">
            {!hasHardwareData ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 tracking-tight">--</span>
                <span className="text-xs font-semibold text-slate-400">L/min</span>
              </>
            ) : (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {latestData.fc1.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-slate-500">L/min</span>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100/90 text-[10.5px] sm:text-[11px] text-slate-500 flex justify-between items-center gap-1">
            <span className="truncate">Katup FC1:</span>
            <span className="font-bold shrink-0 text-slate-700">{fc1Valve}%</span>
          </div>
        </div>

        {/* Card 8: FC2 */}
        <div
          onClick={onCardClick}
          className="asklepios-card p-3 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none flex flex-col justify-between h-full min-h-[148px]"
          title="Klik untuk membuka Kontrol Aliran"
        >
          <div className="flex justify-between items-start gap-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800 truncate">Laju Alir Dingin</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 shrink-0">FC2</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
                FC2 = Debit Aliran Dingin
              </span>
            </div>
            <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-xl shrink-0">
              <Activity className="w-4 h-4" />
            </span>
          </div>

          <div className="my-2 flex items-baseline gap-1.5 min-h-[38px]">
            {!hasHardwareData ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 tracking-tight">--</span>
                <span className="text-xs font-semibold text-slate-400">L/min</span>
              </>
            ) : (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {latestData.fc2.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-slate-500">L/min</span>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100/90 text-[10.5px] sm:text-[11px] text-slate-500 flex justify-between items-center gap-1">
            <span className="truncate">Katup FC2:</span>
            <span className="font-bold shrink-0 text-slate-700">{fc2Valve}%</span>
          </div>
        </div>
      </div>

      {/* 1 Tampilan Terpusat Glassmorphism saat Hardware Offline / Menunggu Jaringan */}
      {!hasHardwareData && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-slate-900/10 backdrop-blur-[6px] rounded-3xl animate-fade-in pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md border border-rose-200/90 shadow-2xl rounded-3xl px-6 py-6 sm:px-8 sm:py-7 flex flex-col items-center text-center max-w-md mx-auto transition-all animate-scale-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-100 to-amber-50 border border-rose-300/80 flex items-center justify-center mb-3.5 shadow-sm">
              <WifiOff className="w-7 h-7 text-rose-600" />
            </div>
            <h4 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              Mesin Belum Terhubung (Data Tidak Masuk)
            </h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs">
              Mesin Heat Exchanger laboratorium sedang tidak terhubung atau belum mengirimkan data. Nilai sensor disembunyikan demi menjaga kepastian pembacaan.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-300/80 text-rose-800 text-[11px] font-extrabold uppercase tracking-wider shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Status: Mesin Offline
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default TelemetryCards;

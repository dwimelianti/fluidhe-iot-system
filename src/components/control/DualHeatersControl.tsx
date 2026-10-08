'use client';

import React, { useState, useEffect } from 'react';
import {
  Power,
  Zap,
  Check,
  Flame,
  Target,
  Settings2,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { ControlMode } from '@/types';

export interface DualHeatersControlProps {
  controlMode: ControlMode;
  targetTemp?: number;
  heater1Status?: boolean;
  heater2Status?: boolean;
  emergencyStopped: boolean;
  isBtnUpActive?: boolean;
  isBtnDownActive?: boolean;
  // Thermostat Setup Props
  targetTempHot?: number;
  toleranceLevel?: number;
  upperLimit?: number;
  lowerLimit?: number;
  // Sensor Calibration Props
  flowCalibrationFactor?: number;
  tempOffset?: number;
  pressureOffset?: number;
  // Handlers
  onToggleHeater1?: (nextState: boolean) => void | Promise<any>;
  onToggleHeater2?: (nextState: boolean) => void | Promise<any>;
  onAdjustSetPoint?: (delta: number) => void | Promise<any>;
  onAdjustTolerance?: (delta: number) => void | Promise<any>;
  onSaveThermostatSetup?: (targetTempHot: number, toleranceLevel: number) => void | Promise<any>;
  onSaveCalibration?: (flowFactor: number, tempOffset: number, pressOffset: number) => void | Promise<any>;
  // Legacy fallback props
  targetUpper?: number;
  targetLower?: number;
  onStepUp?: () => void;
  onStepDown?: () => void;
  onSaveThermostatLimits?: (upper: number, lower: number) => void;
  // Status sinkronisasi ke ESP32
  isUpdatingControl?: boolean;
}

export const DualHeatersControl: React.FC<DualHeatersControlProps> = ({
  controlMode,
  targetTemp = 50,
  heater1Status = false,
  heater2Status = false,
  emergencyStopped,
  targetTempHot = 50.0,
  toleranceLevel = 1,
  upperLimit,
  lowerLimit,
  flowCalibrationFactor = 7.90,
  tempOffset = 0.0,
  pressureOffset = 0.0,
  onToggleHeater1,
  onToggleHeater2,
  onAdjustSetPoint,
  onAdjustTolerance,
  onSaveThermostatSetup,
  onSaveCalibration,
  // Legacy fallbacks
  targetUpper,
  targetLower,
  onSaveThermostatLimits,
  isUpdatingControl = false
}) => {
  const isAuto = controlMode === 'AUTO';
  const isH1On = heater1Status;
  const isH2On = heater2Status;

  // Local state for Set Point & Tolerance
  const [localSp, setLocalSp] = useState<number>(targetTempHot ?? targetTemp ?? 50.0);
  const [spInput, setSpInput] = useState<string>(String(targetTempHot ?? targetTemp ?? 50.0));
  const [localTol, setLocalTol] = useState<number>(toleranceLevel ?? 1);

  // Local state for Calibration Inputs
  const [flowCalInput, setFlowCalInput] = useState<string>(String(flowCalibrationFactor ?? 7.90));
  const [tempOffsetInput, setTempOffsetInput] = useState<string>(String(tempOffset ?? 0.0));
  const [pressOffsetInput, setPressOffsetInput] = useState<string>(String(pressureOffset ?? 0.0));
  const [calSaveSuccess, setCalSaveSuccess] = useState<boolean>(false);
  const [calError, setCalError] = useState<string | null>(null);

  // Sync state tracking for ESP32 transmission feedback
  const [isSyncingSp, setIsSyncingSp] = useState<boolean>(false);
  const [isSyncingTol, setIsSyncingTol] = useState<boolean>(false);
  const [tolSyncDir, setTolSyncDir] = useState<number | null>(null);
  const [isSyncingH1, setIsSyncingH1] = useState<boolean>(false);
  const [isSyncingH2, setIsSyncingH2] = useState<boolean>(false);
  const [isSyncingCal, setIsSyncingCal] = useState<boolean>(false);

  // Sync with incoming props
  useEffect(() => {
    if (targetTempHot !== undefined) {
      setLocalSp(targetTempHot);
      setSpInput(String(targetTempHot));
    }
  }, [targetTempHot]);

  useEffect(() => {
    if (toleranceLevel !== undefined) setLocalTol(toleranceLevel);
  }, [toleranceLevel]);

  useEffect(() => {
    if (flowCalibrationFactor !== undefined) setFlowCalInput(String(flowCalibrationFactor));
  }, [flowCalibrationFactor]);

  useEffect(() => {
    if (tempOffset !== undefined) setTempOffsetInput(String(tempOffset));
  }, [tempOffset]);

  useEffect(() => {
    if (pressureOffset !== undefined) setPressOffsetInput(String(pressureOffset));
  }, [pressureOffset]);

  // Dynamic limits calculation
  const calcUpper = parseFloat((localSp + localTol).toFixed(1));
  const calcLower = parseFloat((localSp - localTol).toFixed(1));

  // Handle direct Kontrol Point commit
  const handleCommitSp = async () => {
    if (emergencyStopped || isSyncingSp) return;
    const parsed = parseFloat(spInput);
    if (isNaN(parsed)) {
      setSpInput(String(localSp));
      return;
    }
    const clamped = Math.min(90, Math.max(20, parseFloat(parsed.toFixed(1))));
    setLocalSp(clamped);
    setSpInput(String(clamped));
    setIsSyncingSp(true);

    try {
      if (onSaveThermostatSetup) {
        await Promise.resolve(onSaveThermostatSetup(clamped, localTol));
      } else if (onSaveThermostatLimits) {
        await Promise.resolve(onSaveThermostatLimits(clamped + localTol, clamped - localTol));
      } else if (onAdjustSetPoint) {
        await Promise.resolve(onAdjustSetPoint(clamped - localSp));
      }
    } finally {
      setTimeout(() => setIsSyncingSp(false), 800);
    }
  };

  // Handle Kontrol Point adjust (+1 / -1)
  const handleSpStep = async (delta: number) => {
    if (emergencyStopped || isSyncingSp) return;
    const nextVal = Math.min(90, Math.max(20, parseFloat((localSp + delta).toFixed(1))));
    setLocalSp(nextVal);
    setSpInput(String(nextVal));
    setIsSyncingSp(true);

    try {
      if (onAdjustSetPoint) {
        await Promise.resolve(onAdjustSetPoint(delta));
      } else if (onSaveThermostatSetup) {
        await Promise.resolve(onSaveThermostatSetup(nextVal, localTol));
      } else if (onSaveThermostatLimits) {
        await Promise.resolve(onSaveThermostatLimits(nextVal + localTol, nextVal - localTol));
      }
    } finally {
      setTimeout(() => setIsSyncingSp(false), 800);
    }
  };

  // Handle Tolerance level adjust (P1 to P7)
  const handleTolStep = async (delta: number) => {
    if (emergencyStopped || isSyncingTol) return;
    const nextLevel = Math.min(7, Math.max(1, localTol + delta));
    setLocalTol(nextLevel);
    setIsSyncingTol(true);
    setTolSyncDir(delta);

    try {
      if (onAdjustTolerance) {
        await Promise.resolve(onAdjustTolerance(delta));
      } else if (onSaveThermostatSetup) {
        await Promise.resolve(onSaveThermostatSetup(localSp, nextLevel));
      } else if (onSaveThermostatLimits) {
        await Promise.resolve(onSaveThermostatLimits(localSp + nextLevel, localSp - nextLevel));
      }
    } finally {
      setTimeout(() => {
        setIsSyncingTol(false);
        setTolSyncDir(null);
      }, 800);
    }
  };

  // Handle Save Calibration
  const handleSaveCalibration = async () => {
    const f = parseFloat(flowCalInput);
    const t = parseFloat(tempOffsetInput);
    const p = parseFloat(pressOffsetInput);

    if (isNaN(f) || isNaN(t) || isNaN(p)) {
      setCalError('Isi semua nilai kalibrasi dengan angka valid!');
      return;
    }

    setCalError(null);
    if (onSaveCalibration) {
      setIsSyncingCal(true);
      try {
        await Promise.resolve(onSaveCalibration(f, t, p));
        setCalSaveSuccess(true);
        setTimeout(() => setCalSaveSuccess(false), 2500);
      } finally {
        setTimeout(() => setIsSyncingCal(false), 800);
      }
    }
  };

  const isAnyThermostatSyncing = isUpdatingControl || isSyncingSp || isSyncingTol;

  return (
    <div
      id="tour-dual-heaters"
      className="p-3.5 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs space-y-4 col-span-1 lg:col-span-2"
    >
      {/* Header Utama Section Heater & Thermostat */}
      <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700 border border-sky-200">
            <Zap className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Sistem Kontrol Dual Heater &amp; Thermostat Setup
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">
              Manajemen pemanas ON/OFF, regulasi histeresis (P1–P7), dan kalibrasi sensor dinamis
            </p>
          </div>
        </div>

        {isAuto && (
          <span className="text-[9px] sm:text-[10px] text-sky-800 font-extrabold bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-200 shadow-2xs">
            Mode AUTO Aktif
          </span>
        )}
      </div>

      {/* Grid 2 Kolom: Heater 1 di Kiri, Heater 2 di Kanan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* KOLOM 1: HEATER 1 (UTAMA - 1000W) */}
        <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 gap-2 min-h-[26px]">
              <span className="flex items-center gap-1.5 truncate">
                <Flame className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="font-extrabold text-slate-800">Heater 1 (Pemanas Utama)</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-md font-black text-[10.5px] border ${isH1On
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                >
                  {isH1On ? 'H1: ON' : 'H1: OFF'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-black text-[10.5px] ${isH1On ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                >
                  {isH1On ? '1000 Watt' : '0 Watt'}
                </span>
              </div>
            </div>

            {/* Tombol ON / OFF Heater 1 (Hanya ON/OFF) */}
            <button
              type="button"
              onClick={async () => {
                if (onToggleHeater1 && !isAuto) {
                  setIsSyncingH1(true);
                  try {
                    await Promise.resolve(onToggleHeater1(!isH1On));
                  } finally {
                    setTimeout(() => setIsSyncingH1(false), 800);
                  }
                }
              }}
              disabled={emergencyStopped || isAuto || isSyncingH1}
              className={`w-full py-2.5 min-h-[42px] rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 ${isAuto
                  ? 'bg-slate-800 text-white opacity-90 cursor-not-allowed'
                  : isH1On
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
            >
              {isSyncingH1 ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              <span>
                {isSyncingH1
                  ? 'Mengirim ke ESP...'
                  : isAuto
                    ? 'Dikelola Otomatis'
                    : isH1On
                      ? 'Matikan Heater 1'
                      : 'Nyalakan Heater 1'}
              </span>
            </button>
          </div>

          {/* Sub-Card Keterangan Saklar Heater 1 */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5 text-sky-600" /> Mode Saklar Pemanas
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${isH1On
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
              >
                {isH1On ? 'Saklar ON' : 'Saklar OFF'}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-relaxed">
              Heater 1 beroperasi dengan saklar <strong>ON / OFF</strong> daya utama (1000 Watt) tanpa modulasi level bertingkat.
            </p>
          </div>
        </div>

        {/* KOLOM 2: HEATER 2 (BOOSTER - 500W) */}
        <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 gap-2 min-h-[26px]">
              <span className="flex items-center gap-1.5 truncate">
                <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-extrabold text-slate-800">Heater 2 (Pemanas Booster)</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-md font-black text-[10.5px] border ${isH2On
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                >
                  {isH2On ? 'H2: ON' : 'H2: OFF'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-black text-[10.5px] ${isH2On ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                >
                  {isH2On ? '500 Watt' : '0 Watt'}
                </span>
              </div>
            </div>

            {/* Tombol ON / OFF Heater 2 (Hanya ON/OFF) */}
            <button
              type="button"
              onClick={async () => {
                if (onToggleHeater2) {
                  setIsSyncingH2(true);
                  try {
                    await Promise.resolve(onToggleHeater2(!isH2On));
                  } finally {
                    setTimeout(() => setIsSyncingH2(false), 800);
                  }
                }
              }}
              disabled={emergencyStopped || isAuto || isSyncingH2}
              className={`w-full py-2.5 min-h-[42px] rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 ${isAuto
                  ? 'bg-slate-800 text-white opacity-90 cursor-not-allowed'
                  : isH2On
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
            >
              {isSyncingH2 ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              <span>
                {isSyncingH2
                  ? 'Mengirim ke ESP...'
                  : isAuto
                    ? 'Dikelola Suhu'
                    : isH2On
                      ? 'Matikan Heater 2'
                      : 'Nyalakan Heater 2'}
              </span>
            </button>
          </div>

          {/* Sub-Card Keterangan Saklar Heater 2 */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-600" /> Mode Booster Tambahan
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${isH2On
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
              >
                {isH2On ? 'Booster ON' : 'Booster OFF'}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-relaxed">
              Heater 2 beroperasi otomatis mendampingi Heater 1 saat suhu fluida berada di bawah batas histeresis.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION BARU 1: THERMOSTAT SETUP (KONTROL POINT & LEVEL P1-P7) */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-sky-50 text-sky-600 border border-sky-200">
              <Target className="w-4 h-4" />
            </span>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Thermostat Setup (Kontrol Point &amp; Level P1–P7)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {isAnyThermostatSyncing ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-extrabold text-[10px] animate-pulse shadow-2xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Mengirim ke Mesin...</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Tersinkron ke Mesin</span>
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-400 hidden md:inline">
              Regulasi Suhu Presisi
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Row 1: KONTROL POINT UTAMA (INPUT NILAI LANGSUNG) */}
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 gap-3">
            <div className="shrink-0">
              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                KONTROL POINT UTAMA
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Rentang: 20 – 70 °C
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="20"
                  max="90"
                  step="0.5"
                  value={spInput}
                  disabled={emergencyStopped || isSyncingSp}
                  onChange={(e) => setSpInput(e.target.value)}
                  onBlur={handleCommitSp}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                      handleCommitSp();
                    }
                  }}
                  className="w-24 bg-white border border-sky-300 text-sky-950 font-black text-base px-2.5 py-1.5 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-2xs disabled:bg-slate-100"
                  placeholder="50.0"
                />
                <span className="ml-1.5 text-xs font-extrabold text-slate-600">°C</span>
              </div>
              <button
                type="button"
                onClick={handleCommitSp}
                disabled={emergencyStopped || isSyncingSp}
                className="min-w-[64px] px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-lg font-bold text-xs shadow-xs active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                title="Terapkan Nilai Kontrol Point"
              >
                {isSyncingSp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Kirim</span>
                  </>
                ) : (
                  <span>Set</span>
                )}
              </button>
            </div>
          </div>

          {/* Row 2: LEVEL TOLERANSI P1 - P7 */}
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                LEVEL TOLERANSI
              </span>
              <span className="text-lg font-black text-sky-600">
                P{localTol} (±{localTol}.0 °C)
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleTolStep(-1)}
                disabled={emergencyStopped || localTol <= 1 || isSyncingTol}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs active:scale-95 transition cursor-pointer flex items-center gap-1"
                title="Turunkan level toleransi (min P1)"
              >
                {isSyncingTol && tolSyncDir === -1 && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                <span>DOWN (-)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTolStep(1)}
                disabled={emergencyStopped || localTol >= 7 || isSyncingTol}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs active:scale-95 transition cursor-pointer flex items-center gap-1"
                title="Naikkan level toleransi (max P7)"
              >
                {isSyncingTol && tolSyncDir === 1 && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                <span>UP (+)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Batas Upper & Lower Terkalkulasi */}
        <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-2">
          <span className="flex items-center gap-1.5">
            🔥 Upper Limit: <strong className="text-rose-600 font-bold">{calcUpper} °C</strong>
            <span className="text-[9.5px] text-slate-400 font-normal">(Heater 2 OFF)</span>
          </span>
          <span className="flex items-center gap-1.5">
            ❄️ Lower Limit: <strong className="text-sky-600 font-bold">{calcLower} °C</strong>
            <span className="text-[9.5px] text-slate-400 font-normal">(Heater 2 ON)</span>
          </span>
        </div>
      </div>

      {/* SECTION BARU 2: PANEL KALIBRASI SENSOR */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-cyan-50 text-cyan-600 border border-cyan-200">
              <Settings2 className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                Panel Kalibrasi Sensor
              </h4>
              <p className="text-[10px] text-slate-500">
                Atur faktor kalibrasi dan offset sensor secara dinamis.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Real-Time Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="flex flex-col bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <label className="text-[10px] text-slate-600 font-bold text-center mb-1">
              Flow Factor
            </label>
            <input
              type="number"
              step="0.01"
              value={flowCalInput}
              onChange={(e) => setFlowCalInput(e.target.value)}
              disabled={emergencyStopped}
              className="bg-white border border-slate-300 text-center font-black text-slate-800 rounded-lg py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <span className="text-[8.5px] text-slate-400 text-center mt-1">Faktor pulsa sensor flow</span>
          </div>

          <div className="flex flex-col bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <label className="text-[10px] text-slate-600 font-bold text-center mb-1">
              Temp Offset
            </label>
            <input
              type="number"
              step="0.1"
              value={tempOffsetInput}
              onChange={(e) => setTempOffsetInput(e.target.value)}
              disabled={emergencyStopped}
              className="bg-white border border-slate-300 text-center font-black text-slate-800 rounded-lg py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <span className="text-[8.5px] text-slate-400 text-center mt-1">Koreksi suhu (°C)</span>
          </div>

          <div className="flex flex-col bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <label className="text-[10px] text-slate-600 font-bold text-center mb-1">
              Press Offset
            </label>
            <input
              type="number"
              step="0.01"
              value={pressOffsetInput}
              onChange={(e) => setPressOffsetInput(e.target.value)}
              disabled={emergencyStopped}
              className="bg-white border border-slate-300 text-center font-black text-slate-800 rounded-lg py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <span className="text-[8.5px] text-slate-400 text-center mt-1">Koreksi tekanan (bar)</span>
          </div>
        </div>

        {calError && (
          <p className="text-[10px] font-bold text-rose-600 text-center">{calError}</p>
        )}

        <button
          type="button"
          onClick={handleSaveCalibration}
          disabled={emergencyStopped || isSyncingCal}
          className={`w-full py-2.5 rounded-xl font-black text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 shadow-xs ${calSaveSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
        >
          {isSyncingCal ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" /> MENYINKRONKAN KE MESIN...
            </>
          ) : calSaveSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" /> KALIBRASI BERHASIL DISIMPAN KE MESIN &amp; DATABASE!
            </>
          ) : (
            'SIMPAN KALIBRASI SENSOR'
          )}
        </button>
      </div>
    </div>
  );
};

export default DualHeatersControl;

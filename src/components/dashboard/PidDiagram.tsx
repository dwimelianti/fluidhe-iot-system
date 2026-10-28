'use client';

import React, { useState } from 'react';
import { TelemetryPoint, FlowMode } from '@/types';
import { calculateLMTD } from '@/lib/calculations';
import {
  Layers,
  Flame,
  Droplets,
  Thermometer,
  Activity,
  CheckCircle2,
  Info,
  ChevronDown
} from 'lucide-react';

interface SolenoidValveItem {
  name: string;
  type: 'NC' | 'NO';
  state: string;
  active: boolean;
  badgeClass: string;
}

interface SolenoidValvesState {
  sv1?: SolenoidValveItem;
  sv2?: SolenoidValveItem;
  sv3?: SolenoidValveItem;
  sv4?: SolenoidValveItem;
}

interface DualHeaterDisplayState {
  h1?: boolean;
  h2?: boolean;
  heater1Active?: boolean;
  heater2Active?: boolean;
  powerWatt?: number;
  stage?: string;
}

interface PidDiagramProps {
  diagramMode: FlowMode;
  titleExtra?: string;
  latestData: TelemetryPoint;
  heaterMasterPower: boolean;
  emergencyStopped: boolean;
  fc1Valve: number;
  fc2Valve?: number;
  uapStatus?: boolean;
  airDinginStatus?: boolean;
  pompaStatus?: boolean;
  dualHeaterState: DualHeaterDisplayState;
  solenoidValves?: SolenoidValvesState;
  deltaPHot: number;
  onHoverSensor?: (sensorId: string | null) => void;
  isHardwareOnline?: boolean;
  isAdmin?: boolean;
}

export const PidDiagram: React.FC<PidDiagramProps> = ({
  diagramMode,
  titleExtra = '',
  latestData,
  heaterMasterPower,
  emergencyStopped,
  fc1Valve,
  fc2Valve = 60,
  uapStatus = false,
  airDinginStatus = true,
  pompaStatus = false,
  dualHeaterState,
  deltaPHot,
  onHoverSensor,
  isHardwareOnline = false,
  isAdmin = false
}) => {
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  const isCounter = diagramMode === 'Counter-Current';

  // 4 Thermostats (Suhu T1 - T4)
  // Fluida Panas: T1 = Hot In, T2 = Hot Out
  const thi = Number(latestData.ti1 || 0); // Hot In
  const tho = Number(latestData.ti2 || 0); // Hot Out

  // Fluida Dingin: T3 = Cold In, T4 = Cold Out
  const tci = Number(latestData.ti3 || 0); // Cold In
  const tco = Number(latestData.ti4 || 0); // Cold Out

  // 4 Pressure Sensors (Tekanan P1 - P4)
  const pi1Val = Number(latestData.pi1 || 0).toFixed(2);
  const pi2Val = Number(latestData.pi2 || 0).toFixed(2);
  const pi3Val = Number(latestData.pi3 || 0).toFixed(2);
  const pi4Val = Number(latestData.pi4 || 0).toFixed(2);

  // Flow Meters (FC1 & FC2)
  const flow1Val = Number(latestData.fc1 || 0).toFixed(1);
  const flow2Val = Number(latestData.fc2 || 0).toFixed(1);

  // Formatted String Display (Mencegah tampilan nilai fiktif/basi saat ESP32 Offline)
  const thiStr = isHardwareOnline ? `${thi}°C` : '--';
  const thoStr = isHardwareOnline ? `${tho}°C` : '--';
  const tciStr = isHardwareOnline ? `${tci}°C` : '--';
  const tcoStr = isHardwareOnline ? `${tco}°C` : '--';
  const pi1Str = isHardwareOnline ? `${pi1Val} atm` : '--';
  const pi2Str = isHardwareOnline ? `${pi2Val} atm` : '--';
  const pi3Str = isHardwareOnline ? `${pi3Val} atm` : '--';
  const pi4Str = isHardwareOnline ? `${pi4Val} atm` : '--';
  const flow1Str = isHardwareOnline ? `${flow1Val} L/m` : '--';
  const flow2Str = isHardwareOnline ? `${flow2Val} L/m` : '--';
  const deltaPHotStr = isHardwareOnline ? `${deltaPHot} atm` : '--';

  const lmtdVal = calculateLMTD(thi, tho, tci, tco, isCounter);

  const h1Active = dualHeaterState.h1 ?? dualHeaterState.heater1Active ?? false;
  const h2Active = dualHeaterState.h2 ?? dualHeaterState.heater2Active ?? false;

  const handleHover = (id: string | null) => {
    setHoveredComponent(id);
    onHoverSensor?.(id);
  };

  const isHotFlowActive = heaterMasterPower && !emergencyStopped && fc1Valve > 0;
  const isColdFlowActive = !emergencyStopped && (airDinginStatus ?? true);

  return (
    <div className="bg-gradient-to-b from-slate-50/95 to-slate-100/95 rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 relative overflow-hidden shadow-sm">
      {/* ─── SCADA HEADER BAR ─── */}
      <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200 shadow-xs">
            <Layers className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              P&ID Diagram — Shell & Tube Heat Exchanger
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
              Pemantauan Aliran Real-time & Visualisasi Instrumentasi Sistem
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Active Flow Mode Pill */}
          <span
            className={`px-3 py-1 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wide border shadow-2xs transition-all ${isCounter
                ? 'bg-sky-500 text-white border-sky-400/40 shadow-sky-500/20'
                : 'bg-emerald-600 text-white border-emerald-400/40 shadow-emerald-500/20'
              }`}
          >
            {diagramMode} {titleExtra}
          </span>
        </div>
      </div>

      {/* ─── INTERACTIVE DIGITAL TWIN P&ID SVG SCHEMATIC (BERSIH & SESUAI SKETSA) ─── */}
      <div className="order-1 w-full overflow-x-auto py-2 bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-4 shadow-inner">
        <svg viewBox="0 0 1120 520" className="w-full h-auto min-w-[920px] font-sans select-none">
          <defs>
            {/* Metallic Gradients */}
            <linearGradient id="metalShellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <linearGradient id="tankGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>

            <linearGradient id="flangeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="50%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <linearGradient id="valveYellowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>

            {/* Fluid Flow Gradients */}
            <linearGradient id="hotFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>

            {/* Shadow Filter */}
            <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.08" />
            </filter>

            {/* Dotted Flow Animation */}
            <style>
              {`
                @keyframes flowDotsCold {
                  from {
                    stroke-dashoffset: 0;
                  }
                  to {
                    stroke-dashoffset: -100;
                  }
                }
                .animate-flow-dots-cold {
                  animation: flowDotsCold 2.5s linear infinite;
                }
              `}
            </style>
          </defs>

          {/* ═══════════════════════════════════════════════════════════════════════════
              1. LAB BENCH FRAME (Ramping & Bersih)
          ═══════════════════════════════════════════════════════════════════════════ */}
          <rect x="25" y="475" width="1070" height="8" rx="2" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
          <rect x="60" y="483" width="12" height="32" fill="#64748B" />
          <rect x="340" y="483" width="12" height="32" fill="#64748B" />
          <rect x="740" y="483" width="12" height="32" fill="#64748B" />
          <rect x="1050" y="483" width="12" height="32" fill="#64748B" />

          {/* ═══════════════════════════════════════════════════════════════════════════
              2. HOT WATER RECIRCULATION RETURN PIPE (Counter-Current: Biru Masuk Atas Tank)
          ═══════════════════════════════════════════════════════════════════════════ */}
          <path
            d="M 792,310 L 940,310 L 940,460 L 44,460 L 44,35 L 105,35 L 105,65"
            fill="none"
            stroke="#0284C7"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="butt"
          />
          {/* Panah Masuk Biru di Atas Tangki */}
          <polygon points="105,66 101,58 109,58" fill="#0284C7" />

          {/* ═══════════════════════════════════════════════════════════════════════════
              3. HOT WATER TANK (Sesuai Permintaan: Bahasa Inggris, Tanpa Bahasa Indo)
          ═══════════════════════════════════════════════════════════════════════════ */}
          <g
            className="cursor-pointer transition hover:opacity-90"
            filter="url(#softShadow)"
            onMouseEnter={() => handleHover('HOT_WATER_TANK')}
            onMouseLeave={() => handleHover(null)}
          >
            <rect x="55" y="65" width="85" height="135" rx="6" fill="url(#tankGrad)" stroke="#94A3B8" strokeWidth="2" />
            {/* Water Level */}
            <rect x="58" y="100" width="79" height="97" rx="3" fill="#FEF3C7" opacity="0.6" />
            <line x1="58" y1="100" x2="137" y2="100" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 2" />

            <text x="97" y="125" textAnchor="middle" className="text-[9.5px] font-black fill-slate-800 tracking-wider">
              HOT WATER
            </text>
            <text x="97" y="138" textAnchor="middle" className="text-[9.5px] font-black fill-amber-700 tracking-wider">
              TANK
            </text>

            <rect x="70" y="156" width="55" height="16" rx="3" fill="#FFFFFF" stroke="#FDE68A" strokeWidth="1" />
            <text x="97" y="167" textAnchor="middle" className="text-[8px] font-black fill-amber-900">
              {isHardwareOnline && thi ? `${(thi * 0.95).toFixed(1)}°C` : 'Standby'}
            </text>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════════════
              4. POMPA -> VALVE VL -> FLOWMETER (Jalur Bersih ke Heater)
          ═══════════════════════════════════════════════════════════════════════════ */}
          {/* Pipa dari Tank ke Pompa */}
          <path
            d="M 140,175 L 160,175"
            fill="none"
            stroke="#EF4444"
            strokeWidth="4"
          />

          {/* 4a. Pompa (Simbol Pompa Sentrifugal Bersih) */}
          <g
            className="cursor-pointer transition hover:scale-105"
            filter="url(#softShadow)"
            onMouseEnter={() => handleHover('PUMP_HOT')}
            onMouseLeave={() => handleHover(null)}
          >
            <circle cx="176" cy="175" r="16" fill={pompaStatus ? '#ECFDF5' : '#FFFFFF'} stroke={pompaStatus ? '#10B981' : '#EA580C'} strokeWidth={pompaStatus ? '2.5' : '2'} />
            <path
              d="M 176,162 L 176,188 M 163,175 L 189,175 M 167,166 L 185,184 M 167,184 L 185,166"
              stroke={pompaStatus ? '#059669' : '#EA580C'}
              strokeWidth="1.5"
              className={pompaStatus ? 'animate-spin' : ''}
              style={{ transformOrigin: '176px 175px', animationDuration: '2.5s' }}
            />
            <text x="176" y="202" textAnchor="middle" className={`text-[7.5px] font-black ${pompaStatus ? 'fill-emerald-700 font-bold' : 'fill-slate-700'}`}>
              Pump {pompaStatus ? '(ON)' : ''}
            </text>
          </g>

          {/* Pipa dari Pompa ke VL */}
          <line
            x1="192"
            y1="175"
            x2="212"
            y2="175"
            stroke="#EF4444"
            strokeWidth="4"
          />

          {/* 4b. Valve VL — Butterfly/Gate valve bowtie symbol */}
          <g
            className="cursor-pointer transition hover:scale-105"
            filter="url(#softShadow)"
            onMouseEnter={() => handleHover('VALVE_VL_FEED')}
            onMouseLeave={() => handleHover(null)}
          >
            {/* Bowtie gate valve: two triangles meeting at center */}
            <circle cx="224" cy="175" r="11" fill="#FEFCE8" stroke="#B45309" strokeWidth="1.5" />
            <polygon points="215,168 224,175 215,182" fill="#EAB308" stroke="#B45309" strokeWidth="1" />
            <polygon points="233,168 224,175 233,182" fill="#EAB308" stroke="#B45309" strokeWidth="1" />
            <circle cx="224" cy="175" r="2" fill="#92400E" />
            {/* Actuator stem up */}
            <line x1="224" y1="164" x2="224" y2="159" stroke="#B45309" strokeWidth="2" />
            <rect x="220" y="155" width="8" height="4" rx="1" fill="#B45309" />
            <text x="224" y="192" textAnchor="middle" className="text-[7.5px] font-black fill-amber-900">VL</text>
          </g>

          {/* Pipa dari VL ke Flowmeter */}
          <line
            x1="236"
            y1="175"
            x2="242"
            y2="175"
            stroke="#EF4444"
            strokeWidth="4"
          />

          {/* 4c. Flowmeter — 2D Pill shape */}
          <g
            className="cursor-pointer transition hover:scale-105"
            filter="url(#softShadow)"
            onMouseEnter={() => handleHover('FLOWMETER_1')}
            onMouseLeave={() => handleHover(null)}
          >
            <rect x="242" y="159" width="36" height="32" rx="6" fill="#F97316" stroke="#C2410C" strokeWidth="1.5" />
            <rect x="246" y="164" width="28" height="15" rx="3" fill="#FFFFFF" />
            <text x="260" y="174" textAnchor="middle" className="text-[7.5px] font-black fill-slate-800">
              {flow1Str}
            </text>
            <text x="260" y="187" textAnchor="middle" className="text-[6px] font-bold fill-white">
              flow control
            </text>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════════════
              5. HEATER 1 & HEATER 2 (In Series Sesuai Sketsa Pengguna)
                 - Flowmeter masuk ke IN Heater 1
                 - OUT Heater 1 masuk ke IN Heater 2
                 - OUT Heater 2 turun langsung ke jalur air biru (Counter)
          ═══════════════════════════════════════════════════════════════════════════ */}
          {/* Pipa Suplai Merah dari Flowmeter masuk ke IN Heater 1 (Kanan H1) */}
          <path
            d="M 278,175 L 435,175 L 435,130"
            fill="none"
            stroke="#EF4444"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Panah Masuk ke IN Heater 1 */}
          <polygon points="435,132 431,140 439,140" fill="#EF4444" />

          {/* 5a. HEATER 1 (2D Square / Rectangular style) */}
          <g
            className="cursor-pointer transition hover:scale-[1.01]"
            filter="url(#softShadow)"
            onMouseEnter={() => handleHover('HEATER_1')}
            onMouseLeave={() => handleHover(null)}
          >
            <rect
              x="380"
              y="60"
              width="65"
              height="70"
              rx="4"
              fill="#FFFFFF"
              stroke={h1Active ? '#EF4444' : '#64748B'}
              strokeWidth="2"
            />
            <text x="412.5" y="80" textAnchor="middle" className="text-[9.5px] font-black fill-slate-900">
              Heater 1
            </text>

            {/* Heating coil element */}
            <path
              d="M 395,95 Q 401,87 407,95 T 419,95 Q 425,87 430,95"
              fill="none"
              stroke={h1Active ? '#EF4444' : '#94A3B8'}
              strokeWidth="2"
            />

            <text x="412.5" y="115" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-600">
              {h1Active ? '(ON)' : '(OFF)'}
            </text>

            {/* Port OUT & IN */}
            <text x="395" y="125" textAnchor="middle" className="text-[8px] font-black fill-rose-700">out</text>
            <text x="435" y="125" textAnchor="middle" className="text-[8px] font-black fill-slate-700">IN</text>
          </g>

          {/* Pipa dari OUT Heater 1 (kiri H1) menuju IN Heater 2 (kanan H2) */}
          <path
            d="M 395,130 L 395,155 L 565,155 L 565,130"
            fill="none"
            stroke="#EF4444"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Panah Arah Aliran ke Kanan & Masuk ke IN H2 */}
          <polygon points="485,155 477,151 477,159" fill="#EF4444" />
          <polygon points="565,132 561,140 569,140" fill="#EF4444" />

          {/* 5b. HEATER 2 (2D Square / Rectangular style) */}
          <g
            className="cursor-pointer transition hover:scale-[1.01]"
            filter="url(#softShadow)"
            onMouseEnter={() => handleHover('HEATER_2')}
            onMouseLeave={() => handleHover(null)}
          >
            <rect
              x="510"
              y="60"
              width="65"
              height="70"
              rx="4"
              fill="#FFFFFF"
              stroke={h2Active ? '#EF4444' : '#64748B'}
              strokeWidth="2"
            />
            <text x="542.5" y="80" textAnchor="middle" className="text-[9.5px] font-black fill-slate-900">
              Heater 2
            </text>

            {/* Heating coil element */}
            <path
              d="M 525,95 Q 531,87 537,95 T 549,95 Q 555,87 560,95"
              fill="none"
              stroke={h2Active ? '#EF4444' : '#94A3B8'}
              strokeWidth="2"
            />

            <text x="542.5" y="115" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-600">
              {h2Active ? '(ON)' : '(OFF)'}
            </text>

            {/* Port OUT & IN */}
            <text x="525" y="125" textAnchor="middle" className="text-[8px] font-black fill-rose-700">out</text>
            <text x="565" y="125" textAnchor="middle" className="text-[8px] font-black fill-slate-700">IN</text>
          </g>

          {/* Pipa dari OUT Heater 2 Turun Lurus ke Jalur Air Biru (Counter) */}
          <line
            x1="525"
            y1="130"
            x2="525"
            y2="140"
            stroke="#0284C7"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Panah Turun Masuk ke Jalur Biru */}
          <polygon points="525,138 521,131 529,131" fill="#0284C7" />

          {/* ═══════════════════════════════════════════════════════════════════════════
              6. DUAL FLOW MODE: COUNTER (BIRU) & CO-CURRENT (HIJAU)
          ═══════════════════════════════════════════════════════════════════════════ */}
          {/* Jalur A: Counter (Pipa Biru di Atas Flowmeter & Pompa di y=140, Turun di Koridor x=150 ke VL 1) */}
          <path
            d="M 525,140 L 150,140 L 150,215 L 132,215 L 132,310"
            fill="none"
            stroke="#0284C7"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Panah Arah Aliran Counter ke Kiri */}
          <polygon points="340,140 348,136 348,144" fill="#0284C7" />

          {/* Jalur B: Co-Current (Pipa Hijau ke Kanan Masuk ke Katup VL Kanan) */}
          <path
            d="M 525,140 L 860,140 L 860,299"
            fill="none"
            stroke="#10B981"
            strokeWidth="4"
          />

          {/* ═══════════════════════════════════════════════════════════════════════════
              7. SHELL & TUBE HEAT EXCHANGER
                 - Hanya 2 sekat/baffle (sesuai poin 3!)
                 - Alur kurva ungu: KE ATAS DULU melompati sekat kanan,
                   turun melintasi bawah sekat kiri, lalu ke Keluaran Air Dingin!
          ═══════════════════════════════════════════════════════════════════════════ */}
          {/* Support Legs Meja */}
          <rect x="380" y="380" width="28" height="95" fill="#334155" />
          <rect x="680" y="380" width="30" height="95" fill="#334155" />
          <rect x="360" y="465" width="68" height="10" fill="#1E293B" />
          <rect x="660" y="465" width="70" height="10" fill="#1E293B" />

          {/* Cangkang Silinder Stainless Steel (x: 280 to 740, y: 240 to 380) */}
          <rect x="280" y="240" width="460" height="140" rx="10" fill="url(#metalShellGrad)" stroke="#64748B" strokeWidth="2.5" filter="url(#softShadow)" />

          {/* 2 Garis Sekat Baffle Saja (Sesuai Gambar Sketsa!) */}
          {/* Baffle 1 (Kanan): Menempel di bawah, menjulang ke atas dengan celah di atas */}
          <g stroke="#64748B" strokeWidth="3">
            <line x1="610" y1="265" x2="610" y2="378" />
            <line x1="600" y1="265" x2="620" y2="265" strokeWidth="2.5" />
          </g>

          {/* Baffle 2 (Kiri): Menempel di atas, menjulang ke bawah dengan celah di bawah */}
          <g stroke="#64748B" strokeWidth="3">
            <line x1="440" y1="242" x2="440" y2="355" />
            <line x1="430" y1="355" x2="450" y2="355" strokeWidth="2.5" />
          </g>

          {/* Tabung Fluida Panas (Horizontal Tubes di dalam cangkang — Warna Besi / Hitam Soft) */}
          <g opacity="0.95">
            <line x1="280" y1="280" x2="740" y2="280" stroke="#334155" strokeWidth="4.5" />
            <line x1="280" y1="310" x2="740" y2="310" stroke="#334155" strokeWidth="4.5" />
            <line x1="280" y1="340" x2="740" y2="340" stroke="#334155" strokeWidth="4.5" />
          </g>

          {/* ═══════════════════════════════════════════════════════════════════════════
              ALUR AIR DINGIN DALAM CANGKANG & KELUARAN (SESUAI SKETSA GARIS UNGU)
              Masuk nozzle kanan bawah -> naik melompati sekat kanan ->
              turun di bawah sekat kiri -> naik ke nozzle atas shell melewati Pr & Tr ->
              turun vertikal lurus keluar shell menuju Cold Water Output di bawah!
          ═══════════════════════════════════════════════════════════════════════════ */}
          {/* Nozzle Collars & Flanges (Hanya Nozzle Kanan Bawah & Nozzle Kiri Atas) */}
          <rect x="652" y="378" width="16" height="6" rx="2" fill="url(#flangeGrad)" stroke="#475569" strokeWidth="1.5" />
          <rect x="307" y="234" width="16" height="6" rx="2" fill="url(#flangeGrad)" stroke="#475569" strokeWidth="1.5" />

          {/* Leher Nozzle Atas Shell */}
          <rect x="311" y="222" width="8" height="12" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" />

          {/* Jalur Aliran Air Dingin Dalam Cangkang (Titik-Titik Bergerak Sesuai Permintaan Pengguna) */}
          <path
            d="M 660,380 C 660,310 635,252 580,252 C 525,252 485,368 440,368 L 315,368 L 315,234"
            fill="none"
            stroke="#0284C7"
            strokeWidth="4"
            strokeDasharray="2 8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-flow-dots-cold"
          />

          {/* Pipa Lengkung Keluar Nozzle Belok Kiri & Turun ke Cangkang (Tanpa Buletan, Sejajar x=296) */}
          <path
            d="M 315,234 L 315,222 L 296,222 L 296,240"
            fill="none"
            stroke="#0284C7"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pipa Biru Langsung ke Pembuangan (Berhenti di Atas Kotak Ungu, Tidak Menyentuh Garis Biru Bawah) */}
          <line
            x1="296"
            y1="380"
            x2="296"
            y2="415"
            stroke="#0284C7"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* COLD WATER OUTLET (Kotak Ungu di Atas Garis Biru Bawah, Sejajar di x=296) */}
          <g className="cursor-pointer" onMouseEnter={() => handleHover('COLD_WATER_OUTLET')} onMouseLeave={() => handleHover(null)}>
            <rect x="241" y="415" width="110" height="30" rx="3" fill="#FAF5FF" stroke="#9333EA" strokeWidth="1.5" filter="url(#softShadow)" />
            <text x="296" y="428" textAnchor="middle" className="text-[8.5px] font-black fill-purple-950">
              Cold Water Output
            </text>
            <text x="296" y="438" textAnchor="middle" className="text-[7.5px] font-bold fill-purple-800">
              Keluaran air dingin
            </text>
          </g>

          {/* Header Kiri (Dome Cap) + Flange */}
          <g>
            <path d="M 270,230 C 215,230 215,390 270,390 Z" fill="#E2E8F0" stroke="#475569" strokeWidth="2.5" />
            <rect x="270" y="230" width="12" height="160" rx="3" fill="url(#flangeGrad)" stroke="#475569" strokeWidth="2" />
            {/* Bolts */}
            {[245, 275, 305, 335, 365].map((y) => (
              <circle key={`bl-${y}`} cx="276" cy={y} r="3" fill="#1E293B" />
            ))}
          </g>

          {/* Header Kanan (Dome Cap) + Flange */}
          <g>
            <path d="M 750,230 C 805,230 805,390 750,390 Z" fill="#E2E8F0" stroke="#475569" strokeWidth="2.5" />
            <rect x="738" y="230" width="12" height="160" rx="3" fill="url(#flangeGrad)" stroke="#475569" strokeWidth="2" />
            {/* Bolts */}
            {[245, 275, 305, 335, 365].map((y) => (
              <circle key={`br-${y}`} cx="744" cy={y} r="3" fill="#1E293B" />
            ))}
          </g>

          {/* ═══════════════════════════════════════════════════════════════════════════
              8. RELIEF VALVES (Katup Panas di Header & Katup Uap di Cangkang)
          ═══════════════════════════════════════════════════════════════════════════ */}
          {/* Hot Release Solenoid Kiri */}
          <g className="cursor-pointer" onMouseEnter={() => handleHover('KATUP_PANAS_KIRI')} onMouseLeave={() => handleHover(null)}>
            <rect x="252" y="222" width="12" height="18" rx="2" fill="#7C3AED" />
            <polygon points="258,222 253,214 263,214" fill="#A855F7" />
            <text x="258" y="208" textAnchor="middle" className="text-[7px] font-bold fill-purple-900">
              Hot Release Solenoid
            </text>
          </g>

          {/* Vapor Release Solenoid (Steam Relief Valve) — Ukuran kecil sama persis dengan katup lainnya */}
          <g
            className="cursor-pointer transition hover:scale-110"
            onMouseEnter={() => handleHover('KATUP_UAP')}
            onMouseLeave={() => handleHover(null)}
          >
            <rect
              x="544"
              y="222"
              width="12"
              height="18"
              rx="2"
              fill={uapStatus ? '#F59E0B' : '#0284C7'}
            />
            <polygon
              points="550,222 545,214 555,214"
              fill={uapStatus ? '#FCD34D' : '#38BDF8'}
            />
            <text
              x="550"
              y="208"
              textAnchor="middle"
              className={`text-[7px] font-bold ${uapStatus ? 'fill-amber-900 animate-pulse' : 'fill-sky-900'}`}
            >
              Vapor Release Solenoid
            </text>
          </g>

          {/* Hot Release Solenoid Kanan */}
          <g className="cursor-pointer" onMouseEnter={() => handleHover('KATUP_PANAS_KANAN')} onMouseLeave={() => handleHover(null)}>
            <rect x="752" y="222" width="12" height="18" rx="2" fill="#7C3AED" />
            <polygon points="758,222 753,214 763,214" fill="#A855F7" />
            <text x="758" y="208" textAnchor="middle" className="text-[7px] font-bold fill-purple-900">
              Hot Release Solenoid
            </text>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════════════
              9. SENSOR KELUARAN DINGIN: Pr (Preasure) & Tr (Termostar) DI BAWAH JALUR BIRU
                 Terletak di atas nozzle/shell, di bawah pipa biru
          ═══════════════════════════════════════════════════════════════════════════ */}
          <g className="cursor-pointer" onMouseEnter={() => handleHover('PORT_P4_T4')} onMouseLeave={() => handleHover(null)}>
            {/* Leader Lines dari Pipa Nozzle Atas (x=315, y=222) */}
            <line x1="315" y1="222" x2="315" y2="213" stroke="#94A3B8" strokeWidth="1.5" />
            <line x1="306" y1="213" x2="375" y2="213" stroke="#94A3B8" strokeWidth="1.5" />
            <circle cx="315" cy="222" r="2.5" fill="#64748B" />

            {/* P4 (Cold Outlet Pressure Nozzle) — 2D Pill style */}
            <rect x="278" y="197" width="56" height="16" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="288" cy="205" r="10" fill="#0EA5E9" />
            <text x="288" y="207.5" textAnchor="middle" className="text-[7px] font-bold fill-white">P4</text>
            <text x="313" y="207" textAnchor="middle" className="text-[6.5px] font-bold fill-slate-700">{pi4Str}</text>

            {/* T4 (Cold Outlet Termostat Nozzle) — 2D Pill style */}
            <rect x="348" y="197" width="54" height="16" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="358" cy="205" r="10" fill="#0284C7" />
            <text x="358" y="207.5" textAnchor="middle" className="text-[7px] font-bold fill-white">T4</text>
            <text x="381" y="207" textAnchor="middle" className="text-[6.5px] font-bold fill-slate-700">{tcoStr}</text>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════════════
              10. PORT KIRI: VL, VL, Tr (T1), Presur (P1)
          ═══════════════════════════════════════════════════════════════════════════ */}
          {/* Pipa Biru Horizontal melalui kedua VL, Presur (P1), dan Tr (T1) ke Inlet Header */}
          <line x1="125" y1="310" x2="227" y2="310" stroke="#0284C7" strokeWidth="4" strokeLinecap="butt" />

          {/* VL 1 — Butterfly/Gate valve bowtie symbol */}
          <g className="cursor-pointer" filter="url(#softShadow)">
            <circle cx="132" cy="310" r="11" fill="#FEFCE8" stroke="#B45309" strokeWidth="1.5" />
            <polygon points="123,303 132,310 123,317" fill="#EAB308" stroke="#B45309" strokeWidth="1" />
            <polygon points="141,303 132,310 141,317" fill="#EAB308" stroke="#B45309" strokeWidth="1" />
            <circle cx="132" cy="310" r="2" fill="#92400E" />
            <line x1="132" y1="299" x2="132" y2="294" stroke="#B45309" strokeWidth="2" />
            <rect x="128" y="290" width="8" height="4" rx="1" fill="#B45309" />
            <text x="132" y="327" textAnchor="middle" className="text-[7.5px] font-black fill-amber-900">VL</text>
          </g>

          {/* VL 2 (Katup Cabang Co-Current) — Butterfly valve */}
          <g className="cursor-pointer" filter="url(#softShadow)">
            <circle cx="167" cy="310" r="11" fill="#FEFCE8" stroke="#B45309" strokeWidth="1.5" />
            <polygon points="158,303 167,310 158,317" fill="#EAB308" stroke="#B45309" strokeWidth="1" />
            <polygon points="176,303 167,310 176,317" fill="#EAB308" stroke="#B45309" strokeWidth="1" />
            <circle cx="167" cy="310" r="2" fill="#92400E" />
            <rect x="174" y="320" width="14" height="9" rx="2" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
            <text x="181" y="327" textAnchor="middle" className="text-[7.5px] font-black fill-amber-900">VL</text>
          </g>

          {/* Pipa cabang hijau dari bagian atas VL 2 melintang di bawah T1 masuk ke Inlet Header (Co-Current) sesuai gambar */}
          <path
            d="M 167,299 L 167,280 L 230,280"
            fill="none"
            stroke="#10B981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pipa cabang hijau turun langsung dari katup VL 2 (x=167) ke return line & memutar ke atas tangki (Co-Current) */}
          <path
            d="M 167,321 L 167,470 L 28,470 L 28,48 L 78,48 L 78,65"
            fill="none"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Panah Masuk Hijau di Atas Tangki */}
          <polygon points="78,66 74,58 82,58" fill="#10B981" />

          {/* Presur P1 — 2D Pill style di bawah pipa biru */}
          <g className="cursor-pointer" onMouseEnter={() => handleHover('P1')} onMouseLeave={() => handleHover(null)}>
            <line x1="194" y1="310" x2="194" y2="335" stroke="#94A3B8" strokeWidth="1.5" />
            <circle cx="194" cy="310" r="2" fill="#94A3B8" />
            <rect x="174" y="335" width="40" height="16" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="194" cy="343" r="10" fill="#0EA5E9" />
            <text x="194" y="345.5" textAnchor="middle" className="text-[7px] font-bold fill-white">P1</text>
            <text x="194" y="360" textAnchor="middle" className="text-[6.5px] font-bold fill-slate-700">{pi1Str}</text>
          </g>

          {/* Tr T1 — 2D Pill style di atas pipa hijau, garis penunjuk menembus ke pipa biru sesuai gambar */}
          <g className="cursor-pointer" onMouseEnter={() => handleHover('T1')} onMouseLeave={() => handleHover(null)}>
            <line x1="212" y1="255" x2="212" y2="310" stroke="#94A3B8" strokeWidth="1.5" />
            <circle cx="212" cy="310" r="2" fill="#94A3B8" />
            <rect x="192" y="239" width="40" height="16" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="212" cy="247" r="10" fill="#EF4444" />
            <text x="212" y="249.5" textAnchor="middle" className="text-[7px] font-bold fill-white">T1</text>
            <text x="212" y="233" textAnchor="middle" className="text-[6.5px] font-bold fill-slate-700">{thiStr}</text>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════════════
              11. (PORT KELUARAN AIR DINGIN DIPINDAH KE ATAS)
          ═══════════════════════════════════════════════════════════════════════════ */}

          {/* ═══════════════════════════════════════════════════════════════════════════
              12. PORT KANAN: Presur (P4), Tr (T4), VL (Sesuai Gambar Instruksi 1)
          ═══════════════════════════════════════════════════════════════════════════ */}
          {/* Pipa Hijau dari Katup VL Kanan Menuju Masuk ke Tube / Header Kanan (Co-Current) */}
          <line x1="789.5" y1="280" x2="860" y2="280" stroke="#10B981" strokeWidth="4" strokeLinecap="butt" />
          {/* Panah Masuk ke Tube Kanan (Menempel Rapi di Batas Luar Kubah Tanpa Offside) */}
          <polygon points="789.5,280 797.5,276 797.5,284" fill="#10B981" />

          {/* Sambungan vertikal pipa hijau ke bagian atas katup VL */}
          <line x1="860" y1="280" x2="860" y2="299" stroke="#10B981" strokeWidth="4" />

          {/* Pipa Biru Horizontal Outlet Header kanan melalui P4, T4, dan VL (Mulai Rapi di Batas Luar Kubah Tanpa Offside) */}
          <line x1="792" y1="310" x2="940" y2="310" stroke="#0284C7" strokeWidth="4" strokeLinecap="butt" />

          {/* Presur P2 (Outlet Panas) — Di bawah pipa biru */}
          <g className="cursor-pointer" onMouseEnter={() => handleHover('P2')} onMouseLeave={() => handleHover(null)}>
            <line x1="806" y1="310" x2="806" y2="335" stroke="#94A3B8" strokeWidth="1.5" />
            <circle cx="806" cy="310" r="2" fill="#94A3B8" />
            <rect x="786" y="335" width="40" height="16" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="806" cy="343" r="10" fill="#0EA5E9" />
            <text x="806" y="345.5" textAnchor="middle" className="text-[7px] font-bold fill-white">P2</text>
            <text x="806" y="360" textAnchor="middle" className="text-[6.5px] font-bold fill-slate-700">{pi2Str}</text>
          </g>

          {/* Tr T2 (Outlet Panas) — Di atas pipa hijau dengan garis penunjuk menembus ke pipa biru */}
          <g className="cursor-pointer" onMouseEnter={() => handleHover('T2')} onMouseLeave={() => handleHover(null)}>
            <line x1="830" y1="255" x2="830" y2="310" stroke="#94A3B8" strokeWidth="1.5" />
            <circle cx="830" cy="310" r="2" fill="#94A3B8" />
            <rect x="810" y="239" width="40" height="16" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="830" cy="247" r="10" fill="#EF4444" />
            <text x="830" y="249.5" textAnchor="middle" className="text-[7px] font-bold fill-white">T2</text>
            <text x="830" y="233" textAnchor="middle" className="text-[6.5px] font-bold fill-slate-700">{thoStr}</text>
          </g>

          {/* VL Kanan — Katup VL di titik x=860 sesuai Gambar 1 */}
          <g className="cursor-pointer" filter="url(#softShadow)">
            <circle cx="860" cy="310" r="11" fill="#FEFCE8" stroke="#B45309" strokeWidth="1.5" />
            <polygon points="851,303 860,310 851,317" fill="#EAB308" stroke="#B45309" strokeWidth="1" />
            <polygon points="869,303 860,310 869,317" fill="#EAB308" stroke="#B45309" strokeWidth="1" />
            <circle cx="860" cy="310" r="2" fill="#92400E" />
            <text x="860" y="327" textAnchor="middle" className="text-[7.5px] font-black fill-amber-900">VL</text>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════════════
              13. SUPLAI AIR DINGIN:
                  - GAMBAR KERAN SAJA TANPA TULISAN KERAN (Sesuai Poin 5!)
                  - Pipa turun ke Solenoid -> VL -> Flowmeter -> Tr -> Presur -> Shell
          ═══════════════════════════════════════════════════════════════════════════ */}
          {/* Faucet Icon (HANYA GAMBAR KERAN, TANPA TULISAN KERAN!) */}
          <g className="cursor-pointer" filter="url(#softShadow)">
            {/* Wall mounting plate */}
            <rect x="996" y="58" width="6" height="20" rx="1" fill="#64748B" />
            {/* Faucet Pipe Body */}
            <path d="M 1002,68 L 1018,68 L 1018,78" fill="none" stroke="#475569" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Spout nozzle */}
            <rect x="1014" y="77" width="8" height="5" rx="1" fill="#334155" />
            {/* Handle cross on top */}
            <line x1="1010" y1="62" x2="1010" y2="68" stroke="#334155" strokeWidth="3" />
            <line x1="1004" y1="62" x2="1016" y2="62" stroke="#0284C7" strokeWidth="3.5" strokeLinecap="round" />
            {/* Small water droplet coming out */}
            <circle cx="1018" cy="88" r="2" fill="#0284C7" />
          </g>

          {/* Pipa Biru Turun dari Keran ke Jalur Bawah */}
          <path
            d="M 1018,83 L 1018,420 L 660,420 L 660,380"
            fill="none"
            stroke="#06B6D4"
            strokeWidth="4"
          />

          {/* Solenoid valve — 2D grey/black block design */}
          <g className="cursor-pointer" filter="url(#softShadow)">
            {/* Valve body */}
            <rect x="893" y="414" width="32" height="12" rx="3" fill="#94A3B8" stroke="#475569" strokeWidth="1.5" />
            <polygon points="893,414 905,420 893,426" fill="#64748B" />
            <polygon points="925,414 913,420 925,426" fill="#64748B" />
            {/* Stem */}
            <rect x="906" y="394" width="6" height="20" fill="#64748B" stroke="#475569" strokeWidth="1" />
            {/* Top Actuator Block */}
            <rect x="895" y="380" width="28" height="14" rx="2" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
            <rect x="897" y="382" width="24" height="4" rx="1" fill="#334155" />
            <text x="909" y="374" textAnchor="middle" className="text-[7px] font-bold fill-slate-700">
              Solenoid
            </text>
          </g>

          {/* VL Air Dingin — Butterfly/Gate valve bowtie symbol */}
          <g className="cursor-pointer" filter="url(#softShadow)">
            <circle cx="862" cy="420" r="11" fill="#FEFCE8" stroke="#B45309" strokeWidth="1.5" />
            <polygon points="853,413 862,420 853,427" fill="#EAB308" stroke="#B45309" strokeWidth="1" />
            <polygon points="871,413 862,420 871,427" fill="#EAB308" stroke="#B45309" strokeWidth="1" />
            <circle cx="862" cy="420" r="2" fill="#92400E" />
            <line x1="862" y1="409" x2="862" y2="404" stroke="#B45309" strokeWidth="2" />
            <rect x="858" y="400" width="8" height="4" rx="1" fill="#B45309" />
            <text x="862" y="437" textAnchor="middle" className="text-[7.5px] font-black fill-amber-900">VL</text>
          </g>

          {/* Flowmeter Air Dingin — 2D Pill shape */}
          <g className="cursor-pointer" filter="url(#softShadow)">
            <rect x="797" y="404" width="40" height="32" rx="6" fill="#F97316" stroke="#C2410C" strokeWidth="1.5" />
            <rect x="802" y="409" width="30" height="15" rx="3" fill="#FFFFFF" />
            <text x="817" y="419" textAnchor="middle" className="text-[7.5px] font-black fill-slate-800">
              {flow2Str}
            </text>
            <text x="817" y="432" textAnchor="middle" className="text-[6px] font-bold fill-white">
              flow control
            </text>
          </g>

          {/* Tr (T3) Air Dingin — 2D Pill style */}
          <g className="cursor-pointer" onMouseEnter={() => handleHover('T3')} onMouseLeave={() => handleHover(null)}>
            <line x1="770" y1="420" x2="770" y2="395" stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="750" y="379" width="40" height="16" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="770" cy="387" r="10" fill="#9333EA" />
            <text x="770" y="389.5" textAnchor="middle" className="text-[7px] font-bold fill-white">T3</text>
            <text x="770" y="373" textAnchor="middle" className="text-[6.5px] font-bold fill-slate-700">{tciStr}</text>
          </g>

          {/* Presur (P3) Air Dingin — 2D Pill style */}
          <g className="cursor-pointer" onMouseEnter={() => handleHover('P3')} onMouseLeave={() => handleHover(null)}>
            <line x1="735" y1="420" x2="735" y2="445" stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="715" y="445" width="40" height="16" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="735" cy="453" r="10" fill="#0284C7" />
            <text x="735" y="455.5" textAnchor="middle" className="text-[7px] font-bold fill-white">P3</text>
            <text x="735" y="470" textAnchor="middle" className="text-[6.5px] font-bold fill-slate-700">{pi3Str}</text>
          </g>

          {/* ═══════════════════════════════════════════════════════════════════════════
              14. ΔP HOT BADGE (Ringkas di Bawah Cangkang)
          ═══════════════════════════════════════════════════════════════════════════ */}
          <g className="cursor-pointer">
            <rect x="445" y="488" width="150" height="20" rx="4" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1" filter="url(#softShadow)" />
            <text x="520" y="502" textAnchor="middle" className="text-[8.5px] font-black fill-blue-900">
              ΔP Hot (P1 - P2) = {deltaPHotStr}
            </text>
          </g>
        </svg>
      </div>

      {/* ─── KETERANGAN SINGKATAN SENSOR & KOMPONEN (ON-DEMAND TOGGLE - KHUSUS MOBILE DI BAWAH KINERJA) ─── */}
      <div className="order-3 md:order-2 space-y-2">
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50/90 hover:bg-slate-100/90 rounded-xl border border-slate-200/90 transition shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Keterangan Singkatan Notasi:</span>
            <span className="hidden sm:inline-flex text-[11px] font-medium text-slate-500">
              (T1–T4, P1–P4, FC1–FC2, VL, SV, H)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLegend((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <span>{showLegend ? 'Tutup Keterangan' : 'Buka Keterangan'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showLegend ? 'rotate-180 text-sky-600' : 'text-slate-500'}`} />
          </button>
        </div>

        {showLegend && (
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs animate-in fade-in duration-200">
            {/* T1 - T4 */}
            <div className="flex items-center gap-3 p-2.5 bg-slate-50/70 hover:bg-orange-50/40 rounded-xl border border-slate-200/80 transition">
              <span className="px-2.5 py-1 rounded-lg bg-orange-500 text-white font-black text-[11px] shrink-0 whitespace-nowrap shadow-2xs">
                T1 – T4
              </span>
              <div className="min-w-0">
                <strong className="text-slate-800 block text-xs font-bold">Termostat (Suhu)</strong>
                <span className="text-[11px] text-slate-500 block">Sensor Suhu Fluida (T1, T2, T3, T4)</span>
              </div>
            </div>

            {/* P1 - P4 */}
            <div className="flex items-center gap-3 p-2.5 bg-slate-50/70 hover:bg-blue-50/40 rounded-xl border border-slate-200/80 transition">
              <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-[11px] shrink-0 whitespace-nowrap shadow-2xs">
                P1 – P4
              </span>
              <div className="min-w-0">
                <strong className="text-slate-800 block text-xs font-bold">Pressure (Tekanan)</strong>
                <span className="text-[11px] text-slate-500 block">Sensor Tekanan Fluida (P1, P2, P3, P4)</span>
              </div>
            </div>

            {/* FC1 - FC2 */}
            <div className="flex items-center gap-3 p-2.5 bg-slate-50/70 hover:bg-emerald-50/40 rounded-xl border border-slate-200/80 transition">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-[11px] shrink-0 whitespace-nowrap shadow-2xs">
                FC1 – FC2
              </span>
              <div className="min-w-0">
                <strong className="text-slate-800 block text-xs font-bold">Flow Controller</strong>
                <span className="text-[11px] text-slate-500 block">Sensor Debit Aliran (FC1 &amp; FC2)</span>
              </div>
            </div>

            {/* VL1 - VL6 */}
            <div className="flex items-center gap-3 p-2.5 bg-slate-50/70 hover:bg-amber-50/40 rounded-xl border border-slate-200/80 transition">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-black text-[11px] shrink-0 whitespace-nowrap shadow-2xs">
                VL1 – VL6
              </span>
              <div className="min-w-0">
                <strong className="text-slate-800 block text-xs font-bold">Valve Manual</strong>
                <span className="text-[11px] text-slate-500 block">Katup Kran Aliran Manual (VL1 s/d VL6)</span>
              </div>
            </div>

            {/* SV1 - SV4 */}
            <div className="flex items-center gap-3 p-2.5 bg-slate-50/70 hover:bg-purple-50/40 rounded-xl border border-slate-200/80 transition">
              <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-black text-[11px] shrink-0 whitespace-nowrap shadow-2xs">
                SV1 – SV4
              </span>
              <div className="min-w-0">
                <strong className="text-slate-800 block text-xs font-bold">Solenoid Valve</strong>
                <span className="text-[11px] text-slate-500 block">Katup Otomatis Elektrik (SV1 s/d SV4)</span>
              </div>
            </div>

            {/* H1 - H2 */}
            <div className="flex items-center gap-3 p-2.5 bg-slate-50/70 hover:bg-rose-50/40 rounded-xl border border-slate-200/80 transition">
              <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-[11px] shrink-0 whitespace-nowrap shadow-2xs">
                H1 – H2
              </span>
              <div className="min-w-0">
                <strong className="text-slate-800 block text-xs font-bold">Dual Heater</strong>
                <span className="text-[11px] text-slate-500 block">Elemen Pemanas Tangki Air Panas</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── THERMAL PERFORMANCE KPIS (LMTD & ΔT) ─── */}
      <div className="order-2 md:order-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 px-0.5">
          <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-sky-600" />
            {isAdmin ? 'Kinerja Perpindahan Kalor & LMTD' : 'Kinerja Perpindahan Kalor (ΔT)'}
          </span>
          <span className="text-[9.5px] font-bold text-slate-400">Parameter Efisiensi Termal</span>
        </div>

        <div className={`grid gap-2 text-xs pt-0.5 ${isAdmin ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9.5px] font-bold text-slate-500 block">ΔT Hot (Pelepasan):</span>
              <strong className="text-slate-800 font-black text-xs sm:text-sm">
                {isHardwareOnline ? `${(thi - tho).toFixed(1)} °C` : '--'}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 shrink-0">
              <Droplets className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9.5px] font-bold text-slate-500 block">ΔT Cold (Penyerapan):</span>
              <strong className="text-sky-700 font-black text-xs sm:text-sm">
                {isHardwareOnline ? `${Math.abs(tco - tci).toFixed(1)} °C` : '--'}
              </strong>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                <Thermometer className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[9.5px] font-bold text-slate-500 block">LMTD ({diagramMode}):</span>
                <strong className="text-slate-800 font-black text-xs sm:text-sm">
                  {isHardwareOnline ? `${lmtdVal.toFixed(2)} °C` : '--'}
                </strong>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9.5px] font-bold text-slate-500 block">Status Operasi:</span>
              <span className={`inline-block font-black text-[9.5px] px-2 py-0.5 rounded border ${isHardwareOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {isHardwareOnline ? 'Rig Active' : 'Standby (Offline)'}
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
  );
};

export default PidDiagram;

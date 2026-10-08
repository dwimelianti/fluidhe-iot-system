'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Clock, Sliders, ChevronDown, WifiOff } from 'lucide-react';
import { TelemetryPoint } from '@/types';

interface LiveChartProps {
  telemetryHistory: TelemetryPoint[];
  operatorSessionLimit?: number;
  isHardwareOnline?: boolean;
}

type ChannelKey = 'all' | 'ti1' | 'ti2' | 'ti3' | 'ti4';
type DurationMode = '15m' | '30m' | '60m' | '120m' | 'live';

/**
 * Parses various timestamp formats (HH:MM:SS, HH.MM.SS, HH:MM, ISO 8601) to seconds since midnight (0 - 86399)
 */
function parseTimeToSeconds(timestampStr: string): number | null {
  if (!timestampStr) return null;

  // Try ISO Date String
  if (timestampStr.includes('T') || timestampStr.includes('-')) {
    const parsedDate = new Date(timestampStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.getHours() * 3600 + parsedDate.getMinutes() * 60 + parsedDate.getSeconds();
    }
  }

  // Handle "18/08/2026 10:32:05" or "10:32:05 WIB"
  const timeOnly = timestampStr.replace(/.*?\s(\d{1,2}[:.]\d{1,2}(?:[:.]\d{1,2})?).*/, '$1');
  const cleanStr = (timeOnly || timestampStr).replace(/[^\d:.]/g, '');
  const parts = cleanStr.split(/[:.]/).map(Number);

  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const hours = Math.min(23, Math.max(0, parts[0]));
    const minutes = Math.min(59, Math.max(0, parts[1]));
    const seconds = parts.length >= 3 && !isNaN(parts[2]) ? Math.min(59, Math.max(0, parts[2])) : 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

/**
 * Formats total seconds from midnight to HH:MM or HH:MM:SS
 */
function formatSecondsToTime(totalSeconds: number, includeSeconds = false): string {
  const normalized = ((Math.floor(totalSeconds) % 86400) + 86400) % 86400;
  const h = Math.floor(normalized / 3600);
  const m = Math.floor((normalized % 3600) / 60);
  const s = Math.floor(normalized % 60);

  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  return includeSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
}

/**
 * Calculates a smooth Cubic Bezier path through discrete points (Catmull-Rom spline conversion)
 */
function getSmoothPath(points: { x: number; y: number }[], minX?: number, maxX?: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    let cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    let cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;

    if (minX !== undefined) {
      cp1x = Math.max(minX, cp1x);
      cp2x = Math.max(minX, cp2x);
    }
    if (maxX !== undefined) {
      cp1x = Math.min(maxX, cp1x);
      cp2x = Math.min(maxX, cp2x);
    }

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Generates an area polygon path from smooth curve down to baseline Y
 */
function getAreaPath(points: { x: number; y: number }[], baselineY: number, minX?: number, maxX?: number): string {
  if (points.length < 2) return '';
  const linePath = getSmoothPath(points, minX, maxX);
  const firstX = points[0].x.toFixed(1);
  const lastX = points[points.length - 1].x.toFixed(1);
  return `${linePath} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;
}

export const LiveChart: React.FC<LiveChartProps> = ({
  telemetryHistory,
  operatorSessionLimit = 60,
  isHardwareOnline = false
}) => {
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('all');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Practical Session Duration View Mode (Default: '60m' / 1 Jam)
  const [durationMode, setDurationMode] = useState<DurationMode>('60m');
  const [isTimeConfigOpen, setIsTimeConfigOpen] = useState<boolean>(false);
  const [userSelectedEnd, setUserSelectedEnd] = useState<string | null>(null);

  // Real-time ticking clock for synchronized UI and indicators
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-Time Current Time in seconds since midnight (0 - 86399)
  const currentTimeSec = useMemo(() => {
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  }, [now]);

  // Sort raw history chronologically to prevent backward jumps & filter out yesterday's stale records
  const sortedHistory = useMemo(() => {
    if (!telemetryHistory || telemetryHistory.length === 0) return [];

    // Extract valid timestamp dates to isolate today's / latest active session
    const withDates = telemetryHistory.map((pt) => {
      let timeMs: number | null = null;
      if (pt.created_at) {
        const d = new Date(pt.created_at);
        if (!isNaN(d.getTime())) timeMs = d.getTime();
      }
      return { pt, timeMs };
    });

    const validMs = withDates.filter((x) => x.timeMs !== null).map((x) => x.timeMs as number);
    let filteredList = telemetryHistory;

    if (validMs.length > 0) {
      const maxMs = Math.max(...validMs);
      const latestDateStr = new Date(maxMs).toDateString();
      const todayStr = new Date().toDateString();

      // If user is in live mode and records are not from today, do not plot them as today's live curve
      if (!userSelectedEnd && latestDateStr !== todayStr) {
        return [];
      }

      // Keep only points from the same date or recorded within recent 8 hours
      filteredList = withDates
        .filter(({ pt, timeMs }) => {
          if (!timeMs) return true;
          const ptDateStr = new Date(timeMs).toDateString();
          return ptDateStr === latestDateStr && (maxMs - timeMs <= 8 * 3600 * 1000);
        })
        .map(({ pt }) => pt);
    }

    return [...filteredList].sort((a, b) => {
      if (a.created_at && b.created_at) {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (!isNaN(diff)) return diff;
      }
      const secA = parseTimeToSeconds(a.timestamp) ?? 0;
      const secB = parseTimeToSeconds(b.timestamp) ?? 0;
      return secA - secB;
    });
  }, [telemetryHistory]);

  // SVG Dimension Constants
  const width = 880;
  const height = 250;
  const padLeft = 48;
  const padRight = 32;
  const padTop = 28;
  const padBottom = 48;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const baselineY = height - padBottom;

  // Temperature Scale: Standard Industrial Full Scale 0°C to 100°C (20°C step lines)
  const minTemp = 0;
  const maxTemp = 100;
  const tempSteps = [100, 80, 60, 40, 20, 0];

  const mapY = (val: number) => {
    const clamped = Math.max(minTemp, Math.min(maxTemp, val));
    const ratio = (clamped - minTemp) / (maxTemp - minTemp || 1);
    return baselineY - ratio * plotHeight;
  };

  // Calculate Time Window:
  // Default is Real-Time / Live (End time = NOW, Start time = NOW - duration, rolling backwards)
  // Or if user selected a historical end time: End time = userSelectedEnd, Start time = End time - duration
  const timeWindow = useMemo(() => {
    let durationSec = 3600; // Default 1 hour
    if (durationMode === '15m') {
      durationSec = 15 * 60;
    } else if (durationMode === '30m') {
      durationSec = 30 * 60;
    } else if (durationMode === '60m') {
      durationSec = 60 * 60;
    } else if (durationMode === '120m') {
      durationSec = 120 * 60;
    }

    let endSec: number;
    let isLive = false;

    if (userSelectedEnd) {
      endSec = parseTimeToSeconds(userSelectedEnd) ?? currentTimeSec;
    } else {
      isLive = true;
      endSec = currentTimeSec;

      // Safeguard: If latest telemetry point is slightly ahead of client clock by up to 5 minutes,
      // snap endSec to the latest point so it is never cut off
      if (sortedHistory.length > 0) {
        const latestPt = sortedHistory[sortedHistory.length - 1];
        const latestSec = parseTimeToSeconds(latestPt.timestamp);
        if (latestSec !== null) {
          let diff = latestSec - endSec;
          if (diff > 43200) diff -= 86400;
          if (diff < -43200) diff += 86400;
          if (diff > 0 && diff <= 300) {
            endSec = latestSec;
          }
        }
      }
    }

    const startSec = (endSec - durationSec + 86400) % 86400;

    return {
      startSec,
      endSec,
      durationSec,
      isLive,
      startTimeStr: formatSecondsToTime(startSec),
      endTimeStr: formatSecondsToTime(endSec),
      durationMin: Math.round(durationSec / 60)
    };
  }, [durationMode, userSelectedEnd, currentTimeSec, sortedHistory]);

  // Map Telemetry Points to X Coordinates based on Time Window or Point Index
  const { filteredPoints, timeTicks } = useMemo(() => {
    if (durationMode === 'live') {
      // Rolling live mode: Distribute evenly across points
      const total = sortedHistory.length;
      const points = sortedHistory.map((d, i) => {
        const x = total <= 1 ? padLeft : padLeft + (i / (total - 1)) * plotWidth;
        return { ...d, plotX: x, originalIndex: i };
      });

      const tickStep = Math.max(1, Math.floor(total / 6));
      const ticks = points.filter((_, i) => i % tickStep === 0 || i === total - 1).map((p) => ({
        x: p.plotX,
        label: p.timestamp
      }));

      return { filteredPoints: points, timeTicks: ticks };
    }

    // Fixed Duration Mode (e.g. 1 Jam / 30m / 15m / 2 Jam)
    // End time is rightmost (now), window extends backwards by durationSec
    const { endSec, durationSec } = timeWindow;

    const pointsWithTime = sortedHistory
      .map((d, idx) => {
        let sec: number | null = null;
        if (d.created_at) {
          const dt = new Date(d.created_at);
          if (!isNaN(dt.getTime())) {
            sec = dt.getHours() * 3600 + dt.getMinutes() * 60 + dt.getSeconds();
          }
        }
        if (sec === null) {
          sec = parseTimeToSeconds(d.timestamp);
        }
        return { ...d, sec, originalIndex: idx };
      })
      .filter((d): d is typeof d & { sec: number } => d.sec !== null);

    const mapped = pointsWithTime
      .map((d) => {
        let diffFromEnd = d.sec - endSec;
        if (diffFromEnd > 43200) diffFromEnd -= 86400; // Handle midnight wrap
        if (diffFromEnd < -43200) diffFromEnd += 86400;

        return {
          ...d,
          diffFromEnd
        };
      })
      .filter((d) => {
        // Point is inside window if it is within durationSec in the past up to endSec (+5s tolerance for clock jitter)
        return d.diffFromEnd <= 5 && d.diffFromEnd >= -durationSec;
      })
      .map((d) => {
        // ratio goes from 0 (at start: endSec - durationSec) to 1 (at end: endSec)
        const ratio = Math.max(0, Math.min(1, (d.diffFromEnd + durationSec) / durationSec));
        const plotX = padLeft + ratio * plotWidth;
        return {
          ...d,
          plotX,
          relSec: d.diffFromEnd + durationSec,
          isInsideWindow: true
        };
      });

    // Generate evenly spaced time tick marks across the duration (e.g. 10:17 ... 11:17)
    const numTicks = durationMode === '15m' ? 5 : 6;
    const ticks = [];
    for (let i = 0; i <= numTicks; i++) {
      const ratio = i / numTicks;
      let tickSec = endSec - durationSec + ratio * durationSec;
      tickSec = ((tickSec % 86400) + 86400) % 86400;
      const x = padLeft + ratio * plotWidth;
      ticks.push({
        x,
        label: formatSecondsToTime(tickSec)
      });
    }

    return { filteredPoints: mapped, timeTicks: ticks };
  }, [sortedHistory, durationMode, timeWindow, padLeft, plotWidth]);

  // Precompute smooth point arrays for SVG spline rendering
  const ti1Points = useMemo(
    () => filteredPoints.map((d) => ({ x: d.plotX, y: mapY(d.ti1) })),
    [filteredPoints]
  );
  const ti2Points = useMemo(
    () => filteredPoints.map((d) => ({ x: d.plotX, y: mapY(d.ti2) })),
    [filteredPoints]
  );
  const ti3Points = useMemo(
    () => filteredPoints.map((d) => ({ x: d.plotX, y: mapY(d.ti3) })),
    [filteredPoints]
  );
  const ti4Points = useMemo(
    () => filteredPoints.map((d) => ({ x: d.plotX, y: mapY(d.ti4) })),
    [filteredPoints]
  );

  const minPlotX = padLeft;
  const maxPlotX = width - padRight;

  const ti1Path = useMemo(() => getSmoothPath(ti1Points, minPlotX, maxPlotX), [ti1Points, minPlotX, maxPlotX]);
  const ti2Path = useMemo(() => getSmoothPath(ti2Points, minPlotX, maxPlotX), [ti2Points, minPlotX, maxPlotX]);
  const ti3Path = useMemo(() => getSmoothPath(ti3Points, minPlotX, maxPlotX), [ti3Points, minPlotX, maxPlotX]);
  const ti4Path = useMemo(() => getSmoothPath(ti4Points, minPlotX, maxPlotX), [ti4Points, minPlotX, maxPlotX]);

  const ti1Area = useMemo(() => getAreaPath(ti1Points, baselineY, minPlotX, maxPlotX), [ti1Points, baselineY, minPlotX, maxPlotX]);
  const ti4Area = useMemo(() => getAreaPath(ti4Points, baselineY, minPlotX, maxPlotX), [ti4Points, baselineY, minPlotX, maxPlotX]);

  const hoveredPoint = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < filteredPoints.length ? filteredPoints[hoverIndex] : null;

  const currentTimeMarkerX = useMemo(() => {
    if (durationMode === 'live' || timeWindow.isLive) return null;
    let diffFromEnd = currentTimeSec - timeWindow.endSec;
    if (diffFromEnd > 43200) diffFromEnd -= 86400;
    if (diffFromEnd < -43200) diffFromEnd += 86400;
    if (diffFromEnd <= 0 && diffFromEnd >= -timeWindow.durationSec) {
      const ratio = (diffFromEnd + timeWindow.durationSec) / timeWindow.durationSec;
      return padLeft + ratio * plotWidth;
    }
    return null;
  }, [currentTimeSec, timeWindow, durationMode, padLeft, plotWidth]);

  return (
    <div id="tour-live-chart" className="asklepios-card p-3.5 sm:p-6 bg-white shadow-sm border border-slate-200/80 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4">
      {/* Header with Title, Session Duration Controls & Time Scale Selector */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3.5 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-600 animate-pulse" />
              Grafik Gelombang Suhu Real-Time
            </h3>

            {/* Active Session Range Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200/80 rounded-lg text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>
                {durationMode === 'live'
                  ? 'Mode: Live Rolling'
                  : `Rentang: ${timeWindow.startTimeStr} - ${timeWindow.endTimeStr} WIB (${timeWindow.durationMin} Menit)`}
              </span>
            </span>

            {/* Hardware Status Badge */}
            {isHardwareOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetri
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> ESP Offline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualisasi dinamika termal terkalibrasi per durasi praktikum (TI₁ - TI₄)
          </p>
        </div>

        {/* Duration & Time Window Selectors */}
        <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-auto">
          {/* Quick Duration Buttons */}
          <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-600 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setDurationMode('15m');
                setUserSelectedEnd(null);
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${durationMode === '15m' ? 'bg-white text-sky-700 shadow-xs font-extrabold' : 'hover:text-slate-900'
                }`}
            >
              15m
            </button>
            <button
              type="button"
              onClick={() => {
                setDurationMode('30m');
                setUserSelectedEnd(null);
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${durationMode === '30m' ? 'bg-white text-sky-700 shadow-xs font-extrabold' : 'hover:text-slate-900'
                }`}
            >
              30m
            </button>
            <button
              type="button"
              onClick={() => {
                setDurationMode('60m');
                setUserSelectedEnd(null);
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${durationMode === '60m' ? 'bg-white text-sky-700 shadow-xs font-extrabold' : 'hover:text-slate-900'
                }`}
            >
              1 Jam
            </button>
            <button
              type="button"
              onClick={() => {
                setDurationMode('120m');
                setUserSelectedEnd(null);
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${durationMode === '120m' ? 'bg-white text-sky-700 shadow-xs font-extrabold' : 'hover:text-slate-900'
                }`}
            >
              2 Jam
            </button>
            <button
              type="button"
              onClick={() => {
                setDurationMode('live');
                setUserSelectedEnd(null);
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${durationMode === 'live' ? 'bg-white text-sky-700 shadow-xs font-extrabold' : 'hover:text-slate-900'
                }`}
            >
              Live
            </button>
          </div>

          {/* Time Picker Trigger Button */}
          {durationMode !== 'live' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTimeConfigOpen(!isTimeConfigOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                title="Atur Waktu Acuan Grafik"
              >
                <Sliders className="w-3.5 h-3.5 text-sky-600" />
                <span>{timeWindow.isLive ? 'Waktu: Saat Ini' : `Sampai: ${timeWindow.endTimeStr}`}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Time Configuration Dropdown Popover */}
              {isTimeConfigOpen && (
                <div className="absolute right-0 mt-1.5 w-68 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 space-y-2.5 text-xs animate-in fade-in zoom-in-95">
                  <div className="font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span>Acuan Waktu Akhir:</span>
                    <span className="text-[10px] text-sky-600 font-semibold">{timeWindow.durationMin} Menit Mundur</span>
                  </div>

                  {/* Dynamic Time Quick-Select Option */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUserSelectedEnd(null);
                        setIsTimeConfigOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 border rounded-xl font-bold text-left flex items-center justify-between transition cursor-pointer ${
                        timeWindow.isLive
                          ? 'bg-sky-50 text-sky-800 border-sky-300 ring-1 ring-sky-200'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Waktu Saat Ini (Live)
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">{formatSecondsToTime(currentTimeSec)}</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-slate-400">Atau lihat arsip hingga jam:</p>
                    <div className="grid grid-cols-4 gap-1 pt-0.5">
                      {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            setUserSelectedEnd(time);
                            setIsTimeConfigOpen(false);
                          }}
                          className={`px-1.5 py-1 rounded-lg text-center font-bold text-[11px] transition cursor-pointer ${
                            !timeWindow.isLive && userSelectedEnd === time
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="w-full overflow-x-auto relative rounded-2xl bg-gradient-to-b from-slate-50/50 to-white border border-slate-100 p-2">
        {!isHardwareOnline && sortedHistory.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-[2px] rounded-2xl z-10 p-4">
            <div className="flex flex-col items-center text-center max-w-sm">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-2 shadow-2xs">
                <WifiOff className="w-5 h-5" />
              </div>
              <h5 className="text-sm font-extrabold text-slate-800">ESP32 Offline (Data Tidak Masuk)</h5>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Grafik telemetri live akan mulai digambar secara otomatis saat alat laboratorium dinyalakan dan mengirimkan data ke sistem.
              </p>
            </div>
          </div>
        )}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-58 min-w-[720px] font-sans overflow-visible select-none"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            const boundedX = Math.max(padLeft, Math.min(width - padRight, mouseX));

            let closestIdx = 0;
            let minDist = Infinity;
            filteredPoints.forEach((p, idx) => {
              const dist = Math.abs(p.plotX - boundedX);
              if (dist < minDist) {
                minDist = dist;
                closestIdx = idx;
              }
            });

            if (filteredPoints.length > 0) {
              setHoverIndex(closestIdx);
            }
          }}
        >
          <defs>
            {/* Strict plot clip to completely eliminate any offside line overshooting into axis labels */}
            <clipPath id="chartPlotClip">
              <rect x={padLeft} y={0} width={width - padRight - padLeft} height={height} />
            </clipPath>

            <linearGradient id="grad_airy_blue_area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#60A5FA" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.00" />
            </linearGradient>

            <linearGradient id="grad_airy_amber_area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.18" />
              <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.00" />
            </linearGradient>

            <linearGradient id="wave_grad_primary_flow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="35%" stopColor="#3B82F6" />
              <stop offset="70%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>

            <linearGradient id="wave_grad_hot_flow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* Grid Background Horizontal Lines & Labels (0°C to 100°C) */}
          {tempSteps.map((tempVal) => {
            const y = mapY(tempVal);
            return (
              <g key={tempVal}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray={tempVal === 0 ? 'none' : '4 4'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-semibold"
                >
                  {tempVal}°C
                </text>
              </g>
            );
          })}

          {/* Vertical Separator Line between Y-Axis Labels and Plot Area */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={baselineY}
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />

          {/* Vertical Grid Ticks for Session Timestamps */}
          {timeTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={tick.x}
                y1={padTop}
                x2={tick.x}
                y2={baselineY}
                stroke="#F8FAFC"
                strokeWidth="1"
              />
              <text
                x={tick.x}
                y={baselineY + 20}
                textAnchor="middle"
                className="text-[10px] fill-slate-500 font-semibold"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Empty / Waiting State Notice */}
          {filteredPoints.length === 0 && (
            <g>
              <text
                x={width / 2}
                y={height / 2}
                textAnchor="middle"
                className="text-xs fill-slate-400 font-semibold"
              >
                Menunggu data telemetri real-time ({timeWindow.startTimeStr} - {timeWindow.endTimeStr} WIB)...
              </text>
            </g>
          )}

          {/* ─── CLIPPED PLOT AREA (PREVENTS OFFSIDE / OVERFLOW INTO AXIS LABELS) ─── */}
          <g clipPath="url(#chartPlotClip)">
            {/* Ambient Wave Gradients */}
            {(activeChannel === 'all' || activeChannel === 'ti4') && (
              <path d={ti4Area} fill="url(#grad_airy_blue_area)" className="transition-all duration-500 ease-out" />
            )}
            {activeChannel === 'ti1' && (
              <path d={ti1Area} fill="url(#grad_airy_amber_area)" className="transition-all duration-500 ease-out" />
            )}

            {/* Smooth Flowing Spline Curves */}
            {/* T3: Cold Inlet */}
            {(activeChannel === 'all' || activeChannel === 'ti3') && (
              <path
                d={ti3Path}
                fill="none"
                stroke="#0D9488"
                strokeWidth={activeChannel === 'ti3' ? '3.5' : '2'}
                strokeDasharray="5 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-500 ease-out opacity-85"
              />
            )}

            {/* T2: Cold Outlet */}
            {(activeChannel === 'all' || activeChannel === 'ti2') && (
              <path
                d={ti2Path}
                fill="none"
                stroke="#0284C7"
                strokeWidth={activeChannel === 'ti2' ? '3.5' : '2'}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-500 ease-out opacity-90"
              />
            )}

            {/* T1: Hot Stream (Kiri) */}
            {(activeChannel === 'all' || activeChannel === 'ti1') && (
              <path
                d={ti1Path}
                fill="none"
                stroke="url(#wave_grad_hot_flow)"
                strokeWidth={activeChannel === 'ti1' ? '4' : '3'}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-500 ease-out"
              />
            )}

            {/* T4: Hot Stream (Kanan) */}
            {(activeChannel === 'all' || activeChannel === 'ti4') && (
              <path
                d={ti4Path}
                fill="none"
                stroke="#F43F5E"
                strokeWidth={activeChannel === 'ti4' ? '4' : '3'}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-500 ease-out drop-shadow-sm"
              />
            )}
          </g>

          {/* Live Current Time Marker Line in Session */}
          {currentTimeMarkerX !== null && (
            <g>
              <line
                x1={currentTimeMarkerX}
                y1={padTop}
                x2={currentTimeMarkerX}
                y2={baselineY}
                stroke="#0284C7"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />
              <circle cx={currentTimeMarkerX} cy={padTop + 4} r="3" fill="#0284C7" />
            </g>
          )}

          {/* Latest Live Pulse Beacon at rightmost point */}
          {ti1Points.length > 0 && (activeChannel === 'all' || activeChannel === 'ti1') && (
            <g transform={`translate(${ti1Points[ti1Points.length - 1].x}, ${ti1Points[ti1Points.length - 1].y})`}>
              <circle r="7" fill="#D97706" fillOpacity="0.3" className="animate-ping" />
              <circle r="4" fill="#D97706" stroke="#FFFFFF" strokeWidth="2" />
            </g>
          )}

          {ti4Points.length > 0 && (activeChannel === 'all' || activeChannel === 'ti4') && (
            <g transform={`translate(${ti4Points[ti4Points.length - 1].x}, ${ti4Points[ti4Points.length - 1].y})`}>
              <circle r="7" fill="#0284C7" fillOpacity="0.3" className="animate-ping" />
              <circle r="4" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
            </g>
          )}

          {/* Hover Crosshair Vertical Line */}
          {hoverIndex !== null && hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.plotX}
                y1={padTop}
                x2={hoveredPoint.plotX}
                y2={baselineY}
                stroke="#64748B"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {(activeChannel === 'all' || activeChannel === 'ti1') && (
                <circle cx={ti1Points[hoverIndex]?.x} cy={ti1Points[hoverIndex]?.y} r="5" fill="#D97706" stroke="#fff" strokeWidth="2" />
              )}
              {(activeChannel === 'all' || activeChannel === 'ti4') && (
                <circle cx={ti4Points[hoverIndex]?.x} cy={ti4Points[hoverIndex]?.y} r="5" fill="#0284C7" stroke="#fff" strokeWidth="2" />
              )}
            </g>
          )}
        </svg>

        {/* Hover Floating Tooltip */}
        {hoverIndex !== null && hoveredPoint && (
          <div className="absolute top-3 right-4 bg-slate-900/90 backdrop-blur-sm text-white px-3.5 py-2.5 rounded-xl text-xs shadow-xl border border-slate-700 pointer-events-none transition-all z-20">
            <div className="flex items-center justify-between gap-3 text-[10px] text-slate-300 font-bold mb-1.5 border-b border-slate-700 pb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" /> Waktu: {hoveredPoint.timestamp}
              </span>
              {durationMode !== 'live' && (
                <span className="text-sky-400">
                  {timeWindow.startTimeStr} - {timeWindow.endTimeStr}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
              <span className="text-amber-400 font-bold">T1 (Hot Kiri): {hoveredPoint.ti1.toFixed(1)}°C</span>
              <span className="text-cyan-400 font-bold">T2 (Cold Out): {hoveredPoint.ti2.toFixed(1)}°C</span>
              <span className="text-teal-400 font-bold">T3 (Cold In): {hoveredPoint.ti3.toFixed(1)}°C</span>
              <span className="text-rose-400 font-bold">T4 (Hot Kanan): {hoveredPoint.ti4.toFixed(1)}°C</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer with Channel Toggles */}
      <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 pt-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveChannel(activeChannel === 'ti1' ? 'all' : 'ti1')}
          className={`flex items-center gap-2 cursor-pointer transition py-1 px-2.5 rounded-lg ${activeChannel === 'ti1' ? 'bg-amber-50 ring-1 ring-amber-300 font-bold scale-105' : 'hover:bg-slate-50'
            }`}
        >
          <span className="w-3.5 h-1.5 bg-amber-600 rounded-full shadow-xs" />
          <span className="text-amber-900">T1 (Hot Stream - Kiri)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChannel(activeChannel === 'ti2' ? 'all' : 'ti2')}
          className={`flex items-center gap-2 cursor-pointer transition py-1 px-2.5 rounded-lg ${activeChannel === 'ti2' ? 'bg-sky-50 ring-1 ring-sky-300 font-bold scale-105' : 'hover:bg-slate-50'
            }`}
        >
          <span className="w-3.5 h-1.5 bg-sky-600 rounded-full shadow-xs" />
          <span className="text-sky-900">T2 (Cold Outlet - Atas)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChannel(activeChannel === 'ti3' ? 'all' : 'ti3')}
          className={`flex items-center gap-2 cursor-pointer transition py-1 px-2.5 rounded-lg ${activeChannel === 'ti3' ? 'bg-teal-50 ring-1 ring-teal-300 font-bold scale-105' : 'hover:bg-slate-50'
            }`}
        >
          <span className="w-3.5 h-1.5 bg-teal-600 rounded-full border-dashed" />
          <span className="text-teal-900">T3 (Cold Inlet - Suplai)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChannel(activeChannel === 'ti4' ? 'all' : 'ti4')}
          className={`flex items-center gap-2 cursor-pointer transition py-1 px-2.5 rounded-lg ${activeChannel === 'ti4' ? 'bg-rose-50 ring-1 ring-rose-300 font-bold scale-105' : 'hover:bg-slate-50'
            }`}
        >
          <span className="w-3.5 h-1.5 bg-rose-600 rounded-full shadow-xs" />
          <span className="text-rose-900">T4 (Hot Stream - Kanan)</span>
        </button>

        {activeChannel !== 'all' && (
          <button
            type="button"
            onClick={() => setActiveChannel('all')}
            className="text-[11px] text-slate-500 hover:text-sky-600 font-bold underline cursor-pointer ml-2"
          >
            Tampilkan Semua
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveChart;

'use client';

import React from 'react';
import {
  Video,
  Disc,
  Pause,
  Play,
  Maximize2,
  Camera,
  Folder,
  Volume2,
  VolumeX,
  Volume1,
  AlertTriangle,
  Wifi,
  RotateCw,
  ExternalLink
} from 'lucide-react';
import { TelemetryPoint, TempLabels } from '@/types';
import { PtzController } from './PtzController';
import { CctvWifiModal } from './CctvWifiModal';
import { CctvStorageModal } from './CctvStorageModal';

export interface CctvTabProps {
  selectedCamera: 'cam1' | 'cam2' | 'cam3';
  setSelectedCamera: (cam: 'cam1' | 'cam2' | 'cam3') => void;
  cctvStreamSource: 'local' | 'demo' | 'custom' | string;
  setCctvStreamSource: (source: any) => void;
  cctvIpUrl: string;
  setCctvIpUrl?: (url: string) => void;
  cctvPublicUrl?: string;
  setCctvPublicUrl?: (url: string) => void;
  cctvAudioMuted: boolean;
  setCctvAudioMuted: (muted: boolean) => void;
  audioUserActivated: boolean;
  setAudioUserActivated: (active: boolean) => void;
  cctvVolume: number;
  setCctvVolume: (volume: number) => void;
  cctvRecording: boolean;
  setCctvRecording: (rec: boolean) => void;
  isManualRecording: boolean;
  recordingSeconds: number;
  cctvToast: { message: string; type: 'success' | 'info' | 'warning' | 'error' | string } | null;
  webrtcConnected: boolean;
  webrtcError: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  connectWebRTC: () => void;
  handleTakeSnapshot: () => void;
  handleToggleManualRecord: () => void;
  triggerCctvToast: (message: string, type?: any) => void;
  handlePtzAction: (direction: 'up' | 'down' | 'left' | 'right' | 'center' | 'rig' | 'tank' | 'valve') => void;
  handlePtzPreset: (label: string, presetKey: string) => void;
  ptzMoving: string | null;
  latestData: TelemetryPoint;
  isHardwareOnline?: boolean;
  tempLabels?: TempLabels;
  cctvMediaList?: Array<any>;
}

export const CctvTab: React.FC<CctvTabProps> = ({
  selectedCamera,
  setSelectedCamera,
  cctvStreamSource,
  setCctvStreamSource,
  cctvIpUrl,
  cctvPublicUrl,
  setCctvPublicUrl,
  cctvAudioMuted,
  setCctvAudioMuted,
  audioUserActivated,
  setAudioUserActivated,
  cctvVolume,
  setCctvVolume,
  cctvRecording,
  setCctvRecording,
  isManualRecording,
  recordingSeconds,
  cctvToast,
  webrtcConnected,
  webrtcError,
  videoRef,
  connectWebRTC,
  handleTakeSnapshot,
  handleToggleManualRecord,
  triggerCctvToast,
  handlePtzAction,
  handlePtzPreset,
  ptzMoving,
  latestData,
  isHardwareOnline = false,
  tempLabels,
  cctvMediaList = []
}) => {
  const [isWifiModalOpen, setIsWifiModalOpen] = React.useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [streamRefreshKey, setStreamRefreshKey] = React.useState(0);
  const audioPlayerRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (audioPlayerRef.current) {
      if (cctvAudioMuted) {
        audioPlayerRef.current.pause();
      } else {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const audioSrc = isLocal
          ? 'http://127.0.0.1:8889/api/stream.mp4?src=he_cctv'
          : `${(cctvPublicUrl || '').replace(/\/+$/, '')}/api/stream.mp4?src=he_cctv`;
        if (audioPlayerRef.current.src !== audioSrc) {
          audioPlayerRef.current.src = audioSrc;
        }
        audioPlayerRef.current.volume = (cctvVolume || 100) / 100;
        audioPlayerRef.current.play().catch((err) => console.log('Audio autoplay prevented:', err));
      }
    }
  }, [cctvAudioMuted, cctvVolume, cctvPublicUrl]);

  React.useEffect(() => {
    if (!webrtcConnected) {
      connectWebRTC();
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const scriptId = 'fluidhe-video-stream-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'module';
        script.src = '/video-stream.js';
        document.head.appendChild(script);
      }
    }
  }, []);

  const wsRemoteUrl = React.useMemo(() => {
    if (!cctvIpUrl) return '';
    let url = cctvIpUrl.trim();
    if (url.startsWith('https://')) {
      url = url.replace(/^https:\/\//i, 'wss://');
    } else if (url.startsWith('http://')) {
      url = url.replace(/^http:\/\//i, 'ws://');
    }
    if (url.includes('/stream.html')) {
      url = url.replace(/\/stream\.html.*/i, '/api/ws?src=he_cctv');
    } else if (!url.includes('/api/ws')) {
      url = url.replace(/\/+$/, '') + '/api/ws?src=he_cctv';
    }
    return url;
  }, [cctvIpUrl]);

  const cloudflareEmbedUrl = React.useMemo(() => {
    // Jika diakses dari laptop lokal (localhost / 127.0.0.1), langsung tampilkan stream go2rtc lokal
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://127.0.0.1:8889/stream.html?src=he_cctv&mode=mse';
    }

    let raw = (cctvPublicUrl || cctvIpUrl || '').trim();
    if (raw.includes('screenshot-night-assists-baseball') || raw.includes('youtube')) {
      raw = '';
    }
    if (!raw) {
      return 'http://127.0.0.1:8889/stream.html?src=he_cctv&mode=mse';
    }
    if (raw.includes('/stream.html')) return raw;
    return `${raw.replace(/\/+$/, '')}/stream.html?src=he_cctv&mode=mse`;
  }, [cctvPublicUrl, cctvIpUrl]);

  return (
    <div id="tour-cctv-tab" className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              CCTV Live Monitoring — Heat Exchanger Lab
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
              STREAM ONLINE (REAL-TIME)
            </span>
            <button
              type="button"
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  const res = await fetch('/api/cctv/tunnel');
                  const data = await res.json();
                  if (data?.success && data?.publicUrl && setCctvPublicUrl) {
                    setCctvPublicUrl(data.publicUrl);
                  }
                } catch (_) {}
                setStreamRefreshKey((k) => k + 1);
                connectWebRTC();
                triggerCctvToast('Menyegarkan tayangan CCTV...', 'info');
                setTimeout(() => setIsRefreshing(false), 1200);
              }}
              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Segarkan Kamera"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Ganti Jaringan Wi-Fi (Menggantikan Channel Switchers) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWifiModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Wifi className="w-4 h-4 text-sky-600" />
            <span>Ganti Jaringan Wi-Fi</span>
          </button>
        </div>
      </div>

      {/* Main Monitoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left (2 Cols): Live Video Canvas & Floating Quick Actions */}
        <div className="lg:col-span-2 space-y-4">

          {/* Video Player Container */}
          <div
            id="cctv-player-container"
            className="relative bg-zinc-950 rounded-2xl overflow-hidden shadow-xl aspect-video flex flex-col justify-between p-4 border border-zinc-800 group"
          >

            {/* Top Floating Badges */}
            <div className="relative z-20 flex justify-between items-center text-xs text-white/90 font-mono pointer-events-none">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] font-semibold tracking-wider">
                  LIVE • RIG HEAT EXCHANGER LAB
                </span>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                {isManualRecording && (
                  <div className="flex items-center gap-1.5 bg-red-600/90 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold animate-pulse">
                    <Disc className="w-3 h-3 animate-spin" />
                    <span>REC {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</span>
                  </div>
                )}

                <div className="bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-[10px] font-semibold text-zinc-300">
                  1080P
                </div>

                <a
                  href={cloudflareEmbedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black/60 hover:bg-black/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-[10px] font-semibold text-sky-300 hover:text-white flex items-center gap-1 transition"
                  title="Buka Streaming di Tab Baru"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Tab Baru</span>
                </a>
              </div>
            </div>

            {/* Toast Notification Pill */}
            {cctvToast && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 bg-zinc-900/95 border border-zinc-700 backdrop-blur-md text-white text-xs font-medium rounded-xl shadow-lg animate-fade-in flex items-center gap-2">
                <span>{cctvToast.message}</span>
              </div>
            )}

            {/* Video Stream Element */}
            <div className="absolute inset-0 z-10 w-full h-full flex items-center justify-center bg-black overflow-hidden rounded-2xl">
              <iframe
                key={streamRefreshKey}
                src={`${cloudflareEmbedUrl}${cloudflareEmbedUrl.includes('?') ? '&' : '?'}_t=${streamRefreshKey}`}
                className="w-full h-full border-0 rounded-2xl bg-black"
                allow="autoplay *; fullscreen *; encrypted-media *; picture-in-picture *"
                allowFullScreen
                title="Live CCTV Feed - Rig Heat Exchanger"
              />
            </div>

            {/* Bottom Status & Snapshot Bar */}
            <div className="relative z-20 flex justify-between items-center bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 mt-auto">
              <div
                onClick={() => setIsStorageModalOpen(true)}
                className="flex items-center gap-2 text-white text-xs cursor-pointer hover:bg-white/10 px-2 py-1 rounded-lg transition"
                title="Buka Penyimpanan & Rekaman NVR"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCctvRecording(!cctvRecording);
                  }}
                  className="p-1 hover:bg-white/10 rounded-md transition text-zinc-300 hover:text-white cursor-pointer"
                  title={cctvRecording ? 'Jeda Perekaman NVR' : 'Mulai Merekam NVR'}
                >
                  {cctvRecording ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <span className="text-[11px] text-zinc-300 font-medium">
                  NVR: <strong className="text-emerald-400">{cctvRecording ? '24/7 Aktif' : 'Jeda'}</strong> (Klik untuk File)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('cctv-player-container');
                    if (el && !document.fullscreenElement) {
                      el.requestFullscreen?.();
                    } else if (document.exitFullscreen) {
                      document.exitFullscreen();
                    }
                  }}
                  className="p-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition cursor-pointer"
                  title="Layar Penuh"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-300" />
                </button>
              </div>
            </div>

          </div>

          {/* Quick Action Bar */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200/80">
              <span className="font-bold text-slate-800">Kontrol Cepat Kamera</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleTakeSnapshot}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 transition text-xs font-bold gap-1.5 border border-slate-200 shadow-xs cursor-pointer active:scale-95"
                title="Ambil foto snapshot resolusi tinggi dari kamera"
              >
                <Camera className="w-4 h-4 text-sky-600" />
                <span className="text-[11px]">Snapshot</span>
              </button>

              <button
                type="button"
                onClick={handleToggleManualRecord}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition text-xs font-bold gap-1.5 border shadow-xs cursor-pointer active:scale-95 ${isManualRecording
                    ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-500/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                title={isManualRecording ? 'Hentikan rekaman dan unduh file MP4' : 'Rekam klip live MP4 dengan audio'}
              >
                <Disc className={`w-4 h-4 ${isManualRecording ? 'animate-spin' : 'text-sky-600'}`} />
                <span className="text-[11px]">{isManualRecording ? 'Stop Rekam' : 'Rekam Video'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextMuted = !cctvAudioMuted;
                  setCctvAudioMuted(nextMuted);
                  setAudioUserActivated(!nextMuted);
                  if (audioPlayerRef.current) {
                    if (nextMuted) {
                      audioPlayerRef.current.pause();
                    } else {
                      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                      const audioSrc = isLocal
                        ? 'http://127.0.0.1:8889/api/stream.mp4?src=he_cctv'
                        : `${(cctvPublicUrl || '').replace(/\/+$/, '')}/api/stream.mp4?src=he_cctv`;
                      if (audioPlayerRef.current.src !== audioSrc) {
                        audioPlayerRef.current.src = audioSrc;
                      }
                      audioPlayerRef.current.volume = (cctvVolume || 100) / 100;
                      audioPlayerRef.current.play().catch((err) => console.log('Audio play error:', err));
                    }
                  }
                  triggerCctvToast(!nextMuted ? 'Suara CCTV aktif' : 'Suara CCTV dinonaktifkan', 'info');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition text-xs font-bold gap-1.5 border shadow-xs cursor-pointer active:scale-95 ${!cctvAudioMuted
                    ? 'bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white border-sky-400/40 shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                title="Nyalakan/matikan audio mikrofon laboratorium"
              >
                {!cctvAudioMuted ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                <span className="text-[11px]">{!cctvAudioMuted ? 'Suara ON' : 'Suara OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStorageModalOpen(true)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 transition text-xs font-bold gap-1.5 border border-slate-200 shadow-xs cursor-pointer active:scale-95"
                title="Buka File Rekaman MP4, Snapshot, & Google Drive"
              >
                <Folder className="w-4 h-4 text-sky-600" />
                <span className="text-[11px]">Penyimpanan</span>
              </button>
            </div>

            {!cctvAudioMuted && (
              <div className="pt-2 flex items-center gap-3 px-3.5 py-2 bg-white rounded-xl border border-slate-200 shadow-xs text-xs animate-fade-in">
                <Volume1 className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-[11px] text-slate-600 font-semibold shrink-0">Volume Suara Lab:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cctvVolume}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCctvVolume(val);
                    if (audioPlayerRef.current) {
                      audioPlayerRef.current.volume = val / 100;
                    }
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
                <span className="font-mono text-slate-800 font-bold w-8 text-right text-[11px]">{cctvVolume}%</span>
              </div>
            )}
          </div>

        </div>

        {/* Right (1 Col): PTZ D-Pad Controller & Real-Time Telemetry */}
        <PtzController
          ptzMoving={ptzMoving}
          onPtzAction={handlePtzAction}
          onPtzPreset={handlePtzPreset}
          latestData={latestData}
          connected={Boolean(webrtcConnected || isHardwareOnline || cctvPublicUrl)}
          isHardwareOnline={isHardwareOnline}
          tempLabels={tempLabels}
        />

      </div>

      {/* Hidden Audio Player for live stream sound */}
      <audio ref={audioPlayerRef} playsInline autoPlay className="hidden" />

      {/* Modal Pengaturan Wi-Fi CCTV */}
      <CctvWifiModal
        isOpen={isWifiModalOpen}
        onClose={() => setIsWifiModalOpen(false)}
        onConnected={() => connectWebRTC()}
        triggerToast={triggerCctvToast}
      />

      {/* Modal Penyimpanan CCTV & File Explorer */}
      <CctvStorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        snapshots={cctvMediaList}
      />
    </div>
  );
};

export default CctvTab;

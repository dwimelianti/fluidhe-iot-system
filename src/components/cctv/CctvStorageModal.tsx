'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Film,
  Camera,
  Download,
  Play,
  Pause,
  ExternalLink,
  RefreshCw,
  Folder,
  Calendar,
  Clock,
  FileVideo
} from 'lucide-react';

export interface CctvStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots?: Array<{
    id: string;
    type: 'snapshot' | 'video';
    title: string;
    timestamp: string;
    url?: string;
  }>;
}

interface RecordingItem {
  id: string;
  name: string;
  date: string;
  time: string;
  size: string;
  duration: string;
  url: string;
}

export const CctvStorageModal: React.FC<CctvStorageModalProps> = ({
  isOpen,
  onClose,
  snapshots = []
}) => {
  const [activeTab, setActiveTab] = useState<'recordings' | 'snapshots'>('recordings');
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  const fetchRecordings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cctv/recordings');
      const data = await res.json();
      if (Array.isArray(data?.recordings)) {
        setRecordings(data.recordings);
      }
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecordings();
    } else {
      setPlayingVideoUrl(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-sky-100 text-sky-700 rounded-2xl border border-sky-200">
              <HardDrive className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Penyimpanan &amp; Riwayat CCTV Lab
              </h3>
              <p className="text-xs text-slate-500">
                Manajemen file rekaman MP4 lokal, galeri snapshot foto, dan arsip Google Drive
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Drive Link */}
        <div className="flex flex-wrap items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('recordings');
                setPlayingVideoUrl(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'recordings'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-sky-600" />
              <span>Rekaman Video ({recordings.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('snapshots');
                setPlayingVideoUrl(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'snapshots'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-sky-600" />
              <span>Snapshot Foto ({snapshots.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchRecordings}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Perbarui daftar"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
            </button>
            <a
              href="https://drive.google.com/drive/folders/1f9bPwAzlAIIZa1EHQqm588U-bsiWh5hv?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Folder className="w-3.5 h-3.5 text-emerald-600" />
              <span>Buka Google Drive</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Video Preview Player if a video is selected */}
          {playingVideoUrl && (
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-300 px-1">
                <span className="font-mono text-[11px] truncate">{playingVideoUrl.split('file=')[1] || 'Preview Video'}</span>
                <button
                  type="button"
                  onClick={() => setPlayingVideoUrl(null)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                >
                  Tutup Player
                </button>
              </div>
              <video
                src={playingVideoUrl}
                controls
                autoPlay
                className="w-full max-h-64 rounded-xl bg-black"
              />
            </div>
          )}

          {activeTab === 'recordings' && (
            <>
              {recordings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileVideo className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
                  <p className="text-xs font-semibold">Belum ada file rekaman video di server.</p>
                  <p className="text-[11px] text-slate-400">
                    Klik tombol &quot;Rekam Video&quot; pada dashboard untuk merekam klip live MP4.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {recordings.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/80 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl shrink-0">
                          <Film className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 truncate">
                            {rec.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" /> {rec.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> {rec.time}
                            </span>
                            <span className="font-bold text-slate-600">{rec.size}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setPlayingVideoUrl(rec.url)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Putar</span>
                        </button>
                        <a
                          href={rec.url}
                          download={rec.name}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                          title="Unduh file MP4 ke komputer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Unduh</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'snapshots' && (
            <>
              {snapshots.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Camera className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
                  <p className="text-xs font-semibold">Belum ada snapshot foto tersimpan di sesi ini.</p>
                  <p className="text-[11px] text-slate-400">
                    Klik tombol &quot;Snapshot&quot; pada dashboard untuk mengambil foto resolusi tinggi.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="group p-2.5 bg-white border border-slate-200 rounded-2xl hover:border-sky-300 hover:shadow-md transition space-y-2"
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950">
                        {snap.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={snap.url}
                            alt={snap.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                            Tidak ada preview
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs px-1">
                        <div>
                          <p className="font-extrabold text-[11px] text-slate-800 truncate">
                            {snap.title}
                          </p>
                          <p className="text-[9.5px] text-slate-400 font-medium">
                            {snap.timestamp}
                          </p>
                        </div>
                        {snap.url && (
                          <a
                            href={snap.url}
                            download={`${snap.title.replace(/\s+/g, '_')}.jpg`}
                            className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition"
                            title="Unduh foto"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>Folder Server: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-700">./records/he_cctv/</code></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default CctvStorageModal;

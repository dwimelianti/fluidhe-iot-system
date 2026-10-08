import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';

function getRecordsDir(): string {
  const root = process.cwd();
  const dir = path.join(root, 'records', 'he_cctv');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Global active recording session
interface RecordingSession {
  fileName: string;
  filePath: string;
  startTime: number;
  writeStream: fs.WriteStream;
  req: any;
}

// Attach to global to survive Next.js module reloads in dev
const g = global as unknown as { __activeCctvRecording?: RecordingSession | null };
if (!g.__activeCctvRecording) {
  g.__activeCctvRecording = null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'status';

    if (action === 'start') {
      if (g.__activeCctvRecording) {
        return NextResponse.json({
          success: true,
          isRecording: true,
          fileName: g.__activeCctvRecording.fileName,
          seconds: Math.floor((Date.now() - g.__activeCctvRecording.startTime) / 1000)
        });
      }

      const dir = getRecordsDir();
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeTag = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const fileName = `Manual_Rec_${timeTag}.mp4`;
      const filePath = path.join(dir, fileName);

      const writeStream = fs.createWriteStream(filePath);

      // Connect to go2rtc MP4 stream
      const streamUrl = 'http://127.0.0.1:8889/api/stream.mp4?src=he_cctv';
      const clientReq = http.get(streamUrl, (res) => {
        if (res.statusCode !== 200) {
          writeStream.end();
          g.__activeCctvRecording = null;
          return;
        }
        res.pipe(writeStream);
      });

      clientReq.on('error', (err) => {
        console.error('Recording stream error:', err);
        try { writeStream.end(); } catch (_) {}
        g.__activeCctvRecording = null;
      });

      g.__activeCctvRecording = {
        fileName,
        filePath,
        startTime: Date.now(),
        writeStream,
        req: clientReq
      };

      return NextResponse.json({
        success: true,
        isRecording: true,
        fileName,
        message: 'Perekaman MP4 dimulai'
      });
    }

    if (action === 'stop') {
      const session = g.__activeCctvRecording;
      if (!session) {
        return NextResponse.json({
          success: true,
          isRecording: false,
          message: 'Tidak ada sesi perekaman aktif'
        });
      }

      const duration = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
      const fileName = session.fileName;
      const filePath = session.filePath;

      // Abort connection and finalize file
      try {
        session.req.destroy();
      } catch (_) {}
      try {
        session.writeStream.end();
      } catch (_) {}

      g.__activeCctvRecording = null;

      // Give file system 200ms to flush
      await new Promise((r) => setTimeout(r, 200));

      let fileSize = '0 MB';
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          fileSize = (stats.size / 1024 / 1024).toFixed(2) + ' MB';
        }
      } catch (_) {}

      return NextResponse.json({
        success: true,
        isRecording: false,
        fileName,
        durationSeconds: duration,
        fileSize,
        url: `/api/cctv/recordings/stream?file=${encodeURIComponent(fileName)}`,
        message: `Perekaman selesai (${duration} detik)`
      });
    }

    // Default: Status
    return NextResponse.json({
      isRecording: !!g.__activeCctvRecording,
      fileName: g.__activeCctvRecording?.fileName || null,
      seconds: g.__activeCctvRecording ? Math.floor((Date.now() - g.__activeCctvRecording.startTime) / 1000) : 0
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    isRecording: !!g.__activeCctvRecording,
    fileName: g.__activeCctvRecording?.fileName || null,
    seconds: g.__activeCctvRecording ? Math.floor((Date.now() - g.__activeCctvRecording.startTime) / 1000) : 0
  });
}

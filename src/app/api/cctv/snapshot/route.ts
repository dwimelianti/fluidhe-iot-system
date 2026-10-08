import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkxfbjpbaxnmgsnxrbpj.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGZianBiYXhubWdzbnhyYnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTIxNDY2MCwiZXhwIjoyMTAwNzkwNjYwfQ.AotyhjikKONI3q1OatoEenQ4wS1rb3WcCoTROCqR7WU';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || MASTER_KEY;

async function getCctvBaseUrl(): Promise<string> {
  // 1. Try local go2rtc first
  try {
    const localRes = await fetch('http://127.0.0.1:8889/api', { signal: AbortSignal.timeout(600) });
    if (localRes.ok) return 'http://127.0.0.1:8889';
  } catch (_) {}

  // 2. Try local config file
  try {
    const configPath = path.join(process.cwd(), 'data', 'cctv-tunnel.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (data?.publicUrl) return data.publicUrl.replace(/\/+$/, '');
    }
  } catch (_) {}

  // 3. Fallback: query Supabase telemetry_data for latest CCTV_URL
  try {
    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/telemetry_data?warning_status=like.CCTV_URL:*&order=id.desc&limit=1`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        },
        signal: AbortSignal.timeout(2000)
      }
    );
    if (supaRes.ok) {
      const rows = await supaRes.json();
      if (rows?.[0]?.warning_status) {
        const url = rows[0].warning_status.replace('CCTV_URL:', '').trim();
        if (url) return url.replace(/\/+$/, '');
      }
    }
  } catch (_) {}

  return 'http://127.0.0.1:8889';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get('download') === '1';
    const baseUrl = await getCctvBaseUrl();

    const snapshotUrl = `${baseUrl}/api/frame.jpeg?src=he_cctv`;
    const res = await fetch(snapshotUrl, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      return NextResponse.json({ error: 'Gagal mengambil frame dari CCTV' }, { status: 502 });
    }

    const imageBuffer = await res.arrayBuffer();
    const timeStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `CCTV_Snapshot_${timeStr}.jpg`;

    const headers: Record<string, string> = {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Length': imageBuffer.byteLength.toString(),
    };

    if (isDownload) {
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
    }

    return new Response(imageBuffer, {
      status: 200,
      headers
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Snapshot error' }, { status: 500 });
  }
}

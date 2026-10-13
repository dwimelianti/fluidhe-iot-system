import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkxfbjpbaxnmgsnxrbpj.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGZianBiYXhubWdzbnhyYnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTIxNDY2MCwiZXhwIjoyMTAwNzkwNjYwfQ.AotyhjikKONI3q1OatoEenQ4wS1rb3WcCoTROCqR7WU';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || MASTER_KEY;
const CONFIG_PATH = path.join(process.cwd(), 'data', 'cctv-tunnel.json');

async function getTunnelFromSupabase(): Promise<string> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/telemetry_data?warning_status=like.CCTV_URL:*&order=id.desc&limit=1`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        },
        cache: 'no-store'
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && typeof data[0]?.warning_status === 'string') {
        const raw = data[0].warning_status.replace(/^CCTV_URL:/i, '').trim();
        if (raw.startsWith('http')) {
          return raw;
        }
      }
    }
  } catch (e) {
    console.warn('Supabase CCTV tunnel fetch notice:', e);
  }
  return '';
}

async function saveTunnelToSupabase(publicUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/telemetry_data`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        temp_1: 0,
        temp_2: 0,
        temp_3: 0,
        temp_4: 0,
        pressure: 0,
        flow_rate: 0,
        heater_status: 'OFF',
        warning_status: `CCTV_URL:${publicUrl}`
      })
    });
    return res.ok;
  } catch (e) {
    console.warn('Supabase CCTV tunnel save error:', e);
    return false;
  }
}

async function testTunnelReachability(url: string): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeout);
    return res.status < 500;
  } catch (_) {
    return false;
  }
}

export async function GET() {
  // 1. Coba ambil dari Supabase Cloud (Sinkronisasi Global otomatis ke semua admin/Vercel)
  let publicUrl = await getTunnelFromSupabase();

  // 2. Fallback jika Supabase offline: baca dari file lokal / env
  if (!publicUrl) {
    if (process.env.NEXT_PUBLIC_CCTV_TUNNEL_URL) {
      publicUrl = process.env.NEXT_PUBLIC_CCTV_TUNNEL_URL.trim();
    } else if (fs.existsSync(CONFIG_PATH)) {
      try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data.publicUrl === 'string') {
          publicUrl = data.publicUrl.trim();
        }
      } catch (_) {}
    }
  }

  // Uji apakah URL tersebut benar-benar aktif dan dapat diakses (bukan stale/unplugged)
  const isOnline = publicUrl ? await testTunnelReachability(publicUrl) : false;

  return NextResponse.json({
    success: true,
    publicUrl: isOnline ? publicUrl : '',
    hasConfig: Boolean(publicUrl),
    isOnline
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const publicUrl = typeof body?.publicUrl === 'string' ? body.publicUrl.trim().replace(/\/+$/, '') : '';

    if (publicUrl) {
      // Simpan ke Supabase Cloud agar langsung terdistribusi ke Vercel
      await saveTunnelToSupabase(publicUrl);

      // Simpan juga ke cache lokal
      try {
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ publicUrl, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      publicUrl
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Failed to save tunnel config'
    }, { status: 500 });
  }
}

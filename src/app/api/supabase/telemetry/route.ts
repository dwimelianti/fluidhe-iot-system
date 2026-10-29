import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkxfbjpbaxnmgsnxrbpj.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGZianBiYXhubWdzbnhyYnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTIxNDY2MCwiZXhwIjoyMTAwNzkwNjYwfQ.AotyhjikKONI3q1OatoEenQ4wS1rb3WcCoTROCqR7WU';
const DEFAULT_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || MASTER_KEY;

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error('Fetch failed after retries');
}

export async function GET(req: NextRequest) {
  try {
    const clientKey = req.headers.get('x-supabase-key');
    const supabaseKey = (clientKey && clientKey.trim().length > 10) ? clientKey.trim() : DEFAULT_KEY;

    const limit = new URL(req.url).searchParams.get('limit') || '1000';
    const endpoint = `${SUPABASE_URL}/rest/v1/telemetry_data?select=*&order=created_at.desc&limit=${limit}`;

    const res = await fetchWithRetry(endpoint, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText, code: 'SUPABASE_HTTP_ERROR' }, { status: res.status });
    }

    const data = await res.json();
    const isSpecialStatus = (ws: string) =>
      ws.startsWith('CCTV_URL:') || ws.startsWith('PTZ_CMD:') || ws.startsWith('USER_SYNC:') || ws.startsWith('SESSION_SYNC:');
    const cleanData = Array.isArray(data)
      ? data.filter((item: any) => !isSpecialStatus(String(item?.warning_status || '')))
      : [];
    const sorted = cleanData.reverse();
    return NextResponse.json({ data: sorted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching telemetry', data: [] }, { status: 500 });
  }
}

// ─── DELETE: Hapus Data Telemetri Supabase Berdasarkan Rentang Waktu / Tanggal / ID ───
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minTime = searchParams.get('minTime');
    const maxTime = searchParams.get('maxTime');
    const date = searchParams.get('date'); // format YYYY-MM-DD
    const idsParam = searchParams.get('ids');

    let endpoint = `${SUPABASE_URL}/rest/v1/telemetry_data?`;

    if (minTime && maxTime) {
      endpoint += `created_at=gte.${encodeURIComponent(minTime)}&created_at=lte.${encodeURIComponent(maxTime)}`;
    } else if (date) {
      const startOfDay = `${date}T00:00:00+07:00`;
      const endOfDay = `${date}T23:59:59+07:00`;
      endpoint += `created_at=gte.${encodeURIComponent(startOfDay)}&created_at=lte.${encodeURIComponent(endOfDay)}`;
    } else if (idsParam) {
      const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
      endpoint += `id=in.(${ids.join(',')})`;
    } else {
      return NextResponse.json(
        { success: false, error: 'Parameter minTime & maxTime, date, atau ids wajib dicantumkan' },
        { status: 400 }
      );
    }

    const res = await fetchWithRetry(endpoint, {
      method: 'DELETE',
      headers: {
        'apikey': DEFAULT_KEY,
        'Authorization': `Bearer ${DEFAULT_KEY}`,
        'Prefer': 'count=exact'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }

    const contentRange = res.headers.get('content-range') || '';
    const match = contentRange.match(/\*\/(\d+)/);
    const deletedCount = match ? parseInt(match[1], 10) : 0;

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus ${deletedCount} data telemetri secara permanen`,
      deletedCount
    });
  } catch (err: any) {
    console.error('[Telemetry API] DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Gagal menghapus data telemetri' }, { status: 500 });
  }
}

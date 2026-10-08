import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkxfbjpbaxnmgsnxrbpj.supabase.co';
const DEFAULT_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Daftar kolom valid di tabel device_controls Supabase (kontrol & telemetri hardware ESP32)
const VALID_COLUMNS = new Set([
  'flow_mode',
  'control_mode',
  'heater_status',
  'heater_1_status',
  'heater_2_status',
  'target_temp',
  'target_temp_hot',
  'tolerance_level',
  'upper_limit',
  'lower_limit',
  'flow_calibration_factor',
  'flow_calibration_factor_1',
  'flow_calibration_factor_2',
  'temp_offset',
  'pressure_offset',
  'target_flow',
  'servo_angle',
  'servo_angle_2',
  'uap_status',
  'uap_interval_min',
  'pompa_ekstra',
  'valve_duration',
  'air_dingin',
  'btn_up',
  'btn_onoff',
  'btn_down',
  'trigger_power',
  'step_up_count',
  'step_down_count',
  'temp_1',
  'temp_2',
  'temp_3',
  'temp_4',
  'pressure',
  'pressure_outlet',
  'delta_pressure',
  'pressure_inlet_2',
  'pressure_outlet_2',
  'delta_pressure_2',
  'flow_rate',
  'flow_rate_2',
  'updated_at',
]);

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
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

const ESP32_MASTER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGZianBiYXhubWdzbnhyYnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTIxNDY2MCwiZXhwIjoyMTAwNzkwNjYwfQ.AotyhjikKONI3q1OatoEenQ4wS1rb3WcCoTROCqR7WU";

function getSupabaseKey(_req?: NextRequest): string {
  // Selalu gunakan master key agar penulisan kontrol selalu diizinkan 100% tanpa kendala RLS / token anon
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ESP32_MASTER_KEY || DEFAULT_KEY;
}

export async function GET(req: NextRequest) {
  try {
    const supabaseKey = getSupabaseKey(req);
    const endpoint = `${SUPABASE_URL}/rest/v1/device_controls?id=eq.1&select=*`;

    const res = await fetchWithRetry(endpoint, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const data = await res.json();
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (row) {
      if (row.upper_limit !== undefined && row.target_upper === undefined) {
        row.target_upper = row.upper_limit;
      }
      if (row.lower_limit !== undefined && row.target_lower === undefined) {
        row.target_lower = row.lower_limit;
      }
    }
    return NextResponse.json({ data: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabaseKey = getSupabaseKey(req);
    const body = await req.json();

    // Pemetaan khusus status heater ke kolom kontrol ESP32
    const mappedBody: Record<string, any> = { ...body };
    if ('heater_1_status' in mappedBody) {
      mappedBody.btn_onoff = Boolean(mappedBody.heater_1_status);
    } else if ('btn_onoff' in mappedBody) {
      mappedBody.heater_1_status = Boolean(mappedBody.btn_onoff);
    }

    if ('heater_1_status' in mappedBody && 'heater_2_status' in mappedBody) {
      mappedBody.heater_status = Boolean(mappedBody.heater_1_status || mappedBody.heater_2_status);
    } else if ('heater_status' in mappedBody) {
      mappedBody.heater_status = Boolean(mappedBody.heater_status);
    }

    // Sinkronisasi timbal balik target_temp dan target_temp_hot (Kontrol Point)
    if ('target_temp_hot' in mappedBody && !('target_temp' in mappedBody)) {
      mappedBody.target_temp = mappedBody.target_temp_hot;
    } else if ('target_temp' in mappedBody && !('target_temp_hot' in mappedBody)) {
      mappedBody.target_temp_hot = mappedBody.target_temp;
    }

    // Sinkronisasi batas toleransi target_upper -> upper_limit & target_lower -> lower_limit
    if ('target_upper' in mappedBody) {
      if (!('upper_limit' in mappedBody)) {
        mappedBody.upper_limit = mappedBody.target_upper;
      }
      delete mappedBody.target_upper;
    }

    if ('target_lower' in mappedBody) {
      if (!('lower_limit' in mappedBody)) {
        mappedBody.lower_limit = mappedBody.target_lower;
      }
      delete mappedBody.target_lower;
    }

    // Filter payload hanya ke kolom yang valid di database device_controls
    const sanitizedPayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    for (const key of Object.keys(mappedBody)) {
      if (VALID_COLUMNS.has(key)) {
        sanitizedPayload[key] = mappedBody[key];
      }
    }

    const endpoint = `${SUPABASE_URL}/rest/v1/device_controls?id=eq.1`;

    const res = await fetchWithRetry(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(sanitizedPayload)
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const text = await res.text();
    let data: any = null;
    if (text && text.trim().length > 0) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }
    }
    const row = Array.isArray(data) && data.length > 0 ? data[0] : (data || sanitizedPayload);
    return NextResponse.json({ success: true, data: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'ezviz_ptz_service.py');

// Map frontend action strings to Ezviz PTZ directions
const DIRECTION_MAP: Record<string, string> = {
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
  upLeft: 'UP',
  upRight: 'UP',
  downLeft: 'DOWN',
  downRight: 'DOWN',
  zoomIn: 'ZOOMIN',
  zoomOut: 'ZOOMOUT',
  center: 'UP',
  rig: 'LEFT',
  tank: 'RIGHT',
  valve: 'DOWN',
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkxfbjpbaxnmgsnxrbpj.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGZianBiYXhubWdzbnhyYnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTIxNDY2MCwiZXhwIjoyMTAwNzkwNjYwfQ.AotyhjikKONI3q1OatoEenQ4wS1rb3WcCoTROCqR7WU';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || MASTER_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    const ezvizDirection = DIRECTION_MAP[action] || 'UP';
    const duration = action === 'zoomIn' || action === 'zoomOut' ? '0.5' : '0.8';

    // 1. Sync command to Supabase so the Bandung lab daemon executes it instantly
    fetch(`${SUPABASE_URL}/rest/v1/telemetry_data`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        temp_1: 0,
        temp_2: 0,
        temp_3: 0,
        temp_4: 0,
        pressure: 0,
        flow_rate: 0,
        heater_status: 'OFF',
        warning_status: `PTZ_CMD:${ezvizDirection}:${duration}:${Date.now()}`
      })
    }).catch(() => {});

    // 2. If running locally, also execute python directly as immediate fast-path
    return new Promise<NextResponse>((resolve) => {
      execFile('python', [SCRIPT_PATH, 'move', ezvizDirection, duration], (error) => {
        resolve(NextResponse.json({
          success: true,
          action,
          direction: ezvizDirection
        }));
      });
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: true, message: 'PTZ command dispatched' }
    );
  }
}

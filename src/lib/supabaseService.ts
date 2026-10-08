import {
  TelemetryRow,
  DeviceControlsRow,
  ControlMode
} from '@/types';
import { getStoredAnonKey } from './supabase';

/**
 * Mengambil data telemetri awal dari Supabase (via Server Proxy API)
 */
export async function fetchLatestTelemetry(limit: number = 1000): Promise<{ data: TelemetryRow[] | null; error: Error | null }> {
  try {
    const customKey = getStoredAnonKey();
    const headers: Record<string, string> = {};
    if (customKey && customKey.trim().length > 10) {
      headers['x-supabase-key'] = customKey.trim();
    }

    const res = await fetch(`/api/supabase/telemetry?limit=${limit}`, { cache: 'no-store', headers });
    const json = await res.json();

    if (!res.ok || json.error) {
      const errMsg = json.error || 'Failed to fetch telemetry';
      return { data: null, error: new Error(errMsg) };
    }

    return { data: json.data as TelemetryRow[], error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during fetchLatestTelemetry';
    return { data: null, error: new Error(errorMsg) };
  }
}

/**
 * Mengambil status kontrol perangkat saat ini (Row ID = 1 via Server Proxy API)
 */
export async function fetchDeviceControls(): Promise<{ data: DeviceControlsRow | null; error: Error | null }> {
  try {
    const customKey = getStoredAnonKey();
    const headers: Record<string, string> = {};
    if (customKey && customKey.trim().length > 10) {
      headers['x-supabase-key'] = customKey.trim();
    }

    const res = await fetch('/api/supabase/controls', { cache: 'no-store', headers });
    const json = await res.json();

    if (!res.ok || json.error) {
      const errMsg = json.error || 'Failed to fetch device_controls';
      return { data: null, error: new Error(errMsg) };
    }

    return { data: json.data as DeviceControlsRow, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during fetchDeviceControls';
    return { data: null, error: new Error(errorMsg) };
  }
}

/**
 * Menulis / Meng-update Perintah Kontrol ke tabel device_controls (row id = 1 via Server Proxy API)
 */
export async function updateDeviceControls(
  updates: Partial<Omit<DeviceControlsRow, 'id'>>
): Promise<{ success: boolean; data: DeviceControlsRow | null; error: string | null }> {
  try {
    const customKey = getStoredAnonKey();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey && customKey.trim().length > 10) {
      headers['x-supabase-key'] = customKey.trim();
    }

    const res = await fetch('/api/supabase/controls', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      const errMsg = json.error || 'Failed to update device_controls';
      return { success: false, data: null, error: errMsg };
    }

    return { success: true, data: json.data as DeviceControlsRow, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Koneksi gagal saat memperbarui perintah kontrol';
    return { success: false, data: null, error: errorMsg };
  }
}

/**
 * Helper Spesifik Kontrol Sesuai Spesifikasi Prompt
 */
export const supabaseControlService = {
  // 1. Switch Mode Aliran ("COUNTER" / "CO-CURRENT")
  setFlowMode: async (flowMode: 'COUNTER' | 'CO-CURRENT') => {
    return updateDeviceControls({ flow_mode: flowMode });
  },

  // 2. Switch Control Mode ("AUTO" | "MANUAL" | "STANDBY" | "KALIBRASI" | "SHUTDOWN")
  setControlMode: async (controlMode: 'AUTO' | 'MANUAL' | 'STANDBY' | 'KALIBRASI' | 'SHUTDOWN') => {
    if (controlMode === 'AUTO') {
      return updateDeviceControls({
        control_mode: 'AUTO',
        flow_mode: 'COUNTER',
        air_dingin: true
      });
    }
    if (controlMode === 'STANDBY') {
      return updateDeviceControls({
        control_mode: 'STANDBY',
        btn_onoff: false,
        heater_1_status: false,
        heater_2_status: false,
        heater_status: false,
        air_dingin: false,
        pompa_ekstra: false,
        uap_status: false,
        servo_angle: 0,
        servo_angle_2: 0,
        flow_mode: 'COUNTER',
      });
    }
    return updateDeviceControls({ control_mode: controlMode });
  },

  // 2b. Sistem On / Off Terintegrasi Sinkron dengan Firmware ESP32
  startSystem: async (mode: ControlMode = 'AUTO') => {
    return updateDeviceControls({
      control_mode: mode,
      btn_onoff: true,
      heater_1_status: true,
      heater_2_status: true,
      heater_status: true,
      air_dingin: true,
      pompa_ekstra: true,
      uap_status: false,
      flow_mode: 'COUNTER',
      servo_angle: 100,
      servo_angle_2: 100,
    });
  },

  shutdownSystem: async () => {
    return updateDeviceControls({
      control_mode: 'SHUTDOWN',
      btn_onoff: false,
      heater_1_status: false,
      heater_2_status: false,
      heater_status: false,
      air_dingin: false,
      pompa_ekstra: false,
      uap_status: false,
      servo_angle: 0,
      servo_angle_2: 0,
      flow_mode: 'COUNTER',
    });
  },

  emergencyShutdown: async () => {
    return updateDeviceControls({
      control_mode: 'STANDBY',
      btn_onoff: false,
      heater_1_status: false,
      heater_2_status: false,
      heater_status: false,
      air_dingin: false,
      pompa_ekstra: false,
      uap_status: false,
      servo_angle: 0,
      servo_angle_2: 0,
    });
  },

  triggerPowerPush: async () => {
    return updateDeviceControls({ trigger_power: true });
  },

  // 3. Tombol Heater 1 & 2 Power Terpisah Sesuai ESP32
  setHeater1Power: async (status: boolean) => {
    // Heater 1 dikontrol via btn_onoff mekanik servo + heater_1_status
    return updateDeviceControls({ heater_1_status: status, btn_onoff: status });
  },

  setHeater2Power: async (status: boolean) => {
    // Heater 2 dikontrol via heater_2_status (Direct Relay PIN 14)
    return updateDeviceControls({ heater_2_status: status });
  },

  setHeaterPower: async (heaterStatus: boolean) => {
    return updateDeviceControls({
      heater_status: heaterStatus,
      heater_1_status: heaterStatus,
      heater_2_status: heaterStatus,
      btn_onoff: heaterStatus
    });
  },

  // 4. Slider/Input Target Suhu (float, e.g. 62.5)
  setTargetTemp: async (targetTemp: number) => {
    const parsedFloat = parseFloat(targetTemp.toFixed(1));
    return updateDeviceControls({ target_temp: parsedFloat });
  },

  // 4b. Thermostat Limits Histeresis Heater 2 (target_upper & target_lower)
  setThermostatLimits: async (targetUpper: number, targetLower: number) => {
    const up = parseFloat(targetUpper.toFixed(1));
    const low = parseFloat(targetLower.toFixed(1));
    return updateDeviceControls({ target_upper: up, target_lower: low });
  },

  // 4c. Thermostat Setup Baru (Set Point & Level P1-P7)
  setThermostatSetup: async (targetTempHot: number, toleranceLevel: number) => {
    const sp = parseFloat(targetTempHot.toFixed(1));
    const tol = Math.max(1, Math.min(7, Math.round(toleranceLevel)));
    const upper = parseFloat((sp + tol).toFixed(1));
    const lower = parseFloat((sp - tol).toFixed(1));
    return updateDeviceControls({
      target_temp_hot: sp,
      tolerance_level: tol,
      upper_limit: upper,
      lower_limit: lower,
      target_upper: upper,
      target_lower: lower,
      target_temp: sp
    });
  },

  // 4d. Kalibrasi Sensor Dinamis (Flow Dingin, Flow Panas, Temp Offset, Pressure Offset)
  setSensorCalibration: async (
    flowCalibrationFactor1: number,
    flowCalibrationFactor2: number,
    tempOffset: number,
    pressureOffset: number
  ) => {
    return updateDeviceControls({
      flow_calibration_factor: parseFloat(flowCalibrationFactor1.toFixed(2)),
      flow_calibration_factor_1: parseFloat(flowCalibrationFactor1.toFixed(2)),
      flow_calibration_factor_2: parseFloat(flowCalibrationFactor2.toFixed(2)),
      temp_offset: parseFloat(tempOffset.toFixed(1)),
      pressure_offset: parseFloat(pressureOffset.toFixed(2))
    });
  },

  // 5. Motorized Valve 1 (Panas) & Valve 2 (Dingin)
  setValve1Percent: async (percent: number) => {
    const parsed = Math.min(100, Math.max(10, Math.round(percent)));
    return updateDeviceControls({ servo_angle: parsed });
  },

  setValve2Percent: async (percent: number) => {
    const parsed = Math.min(100, Math.max(10, Math.round(percent)));
    return updateDeviceControls({ servo_angle_2: parsed });
  },

  setServoAngle: async (servoAngle: number) => {
    const parsedInt = Math.min(100, Math.max(10, Math.round(servoAngle)));
    return updateDeviceControls({ servo_angle: parsedInt });
  },

  // 6. Slider/Input Target Flow (0.0 - 10.0 L/min, float)
  setTargetFlow: async (targetFlow: number) => {
    const parsedFloat = parseFloat(Math.min(10.0, Math.max(0.0, targetFlow)).toFixed(1));
    return updateDeviceControls({ target_flow: parsedFloat });
  },

  // 7. Toggle Katup Uap Manual & Otomatis Berjadwal
  setUapStatus: async (uapStatus: boolean) => {
    return updateDeviceControls({ uap_status: uapStatus });
  },

  setUapAutoStatus: async (uapAutoStatus: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('he_uap_auto_status', String(uapAutoStatus));
      } catch (e) {}
    }
    return { success: true, data: null, error: null };
  },

  setUapIntervalMin: async (intervalMin: number) => {
    const clamped = Math.min(60, Math.max(1, Math.round(intervalMin)));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('he_uap_interval_min', String(clamped));
      } catch (e) {}
    }
    return updateDeviceControls({ uap_interval_min: clamped });
  },

  setUapDurationSec: async (durationSec: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(durationSec)));
    return updateDeviceControls({ valve_duration: clamped });
  },

  // 8. Toggle Katup Air Dingin (boolean true / false)
  setAirDinginStatus: async (airDinginStatus: boolean) => {
    return updateDeviceControls({ air_dingin: airDinginStatus });
  },

  // 8b. Toggle Pompa Sirkulasi Air Panas (boolean true / false)
  setPompaStatus: async (pompaStatus: boolean) => {
    return updateDeviceControls({ pompa_ekstra: pompaStatus });
  },

  // 9. Step Buttons UP/DOWN (Increment step_up_count / step_down_count & pulse momentary)
  triggerStepButton: async (btnName: 'btn_up' | 'btn_down', currentCount: number = 0) => {
    try {
      const countKey = btnName === 'btn_up' ? 'step_up_count' : 'step_down_count';
      const nextCount = currentCount + 1;
      const startRes = await updateDeviceControls({
        [btnName]: true,
        [countKey]: nextCount
      });
      if (!startRes.success) return startRes;

      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.warn(`Step button pulse start notice (${btnName}):`, err);
    } finally {
      return await updateDeviceControls({ [btnName]: false });
    }
  },

  triggerMomentaryButton: async (btnName: 'btn_up' | 'btn_onoff' | 'btn_down') => {
    try {
      const startRes = await updateDeviceControls({ [btnName]: true });
      if (!startRes.success) return startRes;

      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.warn(`Momentary button pulse start notice (${btnName}):`, err);
    } finally {
      return await updateDeviceControls({ [btnName]: false });
    }
  }
};

export { useSupabaseIntegration } from '@/hooks/useSupabaseIntegration';


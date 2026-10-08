import { useState, useEffect, useCallback, useRef } from 'react';
import {
  supabase,
  setSupabaseAnonKey,
  getStoredAnonKey
} from '@/lib/supabase';
import {
  TelemetryRow,
  DeviceControlsRow,
  ControlMode,
  SupabaseConnectionStatus
} from '@/types';
import {
  fetchLatestTelemetry,
  fetchDeviceControls,
  supabaseControlService
} from '@/lib/supabaseService';

/**
 * Helper untuk memfilter hanya paket telemetri hardware valid dari sensor ESP32
 */
export const isHardwareTelemetryRow = (r: TelemetryRow | null | undefined): boolean => {
  if (!r) return false;
  const ws = String(r.warning_status || '');
  if (ws.startsWith('CCTV_URL:') || ws.startsWith('PTZ_CMD:') || ws.startsWith('USER_SYNC:')) {
    return false;
  }
  // Tolak paket tiruan jika seluruh nilai suhu 0 dan bukan data normal
  if (r.temp_1 === 0 && r.temp_2 === 0 && r.temp_3 === 0 && r.temp_4 === 0 && r.pressure === 0 && ws !== 'NORMAL') {
    return false;
  }
  return true;
};

/**
 * Custom Hook untuk Integrasi Real-Time Telemetri & Kontrol Dua Arah ESP32 (Supabase)
 */
export function useSupabaseIntegration() {
  const [connectionStatus, setConnectionStatus] = useState<SupabaseConnectionStatus>('CONNECTING');
  const [isHardwareOnline, setIsHardwareOnline] = useState<boolean>(false);
  const [lastHardwareHeartbeat, setLastHardwareHeartbeat] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentAnonKey, setCurrentAnonKey] = useState<string>('');
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryRow | null>(null);
  const [telemetryStream, setTelemetryStream] = useState<TelemetryRow[]>([]);
  const [deviceControls, setDeviceControls] = useState<DeviceControlsRow>({
    id: 1,
    flow_mode: 'COUNTER',
    control_mode: 'MANUAL',
    heater_status: false,
    servo_angle: 100,
    servo_angle_2: 100,
    target_temp: 62.5,
    target_upper: 60,
    target_lower: 45,
    uap_status: false,
    uap_interval_min: 5,
    air_dingin: true,
    pompa_ekstra: true,
    target_flow: 2.0,
    btn_up: false,
    btn_onoff: false,
    btn_down: false,
    target_temp_hot: 50.0,
    tolerance_level: 1,
    upper_limit: 51.0,
    lower_limit: 49.0,
    flow_calibration_factor: 7.90,
    flow_calibration_factor_1: 7.90,
    flow_calibration_factor_2: 7.90,
    temp_offset: 0.0,
    pressure_offset: 0.0
  });
  const [activeMomentaryButtons, setActiveMomentaryButtons] = useState<{ btn_up: boolean; btn_onoff: boolean; btn_down: boolean }>({
    btn_up: false,
    btn_onoff: false,
    btn_down: false
  });
  const [isUpdatingControl, setIsUpdatingControl] = useState<boolean>(false);
  const lastUserActionTimeRef = useRef<number>(0);

  useEffect(() => {
    setCurrentAnonKey(getStoredAnonKey());
  }, []);

  // Initial Fetch Data (Telemetry & Controls)
  const initializeData = useCallback(async () => {
    setConnectionStatus('CONNECTING');
    setErrorMessage(null);

    const activeKey = getStoredAnonKey();
    if (!activeKey || activeKey.includes('YOUR_SUPABASE') || activeKey.includes('INVALID_KEY') || activeKey.trim().length < 10) {
      setErrorMessage('Supabase Anon Key belum diisi atau tidak valid. Silakan masukkan Public Anon Key Anda di bawah ini.');
      setConnectionStatus('ERROR');
      return;
    }

    try {
      // 1. Fetch initial telemetry
      const { data: initialTelemetry, error: telemetryErr } = await fetchLatestTelemetry(1000);
      if (telemetryErr) {
        if (telemetryErr.message.includes('Invalid API key') || telemetryErr.message.includes('apiKey') || telemetryErr.message.includes('Unregistered API key')) {
          setErrorMessage('Supabase Anon Key belum terdaftar di project Supabase ini. Silakan masukkan Public Anon Key (JWT starting with eyJhb...) dari Supabase Dashboard ➔ Project Settings ➔ API.');
        } else {
          setErrorMessage(`Gagal membaca telemetry_data: ${telemetryErr.message}`);
        }
        setConnectionStatus('ERROR');
      } else if (initialTelemetry && initialTelemetry.length > 0) {
        const cleanTelemetry = initialTelemetry.filter(isHardwareTelemetryRow);
        if (cleanTelemetry.length > 0) {
          setTelemetryStream(cleanTelemetry);
          const lastRow = cleanTelemetry[cleanTelemetry.length - 1];
          setLatestTelemetry(lastRow);
          setConnectionStatus('ONLINE');

          // Verifikasi waktu riil paket terakhir: hanya tandai ONLINE jika paket dikirim dalam 12 detik terakhir
          if (lastRow.created_at) {
            const rowTime = new Date(lastRow.created_at).getTime();
            const isFresh = !isNaN(rowTime) && (Date.now() - rowTime < 12000) && (rowTime - Date.now() < 12000);
            if (isFresh) {
              setLastHardwareHeartbeat(Date.now());
              setIsHardwareOnline(true);
            } else {
              setLastHardwareHeartbeat(null);
              setIsHardwareOnline(false);
            }
          } else {
            setLastHardwareHeartbeat(null);
            setIsHardwareOnline(false);
          }
        } else {
          setIsHardwareOnline(false);
          setLastHardwareHeartbeat(null);
        }
      } else {
        setIsHardwareOnline(false);
        setLastHardwareHeartbeat(null);
      }

      // 2. Fetch initial device controls
      const { data: controlsData, error: controlsErr } = await fetchDeviceControls();
      if (controlsErr) {
        if (!telemetryErr) {
          setErrorMessage(`Gagal membaca device_controls (Row ID=1): ${controlsErr.message}`);
        }
      } else if (controlsData) {
        let storedAuto = false;
        let storedInterval = 10;
        try {
          storedAuto = localStorage.getItem('he_uap_auto_status') === 'true';
          const savedInt = Number(localStorage.getItem('he_uap_interval_min'));
          if (savedInt > 0) storedInterval = savedInt;
        } catch (e) {}

        const h1 = controlsData.btn_onoff !== undefined
          ? Boolean(controlsData.btn_onoff)
          : (controlsData.heater_1_status !== undefined ? Boolean(controlsData.heater_1_status) : Boolean(controlsData.heater_status));
        const h2 = controlsData.heater_2_status !== undefined ? Boolean(controlsData.heater_2_status) : false;

        setDeviceControls((prev) => ({
          ...prev,
          ...controlsData,
          target_temp_hot: controlsData.target_temp_hot !== undefined ? controlsData.target_temp_hot : (controlsData.target_temp ?? 50.0),
          tolerance_level: controlsData.tolerance_level !== undefined ? controlsData.tolerance_level : 1,
          upper_limit: controlsData.upper_limit !== undefined ? controlsData.upper_limit : (controlsData.target_upper ?? 51.0),
          lower_limit: controlsData.lower_limit !== undefined ? controlsData.lower_limit : (controlsData.target_lower ?? 49.0),
          heater_1_status: h1,
          heater_2_status: h2,
          heater_status: h1 || h2,
          uap_auto_status: controlsData.uap_auto_status ?? (prev.uap_auto_status ?? storedAuto),
          uap_interval_min: controlsData.uap_interval_min ?? (prev.uap_interval_min ?? storedInterval),
        }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungkan ke Supabase';
      setErrorMessage(msg);
      setConnectionStatus('ERROR');
    }
  }, []);

  // Function to save new Anon Key dynamically from UI
  const saveAnonKey = (newKey: string) => {
    setSupabaseAnonKey(newKey);
    setCurrentAnonKey(newKey.trim());
    initializeData();
  };

  // Realtime & Hybrid Polling Setup for telemetry_data & device_controls
  useEffect(() => {
    initializeData();

    // Polling Interval Super Cepat (Setiap 1 Detik / 1000ms) untuk Sinkronisasi Real-Time Tanpa Delay
    const pollInterval = setInterval(() => {
      fetchLatestTelemetry(200).then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const cleanData = data.filter(isHardwareTelemetryRow);
          if (cleanData.length > 0) {
            setTelemetryStream((prev) => {
              if (prev.length === 0) return cleanData;
              const existingMap = new Map<string | number, TelemetryRow>();
              prev.forEach((r) => {
                const k = r.id ?? r.created_at;
                if (k) existingMap.set(k, r);
              });
              cleanData.forEach((r) => {
                const k = r.id ?? r.created_at;
                if (k) existingMap.set(k, r);
              });
              const merged = Array.from(existingMap.values());
              merged.sort((a, b) => {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return timeA - timeB;
              });
              return merged.slice(-1500);
            });
            const latest = cleanData[cleanData.length - 1];
            setLatestTelemetry(latest);
            setConnectionStatus('ONLINE');
            setErrorMessage(null);

            // Periksa waktu dibuatnya telemetri (toleransi ketat 12 detik demi kepastian live data)
            if (latest.created_at) {
              const rowTime = new Date(latest.created_at).getTime();
              const isFresh = !isNaN(rowTime) && (Date.now() - rowTime < 12000) && (rowTime - Date.now() < 12000);
              if (isFresh) {
                setLastHardwareHeartbeat(Date.now());
                setIsHardwareOnline(true);
              } else {
                setLastHardwareHeartbeat(null);
                setIsHardwareOnline(false);
              }
            } else {
              setLastHardwareHeartbeat(null);
              setIsHardwareOnline(false);
            }
          }
        }
      });
    }, 1000);

    const controlsPollInterval = setInterval(() => {
      fetchDeviceControls().then(({ data, error }) => {
        if (!error && data) {
          const isRecentlyUpdatedByUser = (Date.now() - lastUserActionTimeRef.current < 6000);
          setDeviceControls((prev) => {
            if (isRecentlyUpdatedByUser) {
              return {
                ...prev,
                ...data,
                control_mode: prev.control_mode,
                flow_mode: prev.flow_mode,
                heater_status: prev.heater_status,
                heater_1_status: prev.heater_1_status,
                heater_2_status: prev.heater_2_status,
                target_temp: prev.target_temp,
                target_temp_hot: prev.target_temp_hot,
                tolerance_level: prev.tolerance_level,
                upper_limit: prev.upper_limit,
                lower_limit: prev.lower_limit,
                target_upper: prev.target_upper,
                target_lower: prev.target_lower,
                flow_calibration_factor: prev.flow_calibration_factor,
                flow_calibration_factor_1: prev.flow_calibration_factor_1,
                flow_calibration_factor_2: prev.flow_calibration_factor_2,
                temp_offset: prev.temp_offset,
                pressure_offset: prev.pressure_offset,
                servo_angle: prev.servo_angle,
                servo_angle_2: prev.servo_angle_2,
                air_dingin: prev.air_dingin,
                uap_status: prev.uap_status,
                uap_auto_status: prev.uap_auto_status ?? false,
                uap_interval_min: prev.uap_interval_min ?? 10,
              };
            }

            const h1 = data.btn_onoff !== undefined
              ? Boolean(data.btn_onoff)
              : (data.heater_1_status !== undefined ? Boolean(data.heater_1_status) : Boolean(data.heater_status));
            const h2 = data.heater_2_status !== undefined ? Boolean(data.heater_2_status) : false;

            return {
              ...prev,
              ...data,
              target_temp_hot: data.target_temp_hot !== undefined ? data.target_temp_hot : (prev.target_temp_hot ?? data.target_temp ?? 50.0),
              tolerance_level: data.tolerance_level !== undefined ? data.tolerance_level : (prev.tolerance_level ?? 1),
              upper_limit: data.upper_limit !== undefined ? data.upper_limit : (data.target_upper ?? prev.upper_limit),
              lower_limit: data.lower_limit !== undefined ? data.lower_limit : (data.target_lower ?? prev.lower_limit),
              flow_calibration_factor: data.flow_calibration_factor !== undefined ? data.flow_calibration_factor : prev.flow_calibration_factor,
              flow_calibration_factor_1: data.flow_calibration_factor_1 !== undefined ? data.flow_calibration_factor_1 : (data.flow_calibration_factor ?? prev.flow_calibration_factor_1 ?? 7.90),
              flow_calibration_factor_2: data.flow_calibration_factor_2 !== undefined ? data.flow_calibration_factor_2 : (prev.flow_calibration_factor_2 ?? 7.90),
              temp_offset: data.temp_offset !== undefined ? data.temp_offset : prev.temp_offset,
              pressure_offset: data.pressure_offset !== undefined ? data.pressure_offset : prev.pressure_offset,
              heater_1_status: h1,
              heater_2_status: h2,
              heater_status: h1 || h2,
              uap_auto_status: prev.uap_auto_status ?? false,
              uap_interval_min: prev.uap_interval_min ?? 10,
            };
          });
        }
      });
    }, 2000);

    // 1. Telemetry Data Subscription (INSERT event)
    const telemetryChannel = supabase
      .channel('telemetry_realtime_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'telemetry_data' },
        (payload) => {
          const newRow = payload.new as TelemetryRow;
          // Abaikan sinyal CCTV URL atau perintah PTZ kamera dari aliran sensor
          if (!isHardwareTelemetryRow(newRow)) {
            return;
          }
          setLatestTelemetry(newRow);
          setTelemetryStream((prev) => {
            const exists = prev.some((r) => (r.id && newRow.id && r.id === newRow.id) || (r.created_at && newRow.created_at && r.created_at === newRow.created_at));
            if (exists) return prev;
            const updated = [...prev, newRow];
            return updated.slice(-1500);
          });
          setConnectionStatus('ONLINE');
          setLastHardwareHeartbeat(Date.now());
          setIsHardwareOnline(true);
          setErrorMessage(null);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('ONLINE');
        }
      });

    // 2. Device Controls Realtime Sync Subscription (UPDATE event on row id = 1)
    const controlsChannel = supabase
      .channel('device_controls_realtime_channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'device_controls' },
        (payload) => {
          const updatedControls = payload.new as DeviceControlsRow;
          const isRecentlyUpdatedByUser = (Date.now() - lastUserActionTimeRef.current < 4000);
          if (updatedControls && updatedControls.id === 1) {
            setDeviceControls((prev) => {
              if (isRecentlyUpdatedByUser) {
                return {
                  ...prev,
                  ...updatedControls,
                  control_mode: prev.control_mode,
                  flow_mode: prev.flow_mode,
                  heater_status: prev.heater_status,
                  heater_1_status: prev.heater_1_status,
                  heater_2_status: prev.heater_2_status,
                  target_temp: prev.target_temp,
                  servo_angle: prev.servo_angle,
                  servo_angle_2: prev.servo_angle_2,
                  air_dingin: prev.air_dingin,
                  uap_status: prev.uap_status,
                };
              }

              const h1 = updatedControls.btn_onoff !== undefined
                ? Boolean(updatedControls.btn_onoff)
                : (updatedControls.heater_1_status !== undefined ? Boolean(updatedControls.heater_1_status) : Boolean(updatedControls.heater_status));
              const h2 = updatedControls.heater_2_status !== undefined ? Boolean(updatedControls.heater_2_status) : false;

              return {
                ...prev,
                ...updatedControls,
                heater_1_status: h1,
                heater_2_status: h2,
                heater_status: h1 || h2,
                uap_auto_status: prev.uap_auto_status ?? false,
                uap_interval_min: prev.uap_interval_min ?? 10,
              };
            });
            setConnectionStatus('ONLINE');
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      clearInterval(controlsPollInterval);
      supabase.removeChannel(telemetryChannel);
      supabase.removeChannel(controlsChannel);
    };
  }, [initializeData]);

  // Periodic heartbeat watchdog to mark hardware offline if no packet for > 12s
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (lastHardwareHeartbeat && (Date.now() - lastHardwareHeartbeat < 12000)) {
        setIsHardwareOnline(true);
      } else {
        setIsHardwareOnline(false);
      }
    }, 1000);
    return () => clearInterval(watchdog);
  }, [lastHardwareHeartbeat]);

  // Handlers untuk Dispatch Command Write dengan Try-Catch & Feedback State
  const handleFlowModeChange = async (flowMode: 'COUNTER' | 'CO-CURRENT') => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, flow_mode: flowMode }));
    const result = await supabaseControlService.setFlowMode(flowMode);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update flow_mode: ${result.error}`);
    } else {
      setErrorMessage(null);
    }
    return result;
  };

  const handleControlModeChange = async (controlMode: ControlMode) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({
      ...prev,
      control_mode: controlMode,
      ...(controlMode === 'AUTO' ? { flow_mode: 'COUNTER', air_dingin: true, uap_auto_status: true } : {})
    }));
    const result = await supabaseControlService.setControlMode(controlMode);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update control_mode: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
      if (result.data) {
        setDeviceControls((prev) => ({
          ...prev,
          ...result.data,
          control_mode: result.data!.control_mode || controlMode,
          flow_mode: controlMode === 'AUTO' ? 'COUNTER' : (result.data!.flow_mode || prev.flow_mode),
        }));
      }
    }
    return result;
  };

  const handleHeater1PowerToggle = async (status: boolean) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => {
      const h2 = prev.heater_2_status ?? false;
      return {
        ...prev,
        heater_1_status: status,
        btn_onoff: status,
        heater_status: status || h2,
      };
    });
    const result = await supabaseControlService.setHeater1Power(status);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update heater_1_status: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleHeater2PowerToggle = async (status: boolean) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => {
      const h1 = prev.heater_1_status ?? false;
      return {
        ...prev,
        heater_2_status: status,
        heater_status: h1 || status,
      };
    });
    const result = await supabaseControlService.setHeater2Power(status);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update heater_2_status: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleHeaterPowerToggle = async (heaterStatus: boolean) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({
      ...prev,
      heater_status: heaterStatus,
      heater_1_status: heaterStatus,
      heater_2_status: heaterStatus,
      btn_onoff: heaterStatus,
    }));
    const result = await supabaseControlService.setHeaterPower(heaterStatus);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update heater_status: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleTargetTempChange = async (targetTemp: number) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, target_temp: targetTemp }));
    const result = await supabaseControlService.setTargetTemp(targetTemp);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update target_temp: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleThermostatLimitsChange = async (targetUpper: number, targetLower: number) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, target_upper: targetUpper, target_lower: targetLower }));
    const result = await supabaseControlService.setThermostatLimits(targetUpper, targetLower);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update Thermostat Limits: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleThermostatSetupChange = async (targetTempHot: number, toleranceLevel: number) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    const upper = parseFloat((targetTempHot + toleranceLevel).toFixed(1));
    const lower = parseFloat((targetTempHot - toleranceLevel).toFixed(1));
    setDeviceControls((prev) => ({
      ...prev,
      target_temp_hot: targetTempHot,
      tolerance_level: toleranceLevel,
      upper_limit: upper,
      lower_limit: lower,
      target_upper: upper,
      target_lower: lower,
      target_temp: targetTempHot
    }));
    const result = await supabaseControlService.setThermostatSetup(targetTempHot, toleranceLevel);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update Thermostat Setup: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleSensorCalibrationChange = async (
    flowFactor1: number,
    flowFactor2OrTempOffset: number,
    tempOffsetOrPressOffset?: number,
    pressOffset?: number
  ) => {
    let f1 = flowFactor1;
    let f2 = flowFactor1;
    let t = flowFactor2OrTempOffset;
    let p = tempOffsetOrPressOffset ?? 0;

    if (pressOffset !== undefined) {
      f1 = flowFactor1;
      f2 = flowFactor2OrTempOffset;
      t = tempOffsetOrPressOffset!;
      p = pressOffset;
    }

    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({
      ...prev,
      flow_calibration_factor: f1,
      flow_calibration_factor_1: f1,
      flow_calibration_factor_2: f2,
      temp_offset: t,
      pressure_offset: p
    }));
    const result = await supabaseControlService.setSensorCalibration(f1, f2, t, p);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update Kalibrasi Sensor: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleServoAngleChange = async (servoAngle: number) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, servo_angle: servoAngle }));
    const result = await supabaseControlService.setServoAngle(servoAngle);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update servo_angle: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleValve1Change = async (percent: number) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    const clamped = Math.min(100, Math.max(10, percent));
    setDeviceControls((prev) => ({ ...prev, servo_angle: clamped }));
    const result = await supabaseControlService.setValve1Percent(clamped);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update Katup Panas: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleValve2Change = async (percent: number) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    const clamped = Math.min(100, Math.max(10, percent));
    setDeviceControls((prev) => ({ ...prev, servo_angle_2: clamped }));
    const result = await supabaseControlService.setValve2Percent(clamped);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update Katup Dingin: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleTargetFlowChange = async (targetFlow: number) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, target_flow: targetFlow }));
    const result = await supabaseControlService.setTargetFlow(targetFlow);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update target_flow: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleUapStatusToggle = async (uapStatus: boolean) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, uap_status: uapStatus }));
    const result = await supabaseControlService.setUapStatus(uapStatus);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update uap_status: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleUapAutoToggle = async (uapAutoStatus: boolean) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    try {
      localStorage.setItem('he_uap_auto_status', String(uapAutoStatus));
    } catch (e) {}
    setDeviceControls((prev) => ({ ...prev, uap_auto_status: uapAutoStatus }));
    const result = await supabaseControlService.setUapAutoStatus(uapAutoStatus);
    setIsUpdatingControl(false);
    return { success: true };
  };

  const handleUapIntervalChange = async (intervalMin: number) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    try {
      localStorage.setItem('he_uap_interval_min', String(intervalMin));
    } catch (e) {}
    setDeviceControls((prev) => ({ ...prev, uap_interval_min: intervalMin }));
    const result = await supabaseControlService.setUapIntervalMin(intervalMin);
    setIsUpdatingControl(false);
    return { success: true };
  };

  const handleAirDinginToggle = async (airDinginStatus: boolean) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, air_dingin: airDinginStatus }));
    const result = await supabaseControlService.setAirDinginStatus(airDinginStatus);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update air_dingin: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handlePompaToggle = async (pompaStatus: boolean) => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, pompa_ekstra: pompaStatus }));
    const result = await supabaseControlService.setPompaStatus(pompaStatus);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update pompa: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleStepButtonPress = async (btnName: 'btn_up' | 'btn_down') => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    const countKey = btnName === 'btn_up' ? 'step_up_count' : 'step_down_count';
    const currentCount = deviceControls[countKey] ?? 0;
    const nextCount = currentCount + 1;

    setActiveMomentaryButtons((prev) => ({ ...prev, [btnName]: true }));
    setDeviceControls((prev) => ({
      ...prev,
      [btnName]: true,
      [countKey]: nextCount
    }));

    const result = await supabaseControlService.triggerStepButton(btnName, currentCount);
    
    setActiveMomentaryButtons((prev) => ({ ...prev, [btnName]: false }));
    setDeviceControls((prev) => ({ ...prev, [btnName]: false }));
    setIsUpdatingControl(false);

    if (!result.success) {
      setErrorMessage(`Gagal memicu tombol ${btnName}: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleMomentaryButtonPress = async (btnName: 'btn_up' | 'btn_onoff' | 'btn_down') => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setActiveMomentaryButtons((prev) => ({ ...prev, [btnName]: true }));
    setDeviceControls((prev) => ({ ...prev, [btnName]: true }));

    const result = await supabaseControlService.triggerMomentaryButton(btnName);
    
    setActiveMomentaryButtons((prev) => ({ ...prev, [btnName]: false }));
    setDeviceControls((prev) => ({ ...prev, [btnName]: false }));
    setIsUpdatingControl(false);

    if (!result.success) {
      setErrorMessage(`Gagal memicu tombol servo ${btnName}: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  // Sistem On / Off Terintegrasi Sinkron dengan Firmware ESP32
  const handleSystemStart = async (mode: ControlMode = 'AUTO') => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({
      ...prev,
      control_mode: mode === 'KALIBRASI' ? 'AUTO' : mode,
      btn_onoff: true,
      heater_1_status: true,
      heater_2_status: true,
      heater_status: true,
      air_dingin: true,
      pompa_ekstra: true,
      flow_mode: 'COUNTER',
      servo_angle: 100,
      servo_angle_2: 100,
    }));
    const result = await supabaseControlService.startSystem(mode);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal menyalakan sistem: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleSystemShutdown = async () => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({
      ...prev,
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
    }));
    const result = await supabaseControlService.shutdownSystem();
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal mematikan sistem: ${result.error}`);
    } else {
      setErrorMessage(null);
      lastUserActionTimeRef.current = Date.now();
    }
    return result;
  };

  const handleEmergencyShutdown = async () => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({
      ...prev,
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
    }));
    const result = await supabaseControlService.emergencyShutdown();
    setIsUpdatingControl(false);
    return result;
  };

  const handleTriggerPowerPush = async () => {
    lastUserActionTimeRef.current = Date.now();
    setIsUpdatingControl(true);
    const result = await supabaseControlService.triggerPowerPush();
    setIsUpdatingControl(false);
    return result;
  };

  return {
    connectionStatus,
    isHardwareOnline,
    lastHardwareHeartbeat,
    errorMessage,
    currentAnonKey,
    saveAnonKey,
    latestTelemetry,
    telemetryStream,
    deviceControls,
    activeMomentaryButtons,
    isUpdatingControl,
    initializeData,
    handleFlowModeChange,
    handleControlModeChange,
    handleHeaterPowerToggle,
    handleHeater1PowerToggle,
    handleHeater2PowerToggle,
    handleTargetTempChange,
    handleThermostatLimitsChange,
    handleThermostatSetupChange,
    handleSensorCalibrationChange,
    handleServoAngleChange,
    handleValve1Change,
    handleValve2Change,
    handleTargetFlowChange,
    handleUapStatusToggle,
    handleUapAutoToggle,
    handleUapIntervalChange,
    handleAirDinginToggle,
    handlePompaToggle,
    handleStepButtonPress,
    handleMomentaryButtonPress,
    handleSystemStart,
    handleSystemShutdown,
    handleEmergencyShutdown,
    handleTriggerPowerPush
  };
}

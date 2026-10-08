// ─── CENTRALIZED APPLICATION TYPES & INTERFACES ───

export type UserRole = 'admin' | 'operator';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  isOnline?: boolean;
  lastSeen?: number;
  isScheduleRestricted?: boolean;
  allowedStartDate?: string; // YYYY-MM-DD
  allowedEndDate?: string;   // YYYY-MM-DD
  allowedDays?: string[];
  allowedStartTime?: string;
  allowedEndTime?: string;
}

export interface TelemetryPoint {
  timestamp: string;
  created_at?: string;
  ti1: number; // Hot Inlet (°C)
  ti2: number; // Hot Outlet (°C - Monitored at Heater 2 Outlet)
  ti3: number; // Cold Inlet (°C)
  ti4: number; // Cold Outlet (°C)
  ti5: number; // Shell Mid 1 (°C)
  ti6: number; // Shell Mid 2 (°C)
  pi1: number; // Hot Inlet Press (atm-g)
  pi2: number; // Hot Outlet Press (atm-g)
  pi3: number; // Cold Inlet Press (atm-g)
  pi4: number; // Cold Outlet Press (atm-g)
  fc1: number; // Hot Flow Rate (L/min)
  fc2: number; // Cold Flow Rate (L/min)
  tc1Setpoint: number; // Target Temp (°C)
  heater1Active: boolean; // Dual Heater 1 Status
  heater2Active: boolean; // Dual Heater 2 Status
  mode: 'Counter-Current' | 'Co-Current';
}

export interface AlarmEvent {
  id: string;
  timestamp: string;
  sensor: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'Critical' | 'Warning' | 'Info';
  acknowledged: boolean;
}

export interface TelemetryRow {
  id?: number | string;
  created_at?: string;
  temp_1: number;         // Sensor Suhu T1 (°C)
  temp_2: number;         // Sensor Suhu T2 (°C)
  temp_3: number;         // Sensor Suhu T3 (°C)
  temp_4: number;         // Sensor Suhu T4 (°C)
  pressure: number;       // Tekanan Inlet 1 (atm-g)
  pressure_outlet?: number; // Tekanan Outlet 1 (atm-g)
  delta_pressure?: number;  // Delta Tekanan 1 (atm-g)
  pressure_inlet_2?: number; // Tekanan Inlet 2 (atm-g)
  pressure_outlet_2?: number;// Tekanan Outlet 2 (atm-g)
  delta_pressure_2?: number; // Delta Tekanan 2 (atm-g)
  flow_rate: number;      // Debit Air 1 (L/min)
  flow_rate_2?: number;   // Debit Air 2 (L/min)
  heater_status: string;  // "ON" | "OFF"
  warning_status: string; // "NORMAL" | "WARN_FLOW_HIGH"
}

export type ControlMode = 'AUTO' | 'MANUAL' | 'STANDBY' | 'KALIBRASI' | 'SHUTDOWN';

export interface DeviceControlsRow {
  id: number;                                // Row ID = 1 (int4)
  updated_at?: string;                       // timestamptz
  control_mode: ControlMode;                 // text (AUTO / MANUAL / STANDBY / KALIBRASI / SHUTDOWN)
  flow_mode: 'COUNTER' | 'CO-CURRENT';       // text
  heater_status: boolean;                    // bool
  heater_1_status?: boolean;                 // bool (Heater 1 status)
  heater_2_status?: boolean;                 // bool (Heater 2 status)
  trigger_power?: boolean;                   // bool (Manual Web Push Power Button)
  servo_angle: number;                       // int4 (Valve 1 / Panas: 0 - 100%)
  servo_angle_2?: number;                    // int4 (Valve 2 / Dingin: 0 - 100%)
  target_temp: number;                       // float4
  target_upper?: number;                     // float4 (Suhu Atas: Heater 2 OFF)
  target_lower?: number;                     // float4 (Suhu Bawah: Heater 2 ON)
  uap_status?: boolean;                      // bool
  uap_auto_status?: boolean;                 // UI extension
  uap_interval_min?: number;                 // int4 (Interval buka uap menit)
  valve_duration?: number;                   // int4 (Durasi buka uap detik)
  air_dingin?: boolean;                      // bool (Solenoid air dingin)
  pompa_ekstra?: boolean;                    // bool (Pompa sirkulasi air panas)
  target_flow?: number;                      // numeric
  btn_up?: boolean;                          // bool
  btn_onoff?: boolean;                       // bool
  btn_down?: boolean;                        // bool
  step_up_count?: number;                    // int4
  step_down_count?: number;                  // int4
  // Telemetri ESP32 yang disinkronkan ke device_controls
  temp_1?: number;
  temp_2?: number;
  temp_3?: number;
  temp_4?: number;
  pressure?: number;
  pressure_outlet?: number;
  delta_pressure?: number;
  pressure_inlet_2?: number;
  pressure_outlet_2?: number;
  delta_pressure_2?: number;
  flow_rate?: number;
  flow_rate_2?: number;
  // Thermostat Setup (Set Point & Level P1-P7) & Sensor Calibration
  target_temp_hot?: number;
  tolerance_level?: number;
  upper_limit?: number;
  lower_limit?: number;
  flow_calibration_factor?: number;
  flow_calibration_factor_1?: number;
  flow_calibration_factor_2?: number;
  temp_offset?: number;
  pressure_offset?: number;
}

export type SupabaseConnectionStatus = 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';

export type FlowMode = 'Counter-Current' | 'Co-Current';

export interface DualHeaterState {
  stage?: 'STAGE_1' | 'STAGE_2' | 'SETPOINT_REACHED' | 'STANDBY' | 'OFF' | string;
  powerWatt?: number;
  heater1Active?: boolean;
  heater2Active?: boolean;
  h1?: boolean;
  h2?: boolean;
  dutyCycle?: number;
  note?: string;
  description?: string;
}


export interface TempLabels {
  t1: string;
  t2: string;
  t3: string;
  t4: string;
}

export interface SyncFeedback {
  active: boolean;
  message: string;
  detail: string;
  type: 'syncing' | 'success' | 'idle';
}

export type SystemOperationalStatus = 'OFF' | 'STANDBY' | 'ACTIVE' | 'STOPPING';

export interface SystemSession {
  id: string; // e.g. "SES-20260908-103522"
  title?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  startTimeMs: number;
  endTime?: string; // HH:mm:ss
  endTimeMs?: number;
  durationSeconds?: number;
  operatorName: string;
  operatorEmail?: string;
  operatorRole?: string;
  classGroup?: string;
  pointsCount: number;
  flowMode?: string;
  maxTemp?: number;
  avgFlow?: number;
  data: TelemetryPoint[];
}


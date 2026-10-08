#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ESP32Servo.h>

// ============================================================================
// KREDENSIAL & KONFIGURASI WIFI
// ============================================================================
const char* WIFI_SSID     = "HE_IOT"; 
const char* WIFI_PASSWORD = "KimiaUAD1960";

// Supabase Configuration
String SUPABASE_URL = "https://kkxfbjpbaxnmgsnxrbpj.supabase.co";
String SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGZianBiYXhubWdzbnhyYnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTIxNDY2MCwiZXhwIjoyMTAwNzkwNjYwfQ.AotyhjikKONI3q1OatoEenQ4wS1rb3WcCoTROCqR7WU"; 

// ============================================================================
// PEMETAAN PIN ESP32
// ============================================================================
const int I2C_SDA = 22;
const int I2C_SCL = 21;

#define PIN_ONE_WIRE_BUS    15  // 4 Sensor Suhu (TI1, TI2, TI3, TI4)

#define PIN_FLOW_1          18  // FC1 (Hot Flow)
#define PIN_FLOW_2          19  // FC2 (Cold Flow)

#define PIN_FLOW_CONTROL    26  // Relay Mode Solenoid (Default: COUNTER)
#define PIN_HEATER_1        12  // Relay Daya AC Heater 1
#define PIN_HEATER_2        14  // Relay Daya AC Heater 2
#define PIN_KATUP_UAP       27  // 1 Relay untuk 3 Solenoid Uap
#define PIN_AIR_DINGIN      5   // Relay Air Dingin (Normally Closed)

#define PIN_SERVO_POWER     13  // Servo On/Off Heater 1
#define PIN_SERVO_UP        4   // Servo Tombol Naik Suhu
#define PIN_SERVO_DOWN      23  // Servo Tombol Turun Suhu
#define PIN_SERVO_VALVE     25  // Servo Valve Dinamis (FC1 / FC2)

// ============================================================================
// INISIALISASI OBJEK
// ============================================================================
Adafruit_ADS1X15 ads; // ADS1115 (0x48) untuk PI1, PI2, PI3, PI4

OneWire oneWire(PIN_ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

Servo servoPower;
Servo servoUp;
Servo servoDown;
Servo servoValve;

// ============================================================================
// VARIABEL SISTEM & PARAMETER KONTROL
// ============================================================================
String flowMode       = "COUNTER"; 
String controlMode    = "MANUAL";
bool webHeater1Cmd    = false;
bool webHeater2Cmd    = false;
bool webUapCmd        = false;
bool webAirDinginCmd  = false;
int  webServoAngle    = 52;

// Thermostat Setup (Kontrol Point & Level Toleransi P1–P7)
float kontrolPointHot       = 50.0; // Target Kontrol Point (°C)
int   toleranceLevel        = 1;    // Level Toleransi P1 - P7 (±1.0 - ±7.0 °C)
float upperLimit            = 51.0; // Batas Atas Histeresis (Heater 2 Booster OFF)
float lowerLimit            = 49.0; // Batas Bawah Histeresis (Heater 2 Booster ON)

// Variabel Kalibrasi Dinamis Sensor
float flowCalibrationFactor = 7.90; // Default kalibrasi flow YF-B1
float tempOffset            = 0.00; // Offset kalibrasi suhu (°C)
float pressureOffset        = 0.00; // Offset kalibrasi tekanan (bar)

// 1. Variabel Tekanan & Delta (PI1, PI2, PI3, PI4)
float pi1_hotInlet    = 0.00, pi2_hotOutlet = 0.00, deltaHotPress   = 0.00; 
float pi3_coldInlet   = 0.00, pi4_coldOutlet = 0.00, deltaColdPress  = 0.00; 

// 2. Variabel Flow Rate (FC1 & FC2)
volatile long pulseCount1 = 0;
volatile long pulseCount2 = 0;
float fc1_hotFlow     = 0.00; // L/min
float fc2_coldFlow    = 0.00; // L/min
unsigned long oldTime = 0;

// 3. Variabel Suhu (TI1, TI2, TI3, TI4)
float ti1_hotInlet    = 0.00;
float ti2_hotOutlet   = 0.00;
float ti3_coldInlet   = 0.00;
float ti4_coldOutlet  = 0.00;

void IRAM_ATTR pulseCounter1() { pulseCount1++; }
void IRAM_ATTR pulseCounter2() { pulseCount2++; }

unsigned long lastSyncTime = 0;
const long syncInterval = 2000; 

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("  SISTEM HEAT EXCHANGER ITENAS - STARTING UP...   ");
  Serial.println("==================================================");

  // Setup Flow Sensors
  pinMode(PIN_FLOW_1, INPUT_PULLUP);
  pinMode(PIN_FLOW_2, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_1), pulseCounter1, FALLING);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_2), pulseCounter2, FALLING);

  // Inisialisasi Suhu
  sensors.begin();

  // Inisialisasi I2C & ADS1115
  Wire.begin(I2C_SDA, I2C_SCL);
  if (!ads.begin(0x48)) {
    Serial.println("[WARNING] ADS1115 (0x48) tidak terdeteksi!");
  } else {
    Serial.println("[SUCCESS] ADS1115 (0x48) Terdeteksi untuk 4 Sensor Tekanan.");
  }
  ads.setGain(GAIN_ONE);

  // Setup Relay
  pinMode(PIN_FLOW_CONTROL, OUTPUT);
  pinMode(PIN_HEATER_1, OUTPUT); 
  pinMode(PIN_HEATER_2, OUTPUT);
  pinMode(PIN_KATUP_UAP, OUTPUT);
  pinMode(PIN_AIR_DINGIN, OUTPUT);

  // Default State (Relay OFF / HIGH tergantung modul, Mode Counter)
  digitalWrite(PIN_FLOW_CONTROL, HIGH); // Default COUNTER
  digitalWrite(PIN_HEATER_1, HIGH);
  digitalWrite(PIN_HEATER_2, HIGH);
  digitalWrite(PIN_KATUP_UAP, HIGH);
  digitalWrite(PIN_AIR_DINGIN, HIGH);

  // Setup Servo
  servoPower.attach(PIN_SERVO_POWER);
  servoUp.attach(PIN_SERVO_UP);
  servoDown.attach(PIN_SERVO_DOWN);
  servoValve.attach(PIN_SERVO_VALVE);

  // Posisi awal aman
  servoPower.write(0);
  servoUp.write(0);
  servoDown.write(0);
  servoValve.write(90);

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Menghubungkan ke WiFi (");
  Serial.print(WIFI_SSID);
  Serial.print(")");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[SUCCESS] WiFi Terhubung! IP: " + WiFi.localIP().toString());
}

void sendDataToSupabase() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL certificate verification for HTTPS

  HTTPClient http;
  String endpoint = SUPABASE_URL + "/rest/v1/device_controls?id=eq.1";
  
  http.begin(client, endpoint);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  StaticJsonDocument<800> jsonDoc;
  
  // Mapping telemetri ke database device_controls
  jsonDoc["pressure"]         = serialized(String(pi1_hotInlet, 2));     // PI1
  jsonDoc["pressure_outlet"]  = serialized(String(pi2_hotOutlet, 2));    // PI2
  jsonDoc["delta_pressure"]   = serialized(String(deltaHotPress, 2));  // ΔP Hot
  jsonDoc["pressure_inlet_2"]  = serialized(String(pi3_coldInlet, 2));   // PI3
  jsonDoc["pressure_outlet_2"] = serialized(String(pi4_coldOutlet, 2));  // PI4
  jsonDoc["delta_pressure_2"]  = serialized(String(deltaColdPress, 2)); // ΔP Cold
  
  jsonDoc["flow_rate"]   = serialized(String(fc1_hotFlow, 2));  // FC1
  jsonDoc["flow_rate_2"] = serialized(String(fc2_coldFlow, 2)); // FC2

  jsonDoc["temp_1"] = serialized(String(ti1_hotInlet, 2));   // TI1
  jsonDoc["temp_2"] = serialized(String(ti2_hotOutlet, 2));  // TI2
  jsonDoc["temp_3"] = serialized(String(ti3_coldInlet, 2));  // TI3
  jsonDoc["temp_4"] = serialized(String(ti4_coldOutlet, 2)); // TI4
  
  String requestBody;
  serializeJson(jsonDoc, requestBody);

  int httpCode = http.sendRequest("PATCH", (uint8_t*)requestBody.c_str(), requestBody.length());
  
  if (httpCode > 0) {
    Serial.println("[SUPABASE SUCCESS] Telemetri disinkronkan ke Web Dashboard.");
  } else {
    Serial.print("[SUPABASE ERROR]: ");
    Serial.println(http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void syncAndExecuteSensorsAndRelays() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    return;
  }

  // =========================================================================
  // 1. PERHITUNGAN FLOW RATE (FC1 & FC2)
  // =========================================================================
  unsigned long currentTime = millis();
  unsigned long elapsedTime = currentTime - oldTime;

  if (elapsedTime >= 1000) { // Hitung setiap 1 detik
    noInterrupts();
    unsigned long p1 = pulseCount1;
    unsigned long p2 = pulseCount2;
    pulseCount1 = 0;
    pulseCount2 = 0;
    interrupts();
    
    oldTime = currentTime;

    // Hitung Frekuensi (Hz) dari pulsa mentah
    float freq1 = ((float)p1 / (float)elapsedTime) * 1000.0;
    float freq2 = ((float)p2 / (float)elapsedTime) * 1000.0;

    // Hitung Debit (L/min) dengan rumus kalibrasi dinamis
    float activeCal = (flowCalibrationFactor > 0.5) ? flowCalibrationFactor : 7.90;
    fc1_hotFlow = freq1 / activeCal;
    fc2_coldFlow = freq2 / activeCal;
  }

  // =========================================================================
  // 2. PEMBACAAN 4 SENSOR SUHU (TI1, TI2, TI3, TI4) + OFFSET KALIBRASI
  // =========================================================================
  sensors.requestTemperatures(); 
  float rawTi1 = sensors.getTempCByIndex(0);
  float rawTi2 = sensors.getTempCByIndex(1);
  float rawTi3 = sensors.getTempCByIndex(2);
  float rawTi4 = sensors.getTempCByIndex(3);

  ti1_hotInlet   = (rawTi1 == DEVICE_DISCONNECTED_C) ? 0.00 : (rawTi1 + tempOffset);
  ti2_hotOutlet  = (rawTi2 == DEVICE_DISCONNECTED_C) ? 0.00 : (rawTi2 + tempOffset);
  ti3_coldInlet  = (rawTi3 == DEVICE_DISCONNECTED_C) ? 0.00 : (rawTi3 + tempOffset);
  ti4_coldOutlet = (rawTi4 == DEVICE_DISCONNECTED_C) ? 0.00 : (rawTi4 + tempOffset);

  // =========================================================================
  // 3. PEMBACAAN 4 SENSOR TEKANAN & DELTA (PI1, PI2, PI3, PI4) + OFFSET KALIBRASI
  // =========================================================================
  int16_t adcPi1 = ads.readADC_SingleEnded(0); // PI1 (Hot Inlet)
  int16_t adcPi2 = ads.readADC_SingleEnded(1); // PI2 (Hot Outlet)
  int16_t adcPi3 = ads.readADC_SingleEnded(2); // PI3 (Cold Inlet)
  int16_t adcPi4 = ads.readADC_SingleEnded(3); // PI4 (Cold Outlet)

  pi1_hotInlet   = (ads.computeVolts(adcPi1) * 5.00) + pressureOffset; // Konversi ke bar/atm
  pi2_hotOutlet  = (ads.computeVolts(adcPi2) * 5.00) + pressureOffset;
  pi3_coldInlet  = (ads.computeVolts(adcPi3) * 5.00) + pressureOffset;
  pi4_coldOutlet = (ads.computeVolts(adcPi4) * 5.00) + pressureOffset;

  if (pi1_hotInlet < 0) pi1_hotInlet = 0;
  if (pi2_hotOutlet < 0) pi2_hotOutlet = 0;
  if (pi3_coldInlet < 0) pi3_coldInlet = 0;
  if (pi4_coldOutlet < 0) pi4_coldOutlet = 0;

  // Perhitungan Nilai Delta Pressure
  deltaHotPress  = pi1_hotInlet - pi2_hotOutlet;   // ΔP Hot
  deltaColdPress = pi3_coldInlet - pi4_coldOutlet; // ΔP Cold

  // =========================================================================
  // 4. AMBIL PERINTAH DARI WEB SUPABASE (GET) & KONTROL AKTUATOR
  // =========================================================================
  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL certificate verification for HTTPS

  HTTPClient http;
  String endpoint = SUPABASE_URL + "/rest/v1/device_controls?id=eq.1&select=*";
  
  http.begin(client, endpoint);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
  http.setTimeout(4000); 

  int httpCode = http.GET();
  
  if (httpCode > 0 && httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(2048);
    DeserializationError err = deserializeJson(doc, payload);
    
    if (!err) {
      JsonObject obj = doc[0];
      
      if (obj.containsKey("flow_mode")) {
        flowMode = obj["flow_mode"].as<String>();
        flowMode.trim();
      }

      if (obj.containsKey("control_mode")) {
        controlMode = obj["control_mode"].as<String>();
        controlMode.trim();
      }

      webUapCmd       = obj["uap_status"] | false;
      webAirDinginCmd = obj["air_dingin"] | false;
      webServoAngle   = obj["servo_angle"] | 52;
      
      bool heaterStatusWeb = obj["heater_status"] | false;

      // --- SINKRONISASI THERMOSTAT SETUP (KONTROL POINT & LEVEL P1-P7) ---
      if (obj.containsKey("target_temp_hot")) {
        kontrolPointHot = obj["target_temp_hot"].as<float>();
      } else if (obj.containsKey("target_temp")) {
        kontrolPointHot = obj["target_temp"].as<float>();
      }

      if (obj.containsKey("tolerance_level")) {
        toleranceLevel = obj["tolerance_level"].as<int>();
      }

      if (obj.containsKey("upper_limit")) {
        upperLimit = obj["upper_limit"].as<float>();
      } else if (obj.containsKey("target_upper")) {
        upperLimit = obj["target_upper"].as<float>();
      } else {
        upperLimit = kontrolPointHot + toleranceLevel;
      }

      if (obj.containsKey("lower_limit")) {
        lowerLimit = obj["lower_limit"].as<float>();
      } else if (obj.containsKey("target_lower")) {
        lowerLimit = obj["target_lower"].as<float>();
      } else {
        lowerLimit = kontrolPointHot - toleranceLevel;
      }

      // --- SINKRONISASI KALIBRASI SENSOR DINAMIS ---
      if (obj.containsKey("flow_calibration_factor")) {
        float fc = obj["flow_calibration_factor"].as<float>();
        if (fc > 0.5) flowCalibrationFactor = fc;
      }
      if (obj.containsKey("temp_offset")) {
        tempOffset = obj["temp_offset"].as<float>();
      }
      if (obj.containsKey("pressure_offset")) {
        pressureOffset = obj["pressure_offset"].as<float>();
      }

      // -------------------------------------------------------------
      // LOGIKA KONTROL WATER HEATER (AUTO / MANUAL)
      // -------------------------------------------------------------
      if (controlMode == "AUTO") {
        // Kontrol Histeresis Otomatis Berbasis Kontrol Point & Toleransi P1-P7
        float refTemp = (ti1_hotInlet > 0.0) ? ti1_hotInlet : ti2_hotOutlet;

        if (refTemp >= upperLimit) {
          // Suhu mencapai batas atas toleransi: Matikan Heater 2 (Booster)
          webHeater2Cmd = false;
          if (refTemp >= upperLimit + 2.0) {
            // Cutoff darurat pemanas utama jika melebihi batas atas + 2°C
            webHeater1Cmd = false;
          } else {
            webHeater1Cmd = true;
          }
        } else if (refTemp <= lowerLimit) {
          // Suhu di bawah batas toleransi: Nyalakan Heater 1 dan Heater 2 Booster
          webHeater1Cmd = true;
          webHeater2Cmd = true;
        } else {
          // Berada di dalam rentang Kontrol Point: Heater 1 ON menjaga suhu, Heater 2 OFF
          webHeater1Cmd = true;
          webHeater2Cmd = false;
        }
      } else {
        // Mode MANUAL: Mengikuti switch independen Heater 1 dan Heater 2 dari Dashboard
        if (obj.containsKey("heater_1_status")) {
          webHeater1Cmd = obj["heater_1_status"].as<bool>();
        } else if (obj.containsKey("btn_onoff")) {
          webHeater1Cmd = obj["btn_onoff"].as<bool>();
        } else {
          webHeater1Cmd = heaterStatusWeb;
        }

        if (obj.containsKey("heater_2_status")) {
          webHeater2Cmd = obj["heater_2_status"].as<bool>();
        } else {
          webHeater2Cmd = heaterStatusWeb;
        }
      }

      // --- EKSEKUSI RELAY SOLENOID MODE (Default: COUNTER) ---
      if (flowMode == "CO-CURRENT") {
        digitalWrite(PIN_FLOW_CONTROL, LOW);   
      } else {
        digitalWrite(PIN_FLOW_CONTROL, HIGH); // Default COUNTER
      }

      // --- EKSEKUSI RELAY HEATER & SERVO UNTUK HEATER 1 ---
      digitalWrite(PIN_HEATER_1, webHeater1Cmd ? LOW : HIGH);
      digitalWrite(PIN_HEATER_2, webHeater2Cmd ? LOW : HIGH);

      if (webHeater1Cmd) {
        servoPower.write(45);
      } else {
        servoPower.write(0);
      }

      // Gerakkan Servo Valve dinamis berdasarkan servo_angle dari Web
      int clampedAngle = constrain(webServoAngle, 0, 180);
      servoValve.write(clampedAngle);

      // --- EKSEKUSI KATUP UAP & AIR DINGIN ---
      digitalWrite(PIN_KATUP_UAP, webUapCmd ? LOW : HIGH);
      digitalWrite(PIN_AIR_DINGIN, webAirDinginCmd ? LOW : HIGH);
    }
  } else {
    Serial.print("[SUPABASE GET ERROR]: ");
    Serial.println(httpCode > 0 ? String(httpCode) : http.errorToString(httpCode).c_str());
  }
  http.end();

  // Kirim data telemetri terbaru ke Web Supabase
  sendDataToSupabase();
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - lastSyncTime >= syncInterval) {
    lastSyncTime = currentMillis;
    syncAndExecuteSensorsAndRelays();
  }
}

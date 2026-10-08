#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ============================================================================
// KREDENSIAL & KONFIGURASI WIFI
// ============================================================================
const char* WIFI_SSID     = "HE_IOT"; 
const char* WIFI_PASSWORD = "KimiaUAD1960";

String SUPABASE_URL = "https://kkxfbjpbaxnmgsnxrbpj.supabase.co";
String SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGZianBiYXhubWdzbnhyYnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTIxNDY2MCwiZXhwIjoyMTAwNzkwNjYwfQ.AotyhjikKONI3q1OatoEenQ4wS1rb3WcCoTROCqR7WU";

// ============================================================================
// PEMETAAN PIN ESP32
// ============================================================================
const int I2C_SDA = 21; const int I2C_SCL = 22;
#define PIN_ONE_WIRE_BUS    15  
#define PIN_FLOW_1          18  
#define PIN_FLOW_2          19  

// 1. RELAY UAP & FLOW CONTROL (ACTIVE-LOW: LOW = NYALA/BUKA, HIGH = MATI/TUTUP)
#define PIN_FLOW_CONTROL    26  
#define PIN_UAP             27  

// 2. RELAY VALVE (ACTIVE-HIGH: HIGH = GERAK/MUTER, LOW = NGEREM/DIAM)
#define PIN_RELAY_BUKA      32  
#define PIN_RELAY_TUTUP     25  
#define PIN_VALVE2_BUKA     16   
#define PIN_VALVE2_TUTUP    33   

// 3. RELAY HEATER, AIR DINGIN, & POMPA EKSTRA (ACTIVE-HIGH: HIGH = NYALA, LOW = MATI)
#define PIN_HEATER_1        12  
#define PIN_HEATER_2        14  
#define PIN_AIR_DINGIN      5   
#define PIN_POMPA_EKSTRA    17  

const int RELAY_OFF = HIGH; 
const int RELAY_ON  = LOW;  

// ============================================================================
// INISIALISASI OBJEK & VARIABEL
// ============================================================================
Adafruit_ADS1X15 ads; OneWire oneWire(PIN_ONE_WIRE_BUS); DallasTemperature sensors(&oneWire);
DeviceAddress sensor1 = { 0x28, 0x92, 0x37, 0x6C, 0x00, 0x00, 0x00, 0x96 };
DeviceAddress sensor2 = { 0x28, 0xCA, 0x78, 0x6C, 0x00, 0x00, 0x00, 0x9F };
DeviceAddress sensor3 = { 0x28, 0xB5, 0x85, 0x6B, 0x00, 0x00, 0x00, 0xEF };
DeviceAddress sensor4 = { 0x28, 0x37, 0xC7, 0x69, 0x00, 0x00, 0x00, 0x06 };

bool adsConnected = false; 
int currentValvePercent  = 0; 
int currentValve2Percent = 0; 

const unsigned long WAKTU_BUKA_MAP[6]  = { 0, 2400, 4800, 7200, 9600, 12000 }; 
const unsigned long WAKTU_TUTUP_MAP[6] = { 0, 2400, 4800, 7200, 9600, 12000 }; 

volatile long pulseCount1 = 0, pulseCount2 = 0;
float fc1_counterFlow = 0.00, fc2_cocurrentFlow = 0.00; unsigned long oldTime = 0; 
float ti1_hotInlet = 0, ti2_hotOutlet = 0, ti3_coldInlet = 0, ti4_coldOutlet = 0;
float pi1_hotInlet = 0, pi2_hotOutlet = 0, deltaHotPress = 0;
float pi3_coldInlet = 0, pi4_coldOutlet = 0, deltaColdPress = 0;

unsigned long lastSyncTime = 0; 
const long syncInterval = 3000;  

unsigned long lastUapOpenTime = 0; unsigned long uapCloseTime = 0;
bool isUapOpen = false; const float BATAS_TEKANAN_BAHAYA = 2.0; 

volatile unsigned long lastMicros1 = 0;
void IRAM_ATTR pulseCounter1() { 
  unsigned long currentMicros = micros();
  if (currentMicros - lastMicros1 > 15000) { pulseCount1++; lastMicros1 = currentMicros; }
}

volatile unsigned long lastMicros2 = 0;
void IRAM_ATTR pulseCounter2() { 
  unsigned long currentMicros = micros();
  if (currentMicros - lastMicros2 > 15000) { pulseCount2++; lastMicros2 = currentMicros; }
}

// ⚡ KONTROL RELAY HEATER 1 MURNI TANPA TOMBOL VIRTUAL
void setListrikHeater1(bool nyalakan) {
  if (nyalakan) {
    digitalWrite(PIN_HEATER_1, HIGH); 
  } else {
    digitalWrite(PIN_HEATER_1, LOW); 
  }
}

void triggerEmergencyShutdown() {
  Serial.println("\n[FAIL-SAFE] Koneksi terputus! Mematikan aktuator...");
  digitalWrite(PIN_HEATER_1, LOW); 
  digitalWrite(PIN_HEATER_2, LOW); 
  digitalWrite(PIN_AIR_DINGIN, LOW); 
  digitalWrite(PIN_POMPA_EKSTRA, LOW); 
  digitalWrite(PIN_FLOW_CONTROL, HIGH);  
  if (pi1_hotInlet >= BATAS_TEKANAN_BAHAYA || pi3_coldInlet >= BATAS_TEKANAN_BAHAYA) { digitalWrite(PIN_UAP, LOW); } else { digitalWrite(PIN_UAP, HIGH); }
  digitalWrite(PIN_RELAY_BUKA, LOW); digitalWrite(PIN_RELAY_TUTUP, LOW); 
  digitalWrite(PIN_VALVE2_BUKA, LOW); digitalWrite(PIN_VALVE2_TUTUP, LOW);
}

void setup() {
  Serial.begin(115200); delay(3000); 
  Serial.println("\n[SYSTEM] Menyiapkan perangkat...");

  pinMode(PIN_FLOW_CONTROL, OUTPUT); digitalWrite(PIN_FLOW_CONTROL, HIGH); 
  pinMode(PIN_UAP, OUTPUT); digitalWrite(PIN_UAP, HIGH); 
  
  pinMode(PIN_RELAY_BUKA, OUTPUT); digitalWrite(PIN_RELAY_BUKA, LOW); 
  pinMode(PIN_RELAY_TUTUP, OUTPUT); digitalWrite(PIN_RELAY_TUTUP, LOW);
  pinMode(PIN_VALVE2_BUKA, OUTPUT); digitalWrite(PIN_VALVE2_BUKA, LOW);
  pinMode(PIN_VALVE2_TUTUP, OUTPUT); digitalWrite(PIN_VALVE2_TUTUP, LOW);

  pinMode(PIN_HEATER_1, OUTPUT); digitalWrite(PIN_HEATER_1, LOW); 
  pinMode(PIN_HEATER_2, OUTPUT); digitalWrite(PIN_HEATER_2, LOW); 
  pinMode(PIN_AIR_DINGIN, OUTPUT); digitalWrite(PIN_AIR_DINGIN, LOW); 
  pinMode(PIN_POMPA_EKSTRA, OUTPUT); digitalWrite(PIN_POMPA_EKSTRA, LOW); 

  delay(500); 

  pinMode(PIN_FLOW_1, INPUT_PULLUP); pinMode(PIN_FLOW_2, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_1), pulseCounter1, FALLING); attachInterrupt(digitalPinToInterrupt(PIN_FLOW_2), pulseCounter2, FALLING);

  Wire.begin(I2C_SDA, I2C_SCL); sensors.begin(); sensors.setResolution(9); sensors.setWaitForConversion(true); 
  if (ads.begin(0x48)) { adsConnected = true; ads.setGain(GAIN_ONE); Serial.println("[OK] ADS1115 Siap."); } 

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[OK] WiFi Terhubung!");
  
  currentValvePercent = 0;
  currentValve2Percent = 0;
}

unsigned long getDurasiMapping(int dariPersen, int kePersen) {
  int idxDari = dariPersen / 20, idxKe = kePersen / 20;
  if (idxDari == idxKe) return 0;
  if (kePersen > dariPersen) {
    unsigned long d = WAKTU_BUKA_MAP[idxDari], k = WAKTU_BUKA_MAP[idxKe];
    return k > d ? (k - d) : (d - k);
  } else {
    unsigned long d = WAKTU_TUTUP_MAP[idxDari], k = WAKTU_TUTUP_MAP[idxKe];
    return d > k ? (d - k) : (k - d);
  }
}

// ============================================================================
// FUNGSI KONTROL VALVE 1 (PANAS) DENGAN INTERLOCK AMAN
// ============================================================================
void aturMotorizedValve(int targetPersen) {
  targetPersen = constrain(targetPersen, 0, 100); 
  targetPersen = (targetPersen + 10) / 20 * 20; 
  
  if (targetPersen == currentValvePercent) return;
  unsigned long durasiGerak = getDurasiMapping(currentValvePercent, targetPersen);

  digitalWrite(PIN_RELAY_BUKA, HIGH); 
  digitalWrite(PIN_RELAY_TUTUP, HIGH); 
  delay(50); 

  if (targetPersen > currentValvePercent) {
    digitalWrite(PIN_RELAY_TUTUP, HIGH); 
    delay(50); 
    digitalWrite(PIN_RELAY_BUKA, LOW);   
    
    unsigned long start = millis(); 
    while (millis() - start < durasiGerak) { 
      if (isUapOpen && (millis() >= uapCloseTime)) { isUapOpen = false; digitalWrite(PIN_UAP, HIGH); }
      delay(5); yield(); 
    } 
    digitalWrite(PIN_RELAY_BUKA, HIGH);  
  } else {
    digitalWrite(PIN_RELAY_BUKA, HIGH); 
    delay(50); 
    digitalWrite(PIN_RELAY_TUTUP, LOW);  
    
    unsigned long start = millis(); 
    while (millis() - start < durasiGerak) { 
      if (isUapOpen && (millis() >= uapCloseTime)) { isUapOpen = false; digitalWrite(PIN_UAP, HIGH); }
      delay(5); yield(); 
    } 
    digitalWrite(PIN_RELAY_TUTUP, HIGH); 
  }
  
  currentValvePercent = targetPersen;
}

// ============================================================================
// FUNGSI KONTROL VALVE 2 (DINGIN) - DISEARAHKAN DENGAN VALVE 1
// ============================================================================
void aturMotorizedValve2(int targetPersen) {
  targetPersen = constrain(targetPersen, 0, 100); 
  targetPersen = (targetPersen + 10) / 20 * 20; 
  
  if (targetPersen == currentValve2Percent) return;
  unsigned long durasiGerak = getDurasiMapping(currentValve2Percent, targetPersen);

  digitalWrite(PIN_VALVE2_BUKA, HIGH); 
  digitalWrite(PIN_VALVE2_TUTUP, HIGH); 
  delay(50);

  // ⚡ DIBALIK AGAR SESUAI DENGAN FISIK KATUP DINGIN
  if (targetPersen < currentValve2Percent) {
    digitalWrite(PIN_VALVE2_TUTUP, HIGH); 
    delay(50); 
    digitalWrite(PIN_VALVE2_BUKA, LOW);   
    
    unsigned long start = millis(); 
    while (millis() - start < durasiGerak) { 
      if (isUapOpen && (millis() >= uapCloseTime)) { isUapOpen = false; digitalWrite(PIN_UAP, HIGH); }
      delay(5); yield(); 
    } 
    digitalWrite(PIN_VALVE2_BUKA, HIGH);  
  } else {
    digitalWrite(PIN_VALVE2_BUKA, HIGH); 
    delay(50); 
    digitalWrite(PIN_VALVE2_TUTUP, LOW);  
    
    unsigned long start = millis(); 
    while (millis() - start < durasiGerak) { 
      if (isUapOpen && (millis() >= uapCloseTime)) { isUapOpen = false; digitalWrite(PIN_UAP, HIGH); }
      delay(5); yield(); 
    } 
    digitalWrite(PIN_VALVE2_TUTUP, HIGH); 
  }
  
  currentValve2Percent = targetPersen;
}

void syncAndExecuteSystem() {
  if (WiFi.status() != WL_CONNECTED) { 
    unsigned long startWait = millis();
    while(WiFi.status() != WL_CONNECTED && millis() - startWait < 3000) { WiFi.reconnect(); delay(100); }
    if (WiFi.status() != WL_CONNECTED) { triggerEmergencyShutdown(); return; }
  }

  HTTPClient httpGet;
  httpGet.begin(SUPABASE_URL + "/rest/v1/device_controls?id=eq.1");
  httpGet.addHeader("apikey", SUPABASE_KEY); httpGet.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
  httpGet.setTimeout(2000); 

  bool currentBtnOnOff = false; 
  bool webPompaEkstra = false;

  if (httpGet.GET() == 200) {
    DynamicJsonDocument doc(2048);
    if (!deserializeJson(doc, httpGet.getString())) {
      JsonObject obj = doc[0];

      String systemMode    = obj["control_mode"] | "STANDBY";
      currentBtnOnOff      = obj["btn_onoff"] | false;
      bool webHeater2      = obj["heater_2_status"] | false; 
      bool webUap          = obj["uap_status"] | false;
      bool webAirDingin    = obj["air_dingin"] | false; 
      webPompaEkstra       = obj["pompa_ekstra"] | true; 
      String flowMode      = obj["flow_mode"] | "COUNTER";

      int targetValve      = obj["servo_angle"] | 0;   
      int targetValve2     = obj["servo_angle_2"] | 0; 
      int currentStepUp    = obj["step_up_count"] | 0;
      int currentStepDown  = obj["step_down_count"] | 0;

      float targetTempHot  = obj["target_temp_hot"] | 50.00;
      int toleranceLevel   = obj["tolerance_level"] | 1;
      float upperLimit     = targetTempHot + (float)toleranceLevel;
      float lowerLimit     = targetTempHot - (float)toleranceLevel;
      
      // Masing-masing sensor flow kini memiliki nilai faktor kalibrasi sendiri
      float flowCalibrationFactor1 = obj["flow_calibration_factor_1"] | 7.90;
      float flowCalibrationFactor2 = obj["flow_calibration_factor_2"] | 7.90;
      float tempOffset            = obj["temp_offset"] | 0.00;
      float pressureOffset        = obj["pressure_offset"] | 0.00;
      int uapIntervalMin          = obj["uap_interval_min"] | 5;

      unsigned long currentTime = millis();
      if (currentTime - oldTime >= 1000) { 
        noInterrupts(); unsigned long p1 = pulseCount1, p2 = pulseCount2; pulseCount1 = pulseCount2 = 0; interrupts();
        unsigned long elapsedTime = currentTime - oldTime; oldTime = currentTime;
        fc1_counterFlow = (((float)p1 / elapsedTime) * 1000.0) / flowCalibrationFactor1; 
        fc2_cocurrentFlow = (((float)p2 / elapsedTime) * 1000.0) / flowCalibrationFactor2; 
      }

      sensors.requestTemperatures(); delay(250); 
      float t1 = sensors.getTempC(sensor1), t2 = sensors.getTempC(sensor2), t3 = sensors.getTempC(sensor3), t4 = sensors.getTempC(sensor4);
      ti1_hotInlet  = (t1 > -127.00) ? (t1 + tempOffset) : ti1_hotInlet; 
      ti2_hotOutlet = (t2 > -127.00) ? (t2 + tempOffset) : ti2_hotOutlet;
      ti3_coldInlet = (t3 > -127.00) ? (t3 + tempOffset) : ti3_coldInlet; 
      ti4_coldOutlet= (t4 > -127.00) ? (t4 + tempOffset) : ti4_coldOutlet;

      if (adsConnected) {
        pi1_hotInlet  = max(0.0f, (float)(ads.computeVolts(ads.readADC_SingleEnded(0)) * 2.00f) + pressureOffset); 
        pi2_hotOutlet = max(0.0f, (float)(ads.computeVolts(ads.readADC_SingleEnded(1)) * 2.00f) + pressureOffset); 
        deltaHotPress = pi1_hotInlet - pi2_hotOutlet;
        
        pi3_coldInlet = max(0.0f, (float)(ads.computeVolts(ads.readADC_SingleEnded(2)) * 2.00f) + pressureOffset); 
        pi4_coldOutlet= max(0.0f, (float)(ads.computeVolts(ads.readADC_SingleEnded(3)) * 2.00f) + pressureOffset); 
        deltaColdPress = pi3_coldInlet - pi4_coldOutlet;
      }

      digitalWrite(PIN_FLOW_CONTROL, (flowMode == "COUNTER") ? HIGH : LOW);
      bool isTekananBahaya = (abs(deltaHotPress) >= BATAS_TEKANAN_BAHAYA || abs(deltaColdPress) >= BATAS_TEKANAN_BAHAYA);

      static bool isKalibrasiDone = false;
      if (systemMode != "KALIBRASI") { isKalibrasiDone = false; }

      if (systemMode == "STANDBY") {
        setListrikHeater1(false); 
        digitalWrite(PIN_HEATER_2, LOW); 
        digitalWrite(PIN_AIR_DINGIN, LOW); 
        digitalWrite(PIN_POMPA_EKSTRA, LOW); 
        digitalWrite(PIN_UAP, HIGH);
        
        aturMotorizedValve(0);
        aturMotorizedValve2(0);
      }
      else if (systemMode == "KALIBRASI") {
        if (!isKalibrasiDone) {
            digitalWrite(PIN_RELAY_BUKA, LOW); digitalWrite(PIN_VALVE2_BUKA, LOW); delay(50);
            digitalWrite(PIN_RELAY_TUTUP, HIGH); digitalWrite(PIN_VALVE2_TUTUP, HIGH); 
            unsigned long startZero = millis(); 
            while(millis() - startZero < 3000) { 
              if (isUapOpen && (millis() >= uapCloseTime)) { isUapOpen = false; digitalWrite(PIN_UAP, HIGH); }
              yield(); delay(10); 
            } 
            digitalWrite(PIN_RELAY_TUTUP, LOW); digitalWrite(PIN_VALVE2_TUTUP, LOW); 
            currentValvePercent = 0; currentValve2Percent = 0;

            setListrikHeater1(true);
            digitalWrite(PIN_HEATER_2, HIGH); 
            digitalWrite(PIN_AIR_DINGIN, HIGH); 
            digitalWrite(PIN_POMPA_EKSTRA, HIGH); 
            digitalWrite(PIN_UAP, HIGH); digitalWrite(PIN_FLOW_CONTROL, HIGH); 

            digitalWrite(PIN_RELAY_TUTUP, LOW); digitalWrite(PIN_VALVE2_TUTUP, LOW); delay(50);
            digitalWrite(PIN_RELAY_BUKA, HIGH); digitalWrite(PIN_VALVE2_BUKA, HIGH); 
            unsigned long startOpen = millis(); 
            while(millis() - startOpen < 3000) { 
              if (isUapOpen && (millis() >= uapCloseTime)) { isUapOpen = false; digitalWrite(PIN_UAP, HIGH); }
              yield(); delay(10); 
            } 
            digitalWrite(PIN_RELAY_BUKA, LOW); digitalWrite(PIN_VALVE2_BUKA, LOW); 
            currentValvePercent = 100; currentValve2Percent = 100;

            HTTPClient httpReady; httpReady.begin(SUPABASE_URL + "/rest/v1/device_controls?id=eq.1");
            httpReady.addHeader("apikey", SUPABASE_KEY); httpReady.addHeader("Authorization", "Bearer " + SUPABASE_KEY); httpReady.addHeader("Content-Type", "application/json");
            String patchPayload = "{\"control_mode\":\"AUTO\",\"btn_onoff\":true,\"heater_2_status\":true,\"air_dingin\":true,\"pompa_ekstra\":true,\"uap_status\":false,\"servo_angle\":100,\"servo_angle_2\":100}";
            httpReady.sendRequest("PATCH", (uint8_t*)patchPayload.c_str(), patchPayload.length()); 
            httpReady.end();

            isKalibrasiDone = true; 
        }
      }
      else if (systemMode == "SHUTDOWN") {
        setListrikHeater1(false); 
        digitalWrite(PIN_HEATER_2, LOW); 
        digitalWrite(PIN_AIR_DINGIN, LOW); 
        digitalWrite(PIN_POMPA_EKSTRA, LOW); 
        digitalWrite(PIN_UAP, HIGH);

        aturMotorizedValve(0);
        aturMotorizedValve2(0);

        HTTPClient httpOff; httpOff.begin(SUPABASE_URL + "/rest/v1/device_controls?id=eq.1");
        httpOff.addHeader("apikey", SUPABASE_KEY); httpOff.addHeader("Authorization", "Bearer " + SUPABASE_KEY); httpOff.addHeader("Content-Type", "application/json");
        httpOff.sendRequest("PATCH", (uint8_t*)"{\"control_mode\":\"STANDBY\",\"btn_onoff\":false,\"heater_2_status\":false,\"air_dingin\":false,\"pompa_ekstra\":false,\"uap_status\":false,\"servo_angle\":0,\"servo_angle_2\":0}", 150); httpOff.end();
      } 
      else if (systemMode == "MANUAL") {
        if (isTekananBahaya) { 
          if (!isUapOpen && (millis() - lastUapOpenTime >= 5000UL)) { 
            lastUapOpenTime = millis(); uapCloseTime = millis() + 1000UL; isUapOpen = true; digitalWrite(PIN_UAP, LOW); 
          } 
        } else { 
          digitalWrite(PIN_UAP, webUap ? LOW : HIGH); 
        }
        
        digitalWrite(PIN_AIR_DINGIN, webAirDingin ? HIGH : LOW);        
        digitalWrite(PIN_POMPA_EKSTRA, webPompaEkstra ? HIGH : LOW); 
        digitalWrite(PIN_HEATER_2, webHeater2 ? HIGH : LOW);            
        setListrikHeater1(currentBtnOnOff);

        aturMotorizedValve(targetValve);
        aturMotorizedValve2(targetValve2); 
      } 
      else if (systemMode == "AUTO") { 
        float suhuAcuan = ti1_hotInlet; 
        if (flowMode == "CO-CURRENT") {
            suhuAcuan = (ti1_hotInlet + ti2_hotOutlet) / 2.0; 
        }

        // Kontrol Heater Otomatis berdasarkan batas suhu P1-P7
        if (suhuAcuan >= upperLimit) {
            setListrikHeater1(false);
            digitalWrite(PIN_HEATER_2, LOW);
        } 
        else if (suhuAcuan <= lowerLimit) {
            setListrikHeater1(true);
            digitalWrite(PIN_HEATER_2, HIGH);
        }
        else {
            setListrikHeater1(true);
            digitalWrite(PIN_HEATER_2, LOW);
        }

        aturMotorizedValve(targetValve);
        aturMotorizedValve2(targetValve2);

        // Pompa Ekstra & Air Dingin murni independen dari tombol web
        digitalWrite(PIN_AIR_DINGIN, webAirDingin ? HIGH : LOW); 
        digitalWrite(PIN_POMPA_EKSTRA, webPompaEkstra ? HIGH : LOW); 

        if (isTekananBahaya) { 
          if (!isUapOpen && (millis() - lastUapOpenTime >= 5000UL)) { 
            lastUapOpenTime = millis(); uapCloseTime = millis() + 1000UL; isUapOpen = true; digitalWrite(PIN_UAP, LOW); 
          }
        } else {
          if (!isUapOpen && (millis() - lastUapOpenTime >= (unsigned long)uapIntervalMin * 60000UL)) {
            lastUapOpenTime = millis(); uapCloseTime = millis() + 1000UL; isUapOpen = true; digitalWrite(PIN_UAP, LOW); 
          }
        }
      }

      HTTPClient httpSend;
      httpSend.begin(SUPABASE_URL + "/rest/v1/device_controls?id=eq.1");
      httpSend.addHeader("apikey", SUPABASE_KEY); httpSend.addHeader("Authorization", "Bearer " + SUPABASE_KEY); httpSend.addHeader("Content-Type", "application/json");

      DynamicJsonDocument jsonDoc(1024);
      jsonDoc["temp_1"] = ti1_hotInlet; jsonDoc["temp_2"] = ti2_hotOutlet;
      jsonDoc["temp_3"] = ti3_coldInlet; jsonDoc["temp_4"] = ti4_coldOutlet;
      jsonDoc["pressure"] = pi1_hotInlet; jsonDoc["pressure_outlet"] = pi2_hotOutlet; jsonDoc["delta_pressure"] = deltaHotPress;
      jsonDoc["pressure_inlet_2"] = pi3_coldInlet; jsonDoc["pressure_outlet_2"] = pi4_coldOutlet; jsonDoc["delta_pressure_2"] = deltaColdPress;
      jsonDoc["flow_rate"] = fc1_counterFlow; jsonDoc["flow_rate_2"] = fc2_cocurrentFlow;
      
      jsonDoc["btn_onoff"] = (digitalRead(PIN_HEATER_1) == HIGH);
      jsonDoc["heater_2_status"] = (digitalRead(PIN_HEATER_2) == HIGH);
      jsonDoc["servo_angle"] = currentValvePercent;
      jsonDoc["servo_angle_2"] = currentValve2Percent;

      String requestBody; serializeJson(jsonDoc, requestBody);
      httpSend.sendRequest("PATCH", (uint8_t*)requestBody.c_str(), requestBody.length());
      httpSend.end();
      jsonDoc.clear();

      HTTPClient httpLog;
      httpLog.begin(SUPABASE_URL + "/rest/v1/telemetry_data");
      httpLog.addHeader("apikey", SUPABASE_KEY); 
      httpLog.addHeader("Authorization", "Bearer " + SUPABASE_KEY); 
      httpLog.addHeader("Content-Type", "application/json");
      httpLog.addHeader("Prefer", "return=minimal"); 

      DynamicJsonDocument logDoc(1024);
      logDoc["temp_1"] = ti1_hotInlet; logDoc["temp_2"] = ti2_hotOutlet;
      logDoc["temp_3"] = ti3_coldInlet; logDoc["temp_4"] = ti4_coldOutlet;
      logDoc["pressure"] = pi1_hotInlet; logDoc["pressure_outlet"] = pi2_hotOutlet; logDoc["delta_pressure"] = deltaHotPress;
      logDoc["pressure_inlet_2"] = pi3_coldInlet; logDoc["pressure_outlet_2"] = pi4_coldOutlet; logDoc["delta_pressure_2"] = deltaColdPress;
      logDoc["flow_rate"] = fc1_counterFlow; logDoc["flow_rate_2"] = fc2_cocurrentFlow; 
      logDoc["heater_status"] = (digitalRead(PIN_HEATER_1) == HIGH) ? "ON" : "OFF"; 
      logDoc["pompa_ekstra_status"] = (digitalRead(PIN_POMPA_EKSTRA) == HIGH) ? "ON" : "OFF"; 

      String logBody; serializeJson(logDoc, logBody);
      httpLog.sendRequest("POST", (uint8_t*)logBody.c_str(), logBody.length());
      httpLog.end();
      logDoc.clear();
    }
  }
}

void loop() {
  if (isUapOpen && (millis() >= uapCloseTime)) { 
    isUapOpen = false; 
    digitalWrite(PIN_UAP, HIGH); 
  }

  if (millis() - lastSyncTime >= syncInterval) { 
    lastSyncTime = millis(); 
    syncAndExecuteSystem(); 
  }
}

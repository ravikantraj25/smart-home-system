#include <Servo.h>
#include <SoftwareSerial.h>

// =================================================================================
// ARCHITECTURE:
//   SoftwareSerial (pins 2 TX / 3 RX) → ESP-01 WiFi module (AT commands)
//   SoftwareSerial (pins 11 TX / 12 RX) → HC-05 Bluetooth module
//
//   Hardware Serial (pins 0/1) is FREE for USB debugging during development.
//   All runtime debug output goes to Bluetooth (viewable on phone via BT
//   terminal).
//
// IMPORTANT: Only ONE SoftwareSerial port can listen() at a time.
//   We switch with espSerial.listen() / btSerial.listen() as needed.
//
// WIRING NOTE (ESP-01 RX):
//   Arduino Pin 2 → 1kΩ resistor → ESP-01 RX
//                                 ↘ 2.2kΩ → GND
//   This voltage divider drops 5V to ~3.4V safe for the ESP-01.
// =================================================================================

// ================= PIN DEFINITIONS =================
const int espRxPin = 2;  // Arduino RX ← ESP-01 TX (ESP TX → Pin 2)
const int espTxPin = 3;  // Arduino TX → ESP-01 RX (via voltage divider!)
const int relay1Pin = 4; // Light
const int relay2Pin = 5; // Pump
const int servoPin = 6;  // Door
const int buzzerPin = 8;
const int trigPin = 9;
const int echoPin = 10;
const int btTxPin = 11; // Arduino TX → HC-05 RX
const int btRxPin = 12; // Arduino RX ← HC-05 TX
const int gasPin = A0;
const int currentPin = A1;

// ================= SERVER (AWS EC2 — plain HTTP, no SSL needed) =================
const char *SERVER_HOST = "18.212.118.67";
const int SERVER_PORT = 80;

// ================= WIFI CREDENTIALS =================
const char *WIFI_SSID = "Aryan PG 1st F";
const char *WIFI_PASS = "7975401607";

// ================= OBJECTS =================
SoftwareSerial
    espSerial(espRxPin,
              espTxPin); // ESP-01 WiFi (pin 2 RX from ESP, pin 3 TX to ESP)
SoftwareSerial btSerial(btRxPin,
                        btTxPin); // HC-05 Bluetooth (pins 12 RX, 11 TX)
Servo doorServo;

// ================= VARIABLES =================
int distanceCm = 0;
int waterLevelPercent = 0;
int gasLevel = 0;
int currentUsage = 0;

bool isPumpAuto = true;
bool isDoorOpen = false;
bool isFireActive = false;
bool wifiConnected = false;

// Thresholds
const int FIRE_THRESHOLD = 400;

// Tank / pump thresholds (distance in cm from ultrasonic sensor)
// Motor ON  when distance > 10cm (tank is empty / low)
// Motor OFF when distance < 3cm  (tank is full)
const int TANK_HEIGHT_CM = 10;
const int TANK_EMPTY_CM = 10;
const int TANK_FULL_CM = 2;

// Timers (non-blocking)
unsigned long prevSensor = 0;
unsigned long prevWeb = 0;
unsigned long prevWifiCheck = 0;

const long sensorInterval = 2000;
const long webInterval = 2000; // Send data & receive commands every 2s (was 5s)
const long wifiCheckInterval = 15000;

// Command buffers
String webCommand = "";
String btBuffer = "";

// Reusable char buffers
char payload[96];
char atCmd[100];
char httpRequest[300];
char btStatusMsg[128];

// Buffer size limits
const int MAX_RESPONSE_BUFFER = 200;
const int MAX_BT_BUFFER = 128;

// WiFi reconnection tracking
int wifiRetries = 0;
const int MAX_WIFI_RETRIES = 3;

// Bluetooth status feedback timer
unsigned long prevBtStatus = 0;
const long btStatusInterval = 3000;

// ================= HELPER: Switch to ESP =================
void listenESP() { espSerial.listen(); }

// ================= HELPER: Switch to Bluetooth =================
void listenBT() { btSerial.listen(); }

// ================= DEBUG HELPER =================
// Debug output goes to BOTH Serial Monitor (USB) and Bluetooth (phone)
void dbg(const __FlashStringHelper *msg) {
  Serial.println(msg);
  listenBT();
  btSerial.println(msg);
}
void dbgVal(const __FlashStringHelper *label, int val) {
  Serial.print(label);
  Serial.println(val);
  listenBT();
  btSerial.print(label);
  btSerial.println(val);
}

// ================= SETUP =================
void setup() {
  Serial.begin(9600);   // USB debug (serial monitor)
  btSerial.begin(9600); // HC-05 default baud

  webCommand.reserve(100);
  btBuffer.reserve(MAX_BT_BUFFER + 10);

  pinMode(relay1Pin, OUTPUT);
  pinMode(relay2Pin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  // Relays are active-LOW: HIGH = OFF
  digitalWrite(relay1Pin, HIGH);
  digitalWrite(relay2Pin, HIGH);

  doorServo.attach(servoPin);
  doorServo.write(0);
  delay(500);         // Let servo reach position
  doorServo.detach(); // Detach to prevent jitter

  Serial.println(F("System Booting..."));
  Serial.println(F("ESP-01 on pins 2(RX)/3(TX), HC-05 on pins 12(RX)/11(TX)"));

  // Auto-detect and fix ESP-01 baud rate
  configureESPBaud();

  connectWiFi();

  // After WiFi setup, switch back to BT for normal operation
  listenBT();
  dbg(F("System ready!"));
}

// ================= LOOP =================
void loop() {
  unsigned long now = millis();

  // SENSOR TASK
  if (now - prevSensor >= sensorInterval) {
    prevSensor = now;
    readSensors();
    handleAutomation();
  }

  // WEB TASK — send sensor data to server via ESP-01
  if (now - prevWeb >= webInterval) {
    prevWeb = now;
    if (wifiConnected) {
      sendDataToServer();
      listenBT(); // Switch back to BT after ESP communication
    }
  }

  // WIFI HEALTH CHECK
  if (now - prevWifiCheck >= wifiCheckInterval) {
    prevWifiCheck = now;
    checkWiFi();
    listenBT(); // Switch back to BT after check
  }

  // BLUETOOTH STATUS FEEDBACK (send sensor data to phone)
  if (now - prevBtStatus >= btStatusInterval) {
    prevBtStatus = now;
    sendBluetoothStatus();
  }

  // Process Bluetooth input (non-blocking accumulation)
  // BT should be listening most of the time
  readBluetoothInput();

  // Execute any pending commands
  if (webCommand.length() > 0) {
    processCommands();
  }
}

// ================= SENSOR READING =================
void readSensors() {
  // Ultrasonic HC-SR04
  // Temporarily disable PCINT interrupts that SoftwareSerial uses,
  // otherwise pulseIn() timing gets corrupted.
  uint8_t savedPCICR = PCICR;
  PCICR = 0; // Disable ALL pin-change interrupts during measurement

  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);

  PCICR = savedPCICR; // Restore pin-change interrupts

  if (duration == 0) {
    distanceCm = -1;
    waterLevelPercent = -1;
  } else {
    distanceCm = duration * 0.034 / 2;

    int waterHeight = TANK_HEIGHT_CM - distanceCm;
    if (waterHeight < 0)
      waterHeight = 0;
    if (waterHeight > TANK_HEIGHT_CM)
      waterHeight = TANK_HEIGHT_CM;
    waterLevelPercent = (waterHeight * 100) / TANK_HEIGHT_CM;
  }

  // Analog sensors
  gasLevel = analogRead(gasPin);
  currentUsage = analogRead(currentPin);

  // Debug output to BOTH Serial Monitor and Bluetooth
  Serial.print(F("Water: "));
  Serial.print(distanceCm);
  Serial.print(F("cm ("));
  Serial.print(waterLevelPercent);
  Serial.print(F("%) Gas:"));
  Serial.print(gasLevel);
  Serial.print(F(" Current:"));
  Serial.println(currentUsage);

  listenBT();
  btSerial.print(F("Water: "));
  btSerial.print(distanceCm);
  btSerial.print(F("cm ("));
  btSerial.print(waterLevelPercent);
  btSerial.print(F("%) Gas:"));
  btSerial.print(gasLevel);
  btSerial.print(F(" Current:"));
  btSerial.println(currentUsage);
}

// ================= AUTOMATION LOGIC =================
void handleAutomation() {

  // --- FIRE / GAS ALERT ---
  if (gasLevel > FIRE_THRESHOLD) {
    if (!isFireActive) {
      isFireActive = true;
      tone(buzzerPin, 4000);
      dbg(F("FIRE ALERT!"));
    }
  } else {
    if (isFireActive) {
      isFireActive = false;
      noTone(buzzerPin);
      dbg(F("Fire cleared."));
    }
  }

  // --- PUMP AUTO (HYSTERESIS) ---
  if (isPumpAuto && distanceCm != -1) {
    if (distanceCm >= TANK_EMPTY_CM) {
      digitalWrite(relay2Pin, LOW); // Pump ON
    }
    if (distanceCm <= TANK_FULL_CM) {
      digitalWrite(relay2Pin, HIGH); // Pump OFF
    }
  }
}

// ================= BLUETOOTH INPUT (NON-BLOCKING, BOUNDED) =================
void readBluetoothInput() {
  while (btSerial.available()) {
    char c = btSerial.read();
    if (c == '\n') {
      btBuffer.trim();
      if (btBuffer.length() > 0) {
        btSerial.print(F("BT Cmd: "));
        btSerial.println(btBuffer);

        if (btBuffer.equalsIgnoreCase("STATUS")) {
          sendBluetoothStatus();
        } else {
          webCommand = btBuffer;
        }

        btSerial.print(F("OK: "));
        btSerial.println(btBuffer);
      }
      btBuffer = "";
    } else if (c != '\r') {
      if (btBuffer.length() < MAX_BT_BUFFER) {
        btBuffer += c;
      } else {
        dbg(F("ERROR: BT buffer overflow!"));
        btSerial.println(F("ERROR: Command too long"));
        btBuffer = "";
      }
    }
  }
}

// ================= BLUETOOTH STATUS FEEDBACK =================
void sendBluetoothStatus() {
  listenBT();
  snprintf(btStatusMsg, sizeof(btStatusMsg),
           "W:%d%%|WD:%dcm|G:%d|P:%d|L:%s|D:%s|M:%s|F:%s", waterLevelPercent,
           distanceCm, gasLevel, currentUsage,
           (digitalRead(relay1Pin) == LOW) ? "ON" : "OFF",
           isDoorOpen ? "OPEN" : "CLOSED", isPumpAuto ? "AUTO" : "MANUAL",
           isFireActive ? "YES" : "NO");
  btSerial.println(btStatusMsg);
}
// ================= ESP BAUD RATE AUTO-CONFIG =================
// ESP-01 ships at 115200 by default. SoftwareSerial can't handle 115200
// reliably, so we try to detect and permanently change it to 9600.
void configureESPBaud() {
  Serial.println(F("[BAUD] Trying ESP at 9600..."));

  // Try 9600 first (already configured?)
  espSerial.begin(9600);
  listenESP();
  delay(100);
  flushESP();
  espSerial.println(F("AT"));

  if (waitForResponse("OK", 2000)) {
    Serial.println(F("[BAUD] ESP responding at 9600 - OK!"));
    return; // Already at 9600, we're good
  }

  // Try 115200 (factory default)
  Serial.println(F("[BAUD] No response at 9600. Trying 115200..."));
  espSerial.begin(115200);
  listenESP();
  delay(100);
  flushESP();
  espSerial.println(F("AT"));

  if (waitForResponse("OK", 2000)) {
    Serial.println(F("[BAUD] ESP found at 115200! Changing to 9600..."));

    // Permanently change baud rate to 9600
    listenESP();
    espSerial.println(F("AT+UART_DEF=9600,8,1,0,0"));
    delay(1000);

    // Reinitialize at 9600
    espSerial.begin(9600);
    listenESP();
    delay(500);
    flushESP();

    // Verify
    espSerial.println(F("AT"));
    if (waitForResponse("OK", 2000)) {
      Serial.println(F("[BAUD] Successfully changed to 9600!"));
    } else {
      Serial.println(F("[BAUD] WARNING: Changed baud but no response at 9600. "
                       "Power-cycle ESP and retry."));
    }
    return;
  }

  // Neither worked
  Serial.println(F("[BAUD] ESP not responding at 9600 or 115200!"));
  Serial.println(
      F("[BAUD] Check: wiring, 3.3V power (NOT 5V), CH_PD pulled HIGH"));

  // Default to 9600 for subsequent attempts
  espSerial.begin(9600);
}

// ================= WIFI CONNECTION =================
void connectWiFi() {
  dbg(F("Connecting WiFi..."));
  wifiRetries = 0;
  wifiConnected = false;

  while (wifiRetries < MAX_WIFI_RETRIES && !wifiConnected) {
    wifiRetries++;
    Serial.print(F("\n--- WiFi attempt "));
    Serial.print(wifiRetries);
    Serial.println(F("/3 ---"));

    // Switch to ESP for AT commands
    listenESP();

    // Reset module
    Serial.println(F("[ESP] Sending AT+RST..."));
    espSerial.println(F("AT+RST"));
    delay(5000); // ESP-01 needs 3-5s to boot after reset
    flushESP();

    // Sync baud — send AT twice
    Serial.println(F("[ESP] Sending AT (sync)..."));
    listenESP();
    espSerial.println(F("AT"));
    delay(500);
    flushESP();

    // Check module alive
    Serial.println(F("[ESP] Sending AT (check alive)..."));
    listenESP();
    espSerial.println(F("AT"));
    if (!waitForResponse("OK", 3000)) {
      Serial.println(
          F("[ESP] *** ESP NOT RESPONDING! Check wiring & baud rate ***"));
      Serial.println(F("[ESP] Make sure ESP-01 is set to 9600 baud: "
                       "AT+UART_DEF=9600,8,1,0,0"));
      dbg(F("ESP not responding after reset."));
      continue;
    }
    Serial.println(F("[ESP] ESP is alive!"));

    // Station mode
    Serial.println(F("[ESP] Setting station mode..."));
    listenESP();
    espSerial.println(F("AT+CWMODE=1"));
    if (!waitForResponse("OK", 2000)) {
      Serial.println(F("[ESP] CWMODE failed"));
      dbg(F("Failed to set station mode."));
      continue;
    }

    // Connect to AP
    Serial.print(F("[ESP] Joining: "));
    Serial.println(WIFI_SSID);
    listenESP();
    snprintf(atCmd, sizeof(atCmd), "AT+CWJAP=\"%s\",\"%s\"", WIFI_SSID,
             WIFI_PASS);
    espSerial.println(atCmd);

    if (waitForResponse("WIFI GOT IP", 15000)) {
      wifiConnected = true;
      Serial.println(F("[ESP] WiFi Connected!"));
      dbg(F("WiFi Connected!"));
      break;
    }

    Serial.println(F("[ESP] WiFi join FAILED (wrong password? out of range?)"));
    dbg(F("WiFi connection attempt failed."));
    listenESP();
    flushESP();
    delay(2000);
  }

  if (!wifiConnected) {
    Serial.println(F("[ESP] WiFi FAILED after all attempts!"));
    dbg(F("WiFi FAILED after 3 attempts. Will retry later."));
    return;
  }

  // Single connection mode
  listenESP();
  espSerial.println(F("AT+CIPMUX=0"));
  if (!waitForResponse("OK", 2000)) {
    dbg(F("Warning: CIPMUX command failed."));
  }
  flushESP();

  // Configure SSL buffer size (needed for HTTPS to Render)
  listenESP();
  espSerial.println(F("AT+CIPSSLSIZE=4096"));
  if (!waitForResponse("OK", 2000)) {
    dbg(F("Warning: CIPSSLSIZE not supported."));
  }
  flushESP();
}

// ================= WIFI HEALTH CHECK =================
void checkWiFi() {
  listenESP();
  flushESP();
  espSerial.println(F("AT"));

  if (waitForResponse("OK", 2000)) {
    if (!wifiConnected) {
      dbg(F("WiFi restored."));
    }
    wifiConnected = true;
  } else {
    wifiConnected = false;
    dbg(F("WiFi lost! Reconnecting..."));
    connectWiFi();
  }
}

// ================= SEND DATA TO SERVER =================
void sendDataToServer() {

  snprintf(payload, sizeof(payload), "water=%d&gas=%d&power=%d",
           waterLevelPercent, gasLevel, currentUsage);
  int payloadLen = strlen(payload);

  int reqLen = snprintf(httpRequest, sizeof(httpRequest),
                        "POST /sensor-data HTTP/1.1\r\n"
                        "Host: %s\r\n"
                        "Content-Type: application/x-www-form-urlencoded\r\n"
                        "Connection: close\r\n"
                        "Content-Length: %d\r\n\r\n"
                        "%s",
                        SERVER_HOST, payloadLen, payload);

  if (reqLen >= (int)sizeof(httpRequest)) {
    dbg(F("ERROR: HTTP request buffer overflow!"));
    return;
  }

  // Switch to ESP for the entire HTTP transaction
  listenESP();

  // Close any stale connection
  espSerial.println(F("AT+CIPCLOSE"));
  delay(300);
  flushESP();

  // Open TCP connection (plain HTTP to EC2)
  snprintf(atCmd, sizeof(atCmd), "AT+CIPSTART=\"TCP\",\"%s\",%d", SERVER_HOST,
           SERVER_PORT);
  espSerial.println(atCmd);

  if (!waitForResponse("OK", 5000)) {
    dbg(F("TCP connect failed."));
    listenESP();
    espSerial.println(F("AT+CIPCLOSE"));
    delay(200);
    flushESP();
    return;
  }

  // Send length
  listenESP();
  snprintf(atCmd, sizeof(atCmd), "AT+CIPSEND=%d", reqLen);
  espSerial.println(atCmd);

  if (!waitForResponse(">", 3000)) {
    dbg(F("CIPSEND not ready."));
    listenESP();
    espSerial.println(F("AT+CIPCLOSE"));
    delay(200);
    flushESP();
    return;
  }

  // Send HTTP request
  // CRITICAL: Stay on listenESP() — do NOT switch to BT here!
  // The server responds within milliseconds. If we switch to listenBT()
  // for debug prints, the response bytes arrive on espSerial while we're
  // not listening, and they are permanently lost.
  listenESP();
  espSerial.print(httpRequest);

  // Read server response for commands (stays on listenESP internally)
  readServerResponse();

  // Debug print AFTER response is fully captured
  Serial.print(F("Sent: "));
  Serial.println(payload);
}

// ================= READ SERVER RESPONSE =================
// 3-phase streaming state machine:
//   Phase 0: Skip ESP noise (Recv, SEND OK) — wait for "+IPD," marker
//   Phase 1: Skip byte count after +IPD, — wait for ":"
//   Phase 2: Inside HTTP response — skip headers until \r\n\r\n
//   Phase 3: Capture body (command string)
void readServerResponse() {
  // We must already be on listenESP() — caller ensures this.

  // Phase tracking
  int phase = 0;
  // "+IPD," matcher
  const char *IPD_MARKER = "+IPD,";
  int ipdIdx = 0;
  // \r\n\r\n matcher for HTTP header end
  int crlfState = 0; // 0=none, 1=\r, 2=\r\n, 3=\r\n\r

  char body[80];
  int bodyLen = 0;

  unsigned long timeout = millis() + 5000;
  unsigned long lastDataTime = millis();
  bool gotData = false;
  int totalBytes = 0;

  while (millis() < timeout) {
    while (espSerial.available()) {
      char c = (char)espSerial.read();
      totalBytes++;
      lastDataTime = millis();
      gotData = true;

      switch (phase) {
      case 0:
        // Phase 0: Look for "+IPD," marker (skip all ESP noise)
        if (c == IPD_MARKER[ipdIdx]) {
          ipdIdx++;
          if (ipdIdx == 5) { // Found "+IPD,"
            phase = 1;
          }
        } else {
          ipdIdx = (c == '+') ? 1 : 0;
        }
        break;

      case 1:
        // Phase 1: Skip byte count, wait for ":"
        if (c == ':') {
          phase = 2; // Now we're in the HTTP response
          crlfState = 0;
        }
        break;

      case 2:
        // Phase 2: Inside HTTP response — find \r\n\r\n (end of headers)
        if (c == '\r') {
          crlfState = (crlfState == 2) ? 3 : 1;
        } else if (c == '\n') {
          if (crlfState == 1)
            crlfState = 2; // got \r\n
          else if (crlfState == 3) {
            phase = 3;
          } // got \r\n\r\n → body!
          else
            crlfState = 0;
        } else {
          crlfState = 0;
        }
        break;

      case 3:
        // Phase 3: Capture body bytes
        if (c == '\r' || c == '\n') {
          // Body line ended — we're done
          goto done; // Break out of both loops
        }
        if (bodyLen < 79 && c >= 32 && c <= 126) {
          body[bodyLen++] = c;
        }
        break;
      }
    }

    // If we captured body and no more data, exit
    if (phase == 3 && bodyLen > 0 && !espSerial.available()) {
      delay(30);
      if (!espSerial.available())
        break;
    }

    if (gotData && (millis() - lastDataTime > 500)) {
      break;
    }
  }

done:
  body[bodyLen] = '\0';

  // Switch to BT for debug output
  listenBT();

  // Debug
  Serial.print(F("[CMD] Bytes:"));
  Serial.print(totalBytes);
  Serial.print(F(" Phase:"));
  Serial.print(phase);
  Serial.print(F(" Body:\""));
  Serial.print(body);
  Serial.println(F("\""));

  if (bodyLen == 0) {
    Serial.println(F("[CMD] No body captured."));
    return;
  }

  // Look for command keywords in body
  char *cmdPtr = NULL;
  char *p;
  p = strstr(body, "LED_");
  if (p && (!cmdPtr || p < cmdPtr))
    cmdPtr = p;
  p = strstr(body, "PUMP_");
  if (p && (!cmdPtr || p < cmdPtr))
    cmdPtr = p;
  p = strstr(body, "DOOR_");
  if (p && (!cmdPtr || p < cmdPtr))
    cmdPtr = p;
  p = strstr(body, "BUZZER_");
  if (p && (!cmdPtr || p < cmdPtr))
    cmdPtr = p;

  if (cmdPtr) {
    webCommand = cmdPtr;
    webCommand.trim();
    Serial.print(F("[CMD] >>> "));
    Serial.println(webCommand);
    listenBT();
    btSerial.print(F("Cmd: "));
    btSerial.println(webCommand);
  } else {
    Serial.println(F("[CMD] No commands in body!"));
  }
}

// ================= COMMAND PROCESSOR =================
void processCommands() {

  webCommand.toUpperCase();

  listenBT();
  btSerial.print(F("Processing: "));
  btSerial.println(webCommand);

  // --- LIGHT ---
  if (webCommand.indexOf(F("LED_ON")) >= 0) {
    digitalWrite(relay1Pin, LOW);
    dbg(F("Light ON"));
  }
  if (webCommand.indexOf(F("LED_OFF")) >= 0) {
    digitalWrite(relay1Pin, HIGH);
    dbg(F("Light OFF"));
  }

  // --- DOOR ---
  if (webCommand.indexOf(F("DOOR_OPEN")) >= 0 && !isDoorOpen) {
    doorServo.attach(servoPin);
    doorServo.write(90);
    isDoorOpen = true;
    dbg(F("Door OPEN"));
    delay(500);         // Give servo time to reach position
    doorServo.detach(); // Detach to stop jitter/buzzing
  }
  if (webCommand.indexOf(F("DOOR_CLOSE")) >= 0 && isDoorOpen) {
    doorServo.attach(servoPin);
    doorServo.write(0);
    isDoorOpen = false;
    dbg(F("Door CLOSED"));
    delay(500);         // Give servo time to reach position
    doorServo.detach(); // Detach to stop jitter/buzzing
  }

  // --- PUMP MODE ---
  if (webCommand.indexOf(F("PUMP_AUTO")) >= 0) {
    isPumpAuto = true;
    dbg(F("Pump AUTO mode"));
  }
  if (webCommand.indexOf(F("PUMP_MANUAL")) >= 0) {
    isPumpAuto = false;
    dbg(F("Pump MANUAL mode"));
  }

  // --- PUMP CONTROL (manual only) ---
  if (webCommand.indexOf(F("PUMP_ON")) >= 0 && !isPumpAuto) {
    digitalWrite(relay2Pin, LOW);
    dbg(F("Pump ON (manual)"));
  }
  if (webCommand.indexOf(F("PUMP_OFF")) >= 0 && !isPumpAuto) {
    digitalWrite(relay2Pin, HIGH);
    dbg(F("Pump OFF (manual)"));
  }

  // --- BUZZER TEST ---
  if (webCommand.indexOf(F("BUZZER_TEST")) >= 0) {
    tone(buzzerPin, 2000);
    delay(500);
    noTone(buzzerPin);
    dbg(F("Buzzer test done"));
  }

  webCommand = "";
}

// ================= ESP HELPER: Wait for Response (LIGHTWEIGHT)
// ================= Reads from espSerial looking for target string. Uses NO
// String class and NO Serial echo to maximize read speed. SoftwareSerial only
// has a 64-byte ring buffer — we must read FAST.
bool waitForResponse(const char *target, unsigned long timeoutMs) {
  listenESP();

  unsigned long start = millis();
  int targetLen = strlen(target);
  int matchIdx = 0; // How many chars of target we've matched so far

  while (millis() - start < timeoutMs) {
    while (espSerial.available()) {
      char c = (char)espSerial.read();

      // Simple state machine: match target char by char
      if (c == target[matchIdx]) {
        matchIdx++;
        if (matchIdx == targetLen) {
          // Full match found!
          Serial.print(F("[ESP] OK: "));
          Serial.println(target);
          return true;
        }
      } else {
        // Mismatch — check if current char starts a new match
        matchIdx = (c == target[0]) ? 1 : 0;
      }
    }
  }

  Serial.print(F("[ESP] TIMEOUT: "));
  Serial.println(target);
  return false;
}

// ================= ESP HELPER: Flush Buffer =================
void flushESP() {
  listenESP();
  delay(10);
  while (espSerial.available()) {
    espSerial.read();
  }
}

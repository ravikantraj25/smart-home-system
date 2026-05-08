#include <Servo.h>
#include <SoftwareSerial.h>

// ================= PIN DEFINITIONS =================
const int espRxPin = 2;
const int espTxPin = 3;
const int relay1Pin = 4;   // Light
const int relay2Pin = 5;   // Pump
const int servoPin = 6;    // Door
const int buzzerPin = 8;
const int trigPin = 9;
const int echoPin = 10;
const int gasPin = A0;
const int currentPin = A1;

// ================= SERVER =================
const char* SERVER_HOST = "172.23.106.96";
const int SERVER_PORT = 3001;

// ================= OBJECTS =================
SoftwareSerial espSerial(espRxPin, espTxPin);
Servo doorServo;

// ================= VARIABLES =================
int distanceCm = 0;
int gasLevel = 0;
int currentUsage = 0;

bool isPumpAuto = true;
bool isDoorOpen = false;
bool isFireActive = false;
bool wifiConnected = false;

// Thresholds
const int FIRE_THRESHOLD = 400;
const int FIRE_RESET_LEVEL = 350;  // Hysteresis for gas alert
const int TANK_TOTAL_LENGTH_CM = 200;
const int TANK_EMPTY_CM = 200;     // >=200cm distance means tank empty
const int TANK_FULL_CM = 8;        // Small distance means tank near full

// Servo positions (calibrate based on your door mechanism)
const int DOOR_OPEN_ANGLE = 180;   // CHANGED: Was 90
const int DOOR_CLOSE_ANGLE = 0;

// Timers (non-blocking)
unsigned long prevSensor = 0;
unsigned long prevWeb = 0;
unsigned long prevWifiCheck = 0;
unsigned long lastWifiConnectionTime = 0;

const long sensorInterval = 2000;
const long webInterval = 5000;     // Hotspot-friendly polling interval
const long wifiCheckInterval = 15000;
const long wifiReconnectDebounce = 10000;  // Don't reconnect too frequently

// Command buffers
String webCommand = "";
String serialBuffer = "";
char payload[96];
char atCmd[80];
char httpRequest[256];
char responseBuffer[256];  // For response parsing (prevents String fragmentation)
int responseIdx = 0;

// Search token in a non-null-terminated buffer safely
bool bufferContainsToken(const char* buf, int len, const char* token) {
  int tokenLen = strlen(token);
  if (tokenLen == 0 || len < tokenLen) return false;

  for (int i = 0; i <= len - tokenLen; i++) {
    bool match = true;
    for (int j = 0; j < tokenLen; j++) {
      if (buf[i + j] != token[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

// ================= SETUP =================
void setup() {
  Serial.begin(9600);
  espSerial.begin(9600);

  pinMode(relay1Pin, OUTPUT);
  pinMode(relay2Pin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  // Relays are active-LOW: HIGH = OFF
  digitalWrite(relay1Pin, HIGH);
  digitalWrite(relay2Pin, HIGH);

  doorServo.attach(servoPin);
  doorServo.write(DOOR_CLOSE_ANGLE);

  Serial.println(F("System Booting..."));
  connectWiFi();
  
  lastWifiConnectionTime = millis();
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

  // WEB TASK
  if (now - prevWeb >= webInterval) {
    prevWeb = now;
    if (wifiConnected) {
      sendDataToServer();
    }
  }

  // WIFI HEALTH CHECK
  if (now - prevWifiCheck >= wifiCheckInterval) {
    prevWifiCheck = now;
    checkWiFi();
  }

  // Process serial input
  readSerialInput();

  // Execute pending commands
  if (webCommand.length() > 0) {
    processCommands();
  }
}

// ================= SENSOR READING =================
void readSensors() {
  // Ultrasonic HC-SR04
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);

  if (duration == 0) {
    // No echo often means out-of-range; treat as empty for this 200cm tank.
    distanceCm = TANK_TOTAL_LENGTH_CM;
  } else {
    distanceCm = duration * 0.034 / 2;
    if (distanceCm > TANK_TOTAL_LENGTH_CM) {
      distanceCm = TANK_TOTAL_LENGTH_CM;
    }
    if (distanceCm < 0) {
      distanceCm = 0;
    }
  }

  // Analog sensors
  gasLevel = analogRead(gasPin);
  currentUsage = analogRead(currentPin);

  // Debug output
  Serial.print(F("Water:"));
  Serial.print(distanceCm);
  Serial.print(F(" Gas:"));
  Serial.print(gasLevel);
  Serial.print(F(" Current:"));
  Serial.println(currentUsage);
}

// ================= AUTOMATION LOGIC =================
void handleAutomation() {

  // --- FIRE / GAS ALERT WITH HYSTERESIS ---
  // NEW: Added hysteresis to prevent buzzer chatter
  if (gasLevel > FIRE_THRESHOLD) {
    if (!isFireActive) {
      isFireActive = true;
      tone(buzzerPin, 4000);
      Serial.println(F("FIRE ALERT!"));
    }
  } else if (gasLevel < FIRE_RESET_LEVEL) {  // CHANGED: Added reset threshold
    if (isFireActive) {
      isFireActive = false;
      noTone(buzzerPin);
      Serial.println(F("Fire cleared."));
    }
  }
  // If gas is between FIRE_RESET_LEVEL and FIRE_THRESHOLD, state doesn't change (hysteresis)

  // --- PUMP AUTO (HYSTERESIS) ---
  if (isPumpAuto) {
    if (distanceCm >= TANK_EMPTY_CM) {
      digitalWrite(relay2Pin, LOW);   // Pump ON (tank empty)
      Serial.println(F("Pump ON - Tank Empty"));
    }
    if (distanceCm <= TANK_FULL_CM) {
      digitalWrite(relay2Pin, HIGH);  // Pump OFF (tank full)
      Serial.println(F("Pump OFF - Tank Full"));
    }
    // Between FULL and EMPTY: maintains current state (hysteresis)
  }
}

// ================= SERIAL INPUT (NON-BLOCKING) =================
void readSerialInput() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      serialBuffer.trim();
      if (serialBuffer.length() > 0) {
        webCommand = serialBuffer;
      }
      serialBuffer = "";
    } else if (c != '\r') {
      serialBuffer += c;
    }
  }
}

// ================= WIFI CONNECTION =================
void connectWiFi() {
  Serial.println(F("Connecting WiFi..."));

  // Reset module
  espSerial.println(F("AT+RST"));
  delay(3000);
  flushESP();

  // Station mode
  espSerial.println(F("AT+CWMODE=1"));
  delay(500);
  flushESP();

  // Connect to AP
  espSerial.println(F("AT+CWJAP=\"Shresth\",\"12345678\""));
  delay(10000);

  // Verify connection
  if (waitForResponse("OK", 3000) || waitForResponse("WIFI GOT IP", 1000)) {
    wifiConnected = true;
    Serial.println(F("WiFi Connected!"));
  } else {
    wifiConnected = false;
    Serial.println(F("WiFi FAILED to connect."));
    return;
  }

  // Get IP
  espSerial.println(F("AT+CIFSR"));
  delay(1000);
  printESPResponse();

  // Single connection mode
  espSerial.println(F("AT+CIPMUX=0"));
  delay(500);
  flushESP();
}

// ================= WIFI HEALTH CHECK =================
void checkWiFi() {
  flushESP();
  espSerial.println(F("AT"));

  if (waitForResponse("OK", 2000)) {
    if (!wifiConnected) {
      Serial.println(F("WiFi restored."));
    }
    wifiConnected = true;
    lastWifiConnectionTime = millis();  // NEW: Reset debounce timer on successful check
  } else {
    wifiConnected = false;
    Serial.println(F("WiFi lost! Reconnecting..."));
    
    // NEW: Don't reconnect too frequently
    if (millis() - lastWifiConnectionTime >= wifiReconnectDebounce) {
      connectWiFi();
    }
  }
}

// ================= SEND DATA TO SERVER =================
void sendDataToServer() {

  sprintf(payload, "{\"water\":%d,\"gas\":%d,\"power\":%d}", distanceCm, gasLevel, currentUsage);
  int payloadLen = strlen(payload);

  int reqLen = snprintf(httpRequest, sizeof(httpRequest),
    "POST /sensor-data HTTP/1.1\r\n"
    "Host: %s\r\n"
    "Content-Type: application/json\r\n"
    "Connection: close\r\n"
    "Content-Length: %d\r\n\r\n"
    "%s",
    SERVER_HOST, payloadLen, payload);

  // Close any stale connection
  espSerial.println(F("AT+CIPCLOSE"));
  delay(100);
  flushESP();

  // Open TCP connection
  sprintf(atCmd, "AT+CIPSTART=\"TCP\",\"%s\",%d", SERVER_HOST, SERVER_PORT);
  espSerial.println(atCmd);

  if (!waitForResponse("OK", 3000) && !waitForResponse("CONNECT", 2000) && !waitForResponse("ALREADY CONNECTED", 1000)) {
    Serial.println(F("TCP connect failed."));
    return;
  }

  // Send length
  sprintf(atCmd, "AT+CIPSEND=%d", reqLen);
  espSerial.println(atCmd);

  if (!waitForResponse(">", 3000)) {
    Serial.println(F("CIPSEND not ready."));
    return;
  }

  // Send HTTP request
  espSerial.print(httpRequest);

  // Confirm ESP accepted the payload before trying to parse response
  if (!waitForResponse("SEND OK", 4000)) {
    Serial.println(F("SEND not acknowledged."));
  }

  Serial.print(F("Sent: "));
  Serial.println(payload);

  readServerResponse();
}

// ================= READ SERVER RESPONSE =================
// Stream-parse response so long HTTP headers don't hide command body
void readServerResponse() {
  unsigned long timeout = millis() + 9000;
  unsigned long lastDataTime = 0;
  bool gotIPD = false;
  bool commandReady = false;

  const char* ipdToken = "+IPD";
  int ipdMatch = 0;
  const char* headerSep = "\r\n\r\n";
  int sepMatch = 0;
  bool inBody = false;

  char commandBuf[80];
  int cmdLen = 0;

  // Keep only a short debug snippet from the stream
  responseIdx = 0;

  while (millis() < timeout) {
    while (espSerial.available()) {
      char c = (char)espSerial.read();

      // Save a small part of the stream for diagnostics
      if (responseIdx < (int)sizeof(responseBuffer) - 1) {
        responseBuffer[responseIdx++] = c;
        responseBuffer[responseIdx] = '\0';
      }

      // Detect +IPD from stream directly
      if (!gotIPD) {
        if (c == ipdToken[ipdMatch]) {
          ipdMatch++;
          if (ipdToken[ipdMatch] == '\0') {
            gotIPD = true;
          }
        } else {
          ipdMatch = (c == ipdToken[0]) ? 1 : 0;
        }
      }

      // Parse HTTP headers and capture only body (command string)
      if (gotIPD && !inBody) {
        if (c == headerSep[sepMatch]) {
          sepMatch++;
          if (headerSep[sepMatch] == '\0') {
            inBody = true;
            cmdLen = 0;
          }
        } else {
          sepMatch = (c == headerSep[0]) ? 1 : 0;
        }
      } else {
        if (inBody) {
          if (c == '\r' || c == '\n') {
            if (cmdLen > 0) {
              commandBuf[cmdLen] = '\0';
              commandReady = true;
              break;
            }
          } else if (cmdLen < (int)sizeof(commandBuf) - 1) {
            commandBuf[cmdLen++] = c;
          }

          // If body gets fully captured without newline, treat as complete.
          if (cmdLen >= (int)sizeof(commandBuf) - 1) {
            commandBuf[cmdLen] = '\0';
            commandReady = true;
            break;
          }
        }
      }

      if (gotIPD) {
        lastDataTime = millis();
      }
    }

    if (commandReady) {
      break;
    }

    if (gotIPD && lastDataTime > 0 && (millis() - lastDataTime > 700)) {
      break;
    }
  }

  responseBuffer[responseIdx] = '\0';

  if (responseIdx == 0) {
    Serial.println(F("No server response."));
    return;
  }

  Serial.println(F("--- RAW ESP RESPONSE ---"));
  Serial.println(responseBuffer);
  Serial.println(F("--- END RAW ---"));

  if (!gotIPD) {
    Serial.println(F("No +IPD data received from server."));
    return;
  }

  if (!commandReady) {
    // Fallback: parse body from short debug snippet if available
    char* bodyStart = strstr(responseBuffer, "\r\n\r\n");
    if (bodyStart != NULL) {
      bodyStart += 4;
      int i = 0;
      while (*bodyStart != '\0' && *bodyStart != '\r' && *bodyStart != '\n' && i < (int)sizeof(commandBuf) - 1) {
        commandBuf[i++] = *bodyStart++;
      }
      commandBuf[i] = '\0';
      commandReady = (i > 0);
    }
  }

  if (!commandReady) {
    // Last fallback for older response format
    char* cmdStart = strstr(responseBuffer, "LED_");
    if (cmdStart != NULL) {
      int i = 0;
      while (*cmdStart != '\0' && *cmdStart != '\r' && *cmdStart != '\n' && i < (int)sizeof(commandBuf) - 1) {
        commandBuf[i++] = *cmdStart++;
      }
      commandBuf[i] = '\0';
      commandReady = (i > 0);
    }
  }

  if (!commandReady) {
    Serial.println(F("No command found in response."));
    return;
  }

  webCommand = commandBuf;
  Serial.print(F("Cmd received: "));
  Serial.println(webCommand);
}

// ================= COMMAND PROCESSOR =================
void processCommands() {

  webCommand.toUpperCase();

  Serial.print(F("Processing: "));
  Serial.println(webCommand);

  // --- LIGHT ---
  if (webCommand.indexOf(F("LED_ON")) >= 0) {
    digitalWrite(relay1Pin, LOW);
    Serial.println(F("Light ON"));
  }
  if (webCommand.indexOf(F("LED_OFF")) >= 0) {
    digitalWrite(relay1Pin, HIGH);
    Serial.println(F("Light OFF"));
  }

  // --- DOOR (CHANGED: Using new angle constants) ---
  if (webCommand.indexOf(F("DOOR_OPEN")) >= 0) {
    doorServo.write(DOOR_OPEN_ANGLE);
    isDoorOpen = true;
    Serial.println(F("Door OPEN"));
  }
  if (webCommand.indexOf(F("DOOR_CLOSE")) >= 0) {
    doorServo.write(DOOR_CLOSE_ANGLE);
    isDoorOpen = false;
    Serial.println(F("Door CLOSED"));
  }

  // --- PUMP MODE ---
  if (webCommand.indexOf(F("PUMP_AUTO")) >= 0) {
    isPumpAuto = true;
    Serial.println(F("Pump AUTO mode"));
  }
  if (webCommand.indexOf(F("PUMP_MANUAL")) >= 0) {
    isPumpAuto = false;
    Serial.println(F("Pump MANUAL mode"));
  }

  // --- PUMP CONTROL (manual only) ---
  if (webCommand.indexOf(F("PUMP_ON")) >= 0 && !isPumpAuto) {
    digitalWrite(relay2Pin, LOW);
    Serial.println(F("Pump ON (manual)"));
  }
  if (webCommand.indexOf(F("PUMP_OFF")) >= 0 && !isPumpAuto) {
    digitalWrite(relay2Pin, HIGH);
    Serial.println(F("Pump OFF (manual)"));
  }

  // --- BUZZER TEST ---
  if (webCommand.indexOf(F("BUZZER_TEST")) >= 0) {
    tone(buzzerPin, 2000);
    delay(500);
    noTone(buzzerPin);
    Serial.println(F("Buzzer test done"));
  }

  webCommand = "";
}

// ================= ESP HELPER: Wait for Response =================
bool waitForResponse(const char* target, unsigned long timeoutMs) {
  unsigned long start = millis();
  char rolling[80];
  int len = 0;
  rolling[0] = '\0';

  while (millis() - start < timeoutMs) {
    while (espSerial.available()) {
      char c = (char)espSerial.read();

      if (len < (int)sizeof(rolling) - 1) {
        rolling[len++] = c;
      } else {
        memmove(rolling, rolling + 1, sizeof(rolling) - 2);
        rolling[sizeof(rolling) - 2] = c;
        len = sizeof(rolling) - 1;
      }
      rolling[len] = '\0';

      if (strstr(rolling, target) != NULL) {
        return true;
      }
    }
  }
  return false;
}

// ================= ESP HELPER: Flush Buffer =================
void flushESP() {
  while (espSerial.available()) {
    espSerial.read();
  }
}

// ================= ESP HELPER: Print Response =================
void printESPResponse() {
  while (espSerial.available()) {
    Serial.write(espSerial.read());
  }
  Serial.println();
}

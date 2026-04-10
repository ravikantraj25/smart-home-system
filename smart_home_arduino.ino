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
const char* SERVER_HOST = "192.168.0.174";
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

// Servo position tracking
int currentDoorAngle = 0;
const int DOOR_OPEN_ANGLE = 90;   // Adjust if your door needs a different angle
const int DOOR_CLOSED_ANGLE = 0;
const int SERVO_SPEED = 8;         // Delay (ms) per degree — lower = faster

// Thresholds
const int FIRE_THRESHOLD = 400;
const int TANK_EMPTY_CM = 20;
const int TANK_FULL_CM = 5;

// Timers (non-blocking)
unsigned long prevSensor = 0;
unsigned long prevWeb = 0;
unsigned long prevWifiCheck = 0;

const long sensorInterval = 2000;
const long webInterval = 2000;     // Poll server every 2 seconds for fast response
const long wifiCheckInterval = 15000;

// Command buffers
String webCommand = "";
String serialBuffer = "";  // Accumulates serial input until newline

// Reusable char buffers to avoid String heap fragmentation
char payload[96];
char atCmd[80];
char httpRequest[256];

// ================= SETUP =================
void setup() {
  Serial.begin(9600);
  espSerial.begin(9600);  // ESP-01 must be pre-configured to 9600 baud
                           // Flash with: AT+UART_DEF=9600,8,1,0,0

  pinMode(relay1Pin, OUTPUT);
  pinMode(relay2Pin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  // Relays are active-LOW: HIGH = OFF
  digitalWrite(relay1Pin, HIGH);
  digitalWrite(relay2Pin, HIGH);

  // Servo starts detached to prevent jitter
  // It's attached only when door state changes
  // Set initial position briefly
  doorServo.attach(servoPin);
  doorServo.write(0);
  delay(500);
  doorServo.detach();
  digitalWrite(servoPin, LOW);  // Hold pin low to prevent floating

  Serial.println(F("System Booting..."));
  connectWiFi();
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

  // Process serial input (non-blocking accumulation)
  readSerialInput();

  // Execute any pending commands
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
    distanceCm = -1;  // Sensor error / out of range
  } else {
    distanceCm = duration * 0.034 / 2;
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

  // --- FIRE / GAS ALERT ---
  if (gasLevel > FIRE_THRESHOLD) {
    if (!isFireActive) {
      isFireActive = true;
      tone(buzzerPin, 4000);
      Serial.println(F("FIRE ALERT!"));
    }
  } else {
    if (isFireActive) {
      isFireActive = false;
      noTone(buzzerPin);
      Serial.println(F("Fire cleared."));
    }
  }

  // --- PUMP AUTO (HYSTERESIS) ---
  if (isPumpAuto && distanceCm != -1) {
    if (distanceCm >= TANK_EMPTY_CM) {
      digitalWrite(relay2Pin, LOW);   // Pump ON
    }
    if (distanceCm <= TANK_FULL_CM) {
      digitalWrite(relay2Pin, HIGH);  // Pump OFF
    }
    // Between FULL and EMPTY: maintains current state (hysteresis)
  }
}

// ================= SERIAL INPUT (NON-BLOCKING) =================
void readSerialInput() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      // Complete command received
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
  espSerial.println(F("AT+CWJAP=\"Aryan PG 1st F\",\"7975401607\""));
  delay(10000);  // Allow time for association

  // Verify connection
  if (waitForResponse("OK", 3000) || waitForResponse("WIFI GOT IP", 1000)) {
    wifiConnected = true;
    Serial.println(F("WiFi Connected!"));
  } else {
    wifiConnected = false;
    Serial.println(F("WiFi FAILED to connect."));
    return;
  }

  // Get IP (informational)
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
  } else {
    wifiConnected = false;
    Serial.println(F("WiFi lost! Reconnecting..."));
    connectWiFi();
  }
}

// ================= SEND DATA TO SERVER =================
void sendDataToServer() {

  // Build JSON payload using char buffer (no String fragmentation)
  sprintf(payload, "{\"water\":%d,\"gas\":%d,\"power\":%d}", distanceCm, gasLevel, currentUsage);
  int payloadLen = strlen(payload);

  // Build HTTP request into buffer
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

  if (!waitForResponse("OK", 2000) && !waitForResponse("ALREADY CONNECTED", 500)) {
    Serial.println(F("TCP connect failed."));
    return;
  }

  // Send length
  sprintf(atCmd, "AT+CIPSEND=%d", reqLen);
  espSerial.println(atCmd);

  if (!waitForResponse(">", 1000)) {
    Serial.println(F("CIPSEND not ready."));
    return;
  }

  // Send HTTP request
  espSerial.print(httpRequest);

  Serial.print(F("Sent: "));
  Serial.println(payload);

  // Read server response for commands
  // NOTE: No delay here! SoftwareSerial buffer is only 64 bytes.
  // readServerResponse() reads data as it arrives to prevent overflow.
  readServerResponse();
}

// ================= READ SERVER RESPONSE =================
void readServerResponse() {
  String response = "";
  unsigned long timeout = millis() + 4000;  // Total max wait: 4 seconds
  unsigned long lastDataTime = 0;
  bool gotIPD = false;  // True once we see +IPD (actual server data)

  while (millis() < timeout) {
    while (espSerial.available()) {
      char c = (char)espSerial.read();
      response += c;

      // Check if we've received the actual server response marker
      if (!gotIPD && response.indexOf("+IPD") >= 0) {
        gotIPD = true;
      }

      // Only start the silence timer AFTER we get +IPD data
      if (gotIPD) {
        lastDataTime = millis();
      }
    }

    // Only break on silence AFTER we've received +IPD data
    // Wait 1 second of silence after last byte to ensure complete response
    if (gotIPD && lastDataTime > 0 && (millis() - lastDataTime > 300)) {
      break;
    }
  }

  if (response.length() == 0) {
    Serial.println(F("No server response."));
    return;
  }

  // Debug: print raw ESP response
  Serial.println(F("--- RAW ESP RESPONSE ---"));
  Serial.println(response);
  Serial.println(F("--- END RAW ---"));

  if (!gotIPD) {
    Serial.println(F("No +IPD data received from server."));
    return;
  }

  // SIMPLE APPROACH: Find "LED_" directly in the raw response
  // Server always sends: LED_ON|PUMP_...|DOOR_...
  // So we just find where LED_ starts and extract from there
  int cmdStart = response.indexOf("LED_");

  if (cmdStart < 0) {
    Serial.println(F("No command found in response."));
    return;
  }

  // Extract from LED_ to end of line (or end of string)
  String body = response.substring(cmdStart);

  // Find the end of the command (newline, \r, or CLOSED marker)
  int endIdx = body.indexOf('\r');
  if (endIdx < 0) endIdx = body.indexOf('\n');
  if (endIdx < 0) endIdx = body.indexOf("CLOSED");
  if (endIdx > 0) {
    body = body.substring(0, endIdx);
  }

  body.trim();

  if (body.length() > 0) {
    webCommand = body;
    Serial.print(F("Cmd received: "));
    Serial.println(webCommand);
  } else {
    Serial.println(F("Empty command after parsing."));
  }
}
// ================= SMOOTH SERVO MOVEMENT =================
// Sweeps servo from current position to target, 1 degree at a time.
// Attaches before movement, detaches after to prevent SoftwareSerial jitter.
void smoothServoMove(int targetAngle) {
  // Clamp target to valid range
  targetAngle = constrain(targetAngle, 0, 180);

  if (targetAngle == currentDoorAngle) return;  // Already there

  doorServo.attach(servoPin);
  delay(20);  // Let servo initialize

  int step = (targetAngle > currentDoorAngle) ? 1 : -1;

  Serial.print(F("Servo: "));
  Serial.print(currentDoorAngle);
  Serial.print(F(" -> "));
  Serial.println(targetAngle);

  while (currentDoorAngle != targetAngle) {
    currentDoorAngle += step;
    doorServo.write(currentDoorAngle);
    delay(SERVO_SPEED);  // Controls speed: 8ms/degree = ~720ms for 90°
  }

  delay(100);           // Let servo settle at final position
  doorServo.detach();   // Stop PWM signal to prevent jitter
  digitalWrite(servoPin, LOW);  // Hold pin low — prevents noise from relay switching
}

// ================= COMMAND PROCESSOR =================
void processCommands() {

  webCommand.toUpperCase();

  Serial.print(F("Processing: "));
  Serial.println(webCommand);

  // --- LIGHT ---
  if (webCommand.indexOf(F("LED_ON")) >= 0) {
    digitalWrite(relay1Pin, LOW);   // Active-LOW: ON
    Serial.println(F("Light ON"));
  }
  if (webCommand.indexOf(F("LED_OFF")) >= 0) {
    digitalWrite(relay1Pin, HIGH);  // Active-LOW: OFF
    Serial.println(F("Light OFF"));
  }

  // --- DOOR (moves only when target differs from current position) ---
  bool wantOpen = (webCommand.indexOf(F("DOOR_O")) >= 0);
  bool wantClose = (webCommand.indexOf("DOOR_C") >= 0) && !wantOpen;

  if (wantOpen && currentDoorAngle != DOOR_OPEN_ANGLE) {
    smoothServoMove(DOOR_OPEN_ANGLE);
    isDoorOpen = true;
    Serial.println(F("Door OPEN"));
  }
  else if (wantClose && currentDoorAngle != DOOR_CLOSED_ANGLE) {
    smoothServoMove(DOOR_CLOSED_ANGLE);
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
    digitalWrite(relay2Pin, LOW);   // Pump ON
    Serial.println(F("Pump ON (manual)"));
  }
  if (webCommand.indexOf(F("PUMP_OFF")) >= 0 && !isPumpAuto) {
    digitalWrite(relay2Pin, HIGH);  // Pump OFF
    Serial.println(F("Pump OFF (manual)"));
  }

  // --- BUZZER TEST ---
  if (webCommand.indexOf(F("BUZZER_TEST")) >= 0) {
    tone(buzzerPin, 2000);
    delay(500);
    noTone(buzzerPin);
    Serial.println(F("Buzzer test done"));
  }

  // Clear processed command
  webCommand = "";
}

// ================= ESP HELPER: Wait for Response =================
bool waitForResponse(const char* target, unsigned long timeoutMs) {
  unsigned long start = millis();
  String response = "";

  while (millis() - start < timeoutMs) {
    while (espSerial.available()) {
      char c = (char)espSerial.read();
      response += c;

      if (response.indexOf(target) >= 0) {
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

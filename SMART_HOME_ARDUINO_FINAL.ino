#include <Servo.h>
#include <SoftwareSerial.h>

// ==========================================
// 1. PIN DEFINITIONS
// ==========================================
const int espRxPin = 2;   // Connect to ESP-01 TX
const int espTxPin = 3;   // Connect to Voltage Divider -> ESP-01 RX
const int relay1Pin = 4;  // LED / Light (Relay 1)
const int relay2Pin = 5;  // DC Motor / Water Pump (Relay 2)
const int servoPin = 6;   // Door Servo
const int buzzerPin = 8;  // Fire Alarm Buzzer
const int trigPin = 9;    // Ultrasonic Trigger
const int echoPin = 10;   // Ultrasonic Echo
const int gasPin = A0;    // MQ-2 Smoke/Gas Sensor
const int currentPin = A1; // ACS712 Current Sensor

// ==========================================
// 2. SERVER CONFIGURATION (VERIFIED - DO NOT CHANGE)
// ==========================================
const char* SERVER_HOST = "192.168.0.174";  // Backend server IP (CORRECT)
const int   SERVER_PORT = 3001;             // Backend server port

// ==========================================
// 3. GLOBAL VARIABLES & OBJECTS
// ==========================================
SoftwareSerial espSerial(espRxPin, espTxPin); // Software serial for ESP-01
Servo doorServo;                              // Servo controller for door

// Sensor Variables
int distanceCm = 0;      // Water level from ultrasonic (cm)
int gasLevel = 0;        // Gas sensor reading (0-1023 ADC)
int currentUsage = 0;    // Current sensor reading (0-1023 ADC)

// System States
bool isPumpAuto = true;     // Pump in AUTO mode by default
bool isDoorOpen = false;    // Door state tracking
bool isFireActive = false;  // Fire alarm state

// Thresholds (Match backend: server/index.js)
const int FIRE_THRESHOLD = 400;  // Gas threshold for fire alarm
const int TANK_EMPTY_CM = 20;    // Pump turns ON if water < 20cm
const int TANK_FULL_CM = 5;      // Pump turns OFF if water > 5cm

// Non-Blocking Timers
unsigned long previousMillisSensors = 0;
unsigned long previousMillisWeb = 0;
const long sensorInterval = 2000; // Read sensors every 2 seconds
const long webInterval = 5000;    // Send data to web every 5 seconds

// String buffer for web commands from server
String webCommand = "";

// ==========================================
// 4. SETUP FUNCTION
// ==========================================
void setup() {
  // Initialize serial communications
  Serial.begin(9600);        // Serial Monitor (laptop)
  espSerial.begin(9600);     // ESP-01 (must be 9600 baud!)

  // Initialize Pin Modes
  pinMode(relay1Pin, OUTPUT);   // Relay 1 (LED)
  pinMode(relay2Pin, OUTPUT);   // Relay 2 (Pump/Motor)
  pinMode(buzzerPin, OUTPUT);   // Buzzer
  pinMode(trigPin, OUTPUT);     // Ultrasonic trigger
  pinMode(echoPin, INPUT);      // Ultrasonic echo

  // Initialize Relay States (Active-LOW: HIGH = OFF, LOW = ON)
  digitalWrite(relay1Pin, HIGH);   // Relay 1 OFF initially
  digitalWrite(relay2Pin, HIGH);   // Relay 2 OFF initially

  // Initialize Servo (Door closed = 0 degrees)
  doorServo.attach(servoPin);
  doorServo.write(0);

  Serial.println("\n===================================");
  Serial.println("🏠 Smart Home IoT System");
  Serial.println("===================================");
  Serial.println("System Booting Up...");
  
  // Connect to WiFi
  connectWiFi();
  
  // Boot complete tone
  tone(buzzerPin, 3000); 
  delay(300); 
  noTone(buzzerPin);
  
  Serial.println("✓ System Ready!");
  Serial.println("===================================\n");
}

// ==========================================
// 5. MAIN LOOP (NON-BLOCKING ARCHITECTURE)
// ==========================================
void loop() {
  unsigned long currentMillis = millis();

  // --- TASK 1: READ SENSORS (Every 2 Seconds) ---
  if (currentMillis - previousMillisSensors >= sensorInterval) {
    previousMillisSensors = currentMillis;
    readAllSensors();              // Read water, gas, current
    handleLocalAutomation();        // Check fire alarm & auto pump
  }

  // --- TASK 2: SEND SENSOR DATA & RECEIVE COMMANDS (Every 5 Seconds) ---
  if (currentMillis - previousMillisWeb >= webInterval) {
    previousMillisWeb = currentMillis;
    sendDataToWebsite();            // POST sensor data, receive commands
  }

  // --- TASK 3: PROCESS RECEIVED COMMANDS (Continuous) ---
  processCommands();                // Execute any pending commands
}

// ==========================================
// 6. SENSOR READING FUNCTION
// ==========================================
void readAllSensors() {
  // --- Read Ultrasonic Distance (Water Level) ---
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout
  if (duration == 0) {
    distanceCm = 999;  // Error code
  } else {
    distanceCm = duration * 0.034 / 2;  // Convert to cm
  }

  // --- Read Gas Sensor (MQ-2) ---
  gasLevel = analogRead(gasPin);  // 0-1023 ADC

  // --- Read Current Sensor (ACS712) ---
  currentUsage = analogRead(currentPin);  // 0-1023 ADC

  // --- Print to Serial Monitor for Debugging ---
  Serial.print("📊 Water: ");
  Serial.print(distanceCm);
  Serial.print("cm | Gas: ");
  Serial.print(gasLevel);
  Serial.print(" | Current: ");
  Serial.print(currentUsage);
  Serial.println();
}

// ==========================================
// 7. LOCAL AUTOMATION & SAFETY LOGIC
// ==========================================
void handleLocalAutomation() {
  // --- A. FIRE SAFETY PROTOCOL ---
  if (gasLevel > FIRE_THRESHOLD) {
    if (!isFireActive) {  // Only log once per alert
      isFireActive = true;
      tone(buzzerPin, 4000);  // High-pitched alarm
      Serial.println("🚨 EMERGENCY: FIRE DETECTED! Gas level: " + String(gasLevel));
      // Optional: Automatically unlock door in emergency
      // doorServo.write(90);
    }
  } else {
    if (isFireActive) {  // Clear alarm when safe
      isFireActive = false;
      noTone(buzzerPin);
      Serial.println("✓ Air quality normal");
    }
  }

  // --- B. AUTO WATER PUMP LOGIC ---
  if (isPumpAuto) {
    if (distanceCm >= TANK_EMPTY_CM && distanceCm != 999) {
      // Water level too low - pump should be ON
      digitalWrite(relay2Pin, LOW);
      Serial.println("🔄 Auto Mode: Tank low, pump ON (water: " + String(distanceCm) + "cm)");
    }
    else if (distanceCm <= TANK_FULL_CM && distanceCm != 999) {
      // Water level sufficient - pump should be OFF
      digitalWrite(relay2Pin, HIGH);
      Serial.println("✓ Auto Mode: Tank full, pump OFF (water: " + String(distanceCm) + "cm)");
    }
  }
}

// ==========================================
// 8. WiFi CONNECTION (AT Commands for ESP-01)
// ==========================================
void connectWiFi() {
  Serial.println("📡 Connecting to WiFi...");

  // Reset ESP-01
  espSerial.println("AT+RST");
  delay(2000);

  // Set station mode (client, not AP)
  espSerial.println("AT+CWMODE=1");
  delay(500);

  // Connect to WiFi network
  // SSID: "Aryan PG 1st F"
  // Password: "7975401607"
  espSerial.println("AT+CWJAP=\"Aryan PG 1st F\",\"7975401607\"");
  delay(8000);  // Wait for connection

  // Get IP address (verify connection)
  espSerial.println("AT+CIFSR");
  delay(1000);

  // Enable single connection mode (not multi-connection)
  espSerial.println("AT+CIPMUX=0");
  delay(300);

  Serial.println("✓ WiFi setup complete!");
}

// ==========================================
// 9. WEB COMMUNICATION FUNCTION
// ==========================================
void sendDataToWebsite() {
  // --- STEP 1: Build JSON Payload ---
  // Server expects: water (cm), gas (0-1023), power (0-1023)
  String jsonPayload = "{";
  jsonPayload += "\"water\":" + String(distanceCm) + ",";
  jsonPayload += "\"gas\":" + String(gasLevel) + ",";
  jsonPayload += "\"power\":" + String(currentUsage);
  jsonPayload += "}";

  int payloadLen = jsonPayload.length();

  // --- STEP 2: Close any existing connection ---
  espSerial.println("AT+CIPCLOSE");
  delay(300);

  // --- STEP 3: Open TCP connection to server ---
  String connectCmd = "AT+CIPSTART=\"TCP\",\"";
  connectCmd += SERVER_HOST;
  connectCmd += "\",";
  connectCmd += SERVER_PORT;
  espSerial.println(connectCmd);
  delay(1000);

  // --- STEP 4: Build HTTP POST request ---
  String httpRequest = "";
  httpRequest += "POST /sensor-data HTTP/1.1\r\n";
  httpRequest += "Host: " + String(SERVER_HOST) + "\r\n";
  httpRequest += "Content-Type: application/json\r\n";
  httpRequest += "Content-Length: " + String(payloadLen) + "\r\n";
  httpRequest += "Connection: close\r\n";
  httpRequest += "\r\n";           // End of HTTP headers
  httpRequest += jsonPayload;      // JSON body

  int requestLen = httpRequest.length();

  // --- STEP 5: Tell ESP-01 how many bytes we're sending ---
  espSerial.print("AT+CIPSEND=");
  espSerial.println(requestLen);
  delay(500);

  // --- STEP 6: Send the HTTP request ---
  espSerial.print(httpRequest);

  Serial.println("📤 Sent to server: " + jsonPayload);

  // --- STEP 7: Read HTTP response ---
  // Server responds with: "LED_ON|PUMP_AUTO|DOOR_CLOSE"
  String response = "";
  unsigned long timeout = millis() + 5000;  // 5 second timeout
  bool bodyStarted = false;

  while (millis() < timeout) {
    while (espSerial.available()) {
      char c = espSerial.read();
      response += c;

      // HTTP headers end with blank line "\r\n\r\n"
      // Everything after that is our command string
      if (!bodyStarted && response.endsWith("\r\n\r\n")) {
        bodyStarted = true;
        response = "";  // Clear headers, start fresh for body
      }
    }
    
    if (bodyStarted && response.length() > 0) {
      delay(50);
      if (!espSerial.available()) break;  // No more data coming
    }
  }

  // --- STEP 8: Store response into webCommand buffer ---
  response.trim();
  if (response.length() > 0) {
    webCommand = response;
    Serial.println("📥 Commands from server: " + webCommand);
  }
}

// ==========================================
// 10. COMMAND PROCESSING FUNCTION
// ==========================================
void processCommands() {
  // --- Allow manual command entry from Serial Monitor for testing ---
  while (Serial.available()) {
    char c = Serial.read();
    // Filter out newline characters
    if (c != '\n' && c != '\r') {
      webCommand += c;
    }
  }

  // --- Process command if buffer contains data ---
  if (webCommand.length() > 0) {
    // Normalize to uppercase
    webCommand.toUpperCase();

    // ============================================
    // 1. LIGHT / LED CONTROL (Relay 1)
    // ============================================
    if (webCommand.indexOf("LED_ON") >= 0) {
      digitalWrite(relay1Pin, LOW);    // Active-LOW: LOW = ON
      Serial.println("💡 Action: LED ON");
    }
    else if (webCommand.indexOf("LED_OFF") >= 0) {
      digitalWrite(relay1Pin, HIGH);   // Active-LOW: HIGH = OFF
      Serial.println("💡 Action: LED OFF");
    }

    // ============================================
    // 2. DOOR SERVO CONTROL
    // ============================================
    else if (webCommand.indexOf("DOOR_OPEN") >= 0) {
      doorServo.write(90);
      isDoorOpen = true;
      Serial.println("🚪 Action: Door OPEN (90°)");
    }
    else if (webCommand.indexOf("DOOR_CLOSE") >= 0) {
      doorServo.write(0);
      isDoorOpen = false;
      Serial.println("🚪 Action: Door CLOSE (0°)");
    }

    // ============================================
    // 3. PUMP AUTO/MANUAL MODE SELECTION
    // ============================================
    else if (webCommand.indexOf("PUMP_AUTO") >= 0) {
      isPumpAuto = true;
      Serial.println("🔄 Action: Pump AUTO mode ENABLED");
    }
    else if (webCommand.indexOf("PUMP_MANUAL") >= 0) {
      isPumpAuto = false;
      Serial.println("🖐️ Action: Pump MANUAL mode ENABLED");
    }

    // ============================================
    // 4. PUMP MANUAL CONTROL (Only when !isPumpAuto)
    // ============================================
    else if (webCommand.indexOf("PUMP_ON") >= 0) {
      if (!isPumpAuto) {
        digitalWrite(relay2Pin, LOW);   // Active-LOW: LOW = ON
        Serial.println("💧 Action: Manual PUMP ON");
      } else {
        Serial.println("⚠️ Cannot control pump - in AUTO mode");
      }
    }
    else if (webCommand.indexOf("PUMP_OFF") >= 0) {
      if (!isPumpAuto) {
        digitalWrite(relay2Pin, HIGH);  // Active-LOW: HIGH = OFF
        Serial.println("💧 Action: Manual PUMP OFF");
      } else {
        Serial.println("⚠️ Cannot control pump - in AUTO mode");
      }
    }

    // --- Clear buffer after processing ---
    webCommand = "";
  }
}

// ==========================================
// END OF CODE
// ==========================================

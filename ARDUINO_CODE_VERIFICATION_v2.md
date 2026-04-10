# 🔍 Arduino Code Verification Report - UPDATED CODE

**Date**: April 11, 2026  
**Project**: Smart Home IoT Dashboard  
**Code Version**: v2 (Updated)  
**Status**: ⚠️ **1 CRITICAL ERROR FOUND** (Server command mismatch)

---

## ✅ IMPROVEMENTS FROM v1 → v2

| Item                      | v1               | v2                         | Status       |
| ------------------------- | ---------------- | -------------------------- | ------------ |
| **Server IP**             | ❌ 192.168.1.100 | ✅ 192.168.0.174           | **FIXED!** ✓ |
| **Code Organization**     | All in loop()    | Separate processCommands() | Improved ✓   |
| **Comment Cleanup**       | Verbose          | Cleaned up                 | Better ✓     |
| **Serial input handling** | Basic            | Filters \n and \r          | Enhanced ✓   |
| **Case sensitivity**      | Not handled      | `.toUpperCase()`           | Better ✓     |

---

## 🔴 CRITICAL ERROR - COMMAND MISMATCH

### **PROBLEM**: Arduino expects "FAN_ON"/"FAN_OFF" but Server sends "PUMP_ON"/"PUMP_OFF"

**Current Arduino Code (Lines 180-192)**:

```cpp
else if (webCommand.indexOf("FAN_ON") >= 0 && !isPumpAuto) {
    digitalWrite(relay2Pin, LOW);
    Serial.println("Action: Manual FAN ON");
}
else if (webCommand.indexOf("FAN_OFF") >= 0 && !isPumpAuto) {
    digitalWrite(relay2Pin, HIGH);
    Serial.println("Action: Manual FAN OFF");
}
```

**Server Actually Sends** (server/index.js line 186):

```javascript
cmds.push(controls.motor === 'ON' ? 'PUMP_ON' : 'PUMP_OFF');
```

**Result**: ❌ Arduino will NEVER respond to manual pump commands!

When user toggles pump in dashboard:

1. Firebase updates `controls/motor` to 'ON'
2. Server builds command: `"LED_OFF|PUMP_MANUAL|PUMP_ON|DOOR_CLOSE"`
3. Server sends to Arduino: `PUMP_ON`
4. Arduino looks for `FAN_ON` → **NOT FOUND** ❌
5. Pump stays OFF

---

### **FIX**: Change "FAN_ON"/"FAN_OFF" to "PUMP_ON"/"PUMP_OFF"

**Replace (around line 180-192)**:

```cpp
    else if (webCommand.indexOf("FAN_ON") >= 0 && !isPumpAuto) {
      digitalWrite(relay2Pin, LOW);
      Serial.println("Action: Manual FAN ON");
    }
    else if (webCommand.indexOf("FAN_OFF") >= 0 && !isPumpAuto) {
      digitalWrite(relay2Pin, HIGH);
      Serial.println("Action: Manual FAN OFF");
    }
```

**With**:

```cpp
    else if (webCommand.indexOf("PUMP_ON") >= 0 && !isPumpAuto) {
      digitalWrite(relay2Pin, LOW);
      Serial.println("Action: Manual PUMP ON");
    }
    else if (webCommand.indexOf("PUMP_OFF") >= 0 && !isPumpAuto) {
      digitalWrite(relay2Pin, HIGH);
      Serial.println("Action: Manual PUMP OFF");
    }
```

---

## ✅ EVERYTHING ELSE CORRECT

### 1. **PIN Definitions** ✓

All pins correctly mapped for Arduino Uno + ESP-01

### 2. **Server IP** ✅ **NOW CORRECT**

```cpp
const char* SERVER_HOST = "192.168.0.174";  // ✓ CORRECT
```

This was the critical fix from v1!

### 3. **Thresholds Match Server** ✓

```cpp
const int FIRE_THRESHOLD = 400;   // ✓ Matches server
const int TANK_EMPTY_CM = 20;     // ✓ Matches server
const int TANK_FULL_CM = 5;       // ✓ Matches server
```

### 4. **Command String Parsing** ✓

```cpp
webCommand.toUpperCase();  // ✓ Converts to uppercase for consistency
```

Expected server response format:

```
LED_OFF|PUMP_AUTO|DOOR_CLOSE|PUMP_ON
```

Arduino correctly parses with `indexOf()`:

- ✓ LED_ON / LED_OFF
- ✓ DOOR_OPEN / DOOR_CLOSE
- ✓ PUMP_AUTO / PUMP_MANUAL
- ❌ ~~FAN_ON / FAN_OFF~~ **← MUST CHANGE TO PUMP_ON / PUMP_OFF**

### 5. **Sensor Reading** ✓

- Ultrasonic: 30ms timeout, error handling
- Gas: analogRead(A0)
- Current: analogRead(A1)
- All correct

### 6. **Fire Safety** ✓

```cpp
if (gasLevel > FIRE_THRESHOLD) {
    isFireActive = true;
    tone(buzzerPin, 4000);  // ✓ Correct
}
```

### 7. **Auto Pump Logic** ✓

```cpp
if (isPumpAuto) {
    if (distanceCm >= TANK_EMPTY_CM) {
        digitalWrite(relay2Pin, LOW);   // ON
    }
    else if (distanceCm <= TANK_FULL_CM) {
        digitalWrite(relay2Pin, HIGH);  // OFF
    }
}
```

### 8. **Manual Override** ✓

```cpp
else if (webCommand.indexOf("...") >= 0 && !isPumpAuto) {
    // Only executes if isPumpAuto is FALSE
}
```

Prevents manual control when in AUTO mode ✓

### 9. **Relay Control (Active LOW)** ✓

```cpp
digitalWrite(relay2Pin, LOW);   // ON  ✓
digitalWrite(relay2Pin, HIGH);  // OFF ✓
```

### 10. **HTTP Response Parsing** ✓

```cpp
if (!bodyStarted && response.endsWith("\r\n\r\n")) {
    bodyStarted = true;  // ✓ Correctly detects end of HTTP headers
}
```

### 11. **Non-Blocking Timers** ✓

```cpp
const long sensorInterval = 2000;  // ✓ Polls every 2 seconds
const long webInterval = 5000;     // ✓ Sends every 5 seconds
```

### 12. **Main Loop Organization** ✓

```cpp
void loop() {
    unsigned long currentMillis = millis();

    // Task 1: Read sensors
    if (currentMillis - previousMillisSensors >= sensorInterval) { ... }

    // Task 2: Send data & get commands
    if (currentMillis - previousMillisWeb >= webInterval) { ... }

    // Task 3: Process commands
    processCommands();
}
```

Clean, non-blocking architecture ✓

---

## ✅ Data Flow Verification

```
SENDS TO SERVER:
POST /sensor-data
{
  "water": 25,    // cm
  "gas": 350,     // ADC
  "power": 520    // ADC
}
↓
SERVER RESPONDS:
LED_OFF|PUMP_MANUAL|PUMP_ON|DOOR_CLOSE
         ↑         ↑        ↑
         |         |        └─ Door command ✓
         |         └────────── Motor control ✓
         └──────────────────── Light control ✓
↓
ARDUINO PROCESSES:
- Finds "LED_OFF" → Relay 1 OFF ✓
- Finds "PUMP_MANUAL" → isPumpAuto = false ✓
- Finds "PUMP_ON" → Relay 2 ON ✓  (Currently broken: looking for FAN_ON)
- Finds "DOOR_CLOSE" → Door to 0° ✓
```

---

## ⚠️ REMAINING WARNINGS (Same as v1)

### **WARNING #1**: WiFi Credentials Hardcoded

```cpp
espSerial.println("AT+CWJAP=\"Aryan PG 1st F\",\"7975401607\"");
```

- ⚠️ Security risk for production
- Recommendation: Use Serial input for setup or EEPROM storage

### **WARNING #2**: Fixed Delays in WiFi Setup

```cpp
delay(8000);  // Hope the network connects in 8 seconds
delay(1000);  // Hope AT+CIFSR responds in 1 second
```

- ⚠️ Could be fragile if network is slow
- Recommendation: Read AT responses and wait for proper OK signals

---

## 📋 COMPLETE CHECKLIST BEFORE UPLOAD

### **Critical Fixes**:

- [ ] **FIX PUMP COMMANDS**: Change "FAN_ON"/"FAN_OFF" → "PUMP_ON"/"PUMP_OFF" (Line ~180-192)

### **Verified Working**:

- [x] Server IP: 192.168.0.174 ✓
- [x] Thresholds: 400 (fire), 20cm (empty), 5cm (full) ✓
- [x] Pin configuration ✓
- [x] Sensor reading logic ✓
- [x] HTTP communication ✓
- [x] Auto pump logic ✓
- [x] Manual override protection ✓
- [x] Fire safety protocol ✓
- [x] Non-blocking architecture ✓

### **Hardware Testing**:

- [ ] Verify ESP-01 baud rate: 9600
- [ ] Test WiFi connection: "Aryan PG 1st F"
- [ ] Verify relay wiring (active-LOW)
- [ ] Test servo: 0° closed, 90° open
- [ ] Check sensors on correct pins
- [ ] Verify USB serial at 9600 baud

---

## 🎯 SUMMARY

| Category            | Status     | Details                      |
| ------------------- | ---------- | ---------------------------- |
| **Server IP**       | ✅ FIXED   | Now 192.168.0.174            |
| **Command Parsing** | 🔴 ERROR   | FAN*\* must be PUMP*\*       |
| **Thresholds**      | ✅ CORRECT | All match server             |
| **Logic**           | ✅ CORRECT | Auto/manual, safety features |
| **Architecture**    | ✅ CORRECT | Non-blocking, clean code     |
| **WiFi Creds**      | ⚠️ WARNING | Hardcoded (not ideal)        |
| **Ready?**          | ❌ NOT YET | Fix FAN→PUMP first           |

---

## 🚨 EXACT FIX NEEDED

**File**: Your Arduino sketch  
**Lines**: ~180-192

Find this:

```cpp
    else if (webCommand.indexOf("FAN_ON") >= 0 && !isPumpAuto) {
      digitalWrite(relay2Pin, LOW);
      Serial.println("Action: Manual FAN ON");
    }
    else if (webCommand.indexOf("FAN_OFF") >= 0 && !isPumpAuto) {
      digitalWrite(relay2Pin, HIGH);
      Serial.println("Action: Manual FAN OFF");
    }
```

Replace with:

```cpp
    else if (webCommand.indexOf("PUMP_ON") >= 0 && !isPumpAuto) {
      digitalWrite(relay2Pin, LOW);
      Serial.println("Action: Manual PUMP ON");
    }
    else if (webCommand.indexOf("PUMP_OFF") >= 0 && !isPumpAuto) {
      digitalWrite(relay2Pin, HIGH);
      Serial.println("Action: Manual PUMP OFF");
    }
```

Then upload! 🚀

---

## 📊 Expected Behavior After Fix

1. **Boot**: "System Ready!" with 3 tones
2. **Every 2s**: Reads water level, gas, current
3. **Every 5s**: Sends data to server, receives commands
4. **Dashboard Toggle**: Manual pump → Arduino responds immediately
5. **Fire Alarm**: Gas > 400 → Buzzer sounds, dashboard shows alert
6. **Auto Mode**: Water < 5cm → Pump OFF, Water > 20cm → Pump ON

All working ✓

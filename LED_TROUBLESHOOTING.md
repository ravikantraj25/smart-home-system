# 🔴 LED Control Troubleshooting Guide

**Issue**: LED not turning on despite code looking correct  
**Date**: April 11, 2026

---

## 📊 LED Control Data Flow

```
DASHBOARD (React)
    ↓ User clicks toggle
    setRelay1('ON')
    ↓
FIREBASE Database (controls/relay1 = 'ON')
    ↓ Server reads every 5 seconds
BACKEND SERVER (Node.js)
    ↓ buildCommandString() generates
    "LED_ON|PUMP_AUTO|DOOR_CLOSE"
    ↓
ARDUINO  receives via ESP-01
    webCommand = "LED_ON|..."
    ↓
processCommands() looks for indexOf("LED_ON")
    ↓ IF FOUND:
    digitalWrite(relay1Pin, LOW)  // Pin 4 → Set to LOW
    ↓
RELAY (Active-LOW)
    LOW = Relay energized → LED ON ✓
```

---

## 🔍 DIAGNOSTIC STEPS (DO THESE IN ORDER)

### **STEP 1: Check Arduino Serial Output**

Upload the code and open **Arduino IDE → Tools → Serial Monitor** at **9600 baud**.

You should see:

```
System Booting Up...
Connecting to WiFi...
WiFi setup complete!
System Ready!
Water: 15cm | Gas: 250 | Power: 512
📡 Sent to server: {"water":15,"gas":250,"power":512}
📥 Commands from server: LED_OFF|PUMP_AUTO|DOOR_CLOSE
Action: LED OFF
```

**What to check**:

- [ ] Do you see "System Ready!" ? → If NO: Serial port issue
- [ ] Do you see "Sent to server" every 5 sec? → If NO: Server connection issue
- [ ] Do you see "Commands from server" ? → If NO: Server not responding
- [ ] Do you see "Action: LED ON/OFF" ? → If NO: LED problem

---

### **STEP 2: Check if Commands Are Being Received**

Add this temporary debug code to Arduino `processCommands()`:

```cpp
void processCommands() {
  // ... existing code ...

  if (webCommand.length() > 0) {
    Serial.println("DEBUG: webCommand = [" + webCommand + "]");  // ADD THIS
    webCommand.toUpperCase();
    // ... rest of code ...
  }
}
```

**Expected output when Dashboard toggles LED ON:**

```
DEBUG: webCommand = [LED_ON|PUMP_AUTO|DOOR_CLOSE]
Action: LED ON
```

**If you see**:

- ❌ `DEBUG: webCommand = []` (empty) → **Commands not reaching Arduino**
- ❌ `DEBUG: webCommand = [GIBBERISH]` → **Serial corruption**
- ✓ `DEBUG: webCommand = [LED_ON|...]` → **Commands OK, move to Step 3**

---

### **STEP 3: Check Pin 4 Control**

Add this to verify GPIO is being set:

```cpp
void processCommands() {
  // ... existing code ...

  if (webCommand.indexOf("LED_ON") >= 0) {
    digitalWrite(relay1Pin, LOW);
    Serial.print("DEBUG: Pin 4 set to LOW, current state: ");
    Serial.println(digitalRead(relay1Pin));  // ADD THIS
    Serial.println("Action: LED ON");
  }
  else if (webCommand.indexOf("LED_OFF") >= 0) {
    digitalWrite(relay1Pin, HIGH);
    Serial.print("DEBUG: Pin 4 set to HIGH, current state: ");
    Serial.println(digitalRead(relay1Pin));  // ADD THIS
    Serial.println("Action: LED OFF");
  }

  // ... rest of code ...
}
```

**Expected output for LED ON**:

```
DEBUG: Pin 4 set to LOW, current state: 0
Action: LED ON
```

**If you see state = 1**: → Pin is not actually going LOW (hardware issue)

---

### **STEP 4: Check Relay Hardware**

**Without uploading new code**, test the relay directly with Serial Monitor:

In Arduino IDE → Serial Monitor, type and send:

```
LED_ON
```

Does the relay click/LED light up?

- ✓ YES → Arduino code is correct, check Dashboard
- ❌ NO → **Relay or wiring is wrong** (see below)

---

## 🔧 MOST COMMON ISSUES

### **Issue #1: Relay is Backwards** ❌

**Test**: Measure voltage on pin 4 with multimeter

- If LED is OFF but pin shows 0V → Relay polarity is backwards
- If LED is ON but pin shows 5V → Active-HIGH relay (not active-LOW)

**Fix**: If relay is active-HIGH (turns on with HIGH instead of LOW):

```cpp
// Change this:
if (webCommand.indexOf("LED_ON") >= 0) {
    digitalWrite(relay1Pin, LOW);   // Current (wrong for HIGH relay)
}

// To this:
if (webCommand.indexOf("LED_ON") >= 0) {
    digitalWrite(relay1Pin, HIGH);  // For active-HIGH relay
}
```

---

### **Issue #2: Pin 4 Not Connected Properly** ❌

**Check**:

- [ ] Is Arduino pin 4 connected to relay input?
- [ ] Is wire soldered firmly, not just loose?
- [ ] Is there continuity? (Use multimeter beep test)
- [ ] Did you upload to the correct board/port?

---

### **Issue #3: Firebase Not Updating** ❌

Check if Dashboard reflects the toggle:

1. Open Dashboard → Controls → Light toggle
2. Watch the ON/OFF status text
3. Does it change immediately?
   - ✓ YES → Firebase working
   - ❌ NO → **Firebase issue** (not Arduino's problem)

To verify Firebase: Check **Firebase Console → Database → controls/relay1**
Should show `"ON"` or `"OFF"` based on your toggle.

---

### **Issue #4: Commands Never Leave Server** ❌

Check if backend is sending commands:

Run this in Terminal (on PC running server):

```bash
curl http://192.168.0.174:3001/status
```

Look for this in the response:

```json
"pendingCommands": "LED_OFF|PUMP_AUTO|DOOR_CLOSE"
```

Does it show LED_ON or LED_OFF based on your Dashboard toggle?

- ✓ YES → Server is working
- ❌ NO → Backend not syncing with Firebase

---

### **Issue #5: ESP-01 Not Forwarding Response** ❌

The HTTP response from server might not be reaching Arduino.

**Test manually in Serial Monitor**:

Type: `LED_ON|PUMP_AUTO|DOOR_CLOSE`

Does Arduino respond with "Action: LED ON"?

- ✓ YES → ESP-01 response parsing is OK
- ❌ NO → **Command parsing has a bug**

---

## 🚨 QUICK CHECKLIST

### **Before Debugging**, Verify These:

- [ ] **Server is running**: `curl http://192.168.0.174:3001/status` returns JSON
- [ ] **Firebase is connected**: Can you change controls in Dashboard?
- [ ] **Arduino IP is correct**: Line 14 shows `192.168.0.174` ✓
- [ ] **ESP-01 is WiFi connected**: Serial Monitor shows "WiFi setup complete!"
- [ ] **Relay pin is 4**: Verify `const int relay1Pin = 4;`
- [ ] **Relay is active-LOW**: Check if LOW = ON (multimeter test)
- [ ] **Wire is solid**: Pin 4 → Relay input physically connected

---

## 📝 MOST LIKELY CAUSES (In Order)

| Rank | Cause                             | Probability | Fix                    |
| ---- | --------------------------------- | ----------- | ---------------------- |
| 1    | **Relay is active-HIGH**          | 40%         | Swap LOW/HIGH in code  |
| 2    | **Pin 4 not connected**           | 25%         | Check wire + solder    |
| 3    | **Commands not reaching Arduino** | 20%         | Verify server/Firebase |
| 4    | **Arduino code syntax error**     | 10%         | Check serial output    |
| 5    | **Relay hardware failure**        | 5%          | Replace relay          |

---

## ✅ VERIFICATION TEST

Once you fix it, do this:

1. **Open Serial Monitor** (9600 baud)
2. **Click Dashboard Light Toggle** → ON
3. **You should see**:
   ```
   📥 Commands from server: LED_ON|PUMP_AUTO|DOOR_CLOSE
   Action: LED ON
   ```
4. **And LED physically lights up** ✓

If all three happen → **LED control is working!** 🎉

---

## 💡 EXAMPLE: Active-HIGH Relay Fix

If your relay needs HIGH to turn on (instead of LOW):

**In Arduino sketch, find this section**:

```cpp
    if (webCommand.indexOf("LED_ON") >= 0) {
      digitalWrite(relay1Pin, LOW);    // ❌ CHANGE THIS
      Serial.println("Action: LED ON");
    }
    else if (webCommand.indexOf("LED_OFF") >= 0) {
      digitalWrite(relay1Pin, HIGH);    // ❌ CHANGE THIS
      Serial.println("Action: LED OFF");
    }
```

**Replace with**:

```cpp
    if (webCommand.indexOf("LED_ON") >= 0) {
      digitalWrite(relay1Pin, HIGH);    // ✓ Active-HIGH
      Serial.println("Action: LED ON");
    }
    else if (webCommand.indexOf("LED_OFF") >= 0) {
      digitalWrite(relay1Pin, LOW);     // ✓ Active-HIGH
      Serial.println("Action: LED OFF");
    }
```

Also need to fix setup():

```cpp
// OLD:
digitalWrite(relay1Pin, HIGH);  // Initially OFF (active-LOW)

// NEW (for active-HIGH):
digitalWrite(relay1Pin, LOW);   // Initially OFF (active-HIGH)
```

---

## 🔗 Helpful Links

- **Relay wiring guide**: [How Relays Work](https://www.electronics-tutorials.ws/io/io_relays.html)
- **Multimeter voltage test**: Pin 4 should show 0V (LOW) or 5V (HIGH)
- **Active-LOW vs HIGH**: Most relays are active-LOW (pull to ground = on)

---

**Report back with your findings!** What did you see in Serial Monitor? 🔍

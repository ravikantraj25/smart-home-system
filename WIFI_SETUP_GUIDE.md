# 🏠 Complete WiFi Setup Guide for Smart Home Dashboard

## System Architecture Overview

```
Arduino + ESP-01
    ↓ (WiFi HTTP POST)
Backend Server (Node.js) @ localhost:3001
    ↓ (Admin SDK writes)
Firebase Realtime Database
    ↓ (Real-time Listeners)
React Frontend Website
    ↓ (User sends commands)
Firebase Database
    ↓ (Backend reads)
Backend Server
    ↓ (HTTP Response with commands)
Arduino + ESP-01
    ↓ (Executes)
Hardware (Relays, Servo, Sensors)
```

---

## ⚠️ CRITICAL SETUP STEPS

### STEP 1: Update Backend Server IP in Arduino Code

Your Arduino code has this hardcoded:

```cpp
const char* SERVER_HOST = "192.168.1.100";  // ← YOU NEED TO PUT YOUR SERVER IP HERE!
const int   SERVER_PORT = 3001;
```

**Find your server IP:**

**If running locally (same WiFi network):**

```bash
# On Windows (where backend is running):
ipconfig

# Find: "IPv4 Address" under your WiFi adapter
# Example: 192.168.1.50 or 192.168.1.100
```

**If using cloud deployment:**

- Use your actual server's public IP or domain name
- Replace `192.168.1.100` with that IP/domain

**Example:**

```cpp
const char* SERVER_HOST = "192.168.1.50";  // Your actual server IP
const int   SERVER_PORT = 3001;
```

---

### STEP 2: Create Frontend `.env` File

The website is deployed but needs Firebase credentials to read/write data.

**Location:** `client/.env` (copy from .env.example)

**Go to Firebase Console:**

1. Click **Project Settings** (gear icon)
2. **Your apps** section → Find your web app
3. Scroll down, copy the entire `firebaseConfig` object
4. Create `client/.env` with these values:

```env
VITE_BACKEND_URL=http://localhost:3001

VITE_FIREBASE_API_KEY=AIzaSyBe3jIeTWBxnCBGaR4WbiZG0Du-PPfypZM
VITE_FIREBASE_AUTH_DOMAIN=smart-home-automation-b184d.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://smart-home-automation-b184d-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=smart-home-automation-b184d
VITE_FIREBASE_STORAGE_BUCKET=smart-home-automation-b184d.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=640307774492
VITE_FIREBASE_APP_ID=1:640307774492:web:e4121b430325703fb3cbd9
```

**Then rebuild and redeploy:**

```bash
cd client
npm run build
cd ..
firebase deploy --only hosting
```

---

### STEP 3: Start Backend Server

**Terminal 1:**

```bash
cd server
npm run dev
```

Expected output:

```
✅ Firebase Admin connected
🏠 Smart Home IoT Backend
🔥 Firebase: CONNECTED
🌐 Server: http://localhost:3001
```

---

## ✅ VERIFICATION CHECKLIST

### 1. Backend Health Check

```
Open in browser: http://localhost:3001/status
```

Should show:

```json
{
  "status": "ok",
  "firebase": true,
  "latestSensors": { "waterLevel": 0, "gas": 0, "current": 0 },
  "latestControls": {
    "relay1": "OFF",
    "relay2Mode": "AUTO",
    "motor": "OFF",
    "door": "CLOSED"
  }
}
```

### 2. Firebase Console

- Open Firebase Console → Realtime Database → **Data** tab
- Should show: `sensors/`, `controls/`, `metadata/`, `alerts/`

### 3. Website

- Open: **https://smart-home-automation-b184d.web.app**
- Should load the dashboard UI
- **If Firebase not configured:** Will show warning in console but still load

### 4. Arduino to Backend

- Upload your Arduino code with correct `SERVER_HOST`
- Open Arduino Serial Monitor @ 9600 baud
- Should see:

```
📡 Sent to server: {"water":25,"gas":350,"power":500}
📥 Commands from server: LED_OFF|PUMP_AUTO|DOOR_CLOSE
```

### 5. Backend to Firebase

- Go to Firebase Console
- Sensors should update in real-time: `sensors/waterLevel`, `sensors/gas`, `sensors/current`

### 6. Firebase to Website

- Open website dashboard
- Values should auto-update as sensors change
- Toggle switches (Light, Pump, Door) should work

---

## 🚀 Complete Data Flow

```
1. Arduino reads sensors every 2 seconds
2. Arduino sends JSON to: http://SERVER_HOST:3001/sensor-data
3. Backend writes to Firebase
4. Website real-time listeners get updates instantly
5. User clicks button on website (e.g., "Turn On Light")
6. Website writes to Firebase: controls/relay1 = "ON"
7. Backend reads Firebase for next command
8. Backend responds to Arduino with: "LED_ON|PUMP_AUTO|DOOR_CLOSE"
9. Arduino executes: digitalWrite(relay1Pin, LOW)
```

---

## 🔧 Arduino Code Quick Reference

**Sensor Reading Interval:** 2 seconds (line 68)

```cpp
const long sensorInterval = 2000;
```

**Data Send Interval:** 5 seconds (line 70)

```cpp
const long webInterval = 5000;
```

**Fire Threshold:** Gas level > 400 triggers alarm (line 50)

```cpp
const int FIRE_THRESHOLD = 400;
```

**Tank Levels:**

- Empty at < 20cm → **Pump turns ON** (line 51)
- Full at < 5cm → **Pump turns OFF** (line 52)

---

## ⚡ If Something Doesn't Work

### Arduino not connecting to WiFi?

- Check SSID/password in code (line 100-101)
- ESP-01 baud rate must be 9600
- Add 100µF capacitor between ESP-01 power pins

### Backend not receiving data?

```bash
# Check backend logs
cd server
npm run dev
# Watch console output
```

### Firebase not updating?

```bash
# Check rules | go to Firebase Console → Rules tab
# Should be:
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Website not showing data?

- Open browser DevTools (F12)
- Go to **Console** tab
- Should NOT see Firebase auth errors
- Check `client/.env` has correct credentials

---

## 📱 Test Commands (From Arduino Serial Monitor)

Type these in Arduino Serial Monitor to test commands:

```
LED_ON
LED_OFF
PUMP_ON
PUMP_OFF
PUMP_AUTO
PUMP_MANUAL
DOOR_OPEN
DOOR_CLOSE
```

The system will execute them immediately!

---

**Summary: Your system is ready once you:**

1. ✅ Update Arduino `SERVER_HOST` with your server IP
2. ✅ Create `client/.env` with Firebase credentials
3. ✅ Rebuild & redeploy frontend
4. ✅ Start backend server
5. ✅ Upload Arduino code

Then real-time WiFi control will work! 🎉

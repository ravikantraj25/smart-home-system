# 🏠 IoT Smart Home Dashboard

A production-level IoT Smart Home Dashboard with real-time monitoring, device control, voice commands, and automated WhatsApp emergency alerts for gas leaks.

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Tailwind CSS + Framer Motion |
| Charts | Recharts |
| Backend | Node.js (Express) |
| Database | Firebase Realtime Database |
| Voice | Web Speech API |
| Notifications | Twilio WhatsApp API |
| Hardware | Arduino Uno + ESP-01 (ESP8266) |

## 📁 Project Structure

```
smart-home-dashboard/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx             # App header, dark mode, connection status
│   │   │   ├── WaterLevelIndicator.jsx # Circular water level gauge
│   │   │   ├── AirQualityStatus.jsx   # Gas/fire detection card
│   │   │   ├── EnergyMonitor.jsx      # Real-time current chart
│   │   │   ├── LightControl.jsx       # Relay 1 toggle + timer
│   │   │   ├── MotorControl.jsx       # Relay 2 auto/manual control
│   │   │   ├── DoorControl.jsx        # Servo door control with animation
│   │   │   └── VoiceControl.jsx       # Voice command interface
│   │   ├── firebase.js                # Firebase config & helpers
│   │   ├── App.jsx                    # Main application
│   │   ├── index.css                  # Global styles & animations
│   │   └── main.jsx                   # React entry point
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── server/                    # Node.js Backend
│   ├── index.js               # Express server + Twilio
│   ├── .env.example           # Environment variables template
│   └── package.json
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Firebase project with Realtime Database
- (Optional) Twilio account for WhatsApp alerts

### 1. Clone & Install

```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Realtime Database**
4. Set database rules to allow read/write (for development):
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
5. Go to **Project Settings** → **General** → **Your apps** → Add a **Web app**
6. Copy the Firebase config object

7. **Frontend**: Edit `client/src/firebase.js` and replace the config:
   ```js
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
     projectId: "YOUR_PROJECT",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

8. **Backend**: Go to **Project Settings** → **Service Accounts** → **Generate new private key**
   - Save as `server/serviceAccountKey.json`
   - Uncomment the service account line in `server/index.js`

9. **Initialize database** with this structure (you can paste this in Firebase Console):
   ```json
   {
     "sensors": {
       "waterLevel": 0,
       "gas": 0,
       "current": 0
     },
     "controls": {
       "relay1": "OFF",
       "relay2Mode": "AUTO",
       "motor": "OFF",
       "door": "CLOSED"
     }
   }
   ```

### 3. Twilio WhatsApp Setup (Optional)

1. Sign up at [Twilio](https://www.twilio.com/)
2. Go to **Messaging** → **Try it Out** → **Send a WhatsApp Message**
3. Follow the sandbox setup instructions
4. Get your credentials from the [Twilio Console](https://www.twilio.com/console)

5. Create `server/.env` from the template:
   ```bash
   cp .env.example .env
   ```

6. Fill in your Twilio credentials:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ALERT_NUMBERS=["+91XXXXXXXXXX","+91YYYYYYYYYY"]
   FIREBASE_DB_URL=https://YOUR_PROJECT-default-rtdb.firebaseio.com
   ```

### 4. Run the Application

```bash
# Terminal 1 - Start Backend
cd server
npm run dev

# Terminal 2 - Start Frontend
cd client
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/status` | Health check & system info |
| `POST` | `/sensor-data` | Receive data from ESP8266 |
| `POST` | `/send-whatsapp` | Manually trigger WhatsApp alert |
| `GET` | `/alerts` | View alert history |

### ESP8266 Sensor Data Format

```json
POST /sensor-data
{
  "waterLevel": 25,
  "gas": 350,
  "current": 1.2
}
```

## 🔥 Firebase Data Structure

```json
{
  "sensors": {
    "waterLevel": 25,
    "gas": 350,
    "current": 1.2
  },
  "controls": {
    "relay1": "OFF",
    "relay2Mode": "AUTO",
    "motor": "OFF",
    "door": "CLOSED"
  },
  "alerts": {
    "-NxyzABC": {
      "type": "GAS_LEAK",
      "gasValue": 450,
      "timestamp": "2026-04-10T14:30:00.000Z",
      "whatsappSent": true
    }
  }
}
```

## 🎙 Voice Commands

| Command | Action |
|---------|--------|
| "Turn on light" | Sets relay1 = ON |
| "Turn off light" | Sets relay1 = OFF |
| "Turn on motor" | Sets motor = ON |
| "Turn off motor" | Sets motor = OFF |
| "Open door" | Sets door = OPEN |
| "Close door" | Sets door = CLOSED |

## 🔌 Arduino ESP-01 Integration

### Sending Sensor Data to Backend

```cpp
// ESP8266 HTTP POST to backend
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

void sendSensorData(float waterLevel, float gas, float current) {
  WiFiClient client;
  HTTPClient http;
  
  http.begin(client, "http://YOUR_SERVER_IP:3001/sensor-data");
  http.addHeader("Content-Type", "application/json");
  
  String json = "{\"waterLevel\":" + String(waterLevel) +
                ",\"gas\":" + String(gas) +
                ",\"current\":" + String(current) + "}";
  
  int httpCode = http.POST(json);
  http.end();
}
```

### Reading Controls from Firebase

```cpp
// Use Firebase ESP8266 library to listen for control changes
#include <FirebaseESP8266.h>

void readControls() {
  String relay1 = Firebase.getString(fbdo, "/controls/relay1");
  String motor = Firebase.getString(fbdo, "/controls/motor");
  String door = Firebase.getString(fbdo, "/controls/door");
  
  // Act on control values
  digitalWrite(RELAY1_PIN, relay1 == "ON" ? HIGH : LOW);
  digitalWrite(RELAY2_PIN, motor == "ON" ? HIGH : LOW);
  servo.write(door == "OPEN" ? 90 : 0);
}
```

## ✨ Features

- ✅ Real-time sensor monitoring (Water Level, Gas, Current)
- ✅ Device control (Light, Motor, Door)
- ✅ Voice commands via Web Speech API
- ✅ Auto WhatsApp alerts on gas leak (gas > 400)
- ✅ Glassmorphism dark theme with neon gradients
- ✅ Dark/Light mode toggle
- ✅ Connection status indicator
- ✅ Loading skeletons
- ✅ Animated progress bars and charts
- ✅ Mobile responsive design
- ✅ Auto-off timer for lights
- ✅ Auto/Manual motor mode
- ✅ 3D door animation
- ✅ Fire alert sound

## 📄 License

MIT

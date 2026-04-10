# Render Deployment Environment Variables

## Backend (Node.js Server)

### Firebase Configuration

- **FIREBASE_DB_URL**: `https://smart-home-automation-b184d-default-rtdb.firebaseio.com`
- **FIREBASE_SERVICE_ACCOUNT**: (JSON as string) Your Firebase service account key

### Twilio Configuration (Optional)

- **TWILIO_ACCOUNT_SID**: Your Twilio account SID
- **TWILIO_AUTH_TOKEN**: Your Twilio auth token
- **TWILIO_WHATSAPP_NUMBER**: Your Twilio WhatsApp number
- **ALERT_NUMBERS**: JSON array of alert numbers (e.g., `["whatsapp:+1234567890"]`)

### Alert Thresholds (Optional)

- **FIRE_THRESHOLD**: Gas alert threshold (default: 400)
- **TANK_EMPTY_CM**: Tank empty threshold in cm (default: 20)
- **TANK_FULL_CM**: Tank full threshold in cm (default: 5)

## Frontend (React/Vite)

### Firebase Configuration (Vite env vars)

- **VITE_FIREBASE_API_KEY**: Your Firebase API key
- **VITE_FIREBASE_AUTH_DOMAIN**: `smart-home-automation-b184d.firebaseapp.com`
- **VITE_FIREBASE_DATABASE_URL**: `https://smart-home-automation-b184d-default-rtdb.firebaseio.com`
- **VITE_FIREBASE_PROJECT_ID**: `smart-home-automation-b184d`
- **VITE_FIREBASE_STORAGE_BUCKET**: `smart-home-automation-b184d.firebasestorage.app`
- **VITE_FIREBASE_MESSAGING_SENDER_ID**: `640307774492`
- **VITE_FIREBASE_APP_ID**: `1:640307774492:web:e4121b430325703fb3cbd9`
- **VITE_FIREBASE_MEASUREMENT_ID**: `G-2NTCC8BS2L`

## Setup Instructions

1. In Render Dashboard, add environment variables for both services
2. For Backend: Set all Firebase and Twilio variables
3. For Frontend: Set all Firebase Vite variables (these are used at build time)
4. Deploy!

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const twilio = require('twilio');

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE OVERVIEW
//
//  Arduino Uno  <--SoftwareSerial-->  ESP-01  <--HTTP-->  This Server  <---->  Firebase
//
//  FLOW (Every 5 sec):
//   1. Arduino calls sendDataToWebsite() via ESP-01 AT commands
//   2. ESP-01 POSTs  POST /sensor-data  with body: water=X&gas=X&power=X
//   3. Server writes sensors to Firebase, checks alert thresholds
//   4. Server reads current controls from Firebase, builds a COMMAND STRING
//   5. Server responds with plain text:  "LED_ON|PUMP_AUTO|DOOR_CLOSE"
//   6. ESP-01 forwards the response string to Arduino via SoftwareSerial
//   7. Arduino's listenForWebCommands() picks up "LED_ON", "PUMP_AUTO" etc.
//
//  ARDUINO FIELD NAMES → FIREBASE FIELD NAMES:
//   water  → sensors/waterLevel
//   gas    → sensors/gas
//   power  → sensors/current  (raw ADC value 0-1023)
//
//  ARDUINO COMMANDS (parsed with indexOf()):
//   LED_ON | LED_OFF | DOOR_OPEN | DOOR_CLOSE
//   PUMP_AUTO | PUMP_MANUAL | PUMP_ON | PUMP_OFF
// ─────────────────────────────────────────────────────────────────────────────

// ─── Firebase Admin Init ──────────────────────────────────────────────────────
let db = null;

if (process.env.FIREBASE_DB_URL) {
  try {
    let sa;
    // Option 1: Service account JSON from environment variable (for cloud deployment)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('🔑 Using service account from environment variable');
    } else {
      // Option 2: Local file (for development)
      sa = require('./serviceAccountKey.json');
      console.log('🔑 Using local serviceAccountKey.json');
    }
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      databaseURL: process.env.FIREBASE_DB_URL,
    });
    db = admin.database();
    console.log('✅ Firebase Admin connected');
  } catch (err) {
    console.warn('⚠️  Firebase init failed:', err.message);
    console.warn(
      '   → Running in simulation mode (sensor data logged, no real DB writes)'
    );
  }
} else {
  console.warn('⚠️  FIREBASE_DB_URL not set → running in simulation mode');
}

// ─── Twilio Init ──────────────────────────────────────────────────────────────
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_ACCOUNT_SID.startsWith('AC')
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const TWILIO_WHATSAPP_FROM =
  process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

const ALERT_NUMBERS = process.env.ALERT_NUMBERS
  ? JSON.parse(process.env.ALERT_NUMBERS)
  : ['+911234567890'];

// ─── Fire / Gas Thresholds (match Arduino constants) ──────────────────────────
const FIRE_THRESHOLD = parseInt(process.env.FIRE_THRESHOLD || '400'); // Arduino: FIRE_THRESHOLD
const TANK_EMPTY_CM = parseInt(process.env.TANK_EMPTY_CM || '20'); // Arduino: TANK_EMPTY_CM
const TANK_FULL_CM = parseInt(process.env.TANK_FULL_CM || '5'); // Arduino: TANK_FULL_CM

// ─── In-memory state ─────────────────────────────────────────────────────────
const alertLog = [];
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Latest sensor readings — kept in memory so /commands can use them
let latestSensors = { waterLevel: 0, gas: 0, current: 0 };

// Latest control state read from Firebase (or defaults)
// This is refreshed every time /sensor-data receives a request
let latestControls = {
  relay1: 'OFF', // LED/Light
  relay2Mode: 'AUTO', // PUMP mode
  motor: 'OFF', // PUMP on/off (manual)
  door: 'CLOSED', // Door servo
};

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ← fallback for form-encoded data

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Initialize Firebase database with default structure
// ─────────────────────────────────────────────────────────────────────────────
async function initializeDatabase() {
  if (!db) return;
  try {
    console.log('🔍 Reading Firebase database...');

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database read timeout')), 5000)
    );

    const readPromise = db.ref('/').once('value');
    const snapshot = await Promise.race([readPromise, timeoutPromise]);

    console.log('✅ Firebase database read successful');
    if (!snapshot.exists() || snapshot.val() === null) {
      // Database is empty, initialize with default values
      const defaultData = {
        sensors: {
          waterLevel: 0,
          gas: 0,
          current: 0,
          timestamp: new Date().toISOString(),
        },
        controls: {
          relay1: 'OFF', // LED/Light
          relay2Mode: 'AUTO', // PUMP mode
          motor: 'OFF', // PUMP on/off
          door: 'CLOSED', // Door servo
        },
        alerts: {
          lastAlert: null,
          activeAlerts: [],
        },
        metadata: {
          initialized: new Date().toISOString(),
          project: 'Smart Home Automation',
        },
      };

      await db.ref('/').set(defaultData);
      console.log('📊 Firebase Database initialized with default values');
    } else {
      console.log('📊 Firebase Database already contains data');
    }
  } catch (err) {
    console.warn('⚠️  Database initialization failed:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Read current controls from Firebase and update latestControls
// ─────────────────────────────────────────────────────────────────────────────
async function syncControlsFromFirebase() {
  if (!db) return;
  try {
    const snap = await db.ref('controls').once('value');
    const data = snap.val();
    if (data) latestControls = { ...latestControls, ...data };
  } catch (err) {
    console.warn('Could not read controls from Firebase:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Listen for real-time control changes from Firebase
// ─────────────────────────────────────────────────────────────────────────────
function listenToControlsFromFirebase() {
  if (!db) return;
  try {
    db.ref('controls').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log('🔄 Controls updated from Firebase:', data);
        latestControls = { ...latestControls, ...data };
      }
    });
  } catch (err) {
    console.warn('Could not set up controls listener:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Translate Firebase controls → Arduino command string
//
//  Arduino's listenForWebCommands() uses indexOf(), so we can send multiple
//  commands separated by "|" — e.g. "LED_ON|PUMP_AUTO|DOOR_CLOSE"
// ─────────────────────────────────────────────────────────────────────────────
function buildCommandString(controls) {
  const cmds = [];

  // 1. Light (Relay 1) → LED_ON / LED_OFF
  cmds.push(controls.relay1 === 'ON' ? 'LED_ON' : 'LED_OFF');

  // 2. Pump mode (Relay 2 Mode) → PUMP_AUTO / PUMP_MANUAL
  if (controls.relay2Mode === 'AUTO') {
    cmds.push('PUMP_AUTO');
    // In auto mode Arduino handles pump itself — we don't send PUMP_ON/OFF
  } else {
    cmds.push('PUMP_MANUAL');
    // In manual mode also send the on/off state
    cmds.push(controls.motor === 'ON' ? 'PUMP_ON' : 'PUMP_OFF');
  }

  // 3. Door servo → DOOR_OPEN / DOOR_CLOSE
  const doorCmd = controls.door === 'OPEN' ? 'DOOR_OPEN' : 'DOOR_CLOSE';
  cmds.push(doorCmd);

  const cmdString = cmds.join('|');
  if (controls.door !== 'CLOSED' && controls.door !== 'OPEN') {
    console.warn(
      `⚠️ Invalid door state: ${controls.door}, sending: ${doorCmd}`
    );
  }

  return cmdString;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Convert raw ACS712 ADC value → current in Amps
//  ACS712-05A: sensitivity = 185 mV/A, midpoint ≈ 512 (2.5V on 5V Arduino)
//  Current(A) = (ADC - 512) * (5000 / 1023) / 185
// ─────────────────────────────────────────────────────────────────────────────
function adcToCurrent(adc) {
  const voltage_mV = (adc / 1023.0) * 5000.0;
  const current_A = Math.abs((voltage_mV - 2500.0) / 185.0);
  return parseFloat(current_A.toFixed(3));
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: GET /status  —  Health check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    firebase: !!db,
    twilio: !!twilioClient,
    thresholds: { FIRE_THRESHOLD, TANK_EMPTY_CM, TANK_FULL_CM },
    latestSensors,
    latestControls,
    totalAlerts: alertLog.length,
    pendingCommands: buildCommandString(latestControls),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /sensor-data
//
//  Called by ESP-01 (via Arduino's sendDataToWebsite()).
//  Accepts BOTH:
//    - Arduino field names: water, gas, power   (form-encoded or JSON)
//    - Dashboard field names: waterLevel, current, gas  (JSON from frontend tests)
//
//  RESPONSE: plain-text command string (e.g. "LED_ON|PUMP_AUTO|DOOR_CLOSE")
//  ESP-01 forwards this to Arduino via SoftwareSerial → Arduino reads it.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/sensor-data', async (req, res) => {
  try {
    const body = req.body;

    // ── Map Arduino field names to internal names ──────────────────────────
    //  Arduino sends: water, gas, power
    //  Legacy/dashboard sends: waterLevel, gas, current
    const rawWater = body.water ?? body.waterLevel;
    const rawGas = body.gas;
    const rawPower = body.power ?? body.current;

    if (
      rawWater === undefined ||
      rawGas === undefined ||
      rawPower === undefined
    ) {
      return res.status(400).send('ERROR:MISSING_FIELDS');
      // Plain-text error so Arduino serial monitor shows it clearly
    }

    // ── Parse & convert ────────────────────────────────────────────────────
    const waterLevel = parseFloat(rawWater); // cm from ultrasonic
    const gas = parseFloat(rawGas); // ADC 0-1023 (MQ-2)
    const powerADC = parseFloat(rawPower); // ADC 0-1023 (ACS712)
    const current = adcToCurrent(powerADC); // convert to Amps

    latestSensors = { waterLevel, gas, current };

    console.log(
      `📡 [${new Date().toLocaleTimeString()}] Sensor data received:`
    );
    console.log(`   💧 Water:   ${waterLevel} cm`);
    console.log(`   🌫️  Gas:     ${gas} (ADC) — threshold: ${FIRE_THRESHOLD}`);
    console.log(`   ⚡ Current: ${current} A  (raw ADC: ${powerADC})`);

    // ── Write to Firebase ──────────────────────────────────────────────────
    if (db) {
      await db.ref('sensors').set({ waterLevel, gas, current });
    }

    // ── Fire / Gas Alert Logic ────────────────────────────────────────────
    if (gas > FIRE_THRESHOLD) {
      const now = Date.now();
      console.log(`🚨 GAS ALERT! Level: ${gas} > threshold: ${FIRE_THRESHOLD}`);

      if (now - lastAlertTime > ALERT_COOLDOWN_MS) {
        lastAlertTime = now;

        const alertEntry = {
          type: 'GAS_LEAK',
          gasValue: gas,
          waterLevel,
          current,
          timestamp: new Date().toISOString(),
          whatsappSent: false,
        };

        if (twilioClient) {
          try {
            const results = await sendWhatsAppAlerts(gas);
            alertEntry.whatsappSent = true;
            alertEntry.results = results;
            console.log(
              `📱 WhatsApp alerts sent to ${results.length} number(s)`
            );
          } catch (err) {
            console.error('❌ WhatsApp send failed:', err.message);
          }
        } else {
          console.warn('⚠️  Twilio not configured — skipping WhatsApp alert');
        }

        alertLog.push(alertEntry);
        if (db) await db.ref('alerts').push(alertEntry);
      } else {
        const remainingSec = Math.round(
          (ALERT_COOLDOWN_MS - (Date.now() - lastAlertTime)) / 1000
        );
        console.log(
          `⏳ Alert cooldown active — next alert in ${remainingSec}s`
        );
      }
    }

    // ── Auto-pump logic mirror (for Firebase sync in auto mode) ───────────
    //  Arduino handles hardware directly, but we mirror the expected state
    //  to Firebase so the dashboard stays in sync
    if (db && latestControls.relay2Mode === 'AUTO') {
      let autoMotorState = null;
      if (waterLevel >= TANK_EMPTY_CM) autoMotorState = 'ON';
      else if (waterLevel <= TANK_FULL_CM) autoMotorState = 'OFF';

      if (autoMotorState && autoMotorState !== latestControls.motor) {
        latestControls.motor = autoMotorState;
        await db.ref('controls/motor').set(autoMotorState);
        console.log(
          `🔄 Auto-pump sync → motor: ${autoMotorState} (water: ${waterLevel}cm)`
        );
      }
    }

    // ── Sync latest controls from Firebase ────────────────────────────────
    await syncControlsFromFirebase();

    // ── Build and send command string ────────────────────────────────────
    //  This is the KEY response — ESP-01 forwards it to Arduino SoftwareSerial
    const commandString = buildCommandString(latestControls);
    console.log(`📤 Commands → Arduino: "${commandString}"`);

    // Return plain text — Arduino's webCommand string will contain it
    res.set('Content-Type', 'text/plain');
    res.send(commandString);
  } catch (err) {
    console.error('❌ Error in /sensor-data:', err);
    res.status(500).send('ERROR:SERVER');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: GET /commands
//
//  Optional polling endpoint for ESP-01 to fetch latest commands WITHOUT
//  sending sensor data (useful during testing or for a separate polling loop).
//  Returns same plain-text command string.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/commands', async (req, res) => {
  await syncControlsFromFirebase();
  const commandString = buildCommandString(latestControls);
  console.log(`📤 [Poll] Commands: "${commandString}"`);
  res.set('Content-Type', 'text/plain');
  res.send(commandString);
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /send-whatsapp  —  Manual WhatsApp trigger (from dashboard)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/send-whatsapp', async (req, res) => {
  try {
    const { gasValue } = req.body;

    if (!twilioClient) {
      return res.status(503).json({
        error: 'Twilio not configured',
        hint: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER in .env',
      });
    }

    const results = await sendWhatsAppAlerts(gasValue ?? latestSensors.gas);

    const entry = {
      type: 'MANUAL_ALERT',
      gasValue: gasValue ?? latestSensors.gas,
      timestamp: new Date().toISOString(),
      whatsappSent: true,
      results,
    };
    alertLog.push(entry);
    if (db) await db.ref('alerts').push(entry);

    res.json({ success: true, alertsSent: results.length, results });
  } catch (err) {
    console.error('Error in /send-whatsapp:', err);
    res
      .status(500)
      .json({ error: 'Failed to send WhatsApp alerts', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: GET /alerts  —  Alert history (last 50)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/alerts', (req, res) => {
  res.json({
    total: alertLog.length,
    alerts: alertLog.slice(-50).reverse(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Send WhatsApp to all configured numbers
// ─────────────────────────────────────────────────────────────────────────────
async function sendWhatsAppAlerts(gasValue) {
  const timeStr = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const body = [
    '🚨 *EMERGENCY ALERT* 🚨',
    '',
    '⛽ *Gas / Fire Detected!*',
    '',
    `📍 *Location:* Home`,
    `📊 *Gas Level:* ${gasValue} ADC (threshold: ${FIRE_THRESHOLD})`,
    `⏱️ *Time:* ${timeStr}`,
    '',
    '⚠️ Please take action immediately!',
    '🔥 Evacuate if needed. Check the IoT dashboard.',
    '',
    '_— Smart Home Alert System_',
  ].join('\n');

  const results = [];
  for (const number of ALERT_NUMBERS) {
    try {
      const msg = await twilioClient.messages.create({
        body,
        from: TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
          ? TWILIO_WHATSAPP_FROM
          : `whatsapp:${TWILIO_WHATSAPP_FROM}`,
        to: number.startsWith('whatsapp:') ? number : `whatsapp:${number}`,
      });
      console.log(`  ✅ Sent to ${number} → SID: ${msg.sid}`);
      results.push({ number, status: 'sent', sid: msg.sid });
    } catch (err) {
      console.error(`  ❌ Failed to ${number}: ${err.message}`);
      results.push({ number, status: 'failed', error: err.message });
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🔄 Starting server initialization...');
  // Initialize database if Firebase is connected
  if (db) {
    console.log('📍 Database object exists, initializing...');
    await initializeDatabase();
    // Set up real-time listening for control changes
    listenToControlsFromFirebase();
    console.log('🔊 Listening for real-time control changes from Firebase');
  } else {
    console.log('⚠️ Database object is null, skipping initialization');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🏠 Smart Home IoT Backend');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Server:       http://localhost:${PORT}`);
    console.log(`📡 Sensor IN:    POST /sensor-data       ← ESP-01 sends here`);
    console.log(
      `📤 Commands OUT: (response of POST above) → forwarded to Arduino`
    );
    console.log(
      `🔄 Poll cmds:    GET  /commands           ← ESP-01 can poll here`
    );
    console.log(`📱 WhatsApp:     POST /send-whatsapp`);
    console.log(`💚 Health:       GET  /status`);
    console.log(`📋 Alerts:       GET  /alerts`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      `🔥 Firebase:  ${db ? 'CONNECTED' : 'Not configured (simulation mode)'}`
    );
    console.log(
      `📱 Twilio:    ${twilioClient ? 'CONNECTED' : 'Not configured'}`
    );
    console.log(
      `🌡️  Thresholds: Gas>${FIRE_THRESHOLD} | Tank empty>${TANK_EMPTY_CM}cm | Tank full<${TANK_FULL_CM}cm`
    );
    console.log(`👥 Alert numbers: ${ALERT_NUMBERS.join(', ')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
})();

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const twilio = require('twilio');
const mongoose = require('mongoose');

// ─── Route imports ───────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const energyRoutes = require('./routes/energy');
const alertRoutes = require('./routes/alerts');

// ─── Model imports ───────────────────────────────────────────────────────────
const EnergyLog = require('./models/EnergyLog');
const AlertHistory = require('./models/AlertHistory');

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

const TWILIO_PHONE_FROM =
  process.env.TWILIO_PHONE_NUMBER || '+12296337232';

// ─── Alert Recipients ──────────────────────────────────────────────────────
// Recipient 1: Family Member / House Owner
const ALERT_FAMILY = {
  label: 'Family (House Owner)',
  call: process.env.ALERT_FAMILY_CALL || '+918340286898',
  whatsapp: process.env.ALERT_FAMILY_WHATSAPP || 'whatsapp:+918340286898',
  sms: process.env.ALERT_FAMILY_SMS || '+918340286898',
};

// Recipient 2: Fire Extinguisher Office
const ALERT_FIRE_OFFICE = {
  label: 'Fire Extinguisher Office',
  call: process.env.ALERT_FIRE_OFFICE_CALL || '+919508529221',
  whatsapp: process.env.ALERT_FIRE_OFFICE_WHATSAPP || 'whatsapp:+919508529221',
  sms: process.env.ALERT_FIRE_OFFICE_SMS || '+919508529221',
};

// Alert address — included in all messages for location context
const ALERT_ADDRESS = process.env.ALERT_ADDRESS ||
  'Flat 302, Sunrise Apartments, Sector 15, Patna, Bihar 800001, India';


// ─── Fire / Gas Thresholds (match Arduino constants) ──────────────────────────
const FIRE_THRESHOLD = parseInt(process.env.FIRE_THRESHOLD || '400'); // Arduino: FIRE_THRESHOLD

// Tank thresholds — Arduino now sends water level as PERCENTAGE (0-100%)
// Based on 8cm plastic glass: sensor on top, measures distance to water surface
// Arduino calculates: waterLevel% = (8 - distanceCm) / 8 * 100
const TANK_EMPTY_PERCENT = parseInt(process.env.TANK_EMPTY_PERCENT || '15');  // ≤15% = empty (pump ON)
const TANK_FULL_PERCENT = parseInt(process.env.TANK_FULL_PERCENT || '90');    // ≥90% = full  (pump OFF)

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

app.disable('x-powered-by');  // Remove X-Powered-By header (saves bytes for Arduino)
app.use(cors({
  origin: [
    'https://smart-home-automation-b184d.web.app',
    'https://smart-home-automation-b184d.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ← fallback for form-encoded data

// ─── Mount API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/alerts', alertRoutes);

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

  // 3. Door servo → ONLY send DOOR_OPEN/DOOR_CLOSE when state CHANGES
  //    Previously we sent DOOR_CLOSE on every response, which caused the
  //    servo to constantly jitter as it tried to re-write position every 2s.
  const currentDoor = controls.door === 'OPEN' ? 'OPEN' : 'CLOSED';
  if (currentDoor !== buildCommandString._lastSentDoor) {
    const doorCmd = currentDoor === 'OPEN' ? 'DOOR_OPEN' : 'DOOR_CLOSE';
    cmds.push(doorCmd);
    buildCommandString._lastSentDoor = currentDoor;
    console.log(`🚪 Door state changed → sending ${doorCmd}`);
  }
  // If door state hasn't changed, we skip the door command entirely
  // — servo stays where it is without jitter

  const cmdString = cmds.join('|');
  return cmdString;
}
// Initialize last sent door state (on startup, we send one DOOR_CLOSE)
buildCommandString._lastSentDoor = null;

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
    thresholds: { FIRE_THRESHOLD, TANK_EMPTY_PERCENT, TANK_FULL_PERCENT },
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

    // ── Log energy reading to MongoDB ────────────────────────────────────
    if (mongoose.connection.readyState === 1) {
      try {
        await EnergyLog.logReading(
          { waterLevel, gas, current },
          latestControls
        );
      } catch (logErr) {
        console.warn('⚠️ Energy log failed:', logErr.message);
      }
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
          callSent: false,
        };

        if (twilioClient) {
          try {
            const allResults = await sendAllEmergencyAlerts(gas);
            alertEntry.whatsappSent = allResults.whatsapp.length > 0;
            alertEntry.callSent = allResults.calls.length > 0;
            alertEntry.whatsappResults = allResults.whatsapp;
            alertEntry.callResult = allResults.calls;
            alertEntry.smsResults = allResults.sms;
            console.log(
              `📱 Alerts sent → Calls: ${allResults.calls.length}, WhatsApp: ${allResults.whatsapp.length}, SMS: ${allResults.sms.length}`
            );
          } catch (err) {
            console.error('❌ Emergency alerts failed:', err.message);
          }
        } else {
          console.warn('⚠️  Twilio not configured — skipping all alerts');
        }

        alertLog.push(alertEntry);
        if (db) await db.ref('alerts').push(alertEntry);

        // Also save to MongoDB for persistent history
        if (mongoose.connection.readyState === 1) {
          try {
            await AlertHistory.create({
              type: alertEntry.type,
              severity: 'critical',
              gasValue: alertEntry.gasValue,
              waterLevel: alertEntry.waterLevel,
              currentAmps: alertEntry.current,
              whatsappSent: alertEntry.whatsappSent,
              callSent: alertEntry.callSent,
              whatsappResults: alertEntry.whatsappResults || [],
              callResult: alertEntry.callResult || null,
            });
          } catch (mongoErr) {
            console.warn('⚠️ MongoDB alert save failed:', mongoErr.message);
          }
        }
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
    //  waterLevel is now a PERCENTAGE (0-100%): lower = emptier
    if (db && latestControls.relay2Mode === 'AUTO') {
      let autoMotorState = null;
      if (waterLevel <= TANK_EMPTY_PERCENT) autoMotorState = 'ON';   // Tank nearly empty → pump ON
      else if (waterLevel >= TANK_FULL_PERCENT) autoMotorState = 'OFF'; // Tank nearly full → pump OFF

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
    // Set Content-Length explicitly to prevent chunked Transfer-Encoding
    // (Arduino's HTTP parser can't handle chunked encoding)
    res.set('Content-Type', 'text/plain');
    res.set('Content-Length', Buffer.byteLength(commandString));
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
  res.set('Content-Length', Buffer.byteLength(commandString));
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

    const results = await sendAllEmergencyAlerts(gasValue ?? latestSensors.gas);

    const entry = {
      type: 'MANUAL_ALERT',
      gasValue: gasValue ?? latestSensors.gas,
      timestamp: new Date().toISOString(),
      whatsappSent: true,
      callSent: true,
      results,
    };
    alertLog.push(entry);
    if (db) await db.ref('alerts').push(entry);

    res.json({ success: true, results });
  } catch (err) {
    console.error('Error in /send-whatsapp:', err);
    res
      .status(500)
      .json({ error: 'Failed to send alerts', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /send-call  —  Manual phone call trigger (from dashboard)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/send-call', async (req, res) => {
  try {
    const { gasValue } = req.body;

    if (!twilioClient) {
      return res.status(503).json({
        error: 'Twilio not configured',
        hint: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env',
      });
    }

    const results = await sendAllEmergencyAlerts(gasValue ?? latestSensors.gas);

    const entry = {
      type: 'MANUAL_CALL',
      gasValue: gasValue ?? latestSensors.gas,
      timestamp: new Date().toISOString(),
      callSent: true,
      results,
    };
    alertLog.push(entry);
    if (db) await db.ref('alerts').push(entry);

    res.json({ success: true, results });
  } catch (err) {
    console.error('Error in /send-call:', err);
    res
      .status(500)
      .json({ error: 'Failed to place emergency alerts', details: err.message });
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
// MASTER ALERT: Send ALL emergency alerts (calls, WhatsApp, SMS) to BOTH
//   1. Family Member / House Owner
//   2. Fire Extinguisher Office
// ─────────────────────────────────────────────────────────────────────────────
async function sendAllEmergencyAlerts(gasValue) {
  const timeStr = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const results = { calls: [], whatsapp: [], sms: [] };

  // ── 1. PHONE CALLS ────────────────────────────────────────────────────

  // Call 1: Family Member
  try {
    const familyCall = await makeEmergencyCall({
      to: ALERT_FAMILY.call,
      label: ALERT_FAMILY.label,
      gasValue,
      message: [
        'Emergency Alert! Fire or gas leak detected at your smart home.',
        `Address: ${ALERT_ADDRESS}.`,
        `Gas level is ${gasValue}, which exceeds the safe threshold of ${FIRE_THRESHOLD}.`,
        'Please evacuate immediately and contact emergency services.',
        'The fire extinguisher office has also been notified and dispatched.',
        'This is an automated alert from your Smart Home Fire Alert System.',
      ].join(' '),
    });
    results.calls.push(familyCall);
  } catch (err) {
    console.error(`  ❌ Call to Family failed: ${err.message}`);
    results.calls.push({ number: ALERT_FAMILY.call, status: 'failed', error: err.message });
  }

  // Call 2: Fire Extinguisher Office
  try {
    const fireOfficeCall = await makeEmergencyCall({
      to: ALERT_FIRE_OFFICE.call,
      label: ALERT_FIRE_OFFICE.label,
      gasValue,
      message: [
        'Urgent! This is an automated emergency dispatch from a Smart Home Fire Alert System.',
        'A fire or gas leak has been detected and requires immediate response.',
        `Location: ${ALERT_ADDRESS}.`,
        `Gas sensor reading: ${gasValue}. This exceeds the critical threshold of ${FIRE_THRESHOLD}.`,
        'Please dispatch a fire extinguisher team to the above address immediately.',
        'The house owner has been notified and is evacuating.',
        'Please respond to this emergency as soon as possible. Thank you.',
      ].join(' '),
    });
    results.calls.push(fireOfficeCall);
  } catch (err) {
    console.error(`  ❌ Call to Fire Office failed: ${err.message}`);
    results.calls.push({ number: ALERT_FIRE_OFFICE.call, status: 'failed', error: err.message });
  }

  // ── 2. WHATSAPP MESSAGES ──────────────────────────────────────────────

  // WhatsApp 1: Family Member
  try {
    const familyWA = await sendWhatsAppMessage({
      to: ALERT_FAMILY.whatsapp,
      label: ALERT_FAMILY.label,
      body: [
        '🚨 *EMERGENCY ALERT* 🚨',
        '',
        '🔥 *FIRE / GAS DETECTED!*',
        '',
        `📍 *Address:* ${ALERT_ADDRESS}`,
        `📊 *Gas Level:* ${gasValue} ADC (threshold: ${FIRE_THRESHOLD})`,
        `⏱️ *Time:* ${timeStr}`,
        '',
        '⚠️ *IMMEDIATE ACTION REQUIRED!*',
        '🚒 Evacuate the premises immediately!',
        '📞 Emergency call has been placed to you.',
        '🧯 Fire extinguisher office has been dispatched.',
        '🔥 Check the IoT Dashboard for live status.',
        '',
        '_— Smart Home Fire Alert System_',
      ].join('\n'),
    });
    results.whatsapp.push(familyWA);
  } catch (err) {
    console.error(`  ❌ WhatsApp to Family failed: ${err.message}`);
    results.whatsapp.push({ number: ALERT_FAMILY.whatsapp, status: 'failed', error: err.message });
  }

  // WhatsApp 2: Fire Extinguisher Office
  try {
    const fireOfficeWA = await sendWhatsAppMessage({
      to: ALERT_FIRE_OFFICE.whatsapp,
      label: ALERT_FIRE_OFFICE.label,
      body: [
        '🚨🔥 *FIRE EMERGENCY — IMMEDIATE DISPATCH REQUIRED* 🔥🚨',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '📋 *INCIDENT REPORT*',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        `🔴 *Type:* Fire / Hazardous Gas Leak`,
        `🏠 *Building:* Residential Apartment`,
        `📊 *Severity:* CRITICAL — Gas Level ${gasValue} ADC (safe limit: ${FIRE_THRESHOLD})`,
        `⏱️ *Detected:* ${timeStr}`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '📍 *INCIDENT LOCATION*',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        `🏢 ${ALERT_ADDRESS}`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🚒 *ACTION REQUIRED*',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '1️⃣ Dispatch fire extinguisher team to above address *IMMEDIATELY*',
        '2️⃣ Carry fire extinguishing equipment (CO₂ / Dry Chemical)',
        '3️⃣ Gas leak detected — carry gas masks and ventilation equipment',
        '4️⃣ Building occupants have been alerted and are evacuating',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '👤 *OWNER / CONTACT DETAILS*',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        `📞 *Owner Phone:* ${ALERT_FAMILY.call}`,
        `📱 *Owner WhatsApp:* ${ALERT_FAMILY.call}`,
        '✅ Owner has been notified via Call, SMS & WhatsApp',
        '',
        '⚠️ _This is an automated emergency dispatch generated by an IoT-based Smart Home Fire Detection System. Sensor data is real-time and verified._',
        '',
        '_— Smart Home IoT Fire Alert System_',
      ].join('\n'),
    });
    results.whatsapp.push(fireOfficeWA);
  } catch (err) {
    console.error(`  ❌ WhatsApp to Fire Office failed: ${err.message}`);
    results.whatsapp.push({ number: ALERT_FIRE_OFFICE.whatsapp, status: 'failed', error: err.message });
  }

  // ── 3. SMS MESSAGES ───────────────────────────────────────────────────

  // SMS 1: Family Member
  try {
    const familySMS = await sendSMSMessage({
      to: ALERT_FAMILY.sms,
      label: ALERT_FAMILY.label,
      body: `🚨 FIRE ALERT! Gas leak detected at ${ALERT_ADDRESS}. Gas level: ${gasValue} (threshold: ${FIRE_THRESHOLD}). Time: ${timeStr}. EVACUATE IMMEDIATELY! Fire office dispatched. — Smart Home Alert`,
    });
    results.sms.push(familySMS);
  } catch (err) {
    console.error(`  ❌ SMS to Family failed: ${err.message}`);
    results.sms.push({ number: ALERT_FAMILY.sms, status: 'failed', error: err.message });
  }

  // SMS 2: Fire Extinguisher Office
  try {
    const fireOfficeSMS = await sendSMSMessage({
      to: ALERT_FIRE_OFFICE.sms,
      label: ALERT_FIRE_OFFICE.label,
      body: `🚨 FIRE DISPATCH REQUEST! Fire/gas detected at ${ALERT_ADDRESS}. Gas: ${gasValue} ADC (threshold: ${FIRE_THRESHOLD}). Time: ${timeStr}. Dispatch fire team ASAP. Owner: ${ALERT_FAMILY.call}. — Smart Home IoT Alert`,
    });
    results.sms.push(fireOfficeSMS);
  } catch (err) {
    console.error(`  ❌ SMS to Fire Office failed: ${err.message}`);
    results.sms.push({ number: ALERT_FIRE_OFFICE.sms, status: 'failed', error: err.message });
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚨 Emergency Alert Summary:`);
  console.log(`   📞 Calls:    ${results.calls.filter(r => r.status !== 'failed').length}/${results.calls.length} sent`);
  console.log(`   📱 WhatsApp: ${results.whatsapp.filter(r => r.status !== 'failed').length}/${results.whatsapp.length} sent`);
  console.log(`   💬 SMS:      ${results.sms.filter(r => r.status !== 'failed').length}/${results.sms.length} sent`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Make a single emergency phone call
// ─────────────────────────────────────────────────────────────────────────────
async function makeEmergencyCall({ to, label, gasValue, message }) {
  const twiml = [
    '<Response>',
    '  <Say voice="alice" language="en-IN" loop="3">',
    `    ${message}`,
    '  </Say>',
    '</Response>',
  ].join('\n');

  const call = await twilioClient.calls.create({
    twiml,
    to,
    from: TWILIO_PHONE_FROM,
  });

  console.log(`  📞 Call to ${label} (${to}) → SID: ${call.sid}`);
  return { number: to, label, status: 'called', sid: call.sid };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Send a single WhatsApp message
// ─────────────────────────────────────────────────────────────────────────────
async function sendWhatsAppMessage({ to, label, body }) {
  const msg = await twilioClient.messages.create({
    body,
    from: TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
      ? TWILIO_WHATSAPP_FROM
      : `whatsapp:${TWILIO_WHATSAPP_FROM}`,
    to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
  });

  console.log(`  📱 WhatsApp to ${label} (${to}) → SID: ${msg.sid}`);
  return { number: to, label, status: 'sent', sid: msg.sid };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Send a single SMS message
// ─────────────────────────────────────────────────────────────────────────────
async function sendSMSMessage({ to, label, body }) {
  const msg = await twilioClient.messages.create({
    body,
    from: TWILIO_PHONE_FROM,
    to,
  });

  console.log(`  💬 SMS to ${label} (${to}) → SID: ${msg.sid}`);
  return { number: to, label, status: 'sent', sid: msg.sid };
}


// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🔄 Starting server initialization...');

  // ── Connect to MongoDB ──────────────────────────────────────────────────
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connected:', mongoose.connection.name);
    } catch (err) {
      console.warn('⚠️  MongoDB connection failed:', err.message);
      console.warn('   → Energy logging and auth will be unavailable');
    }
  } else {
    console.warn('⚠️  MONGODB_URI not set → auth & energy logging disabled');
  }

  // Initialize database if Firebase is connected
  if (db) {
    console.log('📍 Database object exists, initializing...');
    await initializeDatabase();

    // Reset controls to safe defaults on every server startup
    // (Light OFF, Motor OFF, Door CLOSED, Pump AUTO)
    const defaultControls = {
      relay1: 'OFF',
      relay2Mode: 'AUTO',
      motor: 'OFF',
      door: 'CLOSED',
    };
    try {
      await db.ref('controls').set(defaultControls);
      latestControls = { ...defaultControls };
      console.log('🔄 Controls reset to defaults: Light OFF, Motor OFF, Door CLOSED');
    } catch (err) {
      console.warn('⚠️  Could not reset controls:', err.message);
    }

    // Set up real-time listening for control changes
    listenToControlsFromFirebase();
    console.log('🔊 Listening for real-time control changes from Firebase');
  } else {
    console.log('⚠️ Database object is null, skipping initialization');
  }

  app.listen(PORT, '0.0.0.0', () => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'Not configured';
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
    console.log(`📞 Call:         POST /send-call`);
    console.log(`🔐 Auth:         POST /api/auth/signup, /api/auth/login`);
    console.log(`⚡ Energy:       GET  /api/energy/hourly, /daily, /summary`);
    console.log(`🚨 Alerts DB:    GET  /api/alerts/history, /stats`);
    console.log(`💚 Health:       GET  /status`);
    console.log(`📋 Alerts:       GET  /alerts`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      `🔥 Firebase:  ${db ? 'CONNECTED' : 'Not configured (simulation mode)'}`
    );
    console.log(
      `🍃 MongoDB:   ${mongoStatus}`
    );
    console.log(
      `📱 Twilio:    ${twilioClient ? 'CONNECTED' : 'Not configured'}`
    );
    console.log(
      `🌡️  Thresholds: Gas>${FIRE_THRESHOLD} | Tank empty≤${TANK_EMPTY_PERCENT}% | Tank full≥${TANK_FULL_PERCENT}%`
    );
    console.log(`👨‍👩‍👧 Family:       Call ${ALERT_FAMILY.call} | WA ${ALERT_FAMILY.whatsapp} | SMS ${ALERT_FAMILY.sms}`);
    console.log(`🧯 Fire Office:  Call ${ALERT_FIRE_OFFICE.call} | WA ${ALERT_FIRE_OFFICE.whatsapp} | SMS ${ALERT_FIRE_OFFICE.sms}`);
    console.log(`📍 Alert address: ${ALERT_ADDRESS}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
})();


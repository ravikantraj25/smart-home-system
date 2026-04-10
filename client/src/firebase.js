import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get } from 'firebase/database';
import { getAnalytics } from "firebase/analytics";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBe3jIeTWBxnCBGaR4WbiZG0Du-PPfypZM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smart-home-automation-b184d.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://smart-home-automation-b184d-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smart-home-automation-b184d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smart-home-automation-b184d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "640307774492",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:640307774492:web:e4121b430325703fb3cbd9",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2NTCC8BS2L"
};

// Initialize Firebase, Analytics, and Realtime Database
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Database references for your Smart Home
export const sensorsRef = ref(database, 'sensors');
export const controlsRef = ref(database, 'controls');
export const connectedRef = ref(database, '.info/connected');

// Listener helpers (These listen for changes from the Arduino)
export const onSensorData = (callback) => {
  return onValue(sensorsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) callback(data);
  });
};

export const onControlData = (callback) => {
  return onValue(controlsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) callback(data);
  });
};

export const onConnectionStatus = (callback) => {
  return onValue(connectedRef, (snapshot) => {
    callback(snapshot.val() === true);
  });
};

// Control update helpers (These send commands to the Arduino)
export const updateControl = async (path, value) => {
  const controlRef = ref(database, `controls/${path}`);
  await set(controlRef, value);
};

// Specific component controls
export const setRelay1 = (value) => updateControl('relay1', value);
export const setRelay2Mode = (value) => updateControl('relay2Mode', value);
export const setMotor = (value) => updateControl('motor', value);
export const setDoor = (value) => updateControl('door', value);

// Export standard Firebase functions in case you need them directly in other components
export { database, ref, onValue, set, get };
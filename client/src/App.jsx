import { useState, useEffect, useCallback } from 'react';
import AppView from './AppView';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  onSensorData,
  onControlData,
  onConnectionStatus,
  setRelay1,
  setRelay2Mode,
  setMotor,
  setDoor,
} from './firebase';

function AppContent() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();

  // Theme & UI State
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Connection & Loading State
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  // Sensor & Control Data
  const [sensors, setSensors] = useState({ waterLevel: 0, gas: 0, current: 0 });
  const [controls, setControls] = useState({
    relay1: 'OFF',
    relay2Mode: 'AUTO',
    motor: 'OFF',
    door: 'CLOSED',
  });
  const [alertSent, setAlertSent] = useState(false);

  // Apply theme to document
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Firebase listeners setup
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubSensors = onSensorData((data) => {
      setSensors(data);
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString());
    });

    const unsubControls = onControlData((data) => setControls(data));

    const unsubConnection = onConnectionStatus((connected) =>
      setIsConnected(connected)
    );

    // Fallback loading timeout
    const loadingTimeout = setTimeout(() => setLoading(false), 5000);

    return () => {
      unsubSensors();
      unsubControls();
      unsubConnection();
      clearTimeout(loadingTimeout);
    };
  }, [isAuthenticated]);

  // Handle fire/gas alerts from sensors
  useEffect(() => {
    if (sensors.gas > 400) {
      setAlertSent(true);
      // Auto-clear UI alert state after 5 minutes (matches server cooldown)
      const timer = setTimeout(() => setAlertSent(false), 300000);
      return () => clearTimeout(timer);
    } else {
      setAlertSent(false);
    }
  }, [sensors.gas]);

  // Handler: Toggle Light (Relay 1)
  const handleRelay1Toggle = useCallback(async (v) => {
    try {
      await setRelay1(v);
    } catch (e) {
      console.error('Relay1 error:', e);
    }
  }, []);

  // Handler: Change Pump Mode (Relay 2)
  const handleRelay2ModeChange = useCallback(async (v) => {
    try {
      await setRelay2Mode(v);
    } catch (e) {
      console.error('Relay2 error:', e);
    }
  }, []);

  // Handler: Toggle Motor
  const handleMotorToggle = useCallback(async (v) => {
    try {
      await setMotor(v);
    } catch (e) {
      console.error('Motor error:', e);
    }
  }, []);

  // Handler: Change Door Position
  const handleDoorChange = useCallback(async (v) => {
    try {
      console.log('🚪 Door change:', v);
      await setDoor(v);
    } catch (e) {
      console.error('🚪 Door error:', e);
    }
  }, []);

  // Handler: Process Voice Commands
  const handleVoiceCommand = useCallback(async (action) => {
    try {
      if (action.type === 'relay1') await setRelay1(action.value);
      else if (action.type === 'motor') await setMotor(action.value);
      else if (action.type === 'door') await setDoor(action.value);
    } catch (e) {
      console.error('Voice command error:', e);
    }
  }, []);

  // Show loading spinner while auth is verifying
  if (authLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060609',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#00d4ff',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <AppView
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      isConnected={isConnected}
      lastUpdated={lastUpdated}
      loading={loading}
      sensors={sensors}
      controls={controls}
      alertSent={alertSent}
      onToggleRelay1={handleRelay1Toggle}
      onModeChange={handleRelay2ModeChange}
      onMotorToggle={handleMotorToggle}
      onDoorChange={handleDoorChange}
      onVoiceCommand={handleVoiceCommand}
      user={user}
      onLogout={logout}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

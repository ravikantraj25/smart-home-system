import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Controls from './pages/Controls';
import VoiceAssistant from './pages/VoiceAssistant';
import {
  onSensorData,
  onControlData,
  onConnectionStatus,
  setRelay1,
  setRelay2Mode,
  setMotor,
  setDoor,
} from './firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Mobile bottom navigation component
function BottomNav() {
  const location = useLocation();
  const items = [
    { path: '/', label: 'Monitor', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    )},
    { path: '/controls', label: 'Controls', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
      </svg>
    )},
    { path: '/voice', label: 'Voice', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
        <path d="M19 10v2a7 7 0 01-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
      </svg>
    )},
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 md:hidden z-30 flex"
      style={{
        background: 'rgba(10, 10, 15, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative"
          >
            {isActive && (
              <motion.div
                layoutId="bottomNavActive"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg, #00d4ff, #a855f7)' }}
              />
            )}
            <span style={{ color: isActive ? '#00d4ff' : '#6b7280' }}>{item.icon}</span>
            <span className="text-[10px] font-medium" style={{ color: isActive ? '#ffffff' : '#6b7280' }}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sensors, setSensors] = useState({ waterLevel: 0, gas: 0, current: 0 });
  const [controls, setControls] = useState({ relay1: 'OFF', relay2Mode: 'AUTO', motor: 'OFF', door: 'CLOSED' });
  const [alertSent, setAlertSent] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubSensors = onSensorData((data) => {
      setSensors(data);
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString());
    });
    const unsubControls = onControlData((data) => setControls(data));
    const unsubConnection = onConnectionStatus((connected) => setIsConnected(connected));
    const loadingTimeout = setTimeout(() => setLoading(false), 5000);
    return () => { unsubSensors(); unsubControls(); unsubConnection(); clearTimeout(loadingTimeout); };
  }, []);

  // Alert state is driven by sensor data — server handles WhatsApp alerts
  // with proper cooldown. Client only tracks state for UI display.
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

  const handleRelay1Toggle = useCallback(async (v) => { try { await setRelay1(v); } catch(e) {} }, []);
  const handleRelay2ModeChange = useCallback(async (v) => { try { await setRelay2Mode(v); } catch(e) {} }, []);
  const handleMotorToggle = useCallback(async (v) => { try { await setMotor(v); } catch(e) {} }, []);
  const handleDoorChange = useCallback(async (v) => { try { await setDoor(v); } catch(e) {} }, []);

  const handleVoiceCommand = useCallback(async (action) => {
    if (action.type === 'relay1') await setRelay1(action.value);
    else if (action.type === 'motor') await setMotor(action.value);
    else if (action.type === 'door') await setDoor(action.value);
  }, []);

  const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
  };

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? '' : 'light-mode'}`}
      style={{ background: darkMode ? '#0a0a0f' : '#f0f2f5' }}
    >
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div className="absolute w-80 h-80 rounded-full blur-[100px] opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent)', top: '5%', left: '15%' }}
          animate={{ x: [0, 40, -20, 0], y: [0, -20, 40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute w-80 h-80 rounded-full blur-[100px] opacity-[0.1]"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent)', bottom: '10%', right: '5%' }}
          animate={{ x: [0, -30, 15, 0], y: [0, 30, -15, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Sidebar — hidden on mobile, sticky on desktop */}
      <div className="hidden md:flex relative z-20">
        <Sidebar isOpen={true} setIsOpen={() => {}} />
      </div>
      {/* Mobile sidebar (overlay) */}
      <div className="md:hidden">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
        {/* Sticky top bar */}
        <div className="shrink-0 px-4 sm:px-6 pt-4 pb-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <motion.button
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onClick={() => setSidebarOpen(true)}
              whileTap={{ scale: 0.92 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </motion.button>
            <div className="flex-1 min-w-0">
              <Header
                isConnected={isConnected}
                lastUpdated={lastUpdated}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
            </div>
          </div>
        </div>

        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-20 md:pb-6">
          {/* Background mesh on scroll area */}
          <div className="bg-mesh absolute inset-0 pointer-events-none" />

          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={
                <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <Dashboard sensors={sensors} loading={loading} />
                </motion.div>
              } />
              <Route path="/controls" element={
                <motion.div key="controls" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <Controls
                    controls={controls}
                    onToggleRelay1={handleRelay1Toggle}
                    onModeChange={handleRelay2ModeChange}
                    onMotorToggle={handleMotorToggle}
                    onDoorChange={handleDoorChange}
                    loading={loading}
                  />
                </motion.div>
              } />
              <Route path="/voice" element={
                <motion.div key="voice" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <VoiceAssistant
                    onCommand={handleVoiceCommand}
                    controls={controls}
                    sensors={sensors}
                    alertSent={alertSent}
                  />
                </motion.div>
              } />
            </Routes>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}

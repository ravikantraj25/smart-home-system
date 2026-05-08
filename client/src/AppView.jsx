import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Controls from './pages/Controls';
import VoiceAssistant from './pages/VoiceAssistant';
import EnergyAnalytics from './pages/EnergyAnalytics';
import './App.css';

// Mobile bottom navigation
function BottomNav() {
  const location = useLocation();
  const items = [
    {
      path: '/',
      label: 'Monitor',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      path: '/controls',
      label: 'Controls',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
        </svg>
      ),
    },
    {
      path: '/voice',
      label: 'Voice',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
        </svg>
      ),
    },
    {
      path: '/energy',
      label: 'Energy',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bottom-nav">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <NavLink key={item.path} to={item.path} className="bottom-nav-item">
            {isActive && (
              <motion.div
                layoutId="bottomNavActive"
                className="bottom-nav-active-indicator"
              />
            )}
            <span
              className="bottom-nav-icon"
              style={{ color: isActive ? '#00d4ff' : '#6b7280' }}
            >
              {item.icon}
            </span>
            <span
              className="bottom-nav-label"
              style={{ color: isActive ? '#ffffff' : '#6b7280' }}
            >
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}

export default function AppView({
  darkMode,
  setDarkMode,
  sidebarOpen,
  setSidebarOpen,
  isConnected,
  lastUpdated,
  loading,
  sensors,
  controls,
  alertSent,
  onToggleRelay1,
  onModeChange,
  onMotorToggle,
  onDoorChange,
  onVoiceCommand,
  user,
  onLogout,
}) {
  const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
  };

  return (
    <div
      className={`app-root ${darkMode ? '' : 'light-mode'}`}
      style={{ background: darkMode ? '#0a0a0f' : '#f0f2f5' }}
    >
      {/* Animated Background Orbs */}
      <div className="app-background-orbs">
        <motion.div
          className="app-orb app-orb-1"
          animate={{ x: [0, 40, -20, 0], y: [0, -20, 40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="app-orb app-orb-2"
          animate={{ x: [0, -30, 15, 0], y: [0, 30, -15, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Sidebar — hidden on mobile, sticky on desktop */}
      <div className="app-sidebar-desktop">
        <Sidebar isOpen={true} setIsOpen={() => {}} />
      </div>

      {/* Mobile sidebar (overlay) */}
      <div className="app-sidebar-mobile">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </div>

      {/* Main content */}
      <div className="app-main-content">
        {/* Sticky top bar */}
        <div className="app-header-bar">
          <div className="app-header-container">
            {/* Mobile hamburger */}
            <motion.button
              className="app-hamburger"
              onClick={() => setSidebarOpen(true)}
              whileTap={{ scale: 0.92 }}
              aria-label="Open sidebar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </motion.button>
            <div className="app-header-content">
              <Header
                isConnected={isConnected}
                lastUpdated={lastUpdated}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
            </div>
            {/* User Profile & Logout */}
            {user && (
              <div className="app-user-profile">
                <div className="app-user-avatar" title={user.name}>
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <motion.button
                  className="app-logout-btn"
                  onClick={onLogout}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Logout"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16,17 21,12 16,7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable page content */}
        <div className="app-pages-container">
          {/* Background mesh on scroll area */}
          <div className="bg-mesh absolute inset-0 pointer-events-none" />

          <AnimatePresence mode="wait">
            <Routes>
              <Route
                path="/"
                element={
                  <motion.div
                    key="dashboard"
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Dashboard
                      sensors={sensors}
                      controls={controls}
                      loading={loading}
                      isConnected={isConnected}
                      lastUpdated={lastUpdated}
                      onToggleRelay1={onToggleRelay1}
                      onModeChange={onModeChange}
                      onMotorToggle={onMotorToggle}
                      onDoorChange={onDoorChange}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/controls"
                element={
                  <motion.div
                    key="controls"
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Controls
                      controls={controls}
                      onToggleRelay1={onToggleRelay1}
                      onModeChange={onModeChange}
                      onMotorToggle={onMotorToggle}
                      onDoorChange={onDoorChange}
                      loading={loading}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/voice"
                element={
                  <motion.div
                    key="voice"
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <VoiceAssistant
                      onCommand={onVoiceCommand}
                      controls={controls}
                      sensors={sensors}
                      alertSent={alertSent}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/energy"
                element={
                  <motion.div
                    key="energy"
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <EnergyAnalytics />
                  </motion.div>
                }
              />
            </Routes>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}

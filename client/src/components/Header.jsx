import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export default function Header({ isConnected, lastUpdated, darkMode, setDarkMode }) {
  const location = useLocation();

  const pageTitles = {
    '/': 'Dashboard',
    '/controls': 'Control Panel',
    '/voice': 'Voice & Alerts',
  };

  const pageSubtitles = {
    '/': 'Real-time sensor monitoring',
    '/controls': 'Manage devices & automation',
    '/voice': 'Voice commands & emergency alerts',
  };

  const title = pageTitles[location.pathname] || 'Dashboard';
  const subtitle = pageSubtitles[location.pathname] || '';

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-card px-4 sm:px-6 py-3 sm:py-4 mb-5 flex items-center justify-between gap-3"
    >
      {/* Page Title */}
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold gradient-text truncate">{title}</h1>
        <p className="text-xs text-gray-400 hidden sm:block mt-0.5">{subtitle}</p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Last Updated — hide on small mobile */}
        {lastUpdated && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <span className="font-mono">{lastUpdated}</span>
          </div>
        )}

        {/* Connection Status */}
        <motion.div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border ${
            isConnected
              ? 'border-green-500/30 text-green-400 bg-green-500/10'
              : 'border-red-500/30 text-red-400 bg-red-500/10'
          }`}
          animate={{
            boxShadow: isConnected
              ? ['0 0 0 0 rgba(0,255,136,0)', '0 0 0 5px rgba(0,255,136,0.1)', '0 0 0 0 rgba(0,255,136,0)']
              : 'none'
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="hidden xs:inline">{isConnected ? 'Online' : 'Offline'}</span>
        </motion.div>

        {/* Dark/Light Mode Toggle */}
        <motion.button
          onClick={() => setDarkMode(!darkMode)}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center glass-card border-none cursor-pointer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <motion.div animate={{ rotate: darkMode ? 0 : 180 }} transition={{ duration: 0.5 }}>
            {darkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </motion.div>
        </motion.button>
      </div>
    </motion.header>
  );
}

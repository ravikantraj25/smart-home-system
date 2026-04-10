import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const links = [
  {
    name: 'Dashboard',
    path: '/',
    emoji: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    name: 'Controls',
    path: '/controls',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
        <path d="M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07"/>
      </svg>
    ),
  },
  {
    name: 'Voice & Alerts',
    path: '/voice',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
        <path d="M19 10v2a7 7 0 01-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    ),
  },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 h-screen w-64 z-50 md:static md:translate-x-0 md:h-screen md:shrink-0"
        style={{
          background: 'rgba(15, 15, 26, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 pt-6 pb-5 border-b border-white/5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold gradient-text leading-tight">Smart Home</p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">IoT Control Center</p>
            </div>
          </div>

          {/* Nav section label */}
          <div className="px-5 pt-5 pb-2">
            <p className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">Navigation</p>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-3 space-y-1">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group"
                  style={isActive ? {} : {}}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(168,85,247,0.12))',
                        border: '1px solid rgba(0,212,255,0.2)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span
                    className="relative z-10 transition-colors duration-200"
                    style={{ color: isActive ? '#00d4ff' : '#6b7280' }}
                  >
                    {link.icon}
                  </span>
                  <span
                    className="relative z-10 text-sm font-medium transition-colors duration-200"
                    style={{ color: isActive ? '#ffffff' : '#9ca3af' }}
                  >
                    {link.name}
                  </span>
                  {isActive && (
                    <div
                      className="absolute right-3 w-1.5 h-1.5 rounded-full"
                      style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }}
                    />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* System Info Footer */}
          <div className="px-5 py-5 border-t border-white/5">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03]">
              <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.7)' }} />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-mono truncate">Arduino + ESP-01</p>
                <p className="text-[10px] text-gray-600 truncate">Firebase Realtime DB</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

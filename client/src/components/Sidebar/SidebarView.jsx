import { motion, AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

export default function SidebarView({ links, isOpen, setIsOpen, currentPath }) {
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
            className="sidebar-backdrop"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="sidebar-panel"
      >
        <div className="sidebar-inner">
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
              </svg>
            </div>
            <div className="sidebar-logo-text">
              <p className="sidebar-logo-title">Smart Home</p>
              <p className="sidebar-logo-subtitle">IoT Control Center</p>
            </div>
          </div>

          {/* Nav section label */}
          <div className="sidebar-nav-label">
            <p>Navigation</p>
          </div>

          {/* Nav Links */}
          <nav className="sidebar-nav">
            {links.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="sidebar-nav-bg"
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span
                    className={`sidebar-nav-icon ${isActive ? 'active' : ''}`}
                  >
                    {link.icon}
                  </span>
                  <span
                    className={`sidebar-nav-text ${isActive ? 'active' : ''}`}
                  >
                    {link.name}
                  </span>
                  {isActive && <div className="sidebar-nav-dot" />}
                </NavLink>
              );
            })}
          </nav>

          {/* System Info Footer */}
          <div className="sidebar-footer">
            <div className="sidebar-system-info">
              <div className="sidebar-info-dot" />
              <div className="sidebar-info-text">
                <p className="sidebar-info-device">Arduino + ESP-01</p>
                <p className="sidebar-info-db">Firebase + MongoDB</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

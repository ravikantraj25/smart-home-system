import { motion } from 'framer-motion';
import './DoorControl.css';

export default function DoorControlView({ isOpen, loading, onDoorChange }) {
  if (loading) {
    return (
      <div className="glass-card p-5 space-y-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-28 w-full rounded-xl" />
        <div className="skeleton h-10 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="door-control-container"
    >
      {/* Header */}
      <div className="door-header">
        <div className="door-title-group">
          <div
            className="door-icon"
            style={{
              background: isOpen
                ? 'rgba(0,212,255,0.12)'
                : 'rgba(255,255,255,0.05)',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isOpen ? '#00d4ff' : '#6b7280'}
              strokeWidth="2"
            >
              <path d="M3 3h7v18H3z" />
              <path d="M10 6l8 2v12l-8-2" />
            </svg>
          </div>
          <div>
            <h2 className="door-title">Smart Door</h2>
            <p className="door-subtitle">Servo • {isOpen ? '90°' : '0°'}</p>
          </div>
        </div>
        <span
          className="door-status-badge"
          style={
            isOpen
              ? {
                  background: 'rgba(0,212,255,0.1)',
                  color: '#00d4ff',
                  border: '1px solid rgba(0,212,255,0.25)',
                }
              : {
                  background: 'rgba(255,255,255,0.05)',
                  color: '#6b7280',
                  border: '1px solid rgba(255,255,255,0.08)',
                }
          }
        >
          {isOpen ? '🔓 Open' : '🔒 Closed'}
        </span>
      </div>

      {/* Door animation */}
      <div className="door-animation-container">
        <div className="door-frame">
          <motion.div
            className="door-panel"
            style={{
              background: isOpen
                ? 'linear-gradient(135deg,rgba(0,212,255,0.12),rgba(168,85,247,0.08))'
                : 'linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))',
              transformStyle: 'preserve-3d',
            }}
            animate={{ rotateY: isOpen ? -70 : 0 }}
            transition={{ duration: 0.75, ease: [0.68, -0.55, 0.265, 1.55] }}
          >
            {/* Handle */}
            <div
              className="door-handle"
              style={{
                background: isOpen ? '#00d4ff' : 'rgba(255,255,255,0.15)',
                boxShadow: isOpen ? '0 0 8px rgba(0,212,255,0.4)' : 'none',
              }}
            />
            {/* Panel lines */}
            <div className="door-panel-lines">
              {[0, 1, 2].map((i) => (
                <div key={i} className="panel-line" />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Buttons */}
      <div className="door-buttons">
        <motion.button
          id="door-open"
          className="door-button"
          style={
            isOpen
              ? {
                  background: 'rgba(0,212,255,0.15)',
                  color: '#00d4ff',
                  borderColor: 'rgba(0,212,255,0.3)',
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  color: '#6b7280',
                  borderColor: 'rgba(255,255,255,0.06)',
                }
          }
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onDoorChange('OPEN')}
        >
          🔓 Open
        </motion.button>
        <motion.button
          id="door-close"
          className="door-button"
          style={
            !isOpen
              ? {
                  background: 'rgba(168,85,247,0.15)',
                  color: '#a855f7',
                  borderColor: 'rgba(168,85,247,0.3)',
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  color: '#6b7280',
                  borderColor: 'rgba(255,255,255,0.06)',
                }
          }
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onDoorChange('CLOSED')}
        >
          🔒 Close
        </motion.button>
      </div>
    </motion.div>
  );
}

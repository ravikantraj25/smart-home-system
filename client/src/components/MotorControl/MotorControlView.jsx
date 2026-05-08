import { motion } from 'framer-motion';
import './MotorControl.css';

export default function MotorControlView({
  isAuto,
  isOn,
  loading,
  onModeChange,
  onMotorToggle,
  scheduleOnTime,
  scheduleOffTime,
  scheduleActive,
  onSetScheduleOnTime,
  onSetScheduleOffTime,
  onSetScheduleActive,
}) {
  if (loading) {
    return (
      <div className="glass-card p-5 space-y-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="skeleton h-10 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="motor-control-container"
    >
      {/* Header */}
      <div className="motor-header">
        <div className="motor-title-group">
          <motion.div
            className="motor-icon"
            style={{
              background: isOn
                ? 'rgba(0,255,136,0.12)'
                : 'rgba(255,255,255,0.05)',
            }}
            animate={isOn ? { rotate: 360 } : {}}
            transition={
              isOn ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isOn ? '#00ff88' : '#6b7280'}
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </motion.div>
          <div>
            <h2 className="motor-title">Motor</h2>
            <p className="motor-subtitle">Relay 2</p>
          </div>
        </div>
        <span
          className="motor-status-badge"
          style={
            isOn
              ? {
                  background: 'rgba(0,255,136,0.1)',
                  color: '#00ff88',
                  border: '1px solid rgba(0,255,136,0.25)',
                }
              : {
                  background: 'rgba(255,255,255,0.05)',
                  color: '#6b7280',
                  border: '1px solid rgba(255,255,255,0.08)',
                }
          }
        >
          {isOn ? '⚡ Running' : '○ Stopped'}
        </span>
      </div>

      {/* Mode toggle */}
      <div className="motor-mode-section">
        <p className="motor-section-label">Mode</p>
        <div className="mode-toggle-group">
          {['MANUAL', 'AUTO'].map((mode) => {
            const active = isAuto === (mode === 'AUTO');
            return (
              <motion.button
                key={mode}
                className="mode-button"
                onClick={() => onModeChange(mode)}
                whileTap={{ scale: 0.97 }}
              >
                {active && (
                  <motion.div
                    layoutId="modeTab"
                    className="mode-button-bg"
                    style={
                      mode === 'AUTO'
                        ? {
                            background:
                              'linear-gradient(135deg,rgba(0,255,136,0.18),rgba(0,212,255,0.18))',
                            border: '1px solid rgba(0,255,136,0.25)',
                          }
                        : {
                            background:
                              'linear-gradient(135deg,rgba(0,212,255,0.18),rgba(168,85,247,0.18))',
                            border: '1px solid rgba(0,212,255,0.25)',
                          }
                    }
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`mode-button-text ${active ? 'active' : ''}`}>
                  {mode}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Manual ON/OFF */}
      <div className={`motor-manual-section ${isAuto ? 'disabled' : ''}`}>
        <p className="motor-section-label">Manual Control</p>
        <div className="motor-buttons">
          <motion.button
            id="motor-on"
            className="motor-button"
            style={
              isOn
                ? {
                    background: 'rgba(0,255,136,0.15)',
                    color: '#00ff88',
                    borderColor: 'rgba(0,255,136,0.3)',
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    color: '#6b7280',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }
            }
            whileTap={{ scale: 0.97 }}
            onClick={() => onMotorToggle('ON')}
            disabled={isAuto}
          >
            ON
          </motion.button>
          <motion.button
            id="motor-off"
            className="motor-button"
            style={
              !isOn
                ? {
                    background: 'rgba(255,68,68,0.15)',
                    color: '#ff4444',
                    borderColor: 'rgba(255,68,68,0.3)',
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    color: '#6b7280',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }
            }
            whileTap={{ scale: 0.97 }}
            onClick={() => onMotorToggle('OFF')}
            disabled={isAuto}
          >
            OFF
          </motion.button>
        </div>
        {isAuto && <p className="motor-auto-note">🤖 Water-level controlled</p>}
      </div>

      {/* Schedule Section */}
      <div className="motor-schedule-section">
        <div className="schedule-header">
          <p className="motor-section-label">📅 Motor Schedule</p>
          <motion.button
            className={`schedule-toggle ${scheduleActive ? 'active' : ''}`}
            onClick={() => onSetScheduleActive(!scheduleActive)}
            whileTap={{ scale: 0.95 }}
          >
            {scheduleActive ? 'ON' : 'OFF'}
          </motion.button>
        </div>
        {scheduleActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="schedule-times"
          >
            <div className="schedule-row">
              <span className="schedule-label">💧 Turn ON at</span>
              <input
                type="time"
                value={scheduleOnTime}
                onChange={(e) => onSetScheduleOnTime(e.target.value)}
                className="schedule-input"
              />
            </div>
            <div className="schedule-row">
              <span className="schedule-label">🛑 Turn OFF at</span>
              <input
                type="time"
                value={scheduleOffTime}
                onChange={(e) => onSetScheduleOffTime(e.target.value)}
                className="schedule-input"
              />
            </div>
            {(scheduleOnTime || scheduleOffTime) && (
              <div className="schedule-summary">
                {scheduleOnTime && <span>ON → {scheduleOnTime}</span>}
                {scheduleOnTime && scheduleOffTime && <span> · </span>}
                {scheduleOffTime && <span>OFF → {scheduleOffTime}</span>}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

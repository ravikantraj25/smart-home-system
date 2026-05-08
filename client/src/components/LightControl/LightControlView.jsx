import { motion } from 'framer-motion';
import './LightControl.css';

export default function LightControlView({
  isOn,
  timerMinutes,
  countdown,
  currentTime,
  scheduleOnTime,
  scheduleOffTime,
  scheduleActive,
  loading,
  onToggle,
  onStartTimer,
  onSetTimerMinutes,
  onSetScheduleOnTime,
  onSetScheduleOffTime,
  onSetScheduleActive,
  fmt,
}) {
  if (loading) {
    return (
      <div className="glass-card p-5 space-y-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="skeleton h-8 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="light-control-container"
    >
      {/* Header */}
      <div className="light-header">
        <div className="flex items-center gap-3">
          <motion.div
            className="light-icon"
            style={{
              background: isOn
                ? 'rgba(251,191,36,0.15)'
                : 'rgba(255,255,255,0.05)',
            }}
            animate={
              isOn
                ? {
                    boxShadow: [
                      '0 0 0 0 rgba(251,191,36,0)',
                      '0 0 12px 2px rgba(251,191,36,0.25)',
                      '0 0 0 0 rgba(251,191,36,0)',
                    ],
                  }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isOn ? '#fbbf24' : 'none'}
              stroke={isOn ? '#fbbf24' : '#6b7280'}
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M9 21h6M12 3a6 6 0 00-4 10.5V17h8v-3.5A6 6 0 0012 3z" />
            </svg>
          </motion.div>
          <div>
            <h2 className="light-title">Light</h2>
            <p className="light-subtitle">Relay 1</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="light-status"
            style={{ color: isOn ? '#fbbf24' : '#6b7280' }}
          >
            {isOn ? 'ON' : 'OFF'}
          </span>
          <motion.button
            id="light-toggle"
            className={`toggle-switch ${isOn ? 'active' : ''}`}
            onClick={() => onToggle(isOn ? 'OFF' : 'ON')}
            whileTap={{ scale: 0.95 }}
            aria-label={`Light ${isOn ? 'ON' : 'OFF'}`}
          />
        </div>
      </div>

      {/* Timer buttons */}
      <div className="light-timer-section">
        <p className="light-section-label">Auto-off Timer</p>
        <div className="timer-buttons">
          {[5, 10, 15].map((min) => (
            <motion.button
              key={min}
              className="timer-button"
              style={
                timerMinutes === min
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
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onSetTimerMinutes(min);
                onStartTimer(min);
              }}
            >
              {min}m
            </motion.button>
          ))}
        </div>
        {countdown > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="countdown-display"
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.15)',
            }}
          >
            <span className="countdown-label">Auto-off in</span>
            <span className="countdown-value">{fmt(countdown)}</span>
          </motion.div>
        )}
      </div>

      {/* Real-time Clock Section */}
      <div className="light-clock-section">
        <p className="light-section-label">⏰ Real-Time Clock</p>
        <motion.div className="clock-display">
          <span className="clock-time">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </motion.div>
      </div>

      {/* Schedule Section — ON and OFF times */}
      <div className="light-schedule-section">
        <div className="schedule-header">
          <p className="light-section-label">📅 Light Schedule</p>
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
              <span className="schedule-label">🌅 Turn ON at</span>
              <input
                type="time"
                value={scheduleOnTime}
                onChange={(e) => onSetScheduleOnTime(e.target.value)}
                className="schedule-input"
              />
            </div>
            <div className="schedule-row">
              <span className="schedule-label">🌙 Turn OFF at</span>
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

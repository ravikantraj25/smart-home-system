import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

export default function LightControl({ relay1, onToggle, loading }) {
  const isOn = relay1 === 'ON';
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduleActive, setScheduleActive] = useState(false);
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  const startTimer = useCallback(
    (minutes) => {
      if (minutes <= 0) return;
      if (timerRef.current) clearInterval(timerRef.current);
      if (!isOn) onToggle('ON');
      let secs = minutes * 60;
      setCountdown(secs);
      timerRef.current = setInterval(() => {
        secs -= 1;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          onToggle('OFF');
          setTimerMinutes(0);
        }
      }, 1000);
    },
    [isOn, onToggle]
  );

  useEffect(() => {
    // Update clock every second
    clockRef.current = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Check if scheduled time matches current time
      if (scheduleActive && scheduledTime) {
        const [schedHours, schedMinutes] = scheduledTime.split(':');
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMins = String(now.getMinutes()).padStart(2, '0');

        if (
          schedHours === currentHours &&
          schedMinutes === currentMins &&
          !isOn
        ) {
          onToggle('ON');
        }
      }
    }, 1000);

    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scheduleActive, scheduledTime, isOn, onToggle]);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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
      className="glass-card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
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
            <h2 className="text-sm font-semibold text-white leading-tight">
              Light
            </h2>
            <p className="text-xs text-gray-500">Relay 1</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-medium"
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
      <div>
        <p className="text-[11px] text-gray-500 font-medium mb-2 uppercase tracking-wide">
          Auto-off Timer
        </p>
        <div className="flex gap-2">
          {[5, 10, 15].map((min) => (
            <motion.button
              key={min}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all border"
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
                setTimerMinutes(min);
                startTimer(min);
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
            className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg"
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.15)',
            }}
          >
            <span className="text-xs text-gray-400">Auto-off in</span>
            <span className="text-base font-bold font-mono text-neon-blue">
              {fmt(countdown)}
            </span>
          </motion.div>
        )}
      </div>

      {/* Real-time Clock Section */}
      <div className="mt-5 pt-5 border-t border-gray-700">
        <p className="text-[11px] text-gray-500 font-medium mb-3 uppercase tracking-wide">
          ⏰ Real-Time Clock
        </p>
        <motion.div
          className="px-4 py-3 rounded-lg text-center"
          style={{
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-3xl font-bold font-mono text-purple-400">
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </motion.div>
      </div>

      {/* Schedule Light Section */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">
            📅 Schedule Turn On
          </p>
          <motion.button
            className={`toggle-switch ${scheduleActive ? 'active' : ''}`}
            onClick={() => setScheduleActive(!scheduleActive)}
            whileTap={{ scale: 0.95 }}
            aria-label={`Schedule ${scheduleActive ? 'enabled' : 'disabled'}`}
          />
        </div>

        {scheduleActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2"
          >
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                border: '1px solid rgba(139,92,246,0.3)',
              }}
            />
            {scheduledTime && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-purple-300 text-center py-2 rounded-lg"
                style={{ background: 'rgba(139,92,246,0.1)' }}
              >
                Light will turn on at {scheduledTime}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

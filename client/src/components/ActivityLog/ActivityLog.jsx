import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ActivityLog.css';

export default function ActivityLog({ sensors, controls }) {
  const [logs, setLogs] = useState([]);

  // Track changes in controls & sensors
  useEffect(() => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Check for notable events
    if (sensors?.gas >= 400) {
      addLog({ time: ts, text: 'Gas alert triggered!', type: 'danger', icon: '🔥' });
    }
  }, [sensors?.gas]);

  useEffect(() => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (controls?.relay1 !== undefined) {
      addLog({ time: ts, text: `Light turned ${controls.relay1}`, type: controls.relay1 === 'ON' ? 'success' : 'info', icon: '💡' });
    }
  }, [controls?.relay1]);

  useEffect(() => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (controls?.motor !== undefined) {
      addLog({ time: ts, text: `Motor turned ${controls.motor}`, type: controls.motor === 'ON' ? 'success' : 'info', icon: '⚙️' });
    }
  }, [controls?.motor]);

  useEffect(() => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (controls?.door !== undefined) {
      addLog({ time: ts, text: `Door ${controls.door === 'OPEN' ? 'opened' : 'closed'}`, type: controls.door === 'OPEN' ? 'warning' : 'info', icon: '🚪' });
    }
  }, [controls?.door]);

  function addLog(entry) {
    setLogs(prev => [{ ...entry, id: Date.now() + Math.random() }, ...prev].slice(0, 15));
  }

  const typeColors = {
    success: '#00ff88',
    warning: '#fbbf24',
    danger: '#ff4444',
    info: '#00d4ff',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="activity-log-card"
    >
      <div className="al-header">
        <div className="al-header-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <div>
            <h3 className="al-title">Activity Log</h3>
            <p className="al-subtitle">Real-time events</p>
          </div>
        </div>
        <span className="al-count">{logs.length}</span>
      </div>

      <div className="al-list">
        <AnimatePresence>
          {logs.length === 0 ? (
            <div className="al-empty">No events yet — interact with controls to see activity</div>
          ) : (
            logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.25 }}
                className="al-item"
              >
                <div className="al-dot" style={{ background: typeColors[log.type] || '#6b7280' }} />
                <span className="al-icon">{log.icon}</span>
                <span className="al-text">{log.text}</span>
                <span className="al-time">{log.time}</span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

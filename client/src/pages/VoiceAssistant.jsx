import { motion } from 'framer-motion';
import VoiceControl from '../components/VoiceControl';

export default function VoiceAssistant({ onCommand, controls, sensors, alertSent }) {
  const isFireAlert = (sensors?.gas ?? 0) > 400;

  const statusItems = [
    { label: 'Light', value: controls?.relay1 === 'ON' ? '💡 ON' : '○ OFF', active: controls?.relay1 === 'ON', activeColor: '#fbbf24' },
    { label: 'Motor', value: controls?.motor === 'ON' ? '⚡ Running' : '○ Stopped', active: controls?.motor === 'ON', activeColor: '#00ff88' },
    { label: 'Door', value: controls?.door === 'OPEN' ? '🔓 Open' : '🔒 Closed', active: controls?.door === 'OPEN', activeColor: '#00d4ff' },
    { label: 'Mode', value: controls?.relay2Mode === 'AUTO' ? '🤖 Auto' : '🎮 Manual', active: true, activeColor: controls?.relay2Mode === 'AUTO' ? '#00ff88' : '#00d4ff' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#00ff88,#00d4ff)' }} />
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Voice & Alerts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Voice Control */}
        <VoiceControl onCommand={onCommand} />

        {/* System Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }} className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,255,136,0.12)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-tight">System Status</h2>
              <p className="text-xs text-gray-500">All devices overview</p>
            </div>
          </div>
          <div className="space-y-2">
            {statusItems.map((item) => (
              <div key={item.label}
                className="flex justify-between items-center px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-xs text-gray-400">{item.label}</span>
                <span className="text-xs font-semibold"
                  style={{ color: item.active ? item.activeColor : '#4b5563' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Alerts Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`glass-card p-5 sm:col-span-2 xl:col-span-1 ${isFireAlert ? 'fire-alert' : ''}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: isFireAlert ? 'rgba(255,68,68,0.2)' : 'rgba(255,0,110,0.1)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={isFireAlert ? '#ff4444' : '#ff006e'} strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-tight">Emergency Alerts</h2>
              <p className="text-xs text-gray-500">Auto WhatsApp notification</p>
            </div>
          </div>

          {isFireAlert ? (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-xl space-y-2"
              style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)' }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🚨</span>
                <span className="text-sm font-bold text-red-400">FIRE / GAS ALERT</span>
              </div>
              <p className="text-xs text-red-300/80">Gas: {sensors?.gas} ADC — Threshold exceeded (400)</p>
              <p className="text-xs" style={{ color: alertSent ? '#00ff88' : '#fbbf24' }}>
                WhatsApp: {alertSent ? '✓ Alert sent' : '⏳ Sending...'}
              </p>
              <p className="text-[10px] text-gray-500">{new Date().toLocaleString()}</p>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'rgba(0,255,136,0.1)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-white mb-1">All Clear</p>
              <p className="text-xs text-gray-500">No active alerts — systems normal</p>
              <p className="text-[10px] text-gray-600 mt-1 font-mono">Gas: {sensors?.gas ?? 0} / 400 threshold</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

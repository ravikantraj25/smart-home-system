import { motion } from 'framer-motion';
import './SystemStatus.css';

export default function SystemStatus({ sensors, controls, isConnected, lastUpdated }) {
  const devices = [
    { name: 'Light', status: controls?.relay1 === 'ON', icon: '💡' },
    { name: 'Motor', status: controls?.motor === 'ON', icon: '⚙️' },
    { name: 'Door', status: controls?.door === 'OPEN', icon: '🚪' },
  ];

  const activeCount = devices.filter(d => d.status).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="system-status-card"
    >
      {/* Connection Pulse */}
      <div className="ss-header">
        <div className="ss-connection">
          <motion.div
            className="ss-pulse"
            style={{ background: isConnected ? '#00ff88' : '#ff4444' }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div>
            <h3 className="ss-title">System Status</h3>
            <p className="ss-subtitle">{isConnected ? 'All Systems Online' : 'Disconnected'}</p>
          </div>
        </div>
        {lastUpdated && (
          <span className="ss-updated">Updated {lastUpdated}</span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="ss-stats">
        <div className="ss-stat-item">
          <span className="ss-stat-value" style={{ color: '#00d4ff' }}>{activeCount}</span>
          <span className="ss-stat-label">Active Devices</span>
        </div>
        <div className="ss-stat-item">
          <span className="ss-stat-value" style={{ color: sensors?.gas >= 400 ? '#ff4444' : '#00ff88' }}>
            {sensors?.gas >= 400 ? '⚠️' : '✓'}
          </span>
          <span className="ss-stat-label">Safety</span>
        </div>
        <div className="ss-stat-item">
          <span className="ss-stat-value" style={{ color: '#a855f7' }}>
            {controls?.relay2Mode === 'AUTO' ? 'Auto' : 'Manual'}
          </span>
          <span className="ss-stat-label">Pump Mode</span>
        </div>
      </div>

      {/* Device List */}
      <div className="ss-devices">
        {devices.map((device, i) => (
          <motion.div
            key={device.name}
            className="ss-device"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <span className="ss-device-icon">{device.icon}</span>
            <span className="ss-device-name">{device.name}</span>
            <span
              className="ss-device-badge"
              style={{
                background: device.status ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                color: device.status ? '#00ff88' : '#6b7280',
                border: `1px solid ${device.status ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {device.status ? 'ON' : 'OFF'}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

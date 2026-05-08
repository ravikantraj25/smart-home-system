import { motion } from 'framer-motion';
import './QuickActions.css';

export default function QuickActions({ controls, onToggleRelay1, onMotorToggle, onDoorChange, onModeChange }) {
  const actions = [
    {
      label: 'All Lights',
      icon: '💡',
      active: controls?.relay1 === 'ON',
      color: '#fbbf24',
      onClick: () => onToggleRelay1(controls?.relay1 === 'ON' ? 'OFF' : 'ON'),
    },
    {
      label: 'Water Pump',
      icon: '💧',
      active: controls?.motor === 'ON',
      color: '#00d4ff',
      onClick: () => {
        if (controls?.relay2Mode === 'AUTO') {
          onModeChange('MANUAL');
        }
        onMotorToggle(controls?.motor === 'ON' ? 'OFF' : 'ON');
      },
    },
    {
      label: 'Front Door',
      icon: '🚪',
      active: controls?.door === 'OPEN',
      color: '#a855f7',
      onClick: () => onDoorChange(controls?.door === 'OPEN' ? 'CLOSED' : 'OPEN'),
    },
    {
      label: 'Auto Mode',
      icon: '🤖',
      active: controls?.relay2Mode === 'AUTO',
      color: '#00ff88',
      onClick: () => onModeChange(controls?.relay2Mode === 'AUTO' ? 'MANUAL' : 'AUTO'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="quick-actions-card"
    >
      <div className="qa-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <div>
          <h3 className="qa-title">Quick Actions</h3>
          <p className="qa-subtitle">One-tap controls</p>
        </div>
      </div>

      <div className="qa-grid">
        {actions.map((action, i) => (
          <motion.button
            key={action.label}
            className={`qa-btn ${action.active ? 'active' : ''}`}
            style={{
              '--qa-color': action.color,
              '--qa-bg': action.active ? `${action.color}18` : 'rgba(255,255,255,0.03)',
              '--qa-border': action.active ? `${action.color}35` : 'rgba(255,255,255,0.06)',
            }}
            onClick={action.onClick}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <span className="qa-btn-icon">{action.icon}</span>
            <span className="qa-btn-label">{action.label}</span>
            <span className="qa-btn-status" style={{ color: action.active ? action.color : '#6b7280' }}>
              {action.active ? 'ON' : 'OFF'}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import './AirQualityStatus.css';

export default function AirQualityStatusView({
  status,
  gasValue,
  barPercentage,
  loading,
  isFireAlert,
}) {
  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="skeleton h-4 w-36 mb-4" />
        <div className="flex gap-4 items-center">
          <div className="skeleton w-16 h-16 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-3/4" />
            <div className="skeleton h-2 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className={`air-quality-container ${isFireAlert ? 'fire-alert' : ''}`}
    >
      <AnimatePresence>
        {isFireAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="alert-glow"
          />
        )}
      </AnimatePresence>

      {/* Title Section */}
      <div className="air-quality-header">
        <div className="status-icon" style={{ background: status.bgColor }}>
          <span>{status.icon}</span>
        </div>
        <div className="header-text">
          <h2>Air Quality</h2>
          <p>Gas & Fire Detection</p>
        </div>
        <motion.span
          className="status-badge"
          style={{
            background: status.bgColor,
            color: status.color,
            border: `1px solid ${status.color}40`,
          }}
          animate={isFireAlert ? { scale: [1, 1.05, 1] } : {}}
          transition={isFireAlert ? { duration: 0.8, repeat: Infinity } : {}}
        >
          {status.label}
        </motion.span>
      </div>

      {/* Current Value */}
      <div className="air-quality-value">
        <motion.span
          key={gasValue}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="gas-value-display"
        >
          {gasValue}
        </motion.span>
        <span className="value-unit">ppm</span>
      </div>

      {/* Description */}
      <p className="status-description">{status.description}</p>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-labels">
          <span>Safe</span>
          <span>Warning</span>
          <span>Critical</span>
        </div>
        <div className="progress-bar-bg">
          <motion.div
            className="progress-bar-fill"
            style={{ width: `${barPercentage}%`, background: status.color }}
            initial={{ width: 0 }}
            animate={{ width: `${barPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

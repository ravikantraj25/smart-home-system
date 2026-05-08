import { motion } from 'framer-motion';
import './WaterLevelIndicator.css';

export default function WaterLevelIndicatorView({
  percentage,
  status,
  waterLevel,
  size,
  strokeWidth,
  radius,
  circumference,
  dashOffset,
  maxHeight,
  loading,
}) {
  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="skeleton h-4 w-36 mb-4" />
        <div className="flex gap-4 items-center">
          <div className="skeleton w-28 h-28 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-3/4" />
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="water-level-container"
    >
      {/* Title row */}
      <div className="water-header">
        <div className="water-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00d4ff"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
          </svg>
        </div>
        <div>
          <h2 className="water-title">Water Level</h2>
          <p className="water-subtitle">Tank Monitor</p>
        </div>
      </div>

      {/* Gauge left, Info right */}
      <div className="water-content">
        {/* Circular gauge */}
        <div className="water-gauge" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="water-gauge-svg">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={status.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${status.color}50)` }}
            />
          </svg>
          <div className="water-gauge-center">
            <motion.span
              key={percentage}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="water-percentage"
              style={{ color: status.color }}
            >
              {percentage}%
            </motion.span>
            <span className="water-distance">{waterLevel} cm</span>
          </div>
        </div>

        {/* Right side info */}
        <div className="water-info">
          <div className="water-info-content">
            <div>
              <p className="water-info-label">Tank level</p>
              <div className="water-progress-bg">
                <motion.div
                  className="water-progress-fill"
                  style={{
                    background: status.color,
                    boxShadow: `0 0 8px ${status.color}60`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </div>
              <div className="water-progress-labels">
                <span>0 cm</span>
                <span>{maxHeight} cm</span>
              </div>
            </div>

            <motion.span
              className="water-status-label"
              style={{
                background: status.bgColor,
                color: status.color,
                border: `1px solid ${status.color}30`,
              }}
              animate={{
                boxShadow: [
                  `0 0 0 0 ${status.color}00`,
                  `0 0 0 5px ${status.color}15`,
                  `0 0 0 0 ${status.color}00`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {status.label}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

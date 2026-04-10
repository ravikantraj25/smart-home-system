import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function WaterLevelIndicator({ waterLevel, loading }) {
  const maxHeight = 30;
  // Ultrasonic measures distance from top: lower distance = MORE water
  // So we invert: full tank (5cm) → high %, empty tank (20cm) → low %
  const percentage = useMemo(
    () => Math.max(0, Math.min(Math.round(((maxHeight - waterLevel) / maxHeight) * 100), 100)),
    [waterLevel]
  );

  const getStatus = () => {
    if (percentage > 60) return { label: 'Full', color: '#00ff88', bgColor: 'rgba(0,255,136,0.1)' };
    if (percentage > 25) return { label: 'Medium', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.1)' };
    return { label: 'Low', color: '#ff4444', bgColor: 'rgba(255,68,68,0.1)' };
  };

  const status = getStatus();

  // Circular progress
  const size = 150;
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

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
      className="glass-card p-5"
    >
      {/* Title row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,212,255,0.12)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white leading-tight">Water Level</h2>
          <p className="text-xs text-gray-500">Tank Monitor</p>
        </div>
      </div>

      {/* Content: gauge left, info right */}
      <div className="flex items-center gap-4">
        {/* Circular gauge — compact */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
            <motion.circle
              cx={size/2} cy={size/2} r={radius}
              stroke={status.color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${status.color}50)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={percentage}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold font-mono leading-none"
              style={{ color: status.color }}
            >
              {percentage}%
            </motion.span>
            <span className="text-xs text-gray-500 font-mono mt-0.5">{waterLevel} cm</span>
          </div>
        </div>

        {/* Right side info */}
        <div className="flex-1 min-w-0">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Tank level</p>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: status.color, boxShadow: `0 0 8px ${status.color}60` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>0 cm</span>
                <span>{maxHeight} cm</span>
              </div>
            </div>

            <motion.span
              className="inline-flex px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: status.bgColor, color: status.color, border: `1px solid ${status.color}30` }}
              animate={{
                boxShadow: [`0 0 0 0 ${status.color}00`, `0 0 0 5px ${status.color}15`, `0 0 0 0 ${status.color}00`],
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

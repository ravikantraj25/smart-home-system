import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './EnergyMonitor.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="energy-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">{payload[0].value.toFixed(2)} A</p>
      </div>
    );
  }
  return null;
};

export default function EnergyMonitorView({
  current,
  dataHistory,
  avg,
  peak,
  power,
  loading,
}) {
  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="skeleton h-4 w-36 mb-4" />
        <div className="skeleton h-36 w-full mb-3 rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="energy-monitor-container"
    >
      {/* Title row */}
      <div className="energy-header">
        <div className="energy-title-group">
          <div className="energy-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
            </svg>
          </div>
          <div>
            <h2 className="energy-title">Energy Monitor</h2>
            <p className="energy-subtitle">Real-time Current</p>
          </div>
        </div>
        <div className="energy-current-display">
          <motion.span
            key={current}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="energy-current-value"
          >
            {parseFloat(current || 0).toFixed(2)}
          </motion.span>
          <span className="energy-current-unit">A</span>
        </div>
      </div>

      {/* Chart */}
      <div className="energy-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={dataHistory}
            margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
          >
            <defs>
              <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#4b5563' }}
              stroke="transparent"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#4b5563' }}
              stroke="transparent"
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="current"
              stroke="#a855f7"
              strokeWidth={2}
              fill="url(#cGrad)"
              dot={false}
              activeDot={{
                r: 4,
                stroke: '#a855f7',
                strokeWidth: 2,
                fill: '#0a0a0f',
              }}
              isAnimationActive
              animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="energy-stats">
        {[
          { label: 'Avg', value: `${avg} A`, color: '#00d4ff' },
          { label: 'Peak', value: `${peak} A`, color: '#ff4444' },
          { label: 'Power', value: `${power} W`, color: '#00ff88' },
        ].map((s) => (
          <div key={s.label} className="stat-box">
            <p className="stat-label">{s.label}</p>
            <p className="stat-value" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

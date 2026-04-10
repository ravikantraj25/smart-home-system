import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15,15,26,0.95)',
        border: '1px solid rgba(168,85,247,0.3)',
        borderRadius: 10,
        padding: '8px 12px',
      }}>
        <p style={{ color: '#6b7280', fontSize: 10, marginBottom: 2 }}>{label}</p>
        <p style={{ color: '#a855f7', fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>
          {payload[0].value.toFixed(2)} A
        </p>
      </div>
    );
  }
  return null;
};

export default function EnergyMonitor({ current, loading }) {
  const [dataHistory, setDataHistory] = useState([]);
  const maxPoints = 20;

  useEffect(() => {
    if (current !== undefined && current !== null) {
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
      setDataHistory((prev) => [...prev, { time: timeStr, current: parseFloat(current) || 0 }].slice(-maxPoints));
    }
  }, [current]);

  const avg = dataHistory.length
    ? (dataHistory.reduce((s, d) => s + d.current, 0) / dataHistory.length).toFixed(2) : '0.00';
  const peak = dataHistory.length
    ? Math.max(...dataHistory.map((d) => d.current)).toFixed(2) : '0.00';
  const power = (parseFloat(current || 0) * 220).toFixed(0);

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="skeleton h-4 w-36 mb-4" />
        <div className="skeleton h-36 w-full mb-3 rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card p-5"
    >
      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(168,85,247,0.12)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round">
              <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white leading-tight">Energy Monitor</h2>
            <p className="text-xs text-gray-500">Real-time Current</p>
          </div>
        </div>
        <div className="text-right">
          <motion.span key={current} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="text-xl font-bold font-mono text-neon-purple">
            {parseFloat(current || 0).toFixed(2)}
          </motion.span>
          <span className="text-xs text-gray-500 ml-1">A</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-36 -mx-1 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dataHistory} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#4b5563' }} stroke="transparent" interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: '#4b5563' }} stroke="transparent" domain={[0, 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="current" stroke="#a855f7" strokeWidth={2}
              fill="url(#cGrad)" dot={false}
              activeDot={{ r: 4, stroke: '#a855f7', strokeWidth: 2, fill: '#0a0a0f' }}
              isAnimationActive animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Avg', value: `${avg} A`, color: '#00d4ff' },
          { label: 'Peak', value: `${peak} A`, color: '#ff4444' },
          { label: 'Power', value: `${power} W`, color: '#00ff88' },
        ].map((s) => (
          <div key={s.label} className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-[10px] text-gray-500 mb-0.5">{s.label}</p>
            <p className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

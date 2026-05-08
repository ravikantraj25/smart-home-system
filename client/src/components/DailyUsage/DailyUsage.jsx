import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './DailyUsage.css';

export default function DailyUsage({ current, gasValue, waterLevel }) {
  const [history, setHistory] = useState([]);
  const [peakPower, setPeakPower] = useState(0);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [startTime] = useState(new Date());

  // Record data every update
  useEffect(() => {
    if (current === undefined || current === null) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const powerW = parseFloat(current || 0) * 220;

    setHistory(prev => {
      const newEntry = {
        time: timeStr,
        power: Math.round(powerW),
        gas: parseInt(gasValue || 0),
        water: Math.round(parseFloat(waterLevel || 0)),
      };
      return [...prev, newEntry].slice(-120); // Keep last 120 entries (~4 hours at 2s interval)
    });

    // Track peak
    if (powerW > peakPower) setPeakPower(powerW);

    // Accumulate energy (Wh) — power * interval(2s) / 3600
    setTotalEnergy(prev => prev + (powerW * 2 / 3600));
  }, [current]);

  // Uptime
  const uptimeMinutes = Math.round((new Date() - startTime) / 60000);
  const uptimeStr = uptimeMinutes < 60
    ? `${uptimeMinutes}m`
    : `${Math.floor(uptimeMinutes / 60)}h ${uptimeMinutes % 60}m`;

  // Daily stats summary
  const avgPower = history.length
    ? Math.round(history.reduce((s, d) => s + d.power, 0) / history.length)
    : 0;
  const avgGas = history.length
    ? Math.round(history.reduce((s, d) => s + d.gas, 0) / history.length)
    : 0;
  const gasAlerts = history.filter(d => d.gas >= 400).length;

  const stats = [
    { label: 'Avg Power', value: `${avgPower}W`, icon: '⚡', color: '#fbbf24' },
    { label: 'Peak Power', value: `${Math.round(peakPower)}W`, icon: '📈', color: '#ff6b6b' },
    { label: 'Energy Used', value: `${totalEnergy.toFixed(2)}Wh`, icon: '🔋', color: '#00d4ff' },
    { label: 'Uptime', value: uptimeStr, icon: '⏱️', color: '#a855f7' },
    { label: 'Avg Gas', value: `${avgGas}ppm`, icon: '🌿', color: '#00ff88' },
    { label: 'Gas Alerts', value: `${gasAlerts}`, icon: '🔥', color: gasAlerts > 0 ? '#ff4444' : '#6b7280' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="daily-usage-card"
    >
      <div className="du-header">
        <div className="du-header-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div>
            <h3 className="du-title">Daily Usage Report</h3>
            <p className="du-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
        <span className="du-live-badge">
          <motion.div
            className="du-live-dot"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          LIVE
        </span>
      </div>

      {/* Stats Grid */}
      <div className="du-stats">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="du-stat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <span className="du-stat-icon">{stat.icon}</span>
            <span className="du-stat-value" style={{ color: stat.color }}>{stat.value}</span>
            <span className="du-stat-label">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Power Chart */}
      {history.length > 2 && (
        <div className="du-chart">
          <p className="du-chart-label">Power Usage (W) — Today</p>
          <div style={{ width: '100%', height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history.filter((_, i) => i % 3 === 0)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#4b5563' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#4b5563' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }}
                  itemStyle={{ color: '#fbbf24' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Area type="monotone" dataKey="power" stroke="#fbbf24" fill="url(#powerGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data points count */}
      <div className="du-footer">
        <span>{history.length} data points collected</span>
        <span>Refreshing every 2s</span>
      </div>
    </motion.div>
  );
}

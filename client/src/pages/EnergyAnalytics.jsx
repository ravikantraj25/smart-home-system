import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import './EnergyAnalytics.css';

const API_BASE = 'http://localhost:3001';

export default function EnergyAnalytics() {
  const [summary, setSummary] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [realtimeData, setRealtimeData] = useState([]);
  const [activeTab, setActiveTab] = useState('hourly');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, hourRes, dayRes, rtRes] = await Promise.all([
        fetch(`${API_BASE}/api/energy/summary`),
        fetch(`${API_BASE}/api/energy/hourly?hours=24`),
        fetch(`${API_BASE}/api/energy/daily?days=7`),
        fetch(`${API_BASE}/api/energy/realtime?limit=60`),
      ]);

      const [sumData, hourData, dayData, rtData] = await Promise.all([
        sumRes.json(), hourRes.json(), dayRes.json(), rtRes.json(),
      ]);

      if (sumData.success) setSummary(sumData);
      if (hourData.success) setHourlyData(hourData.data);
      if (dayData.success) setDailyData(dayData.data);
      if (rtData.success) setRealtimeData(rtData.data);
    } catch (err) {
      console.warn('Energy fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  const statCards = summary ? [
    {
      label: 'Power Now',
      value: `${summary.currentReading?.powerWatts?.toFixed(1) ?? 0}W`,
      icon: '⚡',
      color: '#fbbf24',
      glow: 'rgba(251,191,36,0.15)',
    },
    {
      label: 'Today Energy',
      value: `${summary.today?.energyKwh?.toFixed(3) ?? 0} kWh`,
      icon: '📊',
      color: '#00d4ff',
      glow: 'rgba(0,212,255,0.15)',
    },
    {
      label: 'Monthly Energy',
      value: `${summary.month?.energyKwh?.toFixed(3) ?? 0} kWh`,
      icon: '📈',
      color: '#a855f7',
      glow: 'rgba(168,85,247,0.15)',
    },
    {
      label: 'Est. Cost',
      value: `₹${summary.month?.estimatedCostINR?.toFixed(2) ?? 0}`,
      icon: '💰',
      color: '#00ff88',
      glow: 'rgba(0,255,136,0.15)',
    },
    {
      label: 'Peak Power',
      value: `${summary.today?.peakPowerWatts?.toFixed(1) ?? 0}W`,
      icon: '🔺',
      color: '#ff6b6b',
      glow: 'rgba(255,107,107,0.15)',
    },
    {
      label: 'Readings',
      value: `${summary.today?.readings ?? 0}`,
      icon: '📡',
      color: '#f472b6',
      glow: 'rgba(244,114,182,0.15)',
    },
  ] : [];

  const tabs = [
    { id: 'hourly', label: 'Hourly', icon: '🕐' },
    { id: 'daily', label: 'Daily', icon: '📅' },
    { id: 'realtime', label: 'Real-time', icon: '⚡' },
  ];

  const customTooltipStyle = {
    background: 'rgba(10,10,15,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '12px',
    color: '#d1d5db',
    backdropFilter: 'blur(12px)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="energy-page"
    >
      {/* Section Header */}
      <div className="energy-section-header">
        <div className="energy-section-bar" style={{ background: 'linear-gradient(180deg,#fbbf24,#ff6b6b)' }} />
        <div>
          <p className="energy-section-label">Energy Analytics</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="energy-stat-grid">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="energy-stat-card">
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
              <div>
                <div className="skeleton" style={{ width: 60, height: 14, marginBottom: 4 }} />
                <div className="skeleton" style={{ width: 80, height: 10 }} />
              </div>
            </div>
          ))
        ) : (
          statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="energy-stat-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{ '--stat-glow': stat.glow }}
            >
              <span className="energy-stat-icon">{stat.icon}</span>
              <div className="energy-stat-info">
                <span className="energy-stat-value" style={{ color: stat.color }}>{stat.value}</span>
                <span className="energy-stat-label">{stat.label}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Chart Section */}
      <div className="energy-section-header" style={{ marginTop: 24 }}>
        <div className="energy-section-bar" style={{ background: 'linear-gradient(180deg,#00d4ff,#a855f7)' }} />
        <div>
          <p className="energy-section-label">Consumption Charts</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="energy-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`energy-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="energy-chart-card glass-card">
        {activeTab === 'hourly' && (
          <div className="energy-chart-wrap">
            <h3 className="energy-chart-title">Hourly Power Consumption (24h)</h3>
            {hourlyData.length === 0 ? (
              <div className="energy-empty">
                <span>📊</span>
                <p>No hourly data yet. Sensor data will appear as readings come in.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="avgPowerWatts" stroke="#00d4ff" fill="url(#colorPower)" name="Avg Power (W)" strokeWidth={2} />
                  <Area type="monotone" dataKey="totalEnergyWh" stroke="#a855f7" fill="url(#colorEnergy)" name="Energy (Wh)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="energy-chart-wrap">
            <h3 className="energy-chart-title">Daily Energy Consumption (7 days)</h3>
            {dailyData.length === 0 ? (
              <div className="energy-empty">
                <span>📅</span>
                <p>No daily data yet. Data accumulates over time.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend />
                  <Bar dataKey="totalEnergyKwh" fill="#a855f7" name="Energy (kWh)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="costINR" fill="#00ff88" name="Cost (₹)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {activeTab === 'realtime' && (
          <div className="energy-chart-wrap">
            <h3 className="energy-chart-title">Real-time Power Monitor</h3>
            {realtimeData.length === 0 ? (
              <div className="energy-empty">
                <span>⚡</span>
                <p>Waiting for real-time sensor readings...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={realtimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    tickFormatter={(v) => new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    labelFormatter={(v) => new Date(v).toLocaleTimeString('en-IN')}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="powerWatts" stroke="#fbbf24" name="Power (W)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="gasLevel" stroke="#ff6b6b" name="Gas Level" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      {/* Device Usage Breakdown */}
      {hourlyData.length > 0 && (
        <>
          <div className="energy-section-header" style={{ marginTop: 24 }}>
            <div className="energy-section-bar" style={{ background: 'linear-gradient(180deg,#00ff88,#00d4ff)' }} />
            <div>
              <p className="energy-section-label">Device Usage</p>
            </div>
          </div>

          <div className="energy-chart-card glass-card">
            <div className="energy-chart-wrap">
              <h3 className="energy-chart-title">Device ON-Time per Hour (%)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend />
                  <Bar dataKey="lightOnPercent" fill="#fbbf24" name="Light ON %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="motorOnPercent" fill="#00d4ff" name="Motor ON %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

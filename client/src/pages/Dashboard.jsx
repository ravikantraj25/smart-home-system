import { motion } from 'framer-motion';
import WaterLevelIndicator from '../components/WaterLevelIndicator';
import AirQualityStatus from '../components/AirQualityStatus';
import EnergyMonitor from '../components/EnergyMonitor';
import SystemStatus from '../components/SystemStatus/SystemStatus';
import ActivityLog from '../components/ActivityLog/ActivityLog';
import QuickActions from '../components/QuickActions/QuickActions';
import DailyUsage from '../components/DailyUsage/DailyUsage';

export default function Dashboard({
  sensors,
  controls,
  loading,
  isConnected,
  lastUpdated,
  onToggleRelay1,
  onModeChange,
  onMotorToggle,
  onDoorChange,
}) {
  // Hero stats
  const stats = [
    {
      label: 'Water Level',
      value: `${Math.round(sensors?.waterLevel ?? 0)}%`,
      icon: '💧',
      color: '#00d4ff',
      glow: 'rgba(0,212,255,0.15)',
    },
    {
      label: 'Gas Level',
      value: `${sensors?.gas ?? 0}`,
      icon: sensors?.gas >= 400 ? '🔥' : '🌿',
      color: sensors?.gas >= 400 ? '#ff4444' : '#00ff88',
      glow: sensors?.gas >= 400 ? 'rgba(255,68,68,0.15)' : 'rgba(0,255,136,0.15)',
    },
    {
      label: 'Power',
      value: `${(parseFloat(sensors?.current ?? 0) * 220).toFixed(0)}W`,
      icon: '⚡',
      color: '#fbbf24',
      glow: 'rgba(251,191,36,0.15)',
    },
    {
      label: 'Devices',
      value: [controls?.relay1, controls?.motor, controls?.door].filter(v => v === 'ON' || v === 'OPEN').length + '/3',
      icon: '🏠',
      color: '#a855f7',
      glow: 'rgba(168,85,247,0.15)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Hero Stats Bar */}
      <div className="hero-stats-bar">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="hero-stat"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            style={{ '--stat-glow': stat.glow }}
          >
            <span className="hero-stat-icon">{stat.icon}</span>
            <div className="hero-stat-info">
              <span className="hero-stat-value" style={{ color: stat.color }}>{stat.value}</span>
              <span className="hero-stat-label">{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Section: Live Sensors */}
      <div className="flex items-center gap-2.5 mb-4 mt-6">
        <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#00d4ff,#a855f7)' }} />
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Live Sensors</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <WaterLevelIndicator waterLevel={sensors?.waterLevel ?? 0} loading={loading} />
        <AirQualityStatus gasValue={sensors?.gas ?? 0} loading={loading} />
        <div className="sm:col-span-2 xl:col-span-1">
          <EnergyMonitor current={sensors?.current ?? 0} loading={loading} />
        </div>
      </div>

      {/* Section: System & Activity */}
      <div className="flex items-center gap-2.5 mb-4 mt-6">
        <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#a855f7,#00ff88)' }} />
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">System Overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <SystemStatus
          sensors={sensors}
          controls={controls}
          isConnected={isConnected}
          lastUpdated={lastUpdated}
        />
        <QuickActions
          controls={controls}
          onToggleRelay1={onToggleRelay1}
          onMotorToggle={onMotorToggle}
          onDoorChange={onDoorChange}
          onModeChange={onModeChange}
        />
        <div className="sm:col-span-2 xl:col-span-1">
          <ActivityLog sensors={sensors} controls={controls} />
        </div>
      </div>

      {/* Section: Daily Usage Report */}
      <div className="flex items-center gap-2.5 mb-4 mt-6">
        <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#fbbf24,#ff6b6b)' }} />
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Daily Report</p>
        </div>
      </div>

      <DailyUsage
        current={sensors?.current}
        gasValue={sensors?.gas}
        waterLevel={sensors?.waterLevel}
      />
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import WaterLevelIndicator from '../components/WaterLevelIndicator';
import AirQualityStatus from '../components/AirQualityStatus';
import EnergyMonitor from '../components/EnergyMonitor';

export default function Dashboard({ sensors, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-4">
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
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import LightControl from '../components/LightControl';
import MotorControl from '../components/MotorControl';
import DoorControl from '../components/DoorControl';

export default function Controls({ controls, onToggleRelay1, onModeChange, onMotorToggle, onDoorChange, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#a855f7,#00ff88)' }} />
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Device Control</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <LightControl relay1={controls?.relay1 ?? 'OFF'} onToggle={onToggleRelay1} loading={loading} />
        <MotorControl
          relay2Mode={controls?.relay2Mode ?? 'AUTO'}
          motor={controls?.motor ?? 'OFF'}
          onModeChange={onModeChange}
          onMotorToggle={onMotorToggle}
          loading={loading}
        />
        <div className="sm:col-span-2 xl:col-span-1">
          <DoorControl door={controls?.door ?? 'CLOSED'} onDoorChange={onDoorChange} loading={loading} />
        </div>
      </div>
    </motion.div>
  );
}

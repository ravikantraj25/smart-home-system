import { motion } from 'framer-motion';

export default function MotorControl({ relay2Mode, motor, onModeChange, onMotorToggle, loading }) {
  const isAuto = relay2Mode === 'AUTO';
  const isOn = motor === 'ON';

  if (loading) {
    return (
      <div className="glass-card p-5 space-y-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="skeleton h-10 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }} className="glass-card p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: isOn ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.05)' }}
            animate={isOn ? { rotate: 360 } : {}}
            transition={isOn ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={isOn ? '#00ff88' : '#6b7280'} strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </motion.div>
          <div>
            <h2 className="text-sm font-semibold text-white leading-tight">Motor</h2>
            <p className="text-xs text-gray-500">Relay 2</p>
          </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={isOn
            ? { background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.25)' }
            : { background: 'rgba(255,255,255,0.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}>
          {isOn ? '⚡ Running' : '○ Stopped'}
        </span>
      </div>

      {/* Mode toggle */}
      <div className="mb-4">
        <p className="text-[11px] text-gray-500 font-medium mb-2 uppercase tracking-wide">Mode</p>
        <div className="flex p-1 rounded-xl gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {['MANUAL', 'AUTO'].map((mode) => {
            const active = relay2Mode === mode;
            return (
              <motion.button key={mode}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all relative"
                onClick={() => onModeChange(mode)}
                whileTap={{ scale: 0.97 }}>
                {active && (
                  <motion.div layoutId="modeTab" className="absolute inset-0 rounded-lg"
                    style={mode === 'AUTO'
                      ? { background: 'linear-gradient(135deg,rgba(0,255,136,0.18),rgba(0,212,255,0.18))', border: '1px solid rgba(0,255,136,0.25)' }
                      : { background: 'linear-gradient(135deg,rgba(0,212,255,0.18),rgba(168,85,247,0.18))', border: '1px solid rgba(0,212,255,0.25)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10" style={{ color: active ? '#fff' : '#6b7280' }}>{mode}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Manual ON/OFF */}
      <div className={isAuto ? 'opacity-30 pointer-events-none' : ''}>
        <p className="text-[11px] text-gray-500 font-medium mb-2 uppercase tracking-wide">Manual Control</p>
        <div className="flex gap-2">
          <motion.button id="motor-on"
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border"
            style={isOn
              ? { background: 'rgba(0,255,136,0.15)', color: '#00ff88', borderColor: 'rgba(0,255,136,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', borderColor: 'rgba(255,255,255,0.06)' }}
            whileTap={{ scale: 0.97 }} onClick={() => onMotorToggle('ON')} disabled={isAuto}>
            ON
          </motion.button>
          <motion.button id="motor-off"
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border"
            style={!isOn
              ? { background: 'rgba(255,68,68,0.15)', color: '#ff4444', borderColor: 'rgba(255,68,68,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', borderColor: 'rgba(255,255,255,0.06)' }}
            whileTap={{ scale: 0.97 }} onClick={() => onMotorToggle('OFF')} disabled={isAuto}>
            OFF
          </motion.button>
        </div>
        {isAuto && (
          <p className="text-[11px] text-neon-green/60 text-center mt-2">🤖 Water-level controlled</p>
        )}
      </div>
    </motion.div>
  );
}

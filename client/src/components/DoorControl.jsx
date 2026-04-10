import { motion } from 'framer-motion';

export default function DoorControl({ door, onDoorChange, loading }) {
  const isOpen = door === 'OPEN';

  if (loading) {
    return (
      <div className="glass-card p-5 space-y-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-28 w-full rounded-xl" />
        <div className="skeleton h-10 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }} className="glass-card p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: isOpen ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.05)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={isOpen ? '#00d4ff' : '#6b7280'} strokeWidth="2">
              <path d="M3 3h7v18H3z" /><path d="M10 6l8 2v12l-8-2" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white leading-tight">Smart Door</h2>
            <p className="text-xs text-gray-500">Servo • {isOpen ? '90°' : '0°'}</p>
          </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={isOpen
            ? { background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.25)' }
            : { background: 'rgba(255,255,255,0.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}>
          {isOpen ? '🔓 Open' : '🔒 Closed'}
        </span>
      </div>

      {/* Door animation — compact horizontal */}
      <div className="flex justify-center mb-4">
        <div className="relative" style={{ width: 110, height: 80, perspective: 600 }}>
          {/* Frame */}
          <div className="absolute inset-0 rounded-lg"
            style={{ border: '2px solid rgba(255,255,255,0.08)' }} />
          {/* Door panel */}
          <motion.div
            className="absolute inset-1.5 rounded-md origin-left flex items-center"
            style={{
              background: isOpen
                ? 'linear-gradient(135deg,rgba(0,212,255,0.12),rgba(168,85,247,0.08))'
                : 'linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))',
              transformStyle: 'preserve-3d',
            }}
            animate={{ rotateY: isOpen ? -70 : 0 }}
            transition={{ duration: 0.75, ease: [0.68, -0.55, 0.265, 1.55] }}
          >
            {/* Handle */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-5 rounded-full"
              style={{
                background: isOpen ? '#00d4ff' : 'rgba(255,255,255,0.15)',
                boxShadow: isOpen ? '0 0 8px rgba(0,212,255,0.4)' : 'none',
              }} />
            {/* Panel lines */}
            <div className="absolute inset-x-3 top-2 bottom-2 flex flex-col justify-around">
              {[0,1,2].map(i => <div key={i} className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <motion.button id="door-open"
          className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border"
          style={isOpen
            ? { background: 'rgba(0,212,255,0.15)', color: '#00d4ff', borderColor: 'rgba(0,212,255,0.3)' }
            : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', borderColor: 'rgba(255,255,255,0.06)' }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => onDoorChange('OPEN')}>
          🔓 Open
        </motion.button>
        <motion.button id="door-close"
          className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border"
          style={!isOpen
            ? { background: 'rgba(168,85,247,0.15)', color: '#a855f7', borderColor: 'rgba(168,85,247,0.3)' }
            : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', borderColor: 'rgba(255,255,255,0.06)' }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => onDoorChange('CLOSED')}>
          🔒 Close
        </motion.button>
      </div>
    </motion.div>
  );
}

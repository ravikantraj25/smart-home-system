import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AirQualityStatus({ gasValue, loading }) {
  const audioRef = useRef(null);
  const isFireAlert = gasValue >= 400;

  const getStatus = () => {
    if (gasValue < 200) return { label: 'Safe', color: '#00ff88', icon: '✓', bgColor: 'rgba(0,255,136,0.1)', description: 'Air quality normal' };
    if (gasValue < 400) return { label: 'Warning', color: '#fbbf24', icon: '⚠', bgColor: 'rgba(251,191,36,0.1)', description: 'Moderate gas detected' };
    return { label: 'FIRE ALERT', color: '#ff4444', icon: '🔥', bgColor: 'rgba(255,68,68,0.15)', description: 'Dangerous gas level!' };
  };

  const status = getStatus();
  const barPercentage = Math.min((gasValue / 1000) * 100, 100);

  useEffect(() => {
    if (isFireAlert) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.3);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
        audioRef.current = audioCtx;
      } catch (e) {}
    }
    return () => { if (audioRef.current) audioRef.current.close().catch(() => {}); };
  }, [isFireAlert]);

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="skeleton h-4 w-36 mb-4" />
        <div className="flex gap-4 items-center">
          <div className="skeleton w-16 h-16 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-3/4" />
            <div className="skeleton h-2 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className={`glass-card p-5 relative overflow-hidden ${isFireAlert ? 'fire-alert' : ''}`}
    >
      <AnimatePresence>
        {isFireAlert && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at center, rgba(255,0,0,0.08) 0%, transparent 70%)' }}
          />
        )}
      </AnimatePresence>

      {/* Title */}
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: status.bgColor }}>
          <span className="text-base">{status.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white leading-tight">Air Quality</h2>
          <p className="text-xs text-gray-500">Gas & Fire Detection</p>
        </div>
        {/* Status badge in header row */}
        <motion.span
          className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: status.bgColor, color: status.color, border: `1px solid ${status.color}40` }}
          animate={isFireAlert ? { scale: [1, 1.05, 1] } : {}}
          transition={isFireAlert ? { duration: 0.8, repeat: Infinity } : {}}
        >
          {status.label}
        </motion.span>
      </div>

      {/* Main value */}
      <div className="relative z-10 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-1 mb-2">
            <motion.span
              key={gasValue}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl font-bold font-mono"
              style={{ color: status.color }}
            >
              {gasValue}
            </motion.span>
            <span className="text-sm text-gray-500">ADC</span>
          </div>
          <p className="text-xs mb-3" style={{ color: status.color + 'aa' }}>{status.description}</p>

          {/* Gas bar */}
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, #00ff88 0%, #fbbf24 40%, #ff4444 70%)` }}
              initial={{ width: 0 }}
              animate={{ width: `${barPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>0</span><span>200</span><span>400</span><span>1000</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

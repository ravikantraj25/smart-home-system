import { useEffect, useRef } from 'react';
import AirQualityStatusView from './AirQualityStatusView';

export default function AirQualityStatus({ gasValue, loading }) {
  const audioRef = useRef(null);
  const isFireAlert = gasValue >= 400;

  // Determine status based on gas value
  const getStatus = () => {
    if (gasValue < 200) {
      return {
        label: 'Safe',
        color: '#00ff88',
        icon: '✓',
        bgColor: 'rgba(0,255,136,0.1)',
        description: 'Air quality normal',
      };
    }
    if (gasValue < 400) {
      return {
        label: 'Warning',
        color: '#fbbf24',
        icon: '⚠',
        bgColor: 'rgba(251,191,36,0.1)',
        description: 'Moderate gas detected',
      };
    }
    return {
      label: 'FIRE ALERT',
      color: '#ff4444',
      icon: '🔥',
      bgColor: 'rgba(255,68,68,0.15)',
      description: 'Dangerous gas level!',
    };
  };

  const status = getStatus();
  const barPercentage = Math.min((gasValue / 1000) * 100, 100);

  // Fire alert sound effect
  useEffect(() => {
    if (isFireAlert) {
      try {
        const audioCtx = new (
          window.AudioContext || window.webkitAudioContext
        )();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(
          1200,
          audioCtx.currentTime + 0.3
        );
        osc.frequency.exponentialRampToValueAtTime(
          800,
          audioCtx.currentTime + 0.6
        );
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + 0.8
        );
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
        audioRef.current = audioCtx;
      } catch (e) {}
    }
    return () => {
      if (audioRef.current) audioRef.current.close().catch(() => {});
    };
  }, [isFireAlert]);

  return (
    <AirQualityStatusView
      status={status}
      gasValue={gasValue}
      barPercentage={barPercentage}
      loading={loading}
      isFireAlert={isFireAlert}
    />
  );
}

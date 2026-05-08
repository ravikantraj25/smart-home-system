import { useMemo } from 'react';
import WaterLevelIndicatorView from './WaterLevelIndicatorView';

export default function WaterLevelIndicator({ waterLevel, loading }) {
  const maxHeight = 10;

  // waterLevel from backend is already a percentage (0-100)
  const percentage = useMemo(
    () => Math.max(0, Math.min(Math.round(waterLevel), 100)),
    [waterLevel]
  );

  // Calculate actual water height from the bottom of the tank
  const waterHeightCm = ((percentage / 100) * maxHeight).toFixed(1);

  // Determine status based on percentage
  const getStatus = () => {
    // In Arduino, TANK_FULL_CM is 3cm from the top, which is 7cm from bottom (70%)
    if (percentage >= 70) {
      return {
        label: 'Full',
        color: '#00ff88',
        bgColor: 'rgba(0,255,136,0.1)',
      };
    }
    if (percentage > 25) {
      return {
        label: 'Medium',
        color: '#fbbf24',
        bgColor: 'rgba(251,191,36,0.1)',
      };
    }
    return { label: 'Low', color: '#ff4444', bgColor: 'rgba(255,68,68,0.1)' };
  };

  const status = getStatus();

  // Circular progress calculation
  const size = 150;
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <WaterLevelIndicatorView
      percentage={percentage}
      status={status}
      waterLevel={waterHeightCm}
      size={size}
      strokeWidth={strokeWidth}
      radius={radius}
      circumference={circumference}
      dashOffset={dashOffset}
      maxHeight={maxHeight}
      loading={loading}
    />
  );
}

import { useState, useEffect } from 'react';
import EnergyMonitorView from './EnergyMonitorView';

export default function EnergyMonitor({ current, loading }) {
  const [dataHistory, setDataHistory] = useState([]);
  const maxPoints = 20;

  // Build data history from current readings
  useEffect(() => {
    if (current !== undefined && current !== null) {
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setDataHistory((prev) =>
        [...prev, { time: timeStr, current: parseFloat(current) || 0 }].slice(
          -maxPoints
        )
      );
    }
  }, [current]);

  // Calculate statistics
  const avg = dataHistory.length
    ? (
        dataHistory.reduce((s, d) => s + d.current, 0) / dataHistory.length
      ).toFixed(2)
    : '0.00';

  const peak = dataHistory.length
    ? Math.max(...dataHistory.map((d) => d.current)).toFixed(2)
    : '0.00';

  const power = (parseFloat(current || 0) * 220).toFixed(0);

  return (
    <EnergyMonitorView
      current={current}
      dataHistory={dataHistory}
      avg={avg}
      peak={peak}
      power={power}
      loading={loading}
    />
  );
}

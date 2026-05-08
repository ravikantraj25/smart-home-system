import { useState, useEffect, useRef, useCallback } from 'react';
import LightControlView from './LightControlView';

export default function LightControl({ relay1, onToggle, loading }) {
  const isOn = relay1 === 'ON';
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scheduleOnTime, setScheduleOnTime] = useState('');
  const [scheduleOffTime, setScheduleOffTime] = useState('');
  const [scheduleActive, setScheduleActive] = useState(false);
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  // Start auto-off timer
  const startTimer = useCallback(
    (minutes) => {
      if (minutes <= 0) return;
      if (timerRef.current) clearInterval(timerRef.current);
      if (!isOn) onToggle('ON');
      let secs = minutes * 60;
      setCountdown(secs);
      timerRef.current = setInterval(() => {
        secs -= 1;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          onToggle('OFF');
          setTimerMinutes(0);
        }
      }, 1000);
    },
    [isOn, onToggle]
  );

  // Update clock and check scheduled time
  useEffect(() => {
    clockRef.current = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (scheduleActive) {
        const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Schedule ON
        if (scheduleOnTime && currentHHMM === scheduleOnTime && !isOn) {
          onToggle('ON');
        }
        // Schedule OFF
        if (scheduleOffTime && currentHHMM === scheduleOffTime && isOn) {
          onToggle('OFF');
        }
      }
    }, 1000);

    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scheduleActive, scheduleOnTime, scheduleOffTime, isOn, onToggle]);

  // Helper: format seconds to MM:SS
  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <LightControlView
      isOn={isOn}
      timerMinutes={timerMinutes}
      countdown={countdown}
      currentTime={currentTime}
      scheduleOnTime={scheduleOnTime}
      scheduleOffTime={scheduleOffTime}
      scheduleActive={scheduleActive}
      loading={loading}
      onToggle={onToggle}
      onStartTimer={startTimer}
      onSetTimerMinutes={setTimerMinutes}
      onSetScheduleOnTime={setScheduleOnTime}
      onSetScheduleOffTime={setScheduleOffTime}
      onSetScheduleActive={setScheduleActive}
      fmt={fmt}
    />
  );
}

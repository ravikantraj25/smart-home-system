import { useState, useEffect, useRef } from 'react';
import MotorControlView from './MotorControlView';

export default function MotorControl({
  relay2Mode,
  motor,
  onModeChange,
  onMotorToggle,
  loading,
}) {
  const isAuto = relay2Mode === 'AUTO';
  const isOn = motor === 'ON';

  const [scheduleOnTime, setScheduleOnTime] = useState('');
  const [scheduleOffTime, setScheduleOffTime] = useState('');
  const [scheduleActive, setScheduleActive] = useState(false);
  const clockRef = useRef(null);

  // Check scheduled time every second
  useEffect(() => {
    clockRef.current = setInterval(() => {
      if (!scheduleActive) return;
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Schedule ON
      if (scheduleOnTime && currentHHMM === scheduleOnTime && !isOn) {
        if (isAuto) onModeChange('MANUAL');
        onMotorToggle('ON');
      }
      // Schedule OFF
      if (scheduleOffTime && currentHHMM === scheduleOffTime && isOn) {
        onMotorToggle('OFF');
      }
    }, 1000);

    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, [scheduleActive, scheduleOnTime, scheduleOffTime, isOn, isAuto, onModeChange, onMotorToggle]);

  return (
    <MotorControlView
      isAuto={isAuto}
      isOn={isOn}
      loading={loading}
      onModeChange={onModeChange}
      onMotorToggle={onMotorToggle}
      scheduleOnTime={scheduleOnTime}
      scheduleOffTime={scheduleOffTime}
      scheduleActive={scheduleActive}
      onSetScheduleOnTime={setScheduleOnTime}
      onSetScheduleOffTime={setScheduleOffTime}
      onSetScheduleActive={setScheduleActive}
    />
  );
}

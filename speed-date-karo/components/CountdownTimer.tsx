'use client';

import { useEffect, useRef, useState } from 'react';

interface CountdownTimerProps {
  sessionStartedAt: Date | null;
  sessionDurationSeconds: number;
  onTimeUp?: () => void;
}

export default function CountdownTimer({ sessionStartedAt, sessionDurationSeconds, onTimeUp }: CountdownTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(sessionDurationSeconds);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const firedRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);

  useEffect(() => {
    if (!sessionStartedAt) return;

    setIsTimeUp(false);
    firedRef.current = false;

    const interval = setInterval(() => {
      const now = Date.now();
      const startTime = new Date(sessionStartedAt).getTime();
      const endTime = startTime + sessionDurationSeconds * 1000;
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

      setRemainingSeconds(remaining);

      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        setIsTimeUp(true);
        onTimeUpRef.current?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [sessionStartedAt, sessionDurationSeconds]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isLowTime = remainingSeconds < 60;

  return (
    <div className={`text-center p-6 rounded-lg border-2 font-bold text-4xl font-mono ${
      isLowTime
        ? 'bg-gradient-to-r from-red-900 to-red-800 border-red-500 text-red-300'
        : 'bg-gradient-to-r from-blue-900 to-blue-800 border-blue-500 text-blue-200'
    }`}>
      ⏱️ {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      {isTimeUp && <p className="text-sm mt-2 text-yellow-300">⏰ Zaman Bitti!</p>}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

interface CountdownTimerProps {
  sessionStartedAt: Date | null;
  sessionDurationSeconds: number;
  onTimeUp?: () => void;
  paused?: boolean;
  pauseAccumulatedSeconds?: number;
}

export default function CountdownTimer({
  sessionStartedAt,
  sessionDurationSeconds,
  onTimeUp,
  paused = false,
  pauseAccumulatedSeconds = 0,
}: CountdownTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(sessionDurationSeconds);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const firedRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);

  // Use numeric timestamp so a new Date object with the same value doesn't restart the effect
  const startTimestamp = sessionStartedAt ? sessionStartedAt.getTime() : null;

  useEffect(() => {
    if (!startTimestamp) return;

    setIsTimeUp(false);
    firedRef.current = false;

    const interval = setInterval(() => {
      if (paused) return;

      const now = Date.now();
      const effectiveDuration = sessionDurationSeconds - pauseAccumulatedSeconds;
      const endTime = startTimestamp + effectiveDuration * 1000;
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

      setRemainingSeconds(remaining);

      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        setIsTimeUp(true);
        onTimeUpRef.current?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTimestamp, sessionDurationSeconds, paused, pauseAccumulatedSeconds]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isLowTime = remainingSeconds < 60 && !paused;

  return (
    <div className={`text-center p-6 rounded-lg border-2 font-bold text-4xl font-mono ${
      paused
        ? 'bg-gradient-to-r from-yellow-900 to-yellow-800 border-yellow-500 text-yellow-300'
        : isLowTime
          ? 'bg-gradient-to-r from-red-900 to-red-800 border-red-500 text-red-300'
          : 'bg-gradient-to-r from-blue-900 to-blue-800 border-blue-500 text-blue-200'
    }`}>
      {paused ? '⏸' : '⏱️'} {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      {paused && <p className="text-sm mt-2 text-yellow-200 font-semibold">Moderatör duraklattı</p>}
      {isTimeUp && !paused && <p className="text-sm mt-2 text-yellow-300">⏰ Zaman Bitti!</p>}
    </div>
  );
}

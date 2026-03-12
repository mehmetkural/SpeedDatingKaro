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
  const firedRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);

  const startTimestamp = sessionStartedAt ? sessionStartedAt.getTime() : null;

  useEffect(() => {
    if (!startTimestamp) return;
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
        onTimeUpRef.current?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTimestamp, sessionDurationSeconds, paused, pauseAccumulatedSeconds]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isTimeUp = remainingSeconds === 0 && !!startTimestamp;
  const isLowTime = remainingSeconds <= 30 && remainingSeconds > 0 && !paused;
  const progress = startTimestamp
    ? Math.max(0, remainingSeconds / (sessionDurationSeconds - pauseAccumulatedSeconds))
    : 1;

  return (
    <div className={`rounded-2xl border-2 p-5 text-center transition-colors ${
      paused
        ? 'bg-amber-50 border-amber-200'
        : isTimeUp
          ? 'bg-red-50 border-red-200'
          : isLowTime
            ? 'bg-orange-50 border-orange-200'
            : 'bg-blue-50 border-blue-200'
    }`}>
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-200 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            paused ? 'bg-amber-400' : isLowTime ? 'bg-orange-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className={`text-5xl font-bold font-mono tabular-nums ${
        paused ? 'text-amber-600' : isTimeUp ? 'text-red-600' : isLowTime ? 'text-orange-600' : 'text-blue-700'
      }`}>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>

      {paused && (
        <p className="text-sm mt-2 text-amber-600 font-semibold">⏸ Moderatör duraklattı</p>
      )}
      {isTimeUp && !paused && (
        <p className="text-sm mt-2 text-red-600 font-semibold">Süre doldu!</p>
      )}
      {!startTimestamp && (
        <p className="text-sm mt-2 text-slate-400">Her iki taraf hazır olunca başlar</p>
      )}
    </div>
  );
}

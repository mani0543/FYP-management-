import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

export default function CountdownTimer({ targetDate, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) return;

    const calculateTime = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onExpire) onExpire();
        return;
      }

      setIsExpired(false);
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-sm">
        <Clock className="w-4 h-4 text-gray-400" />
        <span>No active deadline configured</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
        <AlertCircle className="w-4 h-4 text-rose-600" />
        <span>Registration Deadline Expired</span>
      </div>
    );
  }

  if (!timeLeft) return null;

  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 shadow-xs">
      <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
      <div>
        <div className="text-xs uppercase tracking-wider text-blue-600 font-semibold">
          Registration Closes In
        </div>
        <div className="text-sm font-bold font-mono text-blue-950">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}h{' '}
          {String(timeLeft.minutes).padStart(2, '0')}m{' '}
          {String(timeLeft.seconds).padStart(2, '0')}s
        </div>
      </div>
    </div>
  );
}

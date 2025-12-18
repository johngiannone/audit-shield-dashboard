import { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const HolidayCountdown = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      // IRS typically opens e-filing in late January - using January 27, 2026
      const irsOpenDate = new Date(2026, 0, 27, 0, 0, 0); // January 27, 2026
      const now = new Date();
      
      if (now >= irsOpenDate) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      const totalSeconds = Math.floor((irsOpenDate.getTime() - now.getTime()) / 1000);
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      return { days, hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white rounded px-2 py-1 min-w-[36px] shadow-md">
        <span className="font-display text-sm md:text-base font-bold tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide font-medium">
        {label}
      </span>
    </div>
  );

  return (
    <div className="bg-card/90 backdrop-blur-sm rounded-lg border border-border px-3 py-2 shadow-md">
      <div className="flex items-center gap-2">
        <span className="text-sm hidden sm:inline">📋</span>
        <p className="text-xs font-medium text-foreground whitespace-nowrap hidden md:block">
          IRS E-Filing Opens:
        </p>
        <div className="flex items-center gap-1">
          <TimeUnit value={timeLeft.days} label="D" />
          <span className="text-sm font-bold text-blue-600">:</span>
          <TimeUnit value={timeLeft.hours} label="H" />
          <span className="text-sm font-bold text-blue-600">:</span>
          <TimeUnit value={timeLeft.minutes} label="M" />
          <span className="text-sm font-bold text-blue-600">:</span>
          <TimeUnit value={timeLeft.seconds} label="S" />
        </div>
      </div>
    </div>
  );
};

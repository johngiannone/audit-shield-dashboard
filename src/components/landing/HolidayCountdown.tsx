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
      <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white rounded-lg px-3 py-2 min-w-[60px] shadow-lg border border-blue-500/50">
        <span className="font-display text-2xl md:text-3xl font-bold tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wide font-medium">
        {label}
      </span>
    </div>
  );

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-4 shadow-lg">
      <div className="flex items-center justify-center gap-1 mb-3">
        <span className="text-lg">📋</span>
        <p className="text-sm font-medium text-foreground">
          IRS E-Filing Opens In
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 md:gap-3">
        <TimeUnit value={timeLeft.days} label="Days" />
        <span className="text-2xl font-bold text-blue-600 mt-[-20px]">:</span>
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <span className="text-2xl font-bold text-blue-600 mt-[-20px]">:</span>
        <TimeUnit value={timeLeft.minutes} label="Mins" />
        <span className="text-2xl font-bold text-blue-600 mt-[-20px]">:</span>
        <TimeUnit value={timeLeft.seconds} label="Secs" />
      </div>
      <p className="text-xs text-center text-muted-foreground mt-3">
        🛡️ Get protected before tax season begins!
      </p>
    </div>
  );
};

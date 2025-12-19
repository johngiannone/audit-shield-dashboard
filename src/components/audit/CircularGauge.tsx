import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface CircularGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function CircularGauge({ 
  value, 
  size = 100, 
  strokeWidth = 8,
  label,
  className 
}: CircularGaugeProps) {
  const { color, bgColor } = useMemo(() => {
    if (value <= 30) {
      return { 
        color: 'hsl(142 76% 36%)', // green
        bgColor: 'hsl(142 76% 36% / 0.15)'
      };
    }
    if (value <= 60) {
      return { 
        color: 'hsl(45 93% 47%)', // amber
        bgColor: 'hsl(45 93% 47% / 0.15)'
      };
    }
    return { 
      color: 'hsl(0 84% 60%)', // red
      bgColor: 'hsl(0 84% 60% / 0.15)'
    };
  }, [value]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - value) / 100) * circumference;
  const center = size / 2;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="text-2xl font-bold tabular-nums"
          style={{ color }}
        >
          {value}%
        </span>
        {label && (
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

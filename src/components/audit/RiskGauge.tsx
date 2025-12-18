import { useMemo } from 'react';

interface RiskGaugeProps {
  score: number;
  size?: number;
}

export function RiskGauge({ score, size = 200 }: RiskGaugeProps) {
  const { color, label, gradientId } = useMemo(() => {
    const id = `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`;
    if (score <= 30) {
      return { color: 'hsl(142, 76%, 36%)', label: 'Low Risk', gradientId: id };
    }
    if (score <= 70) {
      return { color: 'hsl(45, 93%, 47%)', label: 'Moderate Risk', gradientId: id };
    }
    return { color: 'hsl(0, 84%, 60%)', label: 'High Risk', gradientId: id };
  }, [score]);

  // SVG calculations for semi-circle
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const progress = (score / 100) * circumference;
  const centerX = size / 2;
  const centerY = size / 2;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <svg
          width={size}
          height={size / 2 + strokeWidth}
          viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${centerY}`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(142, 76%, 36%)" />
              <stop offset="50%" stopColor="hsl(45, 93%, 47%)" />
              <stop offset="100%" stopColor="hsl(0, 84%, 60%)" />
            </linearGradient>
          </defs>

          {/* Progress arc */}
          <path
            d={`M ${strokeWidth / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${centerY}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />

          {/* Tick marks */}
          {[0, 30, 70, 100].map((tick) => {
            const angle = Math.PI - (tick / 100) * Math.PI;
            const innerRadius = radius - strokeWidth / 2 - 5;
            const outerRadius = radius - strokeWidth / 2 - 15;
            const x1 = centerX + innerRadius * Math.cos(angle);
            const y1 = centerY - innerRadius * Math.sin(angle);
            const x2 = centerX + outerRadius * Math.cos(angle);
            const y2 = centerY - outerRadius * Math.sin(angle);
            
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                opacity={0.5}
              />
            );
          })}
        </svg>

        {/* Score display in center */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-end pb-2"
          style={{ height: size / 2 + 20 }}
        >
          <span className="text-5xl font-bold font-display" style={{ color }}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground">out of 100</span>
        </div>
      </div>

      {/* Risk level label */}
      <div 
        className="mt-2 px-4 py-1.5 rounded-full font-semibold text-white text-sm"
        style={{ backgroundColor: color }}
      >
        {label}
      </div>

      {/* Scale labels */}
      <div className="w-full flex justify-between text-xs text-muted-foreground mt-4 px-2" style={{ maxWidth: size }}>
        <span>0</span>
        <span className="text-green-600">Low</span>
        <span className="text-yellow-600">Moderate</span>
        <span className="text-destructive">High</span>
        <span>100</span>
      </div>
    </div>
  );
}

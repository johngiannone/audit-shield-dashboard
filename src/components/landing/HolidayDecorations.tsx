import { useEffect, useState } from 'react';

// Snowflake component that falls down the screen
const Snowflake = ({ delay, left, size, duration }: { delay: number; left: number; size: number; duration: number }) => (
  <div
    className="snowflake absolute top-0 text-white/60 pointer-events-none select-none"
    style={{
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      fontSize: `${size}px`,
    }}
  >
    ❄
  </div>
);

export const Snowfall = () => {
  const [snowflakes, setSnowflakes] = useState<Array<{ id: number; delay: number; left: number; size: number; duration: number }>>([]);

  useEffect(() => {
    const flakes = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      delay: Math.random() * 10,
      left: Math.random() * 100,
      size: Math.random() * 10 + 8,
      duration: Math.random() * 5 + 8,
    }));
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {snowflakes.map((flake) => (
        <Snowflake key={flake.id} {...flake} />
      ))}
    </div>
  );
};

// String lights decoration for header
export const StringLights = () => {
  const lights = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: i % 4 === 0 ? 'bg-red-500' : i % 4 === 1 ? 'bg-green-500' : i % 4 === 2 ? 'bg-amber-400' : 'bg-blue-400',
    delay: i * 0.1,
  }));

  return (
    <div className="absolute top-0 left-0 right-0 h-8 overflow-hidden pointer-events-none">
      {/* Wire */}
      <div className="absolute top-3 left-0 right-0 h-0.5 bg-green-900" 
           style={{ 
             clipPath: 'polygon(0 50%, 5% 30%, 10% 50%, 15% 70%, 20% 50%, 25% 30%, 30% 50%, 35% 70%, 40% 50%, 45% 30%, 50% 50%, 55% 70%, 60% 50%, 65% 30%, 70% 50%, 75% 70%, 80% 50%, 85% 30%, 90% 50%, 95% 70%, 100% 50%)'
           }} 
      />
      {/* Bulbs */}
      <div className="flex justify-between px-4">
        {lights.map((light) => (
          <div
            key={light.id}
            className={`w-2.5 h-3.5 rounded-full ${light.color} string-light-bulb shadow-lg`}
            style={{ 
              animationDelay: `${light.delay}s`,
              marginTop: light.id % 2 === 0 ? '8px' : '14px',
              boxShadow: `0 0 8px 2px currentColor`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Holiday badge component
export const HolidayBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-green-600 text-white px-4 py-1.5 rounded-full text-sm font-medium mb-6 shadow-lg animate-pulse-slow">
    <span className="text-lg">🎄</span>
    {children}
    <span className="text-lg">🎁</span>
  </div>
);

// Festive ribbon for cards
export const FestiveRibbon = ({ text }: { text: string }) => (
  <div className="absolute -top-2 -right-2 z-10">
    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transform rotate-12 flex items-center gap-1">
      <span>🎅</span>
      {text}
    </div>
  </div>
);

// Snowflake decorations around elements
export const SnowflakeDecor = ({ className = '' }: { className?: string }) => (
  <div className={`absolute pointer-events-none select-none ${className}`}>
    <span className="text-blue-200/40 text-2xl animate-twinkle">❄</span>
  </div>
);

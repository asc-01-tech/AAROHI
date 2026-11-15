// components/StreakBar.tsx
// Displays streak count, best streak, and a plant growth emoji based on plantLevel.
import React from 'react';

interface StreakBarProps {
  streak: number;
  bestStreak: number;
  plantLevel: number; // 0–5
}

const PLANT_EMOJIS = ['🌱', '🌿', '🌳', '🌲', '🌲', '🌴'];

const StreakBar = React.memo(function StreakBar({ streak, bestStreak, plantLevel }: StreakBarProps) {
  const plant = PLANT_EMOJIS[Math.min(plantLevel, 5)];

  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl px-4 py-3 shadow-sm">
      {/* Plant */}
      <span className="text-3xl" aria-label="plant growth indicator" role="img">
        {plant}
      </span>

      {/* Streak count */}
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xl" aria-hidden="true">🔥</span>
          <span className="text-2xl font-bold text-amber-500">{streak}</span>
          <span className="text-sm font-medium text-gray-600 ml-0.5">
            day{streak !== 1 ? 's' : ''} streak
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Best: <span className="font-semibold text-gray-500">{bestStreak}</span> days
        </p>
      </div>

      {/* Weekly badge */}
      {streak >= 7 && (
        <div className="flex flex-col items-center">
          <span className="text-2xl" role="img" aria-label="weekly streak badge">⭐</span>
          <span className="text-[10px] text-amber-600 font-semibold">Weekly!</span>
        </div>
      )}
    </div>
  );
});

export default StreakBar;

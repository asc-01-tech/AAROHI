// components/AdherenceRing.tsx
// SVG ring chart showing medication adherence for today.
// No animation (CLS=0). Uses strokeDasharray/strokeDashoffset.
import React from 'react';

interface AdherenceRingProps {
  taken: number;
  total: number;
  size?: number;
}

const AdherenceRing = React.memo(function AdherenceRing({
  taken,
  total,
  size = 120,
}: AdherenceRingProps) {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(1, taken / total) : 0;
  const offset = circumference * (1 - pct);
  const pctLabel = total > 0 ? Math.round(pct * 100) : 0;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`${pctLabel}% doses taken today`}
      role="img"
    >
      {/* Background ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#f3f4f6" /* gray-100 */
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Foreground ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#f59e0b" /* amber-500 */
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Center text: percentage */}
      <text
        x={cx}
        y={cy - size * 0.06}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.22}
        fontWeight="700"
        fill="#1f2937" /* gray-800 */
        fontFamily="inherit"
      >
        {pctLabel}%
      </text>
      {/* Center sub-label: "today" */}
      <text
        x={cx}
        y={cy + size * 0.17}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.13}
        fill="#6b7280" /* gray-500 */
        fontFamily="inherit"
      >
        today
      </text>
    </svg>
  );
});

export default AdherenceRing;

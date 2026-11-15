// app/elder/loading.tsx
// Time-of-day themed loading state that matches the page background exactly → CLS = 0.
// Runs server-side during streaming; uses the same timeTheme() logic as the page.

import { DoseListSkeleton } from '@/components/Skeletons';
import { timeTheme } from '@/lib/i18n';

export default function ElderLoading() {
  // Server-side hour in IST (UTC+5:30)
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const hour = nowIST.getUTCHours();
  const theme = timeTheme(hour);

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${theme.bg} flex flex-col`}
      aria-busy="true"
      aria-label="Loading your medication schedule…"
    >
      {/* Top strip skeleton */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div className="animate-pulse h-9 w-32 rounded-2xl bg-white/40" />
        <div className="animate-pulse h-9 w-20 rounded-2xl bg-white/40" />
      </div>

      {/* Greeting skeleton */}
      <div className="flex flex-col items-center py-6 gap-3">
        <div className="animate-pulse w-20 h-20 rounded-full bg-white/40" />
        <div className="animate-pulse h-8 w-56 rounded-2xl bg-white/40" />
      </div>

      {/* Dose list skeleton */}
      <div className="flex-1 px-4">
        <DoseListSkeleton />
      </div>

      {/* Bottom bar skeleton */}
      <div className="flex gap-3 px-4 pb-8 pt-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse flex-1 h-20 rounded-3xl bg-white/40"
          />
        ))}
      </div>
    </div>
  );
}

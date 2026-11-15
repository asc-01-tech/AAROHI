// components/Skeletons/DashboardSkeleton.tsx
// Skeleton for the caretaker dashboard — adherence ring + dose list.
'use client';

export function AdherenceRingSkeleton() {
  return (
    <div className="animate-pulse flex justify-center py-6" aria-hidden="true">
      <div className="w-36 h-36 rounded-full bg-gray-200 border-8 border-gray-100" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="px-4 pt-2 space-y-4" aria-hidden="true">
      <AdherenceRingSkeleton />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse flex gap-3 items-center bg-white rounded-2xl p-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
          <div className="w-16 h-7 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}


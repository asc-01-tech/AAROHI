// components/Skeletons/DoseCardSkeleton.tsx
// Skeleton that matches the DoseCard layout exactly to avoid CLS.
// Used in loading.tsx and <Suspense> fallbacks on the elder home.
'use client';

export function DoseCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-3xl bg-white/60 p-5 shadow-md mb-4"
      aria-hidden="true"
      style={{ minHeight: 160 }}
    >
      {/* Capsule outline placeholder */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-8 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-6 w-32 rounded bg-gray-200 mb-2" />
          <div className="h-4 w-20 rounded bg-gray-200" />
        </div>
        <div className="w-16 h-14 rounded-2xl bg-gray-200" />
      </div>
      <div className="h-4 w-48 rounded bg-gray-200" />
    </div>
  );
}

export function DoseListSkeleton() {
  return (
    <div className="px-4 pt-2">
      <DoseCardSkeleton />
      <DoseCardSkeleton />
      <DoseCardSkeleton />
    </div>
  );
}


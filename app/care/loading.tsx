// app/care/loading.tsx
import { DashboardSkeleton } from '@/components/Skeletons';

export default function CareLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav skeleton */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <div className="animate-pulse w-8 h-8 rounded-full bg-gray-200" />
        <div className="animate-pulse w-32 h-6 rounded bg-gray-200" />
        <div className="ml-auto animate-pulse w-24 h-8 rounded-full bg-gray-200" />
      </div>
      <DashboardSkeleton />
    </div>
  );
}


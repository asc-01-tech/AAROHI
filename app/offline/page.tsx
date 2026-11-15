// app/offline/page.tsx
// Shown by the service worker when offline and no cached page exists.
'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl mb-6">📵</div>
      <h1 className="text-3xl font-bold text-amber-800 mb-3">You are offline</h1>
      <p className="text-xl text-amber-700 mb-6">
        Don't worry! Aarohi works offline for previously visited pages.
      </p>
      <p className="text-gray-500 mb-8">Check your connection and try again.</p>
      <button
        onClick={() => window.location.reload()}
        className="bg-amber-500 text-white font-bold text-xl rounded-3xl px-8 py-4 shadow-lg"
      >
        Try Again 🔄
      </button>
    </div>
  );
}


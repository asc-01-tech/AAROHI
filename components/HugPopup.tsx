// components/HugPopup.tsx
// Animated hug notification popup from family member to the elder.

'use client';

import React from 'react';
import { m } from 'framer-motion';
import { X } from 'lucide-react';
import type { HugEvent } from '@/components/ElderDataProvider';

interface Props {
  hug: HugEvent;
  familyId: string;
  memberId: string;
  onClose: () => void;
}

export default function HugPopup({ hug, onClose }: Props) {
  const handleDismiss = () => {
    // Fire-and-forget mark seen
    fetch(`/api/hugs/${hug.hugId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seen: true }),
    }).catch(console.warn);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm select-none">
      <m.div
        initial={{ scale: 0.6, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.7, opacity: 0 }}
        transition={{ type: 'spring', damping: 18 }}
        className="relative w-full max-w-sm bg-gradient-to-br from-rose-50 via-white to-pink-50 rounded-3xl p-7 text-center shadow-2xl border-4 border-rose-300"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 hover:bg-rose-200 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <m.div
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-7xl mb-4 select-none"
        >
          {hug.emoji || '❤️'}
        </m.div>

        <h3 className="text-2xl font-black text-gray-900 mb-2">
          {hug.fromName} sent you a hug!
        </h3>

        {hug.message && (
          <p className="text-lg text-gray-700 bg-white/80 border border-rose-200 rounded-2xl p-4 font-semibold italic mt-3 mb-4">
            "{hug.message}"
          </p>
        )}

        <button
          onClick={handleDismiss}
          className="w-full mt-4 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-black text-xl rounded-2xl py-4 shadow-lg transition"
        >
          Send Love Back ❤️
        </button>
      </m.div>
    </div>
  );
}

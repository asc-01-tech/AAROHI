// components/PraisePopup.tsx
// Full-screen celebration popup after the elder splits a capsule.
// Displays rotating praise with personal nickname and speaks it aloud.

'use client';

import React, { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { randomPraise } from '@/lib/messages';
import { speak } from '@/lib/feedback';

interface Props {
  nickname: string;
  nicknameSpoken: string;
  language: Locale;
  onClose: () => void;
}

export default function PraisePopup({
  nickname,
  nicknameSpoken,
  language,
  onClose,
}: Props) {
  const [praiseText, setPraiseText] = useState('');

  useEffect(() => {
    const praise = randomPraise(nickname, language);
    const spoken = randomPraise(nicknameSpoken, language);
    setPraiseText(praise);

    // Speak celebration praise aloud in elder's chosen language
    speak(spoken, language);

    // Auto close after 3.2 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 3200);

    return () => clearTimeout(timer);
  }, [nickname, nicknameSpoken, language, onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm cursor-pointer select-none"
    >
      <m.div
        initial={{ scale: 0.5, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 300 }}
        className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl border-4 border-amber-300 flex flex-col items-center"
      >
        <m.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', damping: 12 }}
          className="w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-6 shadow-lg"
        >
          <Check size={56} strokeWidth={3.5} />
        </m.div>

        <h2 className="text-3xl font-black text-gray-900 mb-3 leading-snug">
          {praiseText || `Great job, ${nickname}!`}
        </h2>

        <p className="text-gray-500 font-semibold text-lg mt-1">
          Your streak continues! 🔥
        </p>

        <span className="mt-6 text-sm font-bold text-amber-700 bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
          Tap anywhere to continue
        </span>
      </m.div>
    </div>
  );
}

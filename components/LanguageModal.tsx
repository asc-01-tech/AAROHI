'use client';
// components/LanguageModal.tsx
// Language selection dialog for elders and family members.
// Supports English, Marathi (मराठी), and Hindi (हिंदी).
// Stores choice per-user and provides immediate spoken feedback.

import React from 'react';
import { Globe, Check, X } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { speak } from '@/lib/feedback';

interface Props {
  open: boolean;
  onClose: () => void;
  currentLocale: Locale;
  onSelectLocale: (locale: Locale) => void;
}

const LANGUAGE_OPTIONS: { code: Locale; label: string; subLabel: string; speechGreeting: string }[] = [
  {
    code: 'mr-IN',
    label: 'मराठी',
    subLabel: 'Marathi',
    speechGreeting: 'भाषा मराठी निवडली आहे',
  },
  {
    code: 'hi-IN',
    label: 'हिंदी',
    subLabel: 'Hindi',
    speechGreeting: 'भाषा हिंदी चुनी गई है',
  },
  {
    code: 'en-IN',
    label: 'English',
    subLabel: 'English (India)',
    speechGreeting: 'Language set to English',
  },
];

export default function LanguageModal({
  open,
  onClose,
  currentLocale,
  onSelectLocale,
}: Props) {
  if (!open) return null;

  function handleSelect(code: Locale, speechGreeting: string) {
    onSelectLocale(code);
    speak(speechGreeting, code);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl border border-amber-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
            <Globe className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black text-gray-900">
            {currentLocale === 'mr-IN'
              ? 'भाषा निवडा'
              : currentLocale === 'hi-IN'
              ? 'भाषा चुनें'
              : 'Choose Language'}
          </h2>
          <p className="text-xs text-gray-500">
            {currentLocale === 'mr-IN'
              ? 'अॅप आणि व्हॉइस असिस्टंटची भाषा बदला'
              : currentLocale === 'hi-IN'
              ? 'ऐप और वॉइस असिस्टेंट की भाषा बदलें'
              : 'Select your preferred app and voice language'}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2.5 pt-2">
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = currentLocale === opt.code;
            return (
              <button
                key={opt.code}
                onClick={() => handleSelect(opt.code, opt.speechGreeting)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition active:scale-98 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50 shadow-sm'
                    : 'border-gray-200 hover:border-amber-200 bg-white'
                }`}
              >
                <div className="text-left">
                  <p className="text-lg font-bold text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 font-medium">{opt.subLabel}</p>
                </div>
                {isSelected ? (
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full border border-gray-300" />
                )}
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-sm transition"
          >
            {currentLocale === 'mr-IN'
              ? 'रद्द करा'
              : currentLocale === 'hi-IN'
              ? 'रद्द करें'
              : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

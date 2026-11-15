// components/DoseCard.tsx
// Memo component for each dose on the Elder Home.
// Features the signature "Split the capsule" / "Crack the tablet" physical drag interaction.
// Optimistic take-dose execution with haptics, Web Audio sounds, confetti and praise.

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { m, useMotionValue, useTransform } from 'framer-motion';
import { Volume2, CheckCircle2, Clock } from 'lucide-react';
import type { DoseEvent } from '@/components/ElderDataProvider';
import type { Locale } from '@/lib/i18n';
import { playClickSound, playPopSound, vibrate, speak } from '@/lib/feedback';
import { launchConfetti } from '@/lib/celebrate';
import { ttsUpcoming } from '@/lib/messages';
import { getTranslations } from '@/lib/translations';

interface Props {
  dose: DoseEvent;
  elder: {
    nickname: string;
    nicknameSpoken: string;
    language: Locale;
  };
  isPrimary?: boolean;
  onComplete?: () => void;
}

function formatTime(scheduledAt: DoseEvent['scheduledAt']): string {
  try {
    const d = scheduledAt.toDate();
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Now';
  }
}

const DoseCard = React.memo(function DoseCard({
  dose,
  elder,
  isPrimary = false,
  onComplete,
}: Props) {
  const [isTaken, setIsTaken] = useState(dose.status === 'taken');
  const [isSplitting, setIsSplitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const dragTriggered = useRef(false);

  // Motion values for smooth drag without causing React re-renders
  const dragX = useMotionValue(0);
  const rotateRight = useTransform(dragX, [0, 120], [0, 25]);
  const rotateLeft = useTransform(dragX, [0, 120], [0, -12]);
  const opacityHint = useTransform(dragX, [0, 40], [1, 0]);

  const handleReadAloud = useCallback(() => {
    const timeStr = formatTime(dose.scheduledAt);
    const spoken = ttsUpcoming(
      elder.nicknameSpoken,
      dose.medName,
      dose.form,
      `Scheduled for ${timeStr}`,
      elder.language
    );
    speak(spoken, elder.language);
  }, [dose, elder]);

  const handleComplete = useCallback(async () => {
    if (dragTriggered.current || isTaken) return;
    dragTriggered.current = true;
    setIsSplitting(true);

    // 1. Audio & Haptics sequence
    playClickSound();
    vibrate(40);

    setTimeout(() => {
      playPopSound();
      vibrate([60, 40, 60, 40, 140]);
      launchConfetti();
      setIsTaken(true);
      setIsSplitting(false);
      onComplete?.();
    }, 120);

    // 2. Background optimistic API transaction
    try {
      const res = await fetch(`/api/doses/${dose.doseId}/take`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error('Transaction failed');
      }
    } catch (err) {
      console.warn('[Dose take sync failed]', err);
      // Gentle rollback notice if needed
      setFailed(true);
      setTimeout(() => setFailed(false), 4000);
    }
  }, [dose.doseId, isTaken, onComplete]);

  const handleDrag = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 30 && info.offset.x < 75) {
      vibrate(15);
    }
    // Threshold ~75px drag distance pulls the capsule apart
    if (info.offset.x >= 75 && !dragTriggered.current) {
      handleComplete();
    }
  };

  const timeLabel = formatTime(dose.scheduledAt);
  const isCapsule = dose.form === 'capsule';
  const t = getTranslations(elder.language);

  return (
    <div
      className={`rounded-3xl transition-all duration-300 select-none ${
        isPrimary
          ? 'bg-white shadow-xl border-4 border-amber-300 p-6'
          : 'bg-white/90 shadow-md border-2 border-amber-100 p-5'
      }`}
    >
      {/* Header: Time, Name, Read-Aloud */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 bg-amber-50 rounded-2xl px-3.5 py-1.5 border border-amber-200">
          <Clock size={18} className="text-amber-700" />
          <span className="font-bold text-amber-900 text-lg">{timeLabel}</span>
        </div>

        <button
          onClick={handleReadAloud}
          className="min-h-[48px] min-w-[48px] rounded-full bg-amber-100 hover:bg-amber-200 active:scale-95 flex items-center justify-center transition-transform"
          aria-label={`Read aloud instructions for ${dose.medName}`}
        >
          <Volume2 size={24} className="text-amber-800" />
        </button>
      </div>

      <div className="mb-4">
        <h3
          className={`font-black text-gray-900 leading-tight ${
            isPrimary ? 'text-3xl' : 'text-2xl'
          }`}
        >
          {dose.medName}
        </h3>
        <p className="text-gray-500 font-semibold text-base capitalize mt-0.5">
          {dose.form} • {t.oneDose}
        </p>
      </div>

      {/* Hero Capsule Split / Tablet Crack Gesture Area */}
      {isTaken ? (
        <div className="flex items-center justify-center gap-3 py-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
          <CheckCircle2 size={32} className="text-emerald-600" />
          <span className="text-2xl font-black text-emerald-800">{t.takenBadge}</span>
        </div>
      ) : (
        <div className="relative flex flex-col items-center justify-center pt-2 pb-3">
          <div className="flex items-center justify-center relative touch-none py-3">
            {isCapsule ? (
              // ─── Capsule: Red Left Half + White Right Half ───
              <div className="flex items-center">
                {/* Left Half (stationary or slightly springs back) */}
                <m.div
                  style={{ rotate: rotateLeft }}
                  className="w-16 h-14 bg-gradient-to-r from-red-600 to-red-500 rounded-l-full border-4 border-red-700 shadow-md flex items-center justify-end pr-2"
                >
                  <div className="w-1.5 h-6 bg-red-400 rounded-full opacity-60" />
                </m.div>

                {/* Right Half (draggable) */}
                <m.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 120 }}
                  dragElastic={0.2}
                  onDrag={handleDrag}
                  onDragEnd={(_, info) => {
                    if (info.offset.x >= 75) {
                      handleComplete();
                    }
                  }}
                  style={{ x: dragX, rotate: rotateRight }}
                  className="w-16 h-14 bg-gradient-to-r from-gray-100 to-white rounded-r-full border-4 border-gray-400 shadow-lg cursor-grab active:cursor-grabbing flex items-center pl-2 relative"
                >
                  <div className="w-1.5 h-6 bg-gray-300 rounded-full opacity-60" />
                </m.div>
              </div>
            ) : (
              // ─── Tablet: Round Circle that cracks into halves ───
              <div className="flex items-center">
                {/* Left Half */}
                <m.div
                  style={{ rotate: rotateLeft }}
                  className="w-14 h-14 bg-blue-500 rounded-l-full border-4 border-blue-600 shadow-md border-r-2"
                />
                {/* Right Half (draggable) */}
                <m.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 120 }}
                  dragElastic={0.2}
                  onDrag={handleDrag}
                  onDragEnd={(_, info) => {
                    if (info.offset.x >= 75) {
                      handleComplete();
                    }
                  }}
                  style={{ x: dragX, rotate: rotateRight }}
                  className="w-14 h-14 bg-blue-400 rounded-r-full border-4 border-blue-600 shadow-lg cursor-grab active:cursor-grabbing border-l-0"
                />
              </div>
            )}
          </div>

          {/* Pulsing Hint Arrow */}
          <m.div
            style={{ opacity: opacityHint }}
            className="flex items-center gap-1.5 mt-2 text-amber-700 font-bold text-sm tracking-wide"
          >
            <span>{t.pullToTake}</span>
            <span className="text-xl animate-pulse">👉</span>
          </m.div>

          {failed && (
            <p className="text-sm font-bold text-amber-600 mt-2">
              {t.letTryAgain}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

export default DoseCard;

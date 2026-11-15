// app/elder/ElderHomeClient.tsx
// 'use client' — main elder home screen.
// Time-of-day gradient, mascot greeting, dose list, hug popup, change requests, bottom nav.

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { Mic, Camera, CalendarDays, LogOut, Globe } from 'lucide-react';
import { timeTheme, timeGreeting, LOCALE_NAMES } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { speak } from '@/lib/feedback';
import { useElderData } from '@/components/ElderDataProvider';
import DoseCard from '@/components/DoseCard';
import HugPopup from '@/components/HugPopup';
import ChangeRequestCard from '@/components/ChangeRequestCard';
import PraisePopup from '@/components/PraisePopup';
import LogoutModal from '@/components/LogoutModal';
import LanguageModal from '@/components/LanguageModal';
import { getTranslations } from '@/lib/translations';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ElderProfile {
  name: string;
  nickname: string;
  nicknameSpoken: string;
  language: Locale;
  phone: string;
  email: string;
}

interface Streak {
  current: number;
  best: number;
  lastFullDay: string;
}

interface Props {
  elder: ElderProfile;
  streak: Streak;
  plantLevel: number;
  familyId: string;
  memberId: string;
}

// ─── Plant emoji map ────────────────────────────────────────────────────────

const PLANT_EMOJIS = ['🌱', '🌿', '🌿', '🌳', '🌳', '🌲'];

// ─── Mascot by time-of-day ──────────────────────────────────────────────────

function mascotEmoji(hour: number): string {
  if (hour < 12) return '☀️';
  if (hour < 17) return '⛅';
  return '🌙';
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ElderHomeClient({
  elder,
  streak,
  plantLevel,
  familyId,
  memberId,
}: Props) {
  const { doses, hugs, changeRequests } = useElderData();

  // ── Time-of-day state (updates on mount to avoid SSR mismatch) ──────────
  const [hour, setHour] = useState(12); // safe SSR default → afternoon
  const [mounted, setMounted] = useState(false);
  const greetingSpoken = useRef(false);

  // Track praise popup state
  const [praiseDose, setPraiseDose] = useState<{
    nickname: string;
    nicknameSpoken: string;
    language: Locale;
  } | null>(null);

  // Elder-safe logout modal state
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // User-scoped language preference (per-user / per-device override)
  const [currentLocale, setCurrentLocale] = useState<Locale>(elder.language);
  const [langModalOpen, setLangModalOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('carecircle_user_locale') as Locale | null;
      if (stored && (stored === 'mr-IN' || stored === 'hi-IN' || stored === 'en-IN')) {
        setCurrentLocale(stored);
      }
    } catch {}
  }, []);

  const handleSelectLocale = (newLocale: Locale) => {
    setCurrentLocale(newLocale);
    try {
      localStorage.setItem('carecircle_user_locale', newLocale);
    } catch {}
  };

  const t = getTranslations(currentLocale);

  // Track dismissed hug/change-request
  const [hugDismissed, setHugDismissed] = useState(false);
  const [crDismissed, setCrDismissed] = useState(false);

  // Reset dismissals when new items arrive
  const prevHugId = useRef<string | null>(null);
  const prevCrId = useRef<string | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setHour(h);
    setMounted(true);

    // Speak greeting once, respecting prefers-reduced-motion
    const prefersReduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!greetingSpoken.current && !prefersReduced) {
      greetingSpoken.current = true;
      const text = timeGreeting(h, currentLocale, elder.nicknameSpoken);
      speak(text, currentLocale);
    }
  }, [currentLocale, elder.nicknameSpoken]);

  // Reset hug dismissal on new hug
  useEffect(() => {
    if (hugs.length > 0 && hugs[0].hugId !== prevHugId.current) {
      prevHugId.current = hugs[0].hugId;
      setHugDismissed(false);
    }
  }, [hugs]);

  // Reset CR dismissal on new change request
  useEffect(() => {
    if (changeRequests.length > 0 && changeRequests[0].reqId !== prevCrId.current) {
      prevCrId.current = changeRequests[0].reqId;
      setCrDismissed(false);
    }
  }, [changeRequests]);

  const theme = timeTheme(hour);
  const greeting = mounted
    ? timeGreeting(hour, currentLocale, elder.nickname)
    : timeGreeting(12, currentLocale, elder.nickname);

  // ── Sort doses ────────────────────────────────────────────────────────
  const sortedDoses = [...doses].sort(
    (a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis(),
  );

  const pendingDoses = sortedDoses.filter((d) => d.status === 'pending');
  const missedDoses  = sortedDoses.filter((d) => d.status === 'missed');
  const takenDoses   = sortedDoses.filter((d) => d.status === 'taken');

  const nextPending   = pendingDoses[0] ?? null;
  const restPending   = pendingDoses.slice(1);

  // ── Dose complete callback ─────────────────────────────────────────────
  const handleDoseComplete = useCallback(() => {
    setPraiseDose({
      nickname:        elder.nickname,
      nicknameSpoken:  elder.nicknameSpoken,
      language:        currentLocale,
    });
  }, [elder.nickname, elder.nicknameSpoken, currentLocale]);

  // ── Missed dose read-aloud ────────────────────────────────────────────
  const speakMissed = useCallback(
    (medName: string) => {
      const text =
        currentLocale === 'hi-IN'
          ? `${elder.nicknameSpoken}, अभी भी ${medName} लेने का समय है 🙏`
          : currentLocale === 'mr-IN'
          ? `${elder.nicknameSpoken}, अजून ${medName} घेण्याची वेळ आहे 🙏`
          : `${elder.nicknameSpoken}, still time to take ${medName} 🙏`;
      speak(text, currentLocale);
    },
    [currentLocale, elder.nicknameSpoken],
  );

  // ── Weekly badge ──────────────────────────────────────────────────────
  const showWeeklyBadge = streak.current >= 7;

  // ── Active hug/CR ─────────────────────────────────────────────────────
  const activeHug = !hugDismissed && hugs.length > 0 ? hugs[0] : null;
  const activeCR  = !crDismissed && changeRequests.length > 0 ? changeRequests[0] : null;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${theme.bg} flex flex-col relative`}
    >
      {/* ── Top Strip ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        {/* Streak */}
        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-sm">
          <span className="text-2xl">🔥</span>
          <span className={`text-xl font-bold ${theme.accent}`}>
            {streak.current}
          </span>
          {showWeeklyBadge && (
            <span
              className="text-xl ml-1"
              title="7-day streak badge"
              aria-label="Weekly star badge"
            >
              ⭐
            </span>
          )}
        </div>

        {/* Right: Language Switcher + Plant + Safe Logout */}
        <div className="flex items-center gap-2">
          {/* User Language Switcher Button */}
          <button
            onClick={() => setLangModalOpen(true)}
            className="flex items-center gap-1.5 bg-white/70 backdrop-blur-sm rounded-2xl px-3 py-2 text-xs font-bold text-amber-900 border border-amber-200/80 shadow-sm hover:bg-white active:scale-95 transition"
            title="Change language / भाषा निवडा"
            aria-label="Change language"
          >
            <Globe className="w-3.5 h-3.5 text-amber-700" />
            <span>{LOCALE_NAMES[currentLocale] || 'Language'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-sm">
            <span className="text-xl" aria-label="Health plant">
              {PLANT_EMOJIS[Math.min(plantLevel, 5)]}
            </span>
            <span className={`text-xs font-bold ${theme.accent}`}>
              {t.level} {plantLevel}
            </span>
          </div>

          <button
            onClick={() => setLogoutModalOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-2xl bg-white/60 backdrop-blur-sm text-gray-600 hover:text-rose-600 hover:bg-white/90 transition shadow-sm"
            title="Lock & Sign Out (Passcode Required)"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Mascot & Greeting ──────────────────────────────────────────── */}
      <div className="flex flex-col items-center pt-4 pb-5 px-4">
        {mounted ? (
          <m.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="text-7xl mb-3 select-none"
            aria-hidden="true"
          >
            {mascotEmoji(hour)}
          </m.div>
        ) : (
          <div className="text-7xl mb-3 select-none" aria-hidden="true">
            {mascotEmoji(12)}
          </div>
        )}

        <p
          className={`text-center text-2xl font-bold ${theme.accent} leading-snug`}
        >
          {greeting}
        </p>
      </div>

      {/* ── Dose List ─────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pb-2 space-y-3">
        {/* Next pending dose — prominent */}
        {nextPending && (
          <DoseCard
            dose={nextPending}
            elder={{
              nickname:       elder.nickname,
              nicknameSpoken: elder.nicknameSpoken,
              language:       currentLocale,
            }}
            isPrimary
            onComplete={handleDoseComplete}
          />
        )}

        {/* Missed doses */}
        {missedDoses.map((dose) => (
          <div key={dose.doseId} className="space-y-1">
            <div className="rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
              <span className="text-orange-800 font-semibold text-base flex-1">
                {t.stillTimeTake(dose.medName)}
              </span>
              <button
                onClick={() => speakMissed(dose.medName)}
                aria-label={`Read aloud: take ${dose.medName}`}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 active:scale-95 transition-transform"
              >
                <Mic size={22} className="text-orange-600" />
              </button>
            </div>
            <DoseCard
              dose={dose}
              elder={{
                nickname:       elder.nickname,
                nicknameSpoken: elder.nicknameSpoken,
                language:       currentLocale,
              }}
              isPrimary={false}
              onComplete={handleDoseComplete}
            />
          </div>
        ))}

        {/* Rest of pending doses */}
        {restPending.map((dose) => (
          <DoseCard
            key={dose.doseId}
            dose={dose}
            elder={{
              nickname:       elder.nickname,
              nicknameSpoken: elder.nicknameSpoken,
              language:       currentLocale,
            }}
            isPrimary={false}
            onComplete={handleDoseComplete}
          />
        ))}

        {/* Taken doses (collapsed / muted) */}
        {takenDoses.length > 0 && (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-2 pl-1">
              {t.alreadyTakenToday}
            </p>
            {takenDoses.map((dose) => (
              <div
                key={dose.doseId}
                className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-2xl px-4 py-3 mb-2 shadow-xs"
              >
                <span className="text-2xl">
                  {dose.form === 'capsule'
                    ? '💊'
                    : dose.form === 'tablet'
                    ? '🔵'
                    : dose.form === 'syrup'
                    ? '🥄'
                    : '💉'}
                </span>
                <span className="font-bold text-gray-700">{dose.medName}</span>
                <span className="ml-auto text-emerald-700 font-bold text-sm bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  {t.takenBadge}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {doses.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <span className="text-6xl">🎉</span>
            <p className={`text-xl font-bold ${theme.accent}`}>
              {t.noMedsToday}
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom Navigation Bar ──────────────────────────────────────── */}
      <div className="flex gap-2 px-3 pb-8 pt-3">
        <Link
          href={`/elder/talk?lang=${currentLocale}`}
          prefetch
          className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[72px] rounded-3xl bg-white/85 backdrop-blur-sm shadow-md active:scale-95 transition-transform"
          aria-label="Talk to voice assistant"
        >
          <span className="text-2xl">🗣️</span>
          <span className="text-xs font-bold text-gray-800">{t.bottomTalk}</span>
        </Link>

        <Link
          href={`/elder/camera?lang=${currentLocale}`}
          prefetch
          className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[72px] rounded-3xl bg-white/85 backdrop-blur-sm shadow-md active:scale-95 transition-transform"
          aria-label="Open camera scanner"
        >
          <Camera size={24} className="text-gray-800" />
          <span className="text-xs font-bold text-gray-800">{t.bottomCamera}</span>
        </Link>

        <Link
          href={`/elder/appointments?lang=${currentLocale}`}
          prefetch
          className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[72px] rounded-3xl bg-white/85 backdrop-blur-sm shadow-md active:scale-95 transition-transform"
          aria-label="View appointments"
        >
          <CalendarDays size={24} className="text-gray-800" />
          <span className="text-xs font-bold text-gray-800">{t.bottomAppts}</span>
        </Link>

        <Link
          href={`/elder/records?lang=${currentLocale}`}
          prefetch
          className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[72px] rounded-3xl bg-white/85 backdrop-blur-sm shadow-md active:scale-95 transition-transform"
          aria-label="View health records and profile"
        >
          <span className="text-2xl">📋</span>
          <span className="text-xs font-bold text-gray-800">{t.bottomRecords}</span>
        </Link>
      </div>

      {/* ── Hug Popup ─────────────────────────────────────────────────── */}
      {activeHug && (
        <HugPopup
          hug={activeHug}
          familyId={familyId}
          memberId={memberId}
          onClose={() => setHugDismissed(true)}
        />
      )}

      {/* ── Change Request Card ───────────────────────────────────────── */}
      {activeCR && (
        <div className="fixed bottom-32 left-4 right-4 z-50">
          <ChangeRequestCard
            req={activeCR}
            familyId={familyId}
            onDecide={() => setCrDismissed(true)}
          />
        </div>
      )}

      {/* ── Praise Popup ──────────────────────────────────────────────── */}
      {praiseDose && (
        <PraisePopup
          nickname={praiseDose.nickname}
          nicknameSpoken={praiseDose.nicknameSpoken}
          language={praiseDose.language}
          onClose={() => setPraiseDose(null)}
        />
      )}

      {/* ── Elder-Proof Passcode Logout Modal ───────────────────────────── */}
      <LogoutModal
        open={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        familyId={familyId}
        title={t.logoutTitle}
        description={t.logoutDesc}
      />

      {/* ── User Language Selector Modal ──────────────────────────────── */}
      <LanguageModal
        open={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        currentLocale={currentLocale}
        onSelectLocale={handleSelectLocale}
      />
    </div>
  );
}

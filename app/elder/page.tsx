// app/elder/page.tsx
// Server component: fetches family document from Firestore admin SDK,
// extracts elder profile + streak + plantLevel and passes to the client shell.

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';
import ElderHomeClient from './ElderHomeClient';
import type { Locale } from '@/lib/i18n';

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
  lastFullDay: string; // ISO date string
}

export default async function ElderPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.role !== 'elder') redirect('/care');

  const { familyId, memberId } = session;
  const db = getAdminDb();

  const familyDoc = await db.collection('families').doc(familyId).get();
  if (!familyDoc.exists) {
    redirect('/login');
  }

  const data = familyDoc.data()!;

  // ── Elder profile ──────────────────────────────────────────────────────
  const elderRaw = data.elder ?? {};
  const elder: ElderProfile = {
    name:            elderRaw.name            ?? '',
    nickname:        elderRaw.nickname        ?? elderRaw.name ?? '',
    nicknameSpoken:  elderRaw.nicknameSpoken  ?? elderRaw.nickname ?? elderRaw.name ?? '',
    language:        (elderRaw.language       ?? 'en-IN') as Locale,
    phone:           elderRaw.phone           ?? '',
    email:           elderRaw.email           ?? '',
  };

  // ── Streak ─────────────────────────────────────────────────────────────
  const streakRaw = data.streak ?? {};
  const streak: Streak = {
    current:     streakRaw.current     ?? 0,
    best:        streakRaw.best        ?? 0,
    lastFullDay: streakRaw.lastFullDay ?? '',
  };

  // ── Plant level (0-5) ──────────────────────────────────────────────────
  const plantLevel: number = Math.min(5, Math.max(0, data.plantLevel ?? 0));

  return (
    <ElderHomeClient
      elder={elder}
      streak={streak}
      plantLevel={plantLevel}
      familyId={familyId}
      memberId={memberId}
    />
  );
}

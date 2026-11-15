// app/care/page.tsx
// Server component: reads session + family doc, passes data to CareHomeClient.
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';
import CareHomeClient from './CareHomeClient';
import type { Locale } from '@/lib/i18n';

export default async function CarePage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const db = getAdminDb();
  const familyDoc = await db.collection('families').doc(session.familyId).get();
  if (!familyDoc.exists) redirect('/login');

  const family = familyDoc.data()!;

  const elder = family.elder as {
    name: string;
    nickname: string;
    language: Locale;
    phone?: string;
  } | undefined;

  const streak = (family.streak as { current: number; best: number } | undefined) ?? { current: 0, best: 0 };
  const plantLevel = (family.plantLevel as number | undefined) ?? 0;
  const caretakerPhone = (family.caretakerPhone as string | undefined) ?? '';
  let username = (family.username as string | undefined) ?? '';
  if (!username) {
    const base = (elder?.nickname || elder?.name || 'care')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    username = `${base || 'family'}_circle`;
    db.collection('families').doc(session.familyId).update({ username }).catch(() => {});
  }

  return (
    <CareHomeClient
      familyId={session.familyId}
      initialUsername={username}
      memberId={session.memberId}
      role={session.role}
      elderName={elder?.name ?? 'Elder'}
      elderNickname={elder?.nickname ?? elder?.name ?? 'Elder'}
      locale={elder?.language ?? 'en-IN'}
      streak={streak.current}
      bestStreak={streak.best}
      plantLevel={plantLevel}
      caretakerPhone={caretakerPhone}
    />
  );
}

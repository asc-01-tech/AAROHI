// app/api/checkins/route.ts
// Symptom & daily mood recording
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { withTiming } from '@/lib/withTiming';

export const runtime = 'nodejs';

export const POST = withTiming('POST /api/checkins', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { date, mood, symptoms, note } = body;

  const db = getAdminDb();
  const checkinRef = db
    .collection('families')
    .doc(session.familyId)
    .collection('checkins')
    .doc(date || new Date().toISOString().split('T')[0]);

  await checkinRef.set(
    {
      date: date || new Date().toISOString().split('T')[0],
      mood: mood || 3,
      symptoms: symptoms || [],
      note: note || '',
      recordedBy: session.memberId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
});

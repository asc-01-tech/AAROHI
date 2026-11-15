// app/api/appointments/route.ts
// GET: list upcoming appointments; POST: create appointment.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getSession } from '@/lib/session';
import { withTiming } from '@/lib/withTiming';

const ApptSchema = z.object({
  doctorName: z.string().min(1).max(100),
  specialty:  z.string().max(80).optional().default(''),
  location:   z.string().max(200).optional().default(''),
  dateTime:   z.string().datetime(),
  notes:      z.string().max(500).optional().default(''),
});

export const GET = withTiming('appointments/GET', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db  = getAdminDb();
  const now = Timestamp.now();
  const snap = await db
    .collection('families').doc(session.familyId)
    .collection('appointments')
    .where('dateTime', '>=', now)
    .orderBy('dateTime', 'asc')
    .limit(20)
    .get();

  const appointments = snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    dateTime: (d.data().dateTime as Timestamp).toDate().toISOString(),
  }));
  return NextResponse.json({ appointments });
});

export const POST = withTiming('appointments/POST', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = ApptSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const db  = getAdminDb();
  const ref = db.collection('families').doc(session.familyId).collection('appointments').doc();
  await ref.set({
    ...parsed.data,
    dateTime:       Timestamp.fromDate(new Date(parsed.data.dateTime)),
    reminderSent24h: false,
    reminderSent2h:  false,
    createdAt:      FieldValue.serverTimestamp(),
    createdBy:      session.memberId,
  });
  return NextResponse.json({ id: ref.id }, { status: 201 });
});


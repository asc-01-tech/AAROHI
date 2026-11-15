// app/api/meds/route.ts
// GET: list family medications.
// POST: create new medication and batch generate 7-day dose events.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getSession } from '@/lib/session';
import { withTiming } from '@/lib/withTiming';
import { generateDoseEvents, MedicationInput } from '@/lib/schedule';

const MedicationSchema = z.object({
  name: z.string().min(1).max(100),
  strength: z.string().max(50).default(''),
  form: z.enum(['capsule', 'tablet', 'syrup', 'injection']).default('tablet'),
  purpose: z.string().max(200).default(''),
  instructions: z.string().max(300).default(''),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).min(1),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  criticality: z.enum(['low', 'normal', 'critical']).default('normal'),
  pillCount: z.number().int().min(0).default(30),
  refillThreshold: z.number().int().min(0).default(5),
  active: z.boolean().default(true),
});

export const GET = withTiming('meds/GET', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminDb();
  const snap = await db
    .collection('families')
    .doc(session.familyId)
    .collection('medications')
    .where('active', '==', true)
    .get();

  const medications = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json({ medications });
});

export const POST = withTiming('meds/POST', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = MedicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const db = getAdminDb();
  const familyRef = db.collection('families').doc(session.familyId);
  const medRef = familyRef.collection('medications').doc();
  const medId = medRef.id;

  const medData: MedicationInput = {
    ...data,
    id: medId,
    endDate: data.endDate || undefined,
  };

  // Generate 7 days of dose events
  const doseEvents = generateDoseEvents(session.familyId, medId, medData, 7);

  // Batched write (Firestore max 500 ops per batch)
  const batch = db.batch();
  batch.set(medRef, {
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: session.memberId,
  });

  for (const event of doseEvents) {
    const doseDocRef = familyRef.collection('doseEvents').doc(event.doseId);
    batch.set(doseDocRef, event.data, { merge: true });
  }

  // Log activity
  const logRef = familyRef.collection('activityLog').doc();
  batch.set(logRef, {
    actorId: session.memberId,
    actorName: session.role === 'caretaker' ? 'Caretaker' : 'Family',
    action: 'MED_ADDED',
    humanText: `Added medication: ${data.name} (${data.strength})`,
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return NextResponse.json({ ok: true, id: medId, eventsCreated: doseEvents.length }, { status: 201 });
});

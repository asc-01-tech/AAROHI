// app/api/meds/[id]/route.ts
// Single medication route: GET, PUT (update + regenerate dose events), DELETE (soft-delete).
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { generateDoseEvents, MedicationInput } from '@/lib/schedule';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { withTiming } from '@/lib/withTiming';

export const runtime = 'nodejs';

export const GET = withTiming('GET /api/meds/[id]', async (req: NextRequest, ctx: unknown) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = (ctx as { params: { id: string } }).params;
  const db = getAdminDb();
  const medDoc = await db.collection('families').doc(session.familyId).collection('medications').doc(id).get();

  if (!medDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ id: medDoc.id, ...medDoc.data() });
});

export const PUT = withTiming('PUT /api/meds/[id]', async (req: NextRequest, ctx: unknown) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = (ctx as { params: { id: string } }).params;
  const body = await req.json();
  const db = getAdminDb();
  const familyId = session.familyId;

  const medRef = db.collection('families').doc(familyId).collection('medications').doc(id);
  const existing = await medRef.get();
  if (!existing.exists) {
    return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
  }

  // Update medication doc
  await medRef.update({
    ...body,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.memberId,
  });

  // If schedule or times changed, regenerate future pending doses
  const now = Timestamp.now();
  const doseEventsRef = db.collection('families').doc(familyId).collection('doseEvents');
  const futurePending = await doseEventsRef
    .where('medId', '==', id)
    .where('status', '==', 'pending')
    .where('scheduledAt', '>', now)
    .get();

  const batch = db.batch();
  futurePending.docs.forEach((doc) => batch.delete(doc.ref));

  // Generate new 7-day dose events
  const newEvents = generateDoseEvents(familyId, id, body as MedicationInput, 7);
  newEvents.forEach((evt) => {
    const docRef = db.doc(evt.path);
    batch.set(docRef, evt.data, { merge: true });
  });

  await batch.commit();

  // Log activity
  await db.collection('families').doc(familyId).collection('activityLog').add({
    type: 'med_updated',
    description: `Updated schedule for ${body.name || 'medication'}`,
    actor: session.role,
    actorId: session.memberId,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withTiming('DELETE /api/meds/[id]', async (req: NextRequest, ctx: unknown) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role === 'elder') {
    return NextResponse.json({ error: 'Elder cannot directly delete medications' }, { status: 403 });
  }

  const { id } = (ctx as { params: { id: string } }).params;
  const db = getAdminDb();
  const familyId = session.familyId;

  const medRef = db.collection('families').doc(familyId).collection('medications').doc(id);
  await medRef.update({
    active: false,
    deletedAt: FieldValue.serverTimestamp(),
    deletedBy: session.memberId,
  });

  // Cancel future pending doses
  const now = Timestamp.now();
  const futurePending = await db
    .collection('families')
    .doc(familyId)
    .collection('doseEvents')
    .where('medId', '==', id)
    .where('status', '==', 'pending')
    .where('scheduledAt', '>', now)
    .get();

  const batch = db.batch();
  futurePending.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return NextResponse.json({ ok: true });
});

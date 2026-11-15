// app/api/change-requests/[id]/route.ts
// PATCH handler: Elder approves or rejects a medication change request.
// If approved, executes the medication change on Firestore.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getSession } from '@/lib/session';
import { withTiming } from '@/lib/withTiming';

const StatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withTiming('change-requests/[id]/PATCH', async (req: NextRequest, ctx: unknown) => {
  const { params } = ctx as RouteContext;
  const { id: reqId } = await params;

  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status } = parsed.data;
  const db = getAdminDb();
  const familyRef = db.collection('families').doc(session.familyId);
  const reqRef = familyRef.collection('changeRequests').doc(reqId);

  const reqDoc = await reqRef.get();
  if (!reqDoc.exists) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const reqData = reqDoc.data()!;
  await reqRef.update({
    status,
    decidedAt: FieldValue.serverTimestamp(),
    decidedBy: session.memberId,
  });

  // If approved and has payload med updates, apply them
  if (status === 'approved' && reqData.medId && reqData.payload) {
    const medRef = familyRef.collection('medications').doc(reqData.medId);
    await medRef.update({
      ...reqData.payload,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Log activity
  await familyRef.collection('activityLog').add({
    actorId: session.memberId,
    actorName: 'Elder',
    action: status === 'approved' ? 'CHANGE_APPROVED' : 'CHANGE_REJECTED',
    humanText: `Elder ${status} change for ${reqData.medName || 'medication'}`,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, status });
});

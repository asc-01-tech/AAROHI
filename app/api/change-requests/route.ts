// app/api/change-requests/route.ts
// POST: creates a change request (for elder approval)
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { withTiming } from '@/lib/withTiming';

export const runtime = 'nodejs';

export const POST = withTiming('POST /api/change-requests', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { medId, medName, type, payload, requestedBy } = body;

  if (!medId || !type || !payload) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = await db
    .collection('families')
    .doc(session.familyId)
    .collection('changeRequests')
    .add({
      medId,
      medName: medName || 'Medication',
      type, // 'edit' | 'delete'
      payload,
      requestedBy: requestedBy || session.role,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

  return NextResponse.json({ id: ref.id, ok: true });
});

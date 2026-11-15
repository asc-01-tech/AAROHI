// app/api/hugs/[id]/route.ts
// PATCH handler: marks a hug as seen by the elder.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getSession } from '@/lib/session';
import { withTiming } from '@/lib/withTiming';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withTiming('hugs/[id]/PATCH', async (req: NextRequest, ctx: unknown) => {
  const { params } = ctx as RouteContext;
  const { id: hugId } = await params;

  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  await db
    .collection('families')
    .doc(session.familyId)
    .collection('hugs')
    .doc(hugId)
    .update({ seen: true });

  return NextResponse.json({ ok: true });
});

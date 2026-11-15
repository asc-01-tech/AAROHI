// app/api/activity/route.ts
// Cursor-paginated activity audit log
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { withTiming } from '@/lib/withTiming';

export const runtime = 'nodejs';

export const GET = withTiming('GET /api/activity', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const cursor = searchParams.get('cursor');

  const db = getAdminDb();
  let query = db
    .collection('families')
    .doc(session.familyId)
    .collection('activityLog')
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (cursor) {
    const cursorDoc = await db
      .collection('families')
      .doc(session.familyId)
      .collection('activityLog')
      .doc(cursor)
      .get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
});

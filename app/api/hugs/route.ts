// app/api/hugs/route.ts
// POST: send a hug from a family/caretaker member to the elder.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getSession } from '@/lib/session';
import { withTiming } from '@/lib/withTiming';

const HugSchema = z.object({
  emoji:   z.string().max(10).default('❤️'),
  message: z.string().max(200).optional().default(''),
});

export const POST = withTiming('hugs/POST', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'elder') return NextResponse.json({ error: 'Elders cannot send hugs this way' }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = HugSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const db    = getAdminDb();
  const famRef = db.collection('families').doc(session.familyId);

  // Get sender name
  const memberSnap = await famRef.collection('members').doc(session.memberId).get();
  const fromName = memberSnap.data()?.name ?? 'Family';

  const hugRef = famRef.collection('hugs').doc();
  await hugRef.set({
    fromMemberId: session.memberId,
    fromName,
    emoji:   parsed.data.emoji,
    message: parsed.data.message,
    seen:    false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: hugRef.id }, { status: 201 });
});


// app/api/family/update-username/route.ts
// Allows caretaker or family members to customize their Instagram-style @username handle.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';

const Schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, underscores, dots, or hyphens'),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join('. ');
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const cleanUsername = parsed.data.username.toLowerCase().trim().replace(/^@/, '');
  const db = getAdminDb();
  const familyRef = db.collection('families').doc(session.familyId);

  // Check if username is already taken by another family
  const existingSnap = await db
    .collection('families')
    .where('username', '==', cleanUsername)
    .limit(2)
    .get();

  const isTakenByOther = existingSnap.docs.some((doc) => doc.id !== session.familyId);
  if (isTakenByOther) {
    return NextResponse.json(
      { error: `The username @${cleanUsername} is already taken. Please choose a different one.` },
      { status: 409 }
    );
  }

  // Update in Firestore
  await familyRef.update({
    username: cleanUsername,
  });

  return NextResponse.json({
    ok: true,
    username: cleanUsername,
  });
}

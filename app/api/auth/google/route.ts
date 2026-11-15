// app/api/auth/google/route.ts
// Handles Google Sign-In: verifies Firebase ID token and authenticates user.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { signSession, setSessionCookie } from '@/lib/session';
import { withTiming } from '@/lib/withTiming';

const Schema = z.object({
  idToken: z.string().min(10),
});

export const POST = withTiming('auth/google', async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid Firebase ID token is required' }, { status: 400 });
  }

  const { idToken } = parsed.data;

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const email = decodedToken.email?.toLowerCase();
    const name = decodedToken.name || 'Google User';

    if (!email) {
      return NextResponse.json({ error: 'Google account has no associated email address' }, { status: 400 });
    }

    const db = getAdminDb();
    // Search for family where caretakerEmail matches
    const snap = await db.collection('families').where('caretakerEmail', '==', email).limit(1).get();

    if (!snap.empty) {
      const familyDoc = snap.docs[0];
      const familyId = familyDoc.id;

      // Find member doc
      const membersSnap = await familyDoc.ref.collection('members').where('role', '==', 'caretaker').limit(1).get();
      const memberId = membersSnap.empty ? decodedToken.uid : membersSnap.docs[0].id;

      const firebaseToken = await adminAuth.createCustomToken(memberId, {
        familyId,
        memberId,
        role: 'caretaker',
      });

      const sessionToken = await signSession({
        familyId,
        memberId,
        role: 'caretaker',
      });

      const res = NextResponse.json({
        ok: true,
        hasWorkspace: true,
        familyId,
        role: 'caretaker',
        firebaseToken,
      });
      setSessionCookie(res, sessionToken);
      return res;
    }

    // Account verified, but needs to create or join a workspace
    return NextResponse.json({
      ok: true,
      hasWorkspace: false,
      email,
      name,
    });
  } catch (err: any) {
    console.error('[auth/google] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Google authentication failed' },
      { status: 500 }
    );
  }
});

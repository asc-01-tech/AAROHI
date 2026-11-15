// app/api/auth/otp/verify/route.ts
// Verifies OTP and logs into matching workspace, or returns verified status for setup.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, createCustomToken } from '@/lib/firebaseAdmin';
import { signSession, setSessionCookie } from '@/lib/session';

const Schema = z.object({
  identifier: z.string().min(3),
  otp: z.string().length(6),
  type: z.enum(['email', 'phone']).optional().default('email'),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid identifier and 6-digit OTP required' }, { status: 400 });
  }

  const { identifier, otp, type } = parsed.data;
  const normalized = identifier.trim().toLowerCase();
  const docId = `${type}_${normalized.replace(/[^a-zA-Z0-9]/g, '_')}`;

  try {
    const db = getAdminDb();
    const otpRef = db.collection('otps').doc(docId);
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      return NextResponse.json({ error: 'No OTP requested or code expired. Please request a new one.' }, { status: 400 });
    }

    const otpData = otpSnap.data()!;
    const expiresAt = otpData.expiresAt as Timestamp;
    if (expiresAt.toMillis() < Date.now()) {
      await otpRef.delete();
      return NextResponse.json({ error: 'OTP has expired. Please request a new code.' }, { status: 400 });
    }

    if (otpData.otp !== otp.trim()) {
      const attempts = (otpData.attempts || 0) + 1;
      if (attempts >= 4) {
        await otpRef.delete();
        return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 });
      }
      await otpRef.update({ attempts });
      return NextResponse.json({ error: 'Incorrect verification code. Please check and try again.' }, { status: 400 });
    }

    // OTP is valid! Delete the consumed OTP
    await otpRef.delete();

    // Check if a family exists with this email/phone
    let familyQuery = db.collection('families');
    let matchingFamilyDoc = null;
    let memberRole: 'caretaker' | 'family' | 'elder' = 'caretaker';
    let memberId = '';

    if (type === 'email') {
      const snap = await familyQuery.where('caretakerEmail', '==', normalized).limit(1).get();
      if (!snap.empty) {
        matchingFamilyDoc = snap.docs[0];
        memberRole = 'caretaker';
      }
    } else {
      const snap = await familyQuery.where('caretakerPhone', '==', normalized).limit(1).get();
      if (!snap.empty) {
        matchingFamilyDoc = snap.docs[0];
        memberRole = 'caretaker';
      }
    }

    if (matchingFamilyDoc) {
      const familyId = matchingFamilyDoc.id;
      // Find member id
      const membersSnap = await matchingFamilyDoc.ref.collection('members').where('role', '==', memberRole).limit(1).get();
      memberId = membersSnap.empty ? 'caretaker-root' : membersSnap.docs[0].id;

      // Mint Firebase custom token & session
      const firebaseToken = createCustomToken(memberId, {
        familyId,
        memberId,
        role: memberRole,
      });

      const sessionToken = await signSession({
        familyId,
        memberId,
        role: memberRole,
      });

      const res = NextResponse.json({
        ok: true,
        verified: true,
        hasWorkspace: true,
        familyId,
        role: memberRole,
        firebaseToken,
      });
      setSessionCookie(res, sessionToken);
      return res;
    }

    // If verified but no workspace found yet
    return NextResponse.json({
      ok: true,
      verified: true,
      hasWorkspace: false,
      identifier: normalized,
      type,
    });
  } catch (err: any) {
    console.error('[auth/otp/verify] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error verifying code' },
      { status: 500 }
    );
  }
}

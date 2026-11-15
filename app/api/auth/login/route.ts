// app/api/auth/login/route.ts
// Verifies a 6-digit passcode and mints session + Firebase custom token.
// Rate-limited (max 5 attempts per 15 min) via a Firestore counter.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrypt, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { signSession, setSessionCookie } from '@/lib/session';
import { withTiming } from '@/lib/withTiming';

const scryptAsync = promisify(scrypt);

const MAX_ATTEMPTS   = 5;
const LOCKOUT_MS     = 15 * 60 * 1000; // 15 minutes

const LoginSchema = z.object({
  familyId: z.string().min(1),
  passcode: z.string().length(6).regex(/^\d{6}$/),
  role:     z.enum(['elder', 'caretaker', 'family']),
});

async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  if (!hash) return false;

  // Check if hash is seeded sha256
  if (!hash.includes(':')) {
    const sha = createHash('sha256').update('carecircle:' + passcode).digest('hex');
    return sha === hash;
  }

  const [salt, stored] = hash.split(':');
  if (!salt || !stored) return false;

  try {
    const derived = (await scryptAsync(passcode, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(stored, 'hex');
    if (derived.length !== storedBuf.length) return false;
    return timingSafeEqual(derived, storedBuf);
  } catch {
    return false;
  }
}

export const POST = withTiming('auth/login', async (req: NextRequest) => {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { familyId, passcode, role } = parsed.data;

  const db        = getAdminDb();
  const adminAuth = getAdminAuth();
  const familyRef = db.collection('families').doc(familyId);

  // Rate limit check
  const familySnap = await familyRef.get();
  if (!familySnap.exists) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }
  const family = familySnap.data()!;

  const now = Date.now();
  if (family.lockUntil && (family.lockUntil as Timestamp).toMillis() > now) {
    const remaining = Math.ceil(((family.lockUntil as Timestamp).toMillis() - now) / 60000);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${remaining} minutes.` },
      { status: 429 },
    );
  }

  // Verify passcode
  const valid = await verifyPasscode(passcode, family.passcodeHash);
  if (!valid) {
    const attempts = (family.loginAttempts ?? 0) + 1;
    const update: Record<string, unknown> = { loginAttempts: attempts };
    if (attempts >= MAX_ATTEMPTS) {
      update.lockUntil = Timestamp.fromMillis(now + LOCKOUT_MS);
      update.loginAttempts = 0;
    }
    await familyRef.update(update);
    return NextResponse.json({ error: 'Incorrect passcode' }, { status: 401 });
  }

  // Reset attempts on success
  await familyRef.update({ loginAttempts: 0, lockUntil: null });

  // Find or pick a member matching the role
  const membersSnap = await familyRef.collection('members')
    .where('role', '==', role)
    .limit(1)
    .get();

  if (membersSnap.empty) {
    return NextResponse.json(
      { error: `No ${role} account found for this family.` },
      { status: 403 },
    );
  }
  const memberDoc = membersSnap.docs[0];
  const memberId  = memberDoc.id;

  // Mint Firebase custom token
  const firebaseToken = await adminAuth.createCustomToken(memberId, {
    familyId,
    memberId,
    role,
  });

  // Session JWT
  const sessionToken = await signSession({ familyId, memberId, role });

  const res = NextResponse.json({ ok: true, firebaseToken, memberId, role });
  setSessionCookie(res, sessionToken);
  return res;
});


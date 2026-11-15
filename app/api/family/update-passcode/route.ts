// app/api/family/update-passcode/route.ts
// Allows caretaker or family members to update their 6-digit login passcode.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrypt, randomBytes, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import { getSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';

const scryptAsync = promisify(scrypt);

const Schema = z.object({
  currentPasscode: z.string().length(6, 'Current passcode must be 6 digits').regex(/^\d{6}$/, 'Passcode must be numeric digits'),
  newPasscode: z.string().length(6, 'New passcode must be 6 digits').regex(/^\d{6}$/, 'Passcode must be numeric digits'),
});

async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(passcode, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  if (!hash) return false;
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

  const { currentPasscode, newPasscode } = parsed.data;

  if (currentPasscode === newPasscode) {
    return NextResponse.json({ error: 'New passcode must be different from current passcode.' }, { status: 400 });
  }

  const db = getAdminDb();
  const familyRef = db.collection('families').doc(session.familyId);
  const familySnap = await familyRef.get();

  if (!familySnap.exists) {
    return NextResponse.json({ error: 'Family workspace not found.' }, { status: 404 });
  }

  const familyData = familySnap.data()!;
  const isValid = await verifyPasscode(currentPasscode, familyData.passcodeHash);

  if (!isValid) {
    return NextResponse.json({ error: 'Current passcode is incorrect. Please try again.' }, { status: 401 });
  }

  // Hash new passcode and update
  const newHash = await hashPasscode(newPasscode);
  await familyRef.update({
    passcodeHash: newHash,
  });

  return NextResponse.json({ ok: true });
}

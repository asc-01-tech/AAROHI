// app/api/auth/verify-passcode/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrypt, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { withTiming } from '@/lib/withTiming';

const scryptAsync = promisify(scrypt);

const Schema = z.object({
  familyId: z.string().min(1),
  passcode: z.string().length(6).regex(/^\d{6}$/),
});

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

export const POST = withTiming('auth/verify-passcode', async (req: NextRequest) => {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid 6-digit passcode is required' }, { status: 400 });
  }

  const { familyId, passcode } = parsed.data;
  try {
    const db = getAdminDb();
    const familyDoc = await db.collection('families').doc(familyId).get();

    if (!familyDoc.exists) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    const family = familyDoc.data()!;
    const valid = await verifyPasscode(passcode, family.passcodeHash);

    if (!valid) {
      return NextResponse.json({ error: 'Incorrect 6-digit passcode. Please try again.' }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[verify-passcode] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error verifying passcode.' },
      { status: 500 }
    );
  }
});

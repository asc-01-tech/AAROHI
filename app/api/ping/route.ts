import { NextResponse } from 'next/server';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { signSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const scryptAsync = promisify(scrypt);

async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(passcode, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

function cleanPrivateKey(key: string | undefined): string {
  if (!key) return '';
  let cleaned = key.trim();
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.replace(/\\n/g, '\n');
}

export async function GET() {
  const steps: Record<string, any> = {};

  try {
    steps.step = 'hashPasscode';
    const hash = await hashPasscode('123456');
    steps.hash = hash;

    steps.step = 'signSession';
    const session = await signSession({
      familyId: 'test-fam',
      memberId: 'test-mem',
      role: 'caretaker',
    });
    steps.sessionLen = session.length;

    steps.step = 'firebase app & auth';
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;

    const credential = cert({
      projectId,
      clientEmail,
      privateKey: cleanPrivateKey(rawKey),
    });
    const app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential, projectId });

    steps.step = 'createCustomToken';
    const auth = getAuth(app);
    const token = await auth.createCustomToken('test-uid', { role: 'caretaker' });
    steps.customTokenLen = token.length;

    return NextResponse.json({ ok: true, steps });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      failedAtStep: steps.step,
      error: err.message,
      stack: err.stack,
    }, { status: 200 });
  }
}

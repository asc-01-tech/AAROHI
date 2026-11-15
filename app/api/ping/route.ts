import { NextResponse } from 'next/server';
import { getAdminDb, createCustomToken } from '@/lib/firebaseAdmin';
import { signSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const steps: Record<string, any> = {};

  try {
    steps.step = 'session';
    const s = await signSession({ familyId: 'test-fam', memberId: 'test-mem', role: 'caretaker' });
    steps.sessionLen = s.length;

    steps.step = 'customToken';
    const ct = createCustomToken('test-mem', { familyId: 'test-fam', role: 'caretaker' });
    steps.customTokenLen = ct.length;

    steps.step = 'getAdminDb';
    const db = getAdminDb();
    const snap = await db.collection('families').limit(1).get();
    steps.firestoreDocs = snap.size;

    return NextResponse.json({ ok: true, steps });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      failedAtStep: steps.step,
      error: err.message,
      stack: err.stack,
    }, { status: 500 });
  }
}

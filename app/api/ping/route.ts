import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result: Record<string, any> = { step: 'start' };
  try {
    result.step = 'getting db';
    const db = getAdminDb();
    result.step = 'got db';

    result.step = 'getting auth';
    const auth = getAdminAuth();
    result.step = 'got auth';

    result.step = 'testing firestore read';
    const snap = await db.collection('families').limit(1).get();
    result.step = 'firestore read ok';
    result.docs_count = snap.size;

    result.step = 'testing custom token';
    const token = await auth.createCustomToken('test-user');
    result.step = 'custom token ok';
    result.token_len = token.length;

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, step: result.step, error: err.message, stack: err.stack }, { status: 200 });
  }
}

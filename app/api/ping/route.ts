import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
    steps.step = 'importing fb app';
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    steps.step = 'importing fb firestore';
    const { getFirestore } = await import('firebase-admin/firestore');

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;

    steps.projectId = projectId;
    steps.clientEmail = clientEmail;
    steps.rawKeyLen = rawKey?.length;
    steps.cleanedKeyLen = cleanPrivateKey(rawKey).length;
    steps.cleanedKeyLines = cleanPrivateKey(rawKey).split('\n').length;

    steps.step = 'creating cert';
    const credential = cert({
      projectId,
      clientEmail,
      privateKey: cleanPrivateKey(rawKey),
    });
    steps.step = 'cert created';

    steps.step = 'initializing app';
    const app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential, projectId });
    steps.step = 'app initialized';

    steps.step = 'getting firestore';
    const db = getFirestore(app);
    steps.step = 'firestore got';

    steps.step = 'reading test doc';
    const snap = await db.collection('families').limit(1).get();
    steps.step = 'read ok';
    steps.docCount = snap.size;

    return NextResponse.json({ ok: true, steps });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      failedAtStep: steps.step,
      errorName: err?.name,
      errorMessage: err?.message,
      errorStack: err?.stack,
      steps,
    }, { status: 200 });
  }
}

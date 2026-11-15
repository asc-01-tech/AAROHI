// app/api/health/route.ts
// Diagnostic endpoint to pinpoint environment and database health on Vercel.

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envCheck = {
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY_SET: !!process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_PRIVATE_KEY_LEN: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
    FIREBASE_PRIVATE_KEY_PREVIEW: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.substring(0, 30) : 'none',
    SESSION_SECRET: !!process.env.SESSION_SECRET,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    GMAIL_USER: !!process.env.GMAIL_USER,
    NODE_VERSION: process.version,
  };

  let dbStatus = 'untested';
  let dbError = null;

  try {
    const db = getAdminDb();
    const testDoc = await db.collection('families').limit(1).get();
    dbStatus = `OK (found ${testDoc.size} docs)`;
  } catch (err: any) {
    dbStatus = 'FAILED';
    dbError = {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
    };
  }

  return NextResponse.json({
    status: dbStatus === 'FAILED' ? 'error' : 'healthy',
    timestamp: new Date().toISOString(),
    env: envCheck,
    dbStatus,
    dbError,
  });
}

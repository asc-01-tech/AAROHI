import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: Record<string, any> = {
    node: process.version,
    has_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    has_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    has_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    key_length: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
    key_start: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.slice(0, 35) : null,
    has_SESSION_SECRET: !!process.env.SESSION_SECRET,
  };

  try {
    diagnostics.import_app = 'testing...';
    const fbApp = await import('firebase-admin/app');
    diagnostics.import_app = 'success';
    diagnostics.fbApp_keys = Object.keys(fbApp);
  } catch (err: any) {
    diagnostics.import_app = `FAILED: ${err.message}`;
    diagnostics.import_app_stack = err.stack;
  }

  try {
    diagnostics.import_firestore = 'testing...';
    const fbFs = await import('firebase-admin/firestore');
    diagnostics.import_firestore = 'success';
  } catch (err: any) {
    diagnostics.import_firestore = `FAILED: ${err.message}`;
  }

  try {
    diagnostics.import_admin = 'testing...';
    const admin = await import('firebase-admin');
    diagnostics.import_admin = 'success';
  } catch (err: any) {
    diagnostics.import_admin = `FAILED: ${err.message}`;
  }

  return NextResponse.json(diagnostics);
}

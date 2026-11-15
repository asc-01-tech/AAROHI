// lib/firebaseAdmin.ts
// Singleton Firebase Admin SDK (Firestore) + native RS256 Custom Token minter.
// Eliminates jwks-rsa CommonJS/ESM bundling conflicts on Vercel Node 26.

import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { createSign } from 'crypto';

let app: App;
let db: Firestore;

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

export function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey      = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error(
      `Firebase Admin missing env vars: projectId=${!!projectId}, clientEmail=${!!clientEmail}, privateKey=${!!rawKey}`
    );
  }

  const privateKey = cleanPrivateKey(rawKey);

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
  return app;
}

export function getAdminDb(): Firestore {
  if (!db) {
    app = getAdminApp();
    try {
      db = getFirestore(app);
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      db = getFirestore(app);
    }
  }
  return db;
}

/**
 * Mint a Firebase custom token signed with the service account's private key.
 * Uses native Node crypto RS256 (no external auth library needed).
 */
export function createCustomToken(uid: string, claims: Record<string, unknown> = {}): string {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = cleanPrivateKey(rawKey);

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      sub: clientEmail,
      aud: 'https://identitytoolkit.googleapis.com/google.identitytoolkit.v1.IdentityToolkit',
      iat: now,
      exp: now + 3600, // 1 hour
      uid,
      claims,
    })
  ).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, 'base64url');

  return `${header}.${payload}.${signature}`;
}

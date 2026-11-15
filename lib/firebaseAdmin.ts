// lib/firebaseAdmin.ts
// Singleton Firebase Admin SDK — reused across all Vercel invocations.
// Guards against re-initialization in hot reload (dev) or multiple imports.

import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let app: App;
let db: Firestore;
let auth: Auth;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId     = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail   = process.env.FIREBASE_CLIENT_EMAIL!;
  // Vercel stores newlines as literal \n in the env var
  const privateKey    = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

export function getAdminDb(): Firestore {
  if (!db) {
    app = getAdminApp();
    db  = getFirestore(app);
    db.settings({ ignoreUndefinedProperties: true });
  }
  return db;
}

export function getAdminAuth(): Auth {
  if (!auth) {
    app  = getAdminApp();
    auth = getAuth(app);
  }
  return auth;
}


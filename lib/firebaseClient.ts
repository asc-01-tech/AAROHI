// lib/firebaseClient.ts
// Singleton Firebase client SDK with persistent multi-tab Firestore cache.
// The elder's screen loads from cache instantly even on a slow network.

import { getApps, initializeApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:     process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId:      process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

export function getClientApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0];
  app = initializeApp(firebaseConfig);
  return app;
}

export function getClientDb(): Firestore {
  if (db) return db;
  const a = getClientApp();
  // Try persistent cache; falls back gracefully if the browser blocks it
  try {
    db = initializeFirestore(a, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    db = getFirestore(a);
  }
  return db;
}

export function getClientAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getClientApp());
  return auth;
}


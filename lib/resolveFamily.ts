// lib/resolveFamily.ts
// Resolves a family document by either Firestore Document ID or Instagram-style @username.

import { getAdminDb } from '@/lib/firebaseAdmin';
import { DocumentSnapshot } from 'firebase-admin/firestore';

export interface ResolvedFamily {
  familyId: string;
  familyDoc: DocumentSnapshot;
  data: Record<string, any>;
  username: string;
}

export async function resolveFamily(rawIdentifier: string): Promise<ResolvedFamily | null> {
  if (!rawIdentifier) return null;

  const db = getAdminDb();
  const cleaned = rawIdentifier.trim();
  const normalizedUsername = cleaned.toLowerCase().replace(/^@/, '');

  // 1. Try direct Firestore document lookup
  const directDoc = await db.collection('families').doc(cleaned).get();
  if (directDoc.exists) {
    const data = directDoc.data()!;
    return {
      familyId: directDoc.id,
      familyDoc: directDoc,
      data,
      username: data.username || normalizedUsername,
    };
  }

  // 2. Try lookup by username field (e.g. @sharma_family or sharma_family)
  const usernameSnap = await db
    .collection('families')
    .where('username', '==', normalizedUsername)
    .limit(1)
    .get();

  if (!usernameSnap.empty) {
    const doc = usernameSnap.docs[0];
    const data = doc.data();
    return {
      familyId: doc.id,
      familyDoc: doc,
      data,
      username: data.username || normalizedUsername,
    };
  }

  return null;
}

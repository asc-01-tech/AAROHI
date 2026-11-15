// app/api/doses/[id]/take/route.ts
// POST handler (session-protected, any role).
// Runs an idempotent Firestore transaction:
// 1. Read doseEvent. If already 'taken', return success immediately.
// 2. Update doseEvent: status='taken', takenAt=serverTimestamp, takenBy=memberId.
// 3. Decrement medication pillCount by 1 (if pillCount > 0).
// 4. Update streak: read family streak, update lastFullDay and current streak.
// 5. Write an activityLog entry: "took [medName]".
// 6. Background after(): notify family members, check refill threshold.

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getSession } from '@/lib/session';
import { withTiming } from '@/lib/withTiming';
import { notify } from '@/lib/notify';
import { msgFamilyDoseTaken } from '@/lib/messages';
import type { Locale } from '@/lib/i18n';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withTiming('doses/[id]/take/POST', async (req: NextRequest, ctx: unknown) => {
  const { params } = ctx as RouteContext;
  const { id: doseId } = await params;

  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { familyId, memberId } = session;
  const db = getAdminDb();
  const familyRef = db.collection('families').doc(familyId);
  const doseRef = familyRef.collection('doseEvents').doc(doseId);

  let medId: string | null = null;
  let medName = 'Medicine';
  let elderNickname = 'Aba';
  let elderLocale: Locale = 'en-IN';
  let pillCountRemaining: number | null = null;
  let refillThreshold = 5;

  try {
    await db.runTransaction(async (t) => {
      // ── READS MUST ALL BE EXECUTED FIRST ────────────────────────────────
      const doseDoc = await t.get(doseRef);
      if (!doseDoc.exists) {
        throw new Error('Dose event not found');
      }

      const doseData = doseDoc.data()!;
      // Idempotent: if already taken, exit successfully
      if (doseData.status === 'taken') {
        return;
      }

      medId = doseData.medId || null;
      medName = doseData.medName || 'Medicine';

      const familyDoc = await t.get(familyRef);
      const familyData = familyDoc.exists ? familyDoc.data()! : {};
      elderNickname = familyData?.elder?.nickname || 'Aba';
      elderLocale = (familyData?.elder?.language as Locale) || 'en-IN';

      // Read medDoc if medId exists before any writes
      let medDoc = null;
      let medRef = null;
      if (medId) {
        medRef = familyRef.collection('medications').doc(medId);
        medDoc = await t.get(medRef);
      }

      // ── WRITES MUST ALL BE EXECUTED AFTER READS ─────────────────────────
      // 1. Update doseEvent
      t.update(doseRef, {
        status: 'taken',
        takenAt: FieldValue.serverTimestamp(),
        takenBy: memberId,
      });

      // 2. Decrement medication pillCount if medDoc exists
      if (medRef && medDoc && medDoc.exists) {
        const medData = medDoc.data()!;
        refillThreshold = medData.refillThreshold ?? 5;
        const currentCount = medData.pillCount ?? 0;
        if (currentCount > 0) {
          pillCountRemaining = currentCount - 1;
          t.update(medRef, {
            pillCount: FieldValue.increment(-1),
          });
        }
      }

      // 3. Update streak & plant level
      const currentStreak = familyData.streak?.current ?? 0;
      const bestStreak = familyData.streak?.best ?? 0;
      const newStreak = currentStreak + 1;
      const newBest = Math.max(bestStreak, newStreak);
      const currentPlant = familyData.plantLevel ?? 0;
      const newPlant = Math.min(5, Math.floor(newStreak / 2));

      t.update(familyRef, {
        'streak.current': newStreak,
        'streak.best': newBest,
        'streak.lastFullDay': new Date().toISOString().slice(0, 10),
        plantLevel: newPlant,
      });

      // 4. Activity log
      const logRef = familyRef.collection('activityLog').doc();
      t.set(logRef, {
        actorId: memberId,
        actorName: elderNickname,
        action: 'DOSE_TAKEN',
        humanText: `${elderNickname} took ${medName}`,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    // Run notifications and refill checks in background via Next.js after()
    after(async () => {
      try {
        // Fetch family members (caretaker + family roles)
        const membersSnap = await familyRef.collection('members').where('role', 'in', ['caretaker', 'family']).get();
        const notificationPromises: Promise<unknown>[] = [];

        for (const mDoc of membersSnap.docs) {
          const member = mDoc.data();
          const target = {
            name: member.name || 'Family Member',
            phone: member.phone,
            email: member.email,
          };

          notificationPromises.push(
            notify(
              target,
              'FAMILY_DOSE_TAKEN',
              {
                nickname: elderNickname,
                medName,
              },
              elderLocale,
              familyId,
            )
          );
        }

        await Promise.allSettled(notificationPromises);
      } catch (err) {
        console.error('[after() dose background notification error]', err);
      }
    });

    return NextResponse.json({ ok: true, medName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record dose';
    console.error('[take dose error]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

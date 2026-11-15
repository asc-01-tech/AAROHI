// app/api/cron/tick/route.ts
// Cron job: runs every minute via Vercel Cron / external scheduler.
// Returns 200 immediately; all work runs in background via `after()`.

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { notify, notifyAll, type Recipient } from '@/lib/notify';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Locale } from '@/lib/i18n';

export const maxDuration = 30;
export const runtime = 'nodejs';

// ─── IST Helpers ──────────────────────────────────────────────────────────────

function nowIst(): Date {
  // IST = UTC + 5h 30m = UTC + 330 min
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + 330 * 60_000);
}

function toIstString(date: Date): string {
  // Convert a UTC Date to IST "HH:MM" display string
  const istMs = date.getTime() + date.getTimezoneOffset() * 60_000 + 330 * 60_000;
  const ist = new Date(istMs);
  return `${String(ist.getHours()).padStart(2, '0')}:${String(ist.getMinutes()).padStart(2, '0')}`;
}

// ─── Family data helper ───────────────────────────────────────────────────────

interface FamilyMember {
  phone?: string;
  email?: string;
  name?: string;
}

interface FamilyData {
  elderNickname: string;
  locale: Locale;
  elder: Recipient;
  caretaker: Recipient;
  familyMembers: Recipient[];
}

async function getFamilyData(familyId: string): Promise<FamilyData | null> {
  const db = getAdminDb();
  const familySnap = await db.collection('families').doc(familyId).get();
  if (!familySnap.exists) return null;
  const family = familySnap.data()!;

  const membersSnap = await db
    .collection('families')
    .doc(familyId)
    .collection('members')
    .get();

  let elder: FamilyMember & { name: string } = { name: family.elderNickname || 'Elder' };
  let caretaker: FamilyMember & { name: string } = { name: 'Caretaker' };
  const familyMembers: Recipient[] = [];

  for (const doc of membersSnap.docs) {
    const m = doc.data();
    if (m.role === 'elder') {
      elder = { name: m.nickname || m.name || 'Elder', phone: m.phone, email: m.email };
    } else if (m.role === 'caretaker') {
      caretaker = { name: m.name || 'Caretaker', phone: m.phone, email: m.email };
    } else {
      familyMembers.push({ name: m.name || 'Family', phone: m.phone, email: m.email });
    }
  }

  return {
    elderNickname: elder.name,
    locale: (family.locale as Locale) || 'en-IN',
    elder,
    caretaker,
    familyMembers,
  };
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Respond immediately; all processing is deferred to after()
  after(async () => {
    const db = getAdminDb();
    const nowMs = Date.now();
    const nowTs = Timestamp.fromMillis(nowMs);

    // ── STEP 1: Upcoming dose reminders (next 15 minutes) ─────────────────────
    try {
      const upcomingSnap = await db
        .collectionGroup('doseEvents')
        .where('status', '==', 'pending')
        .where('scheduledAt', '>=', nowTs)
        .where('scheduledAt', '<=', Timestamp.fromMillis(nowMs + 15 * 60_000))
        .where('reminderSentAt', '==', null)
        .limit(10)
        .get();

      await Promise.allSettled(
        upcomingSnap.docs.map(async (doc) => {
          try {
            const dose = doc.data();
            const familyId: string = dose.familyId;
            const fd = await getFamilyData(familyId);
            if (!fd) return;

            const time = toIstString((dose.scheduledAt as Timestamp).toDate());
            await notify(
              fd.elder,
              'UPCOMING_DOSE',
              { nickname: fd.elderNickname, medName: dose.medName, time },
              fd.locale,
              familyId
            );
            await doc.ref.update({ reminderSentAt: FieldValue.serverTimestamp() });
          } catch (err) {
            console.error('[STEP1] dose reminder failed', doc.id, err);
          }
        })
      );
    } catch (err) {
      console.error('[STEP1] upcoming reminders error', err);
    }

    // ── STEP 2: Missed dose marking (> 30 min past scheduled) ─────────────────
    try {
      const missedSnap = await db
        .collectionGroup('doseEvents')
        .where('status', '==', 'pending')
        .where('scheduledAt', '<', Timestamp.fromMillis(nowMs - 30 * 60_000))
        .where('missedSentAt', '==', null)
        .limit(10)
        .get();

      await Promise.allSettled(
        missedSnap.docs.map(async (doc) => {
          try {
            const dose = doc.data();
            const familyId: string = dose.familyId;
            const fd = await getFamilyData(familyId);
            if (!fd) return;

            await doc.ref.update({
              status: 'missed',
              missedSentAt: FieldValue.serverTimestamp(),
            });
            await notify(
              fd.elder,
              'MISSED_DOSE',
              { nickname: fd.elderNickname, medName: dose.medName },
              fd.locale,
              familyId
            );
          } catch (err) {
            console.error('[STEP2] missed dose failed', doc.id, err);
          }
        })
      );
    } catch (err) {
      console.error('[STEP2] missed dose error', err);
    }

    // ── STEP 3: Escalation ladder ─────────────────────────────────────────────
    try {
      const escalateSnap = await db
        .collectionGroup('doseEvents')
        .where('status', '==', 'missed')
        .where('missedSentAt', '!=', null)
        .limit(10)
        .get();

      await Promise.allSettled(
        escalateSnap.docs.map(async (doc) => {
          try {
            const dose = doc.data();
            const familyId: string = dose.familyId;
            const fd = await getFamilyData(familyId);
            if (!fd) return;

            const missedSentMs = (dose.missedSentAt as Timestamp).toMillis();
            const isCritical = dose.criticality === 'critical';

            const vars = { nickname: fd.elderNickname, medName: dose.medName, minutes: '15' };

            if (isCritical) {
              // Caretaker escalation: 15 min after missed
              if (!dose.escalatedCaretakerAt && missedSentMs < nowMs - 15 * 60_000) {
                await notify(fd.caretaker, 'ESCALATE_CARETAKER', vars, fd.locale, familyId);
                await doc.ref.update({ escalatedCaretakerAt: FieldValue.serverTimestamp() });
              }
              // Family escalation: 15 min after caretaker escalation
              if (
                !dose.escalatedFamilyAt &&
                dose.escalatedCaretakerAt &&
                (dose.escalatedCaretakerAt as Timestamp).toMillis() < nowMs - 15 * 60_000
              ) {
                await notifyAll(
                  fd.familyMembers,
                  'ESCALATE_FAMILY',
                  vars,
                  fd.locale,
                  familyId
                );
                await doc.ref.update({ escalatedFamilyAt: FieldValue.serverTimestamp() });
              }
            } else {
              // Non-critical: caretaker after 30 min, no family escalation
              if (!dose.escalatedCaretakerAt && missedSentMs < nowMs - 30 * 60_000) {
                await notify(fd.caretaker, 'ESCALATE_CARETAKER', vars, fd.locale, familyId);
                await doc.ref.update({ escalatedCaretakerAt: FieldValue.serverTimestamp() });
              }
            }
          } catch (err) {
            console.error('[STEP3] escalation failed', doc.id, err);
          }
        })
      );
    } catch (err) {
      console.error('[STEP3] escalation error', err);
    }

    // ── STEP 4: Appointment reminders ─────────────────────────────────────────
    try {
      // 24-hour reminder
      const appt24Snap = await db
        .collectionGroup('appointments')
        .where('dateTime', '>=', nowTs)
        .where('dateTime', '<=', Timestamp.fromMillis(nowMs + 25 * 3600_000))
        .where('reminder', '==', true)
        .where('apptReminderSent', '==', null)
        .limit(10)
        .get();

      await Promise.allSettled(
        appt24Snap.docs.map(async (doc) => {
          try {
            const appt = doc.data();
            const familyId: string = appt.familyId;
            const fd = await getFamilyData(familyId);
            if (!fd) return;

            const dateStr = toIstString((appt.dateTime as Timestamp).toDate());
            await notify(
              fd.elder,
              'APPT_24H',
              { nickname: fd.elderNickname, doctorName: appt.doctorName || 'Doctor', dateStr },
              fd.locale,
              familyId
            );
            await doc.ref.update({ apptReminderSent: FieldValue.serverTimestamp() });
          } catch (err) {
            console.error('[STEP4] 24h appt failed', doc.id, err);
          }
        })
      );

      // 2-hour reminder
      const appt2hSnap = await db
        .collectionGroup('appointments')
        .where('dateTime', '>=', nowTs)
        .where('dateTime', '<=', Timestamp.fromMillis(nowMs + 2.5 * 3600_000))
        .where('reminder', '==', true)
        .where('apptReminder2hSent', '==', null)
        .limit(10)
        .get();

      await Promise.allSettled(
        appt2hSnap.docs.map(async (doc) => {
          try {
            const appt = doc.data();
            const familyId: string = appt.familyId;
            const fd = await getFamilyData(familyId);
            if (!fd) return;

            const time = toIstString((appt.dateTime as Timestamp).toDate());
            await notify(
              fd.elder,
              'APPT_2H',
              { nickname: fd.elderNickname, doctorName: appt.doctorName || 'Doctor', time },
              fd.locale,
              familyId
            );
            await doc.ref.update({ apptReminder2hSent: FieldValue.serverTimestamp() });
          } catch (err) {
            console.error('[STEP4] 2h appt failed', doc.id, err);
          }
        })
      );
    } catch (err) {
      console.error('[STEP4] appointment reminders error', err);
    }

    // ── STEP 5: Refill check ──────────────────────────────────────────────────
    try {
      const sevenDaysAgo = Timestamp.fromMillis(nowMs - 7 * 86400_000);

      const medsSnap = await db
        .collectionGroup('medications')
        .where('active', '==', true)
        .get();

      const refillCandidates = medsSnap.docs.filter((doc) => {
        const med = doc.data();
        const pillCount = med.pillCount ?? Infinity;
        const refillThreshold = med.refillThreshold ?? 0;
        if (pillCount > refillThreshold) return false;
        const sentAt: Timestamp | null = med.refillAlertSentAt ?? null;
        if (!sentAt) return true;
        return sentAt.toMillis() < sevenDaysAgo.toMillis();
      });

      await Promise.allSettled(
        refillCandidates.slice(0, 10).map(async (doc) => {
          try {
            const med = doc.data();
            const familyId: string = med.familyId;
            const fd = await getFamilyData(familyId);
            if (!fd) return;

            await notify(
              fd.caretaker,
              'REFILL_ALERT',
              {
                nickname: fd.elderNickname,
                medName: med.name || med.medName || 'Medicine',
                daysLeft: String(Math.ceil((med.pillCount ?? 0) / (med.timesPerDay || 1))),
              },
              fd.locale,
              familyId
            );
            await doc.ref.update({ refillAlertSentAt: FieldValue.serverTimestamp() });
          } catch (err) {
            console.error('[STEP5] refill alert failed', doc.id, err);
          }
        })
      );
    } catch (err) {
      console.error('[STEP5] refill check error', err);
    }

    // ── STEP 6: Evening summary (21:00 IST ± 1 min) ───────────────────────────
    try {
      const ist = nowIst();
      const istHour = ist.getHours();
      const istMinute = ist.getMinutes();

      if (istHour === 21 && istMinute < 2) {
        const todayIst = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;

        const familiesSnap = await db.collection('families').get();

        const startOfTodayIst = new Date(ist);
        startOfTodayIst.setHours(0, 0, 0, 0);
        const startUtcMs = startOfTodayIst.getTime() - 330 * 60_000;

        const endOfTodayIst = new Date(ist);
        endOfTodayIst.setHours(23, 59, 59, 999);
        const endUtcMs = endOfTodayIst.getTime() - 330 * 60_000;

        await Promise.allSettled(
          familiesSnap.docs.map(async (familyDoc) => {
            try {
              const family = familyDoc.data();
              if (family.lastEveningSummaryDate === todayIst) return; // idempotent

              const dosesSnap = await db
                .collectionGroup('doseEvents')
                .where('familyId', '==', familyDoc.id)
                .where('scheduledAt', '>=', Timestamp.fromMillis(startUtcMs))
                .where('scheduledAt', '<=', Timestamp.fromMillis(endUtcMs))
                .get();

              let taken = 0;
              let missed = 0;
              let pending = 0;

              for (const doseDoc of dosesSnap.docs) {
                const status = doseDoc.data().status;
                if (status === 'taken') taken++;
                else if (status === 'missed') missed++;
                else pending++;
              }

              const total = taken + missed + pending;
              const adherence = total > 0 ? taken / total : 1;

              await familyDoc.ref.update({
                lastEveningSummaryDate: todayIst,
                lastAdherence: Math.round(adherence * 100),
                lastEveningSummaryAt: FieldValue.serverTimestamp(),
              });
            } catch (err) {
              console.error('[STEP6] evening summary failed', familyDoc.id, err);
            }
          })
        );
      }
    } catch (err) {
      console.error('[STEP6] evening summary error', err);
    }
  });

  return NextResponse.json({ ok: true, ts: Date.now() }, { status: 200 });
}

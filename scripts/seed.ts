// scripts/seed.ts
// Demo data seeder for CareCircle hackathon demo.
// Creates: 1 family "Aba's Family", elder "Ramchandra Joshi" (nickname: Aba),
// caretaker "Priya Joshi", 5 medications, 1 upcoming appointment, dose history.
// Run: npx ts-node --project tsconfig.json scripts/seed.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

// Initialize admin SDK
const credPath = path.join(process.cwd(), 'firebase-credentials.json');
if (!fs.existsSync(credPath)) {
  console.error('❌ firebase-credentials.json not found in project root.');
  console.error('   Download it from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

initializeApp({
  credential: cert(credPath),
});

const db = getFirestore();

// ── Helpers ─────────────────────────────────────────────────────────────────

function hashPasscode(passcode: string): string {
  // Simple sha256 for seed (real app uses scrypt)
  return crypto.createHash('sha256').update('carecircle:' + passcode).digest('hex');
}

function istNow(): Date {
  return new Date();
}

function istDateString(d: Date = new Date()): string {
  // Returns YYYY-MM-DD in IST
  const ist = new Date(d.getTime() + 330 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

function doseId(medId: string, dateStr: string, hhmm: string): string {
  return `${medId}_${dateStr}_${hhmm.replace(':', '')}`;
}

function scheduledAtIst(dateStr: string, hhmm: string): Timestamp {
  const [hh, mm] = hhmm.split(':').map(Number);
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - 330 * 60 * 1000;
  return Timestamp.fromMillis(utcMs);
}

// ── Main seed ────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding CareCircle demo data...\n');

  const FAMILY_ID = 'demo-aba-family-2024';
  const PASSCODE = '123456';
  const hashedPasscode = hashPasscode(PASSCODE);

  // 1. Family doc
  await db.collection('families').doc(FAMILY_ID).set({
    familyId: FAMILY_ID,
    elderName: 'Ramchandra Joshi',
    elderNickname: 'Aba',
    elderNicknameSpoken: 'आबा',
    locale: 'hi-IN',
    passcodeHash: hashedPasscode,
    createdAt: FieldValue.serverTimestamp(),
    streak: 7,
    bestStreak: 14,
    plantLevel: 2,
    lastStreakDate: istDateString(),
    caretakerPhone: '+919876543211',
    caretakerEmail: 'priya@example.com',
    elder: {
      name: 'Ramchandra Joshi',
      nickname: 'Aba',
      nicknameSpoken: 'आबा',
      age: 74,
      gender: 'Male',
      bloodGroup: 'O+',
      height: '168 cm',
      weight: '68 kg',
      language: 'hi-IN',
      phone: '+919876543210',
      email: 'aba@example.com',
      conditions: [
        'Type 2 Diabetes Mellitus (Diagnosed 2018)',
        'Essential Hypertension (Diagnosed 2015)',
        'Mild Knee Osteoarthritis',
      ],
      allergies: [
        'Penicillin (Moderate Rash)',
        'Peanuts',
      ],
      primaryDoctor: {
        name: 'Dr. Suresh Patel',
        specialty: 'Consultant Cardiologist & Diabetologist',
        clinic: 'Lilavati Hospital & Patel Heart Care, Mumbai',
        phone: '+91 98200 12345',
        email: 'dr.spatel@lilavatihospital.com',
      },
      emergencyContact: {
        name: 'Priya Joshi',
        relationship: 'Daughter / Primary Caregiver',
        phone: '+91 98765 43211',
      },
    },
  }, { merge: true });
  console.log('✅ Family doc created: familyId =', FAMILY_ID);

  // 2. Members
  const elderRef = db.collection('families').doc(FAMILY_ID).collection('members').doc('elder-aba');
  await elderRef.set({
    memberId: 'elder-aba',
    role: 'elder',
    name: 'Ramchandra Joshi',
    nickname: 'Aba',
    phone: '+919876543210',
    email: 'aba@example.com',
    createdAt: FieldValue.serverTimestamp(),
  });

  const caretakerRef = db.collection('families').doc(FAMILY_ID).collection('members').doc('caretaker-priya');
  await caretakerRef.set({
    memberId: 'caretaker-priya',
    role: 'caretaker',
    name: 'Priya Joshi',
    phone: '+919876543211',
    email: 'priya@example.com',
    createdAt: FieldValue.serverTimestamp(),
  });

  const familyRef = db.collection('families').doc(FAMILY_ID).collection('members').doc('family-rahul');
  await familyRef.set({
    memberId: 'family-rahul',
    role: 'family',
    name: 'Rahul Joshi',
    phone: '+919876543212',
    email: 'rahul@example.com',
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log('✅ Members created: elder, caretaker, family');

  // 3. Medications
  const meds = [
    {
      id: 'med-metformin',
      name: 'Metformin',
      strength: '500mg',
      form: 'tablet',
      purpose: 'Blood sugar control (Diabetes)',
      instructions: 'Take after meals with water',
      times: ['08:00', '20:00'],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2024-01-01',
      criticality: 'critical',
      pillCount: 28,
      refillThreshold: 7,
      active: true,
    },
    {
      id: 'med-amlodipine',
      name: 'Amlodipine',
      strength: '5mg',
      form: 'tablet',
      purpose: 'Blood pressure control',
      instructions: 'Take once daily in the morning',
      times: ['08:00'],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2024-01-01',
      criticality: 'critical',
      pillCount: 14,
      refillThreshold: 5,
      active: true,
    },
    {
      id: 'med-atorvastatin',
      name: 'Atorvastatin',
      strength: '20mg',
      form: 'tablet',
      purpose: 'Cholesterol management',
      instructions: 'Take at night after dinner',
      times: ['21:00'],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2024-01-01',
      criticality: 'normal',
      pillCount: 30,
      refillThreshold: 7,
      active: true,
    },
    {
      id: 'med-aspirin',
      name: 'Aspirin',
      strength: '75mg',
      form: 'tablet',
      purpose: 'Heart health (blood thinner)',
      instructions: 'Take after breakfast',
      times: ['09:00'],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2024-01-01',
      criticality: 'normal',
      pillCount: 60,
      refillThreshold: 10,
      active: true,
    },
    {
      id: 'med-vitamind',
      name: 'Vitamin D3',
      strength: '60000 IU',
      form: 'capsule',
      purpose: 'Vitamin D supplementation',
      instructions: 'Take once a week with milk',
      times: ['10:00'],
      daysOfWeek: [0], // Sunday only
      startDate: '2024-01-01',
      criticality: 'low',
      pillCount: 8,
      refillThreshold: 2,
      active: true,
    },
  ];

  for (const med of meds) {
    await db.collection('families').doc(FAMILY_ID).collection('medications').doc(med.id).set({
      ...med,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: 'caretaker-priya',
    });
  }
  console.log('✅ Medications created:', meds.map(m => m.name).join(', '));

  // 4. Dose events — 3 days back (some taken, some missed) + today + 7 days forward
  const batch1 = db.batch();
  const today = istDateString();
  const days: string[] = [];
  for (let i = -3; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(istDateString(d));
  }

  let doseCount = 0;
  for (const dateStr of days) {
    const isPast = dateStr < today;
    const isToday = dateStr === today;
    const dayOfWeek = new Date(dateStr + 'T00:00:00+05:30').getDay();

    for (const med of meds) {
      if (!med.daysOfWeek.includes(dayOfWeek)) continue;

      for (const time of med.times) {
        const id = doseId(med.id, dateStr, time);
        const scheduledAt = scheduledAtIst(dateStr, time);
        const nowMs = Date.now();
        const scheduledMs = scheduledAt.toMillis();

        let status: string;
        let takenAt = null;
        if (isPast) {
          // 85% taken, 15% missed (realistic adherence)
          status = Math.random() < 0.85 ? 'taken' : 'missed';
          if (status === 'taken') {
            takenAt = Timestamp.fromMillis(scheduledMs + Math.random() * 20 * 60 * 1000);
          }
        } else if (isToday && scheduledMs < nowMs) {
          // Past doses today
          status = Math.random() < 0.9 ? 'taken' : 'missed';
          if (status === 'taken') {
            takenAt = Timestamp.fromMillis(scheduledMs + Math.random() * 15 * 60 * 1000);
          }
        } else {
          status = 'pending';
        }

        const ref = db.collection('families').doc(FAMILY_ID).collection('doseEvents').doc(id);
        batch1.set(ref, {
          medId: med.id,
          medName: med.name,
          form: med.form,
          scheduledAt,
          status,
          takenAt,
          takenBy: status === 'taken' ? 'elder-aba' : null,
          familyId: FAMILY_ID,
          criticality: med.criticality,
          reminderSentAt: isPast ? Timestamp.fromMillis(scheduledMs - 10 * 60 * 1000) : null,
          missedSentAt: status === 'missed' ? Timestamp.fromMillis(scheduledMs + 35 * 60 * 1000) : null,
          escalatedCaretakerAt: null,
          escalatedFamilyAt: null,
        }, { merge: true });
        doseCount++;

        // Commit in batches of 400
        if (doseCount % 400 === 0) {
          await batch1.commit();
          console.log(`   Committed ${doseCount} dose events...`);
        }
      }
    }
  }
  await batch1.commit();
  console.log(`✅ Dose events created: ${doseCount} total`);

  // 5. Appointment
  const apptDate = new Date();
  apptDate.setDate(apptDate.getDate() + 3); // 3 days from now
  apptDate.setHours(10, 30, 0, 0);
  await db.collection('families').doc(FAMILY_ID).collection('appointments').add({
    doctorName: 'Dr. Suresh Patel',
    specialty: 'Cardiologist',
    dateTime: Timestamp.fromDate(apptDate),
    location: 'Kokilaben Hospital, Mumbai',
    notes: 'Bring last 3 BP readings and blood report',
    reminder: true,
    apptReminderSent: null,
    apptReminder2hSent: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'caretaker-priya',
  });
  console.log('✅ Appointment created: Dr. Suresh Patel (Cardiologist) in 3 days');

  // 6. Activity log sample
  const activities = [
    { type: 'dose_taken', description: 'Aba took Metformin 500mg', actor: 'Aba', actorRole: 'elder' },
    { type: 'med_added', description: 'Priya added Vitamin D3 to medication list', actor: 'Priya', actorRole: 'caretaker' },
    { type: 'appt_added', description: 'Priya scheduled appointment with Dr. Suresh Patel', actor: 'Priya', actorRole: 'caretaker' },
    { type: 'dose_missed', description: 'Aba missed Aspirin 75mg at 09:00', actor: 'System', actorRole: 'system' },
    { type: 'hug_sent', description: 'Rahul sent a ❤️ hug to Aba', actor: 'Rahul', actorRole: 'family' },
  ];

  for (let i = 0; i < activities.length; i++) {
    const a = activities[i];
    await db.collection('families').doc(FAMILY_ID).collection('activityLog').add({
      ...a,
      createdAt: Timestamp.fromMillis(Date.now() - i * 2 * 60 * 60 * 1000), // staggered
    });
  }
  console.log('✅ Activity log populated');

  // 7. A sample hug
  await db.collection('families').doc(FAMILY_ID).collection('hugs').add({
    emoji: '❤️',
    fromName: 'Rahul',
    fromRole: 'family',
    seen: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log('✅ Sample hug added');

  // 8. Sample Medical Documents
  const sampleDocs = [
    {
      title: 'Cardiology Prescription & Treatment Plan',
      category: 'prescription',
      doctor: 'Dr. Suresh Patel, MD (Cardiology)',
      facility: 'Lilavati Hospital & Research Centre',
      date: '2026-11-10',
      summary: 'Continuation of Metformin 500mg (twice daily) and Amlodipine 5mg (morning). BP 128/82 mmHg. Stable glycemic control.',
      prescribedMeds: ['Metformin 500mg', 'Amlodipine 5mg', 'Vitamin D3 60K'],
      fileType: 'pdf',
      fileName: 'prescription_dr_patel_nov2026.pdf',
      verified: true,
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      title: 'Comprehensive Metabolic & Lipid Panel',
      category: 'lab_report',
      doctor: 'Metropolis Diagnostics Lab',
      facility: 'Bandra West Branch',
      date: '2026-10-28',
      summary: 'HbA1c: 6.8% (Good control). Fasting Blood Sugar: 114 mg/dL. Total Cholesterol: 182 mg/dL. Kidney & Liver function within normal limits.',
      prescribedMeds: [],
      fileType: 'pdf',
      fileName: 'metropolis_lab_report_oct2026.pdf',
      verified: true,
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      title: '2D Echocardiogram & ECG Summary',
      category: 'scan',
      doctor: 'Dr. Anita Deshmukh, MD (Radiology)',
      facility: 'Hinduja Healthcare',
      date: '2026-08-15',
      summary: 'Normal LV systolic function. LVEF 60%. Mild concentric LVH consistent with chronic hypertension. No regional wall motion abnormalities.',
      prescribedMeds: [],
      fileType: 'pdf',
      fileName: '2d_echo_ecg_aug2026.pdf',
      verified: true,
      createdAt: FieldValue.serverTimestamp(),
    },
  ];

  for (const doc of sampleDocs) {
    await db.collection('families').doc(FAMILY_ID).collection('documents').add(doc);
  }
  console.log('✅ Sample medical documents added');

  console.log('\n🎉 Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DEMO CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Family ID : ${FAMILY_ID}`);
  console.log(`  Passcode  : ${PASSCODE}`);
  console.log(`  Elder     : Ramchandra Joshi (Aba)`);
  console.log(`  Caretaker : Priya Joshi`);
  console.log(`  Family    : Rahul Joshi`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

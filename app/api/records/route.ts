// app/api/records/route.ts
// Medical Profile, Documents Vault, and Past Medication History API.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { withTiming } from '@/lib/withTiming';

// Default mock documents for realistic demo experience
const DEMO_DOCUMENTS = [
  {
    id: 'doc-1',
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
  },
  {
    id: 'doc-2',
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
  },
  {
    id: 'doc-3',
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
  },
];

const DEMO_PAST_COURSES = [
  {
    id: 'course-1',
    medName: 'Amoxicillin 500mg',
    form: 'capsule',
    duration: '5 days (12 Oct 2026 - 17 Oct 2026)',
    reason: 'Dental root canal prophylaxis',
    status: 'completed',
    prescribedBy: 'Dr. Kulkarni (Dentist)',
  },
  {
    id: 'course-2',
    medName: 'Paracetamol 650mg (Dolo)',
    form: 'tablet',
    duration: 'As needed (SOS) - Sep 2026',
    reason: 'Mild seasonal viral fever & body ache',
    status: 'discontinued',
    prescribedBy: 'Dr. Suresh Patel',
  },
  {
    id: 'course-3',
    medName: 'Pantoprazole 40mg',
    form: 'tablet',
    duration: '14 days (15 Aug 2026 - 29 Aug 2026)',
    reason: 'Acid reflux & gastritis relief',
    status: 'completed',
    prescribedBy: 'Dr. Suresh Patel',
  },
];

export const GET = withTiming('GET /api/records', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { familyId } = session;
  const db = getAdminDb();
  const familyRef = db.collection('families').doc(familyId);

  // 1. Fetch Family & Elder profile
  const familySnap = await familyRef.get();
  if (!familySnap.exists) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  const familyData = familySnap.data()!;
  const elderData = familyData.elder || {};

  const medicalProfile = {
    patientName: elderData.name || familyData.elderName || 'Patient',
    nickname: elderData.nickname || familyData.elderNickname || 'Aba',
    age: elderData.age || 74,
    gender: elderData.gender || 'Male',
    bloodGroup: elderData.bloodGroup || 'O+',
    height: elderData.height || '168 cm',
    weight: elderData.weight || '68 kg',
    allergies: (elderData.allergies && elderData.allergies.length > 0)
      ? elderData.allergies
      : ['Penicillin (Moderate Rash)', 'Peanuts'],
    conditions: (elderData.conditions && elderData.conditions.length > 0)
      ? elderData.conditions
      : ['Type 2 Diabetes Mellitus (Diagnosed 2018)', 'Essential Hypertension (Diagnosed 2015)', 'Mild Knee Osteoarthritis'],
    primaryDoctor: elderData.primaryDoctor || {
      name: 'Dr. Suresh Patel',
      specialty: 'Consultant Cardiologist & Diabetologist',
      clinic: 'Lilavati Hospital & Patel Heart Care, Mumbai',
      phone: '+91 98200 12345',
      email: 'dr.spatel@lilavatihospital.com',
    },
    emergencyContact: elderData.emergencyContact || {
      name: familyData.caretakerPhone ? 'Priya Joshi' : 'Family Caretaker',
      relationship: 'Daughter / Primary Caregiver',
      phone: familyData.caretakerPhone || '+91 98765 43211',
    },
    recentVitals: {
      bloodPressure: '128/82 mmHg',
      fastingBloodSugar: '114 mg/dL',
      heartRate: '72 bpm',
      spO2: '98%',
      lastChecked: 'Today, 8:30 AM',
    },
  };

  // 2. Fetch Stored Medical Documents
  const docsSnap = await familyRef.collection('documents').orderBy('date', 'desc').limit(20).get();
  let documents = docsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (documents.length === 0) {
    documents = DEMO_DOCUMENTS;
  }

  // 3. Fetch Past Medication History from doseEvents
  const pastDosesSnap = await familyRef.collection('doseEvents')
    .where('status', 'in', ['taken', 'missed'])
    .limit(30)
    .get();

  const doseHistory = pastDosesSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      medName: data.medName,
      form: data.form,
      scheduledDate: data.scheduledDate || '',
      scheduledTime: data.scheduledTime || '',
      status: data.status,
      takenAt: data.takenAt ? (data.takenAt.toDate ? data.takenAt.toDate().toISOString() : data.takenAt) : null,
    };
  });

  return NextResponse.json({
    medicalProfile,
    documents,
    doseHistory,
    pastCourses: DEMO_PAST_COURSES,
  });
});

export const POST = withTiming('POST /api/records/document', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { familyId, memberId } = session;
  const body = await req.json();
  const { title, category, doctor, facility, date, summary, prescribedMeds } = body;

  if (!title || !category) {
    return NextResponse.json({ error: 'Title and Category are required' }, { status: 400 });
  }

  const db = getAdminDb();
  const docRef = db.collection('families').doc(familyId).collection('documents').doc();

  const newDoc = {
    title,
    category: category || 'prescription',
    doctor: doctor || 'Consulting Physician',
    facility: facility || 'Local Clinic',
    date: date || new Date().toISOString().split('T')[0],
    summary: summary || '',
    prescribedMeds: prescribedMeds || [],
    fileType: 'pdf',
    fileName: `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
    verified: true,
    uploadedBy: memberId,
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(newDoc);

  return NextResponse.json({ ok: true, document: { id: docRef.id, ...newDoc } });
});

export const PUT = withTiming('PUT /api/records/profile', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { familyId } = session;
  const body = await req.json();
  const { bloodGroup, allergies, conditions, primaryDoctor, age, weight, height } = body;

  const db = getAdminDb();
  const familyRef = db.collection('families').doc(familyId);

  const updates: Record<string, any> = {};
  if (bloodGroup !== undefined) updates['elder.bloodGroup'] = bloodGroup;
  if (allergies !== undefined) updates['elder.allergies'] = allergies;
  if (conditions !== undefined) updates['elder.conditions'] = conditions;
  if (primaryDoctor !== undefined) updates['elder.primaryDoctor'] = primaryDoctor;
  if (age !== undefined) updates['elder.age'] = age;
  if (weight !== undefined) updates['elder.weight'] = weight;
  if (height !== undefined) updates['elder.height'] = height;

  await familyRef.update(updates);

  return NextResponse.json({ ok: true });
});

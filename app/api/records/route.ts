// app/api/records/route.ts
// Medical Profile, Documents Vault, and Past Medication History API.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { withTiming } from '@/lib/withTiming';

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

  // Only use real data stored by the caretaker — no auto-fill or dummy defaults
  const medicalProfile = {
    patientName: elderData.name || familyData.elderName || '',
    nickname: elderData.nickname || familyData.elderNickname || '',
    age: elderData.age || null,
    gender: elderData.gender || '',
    bloodGroup: elderData.bloodGroup || '',
    height: elderData.height || '',
    weight: elderData.weight || '',
    allergies: elderData.allergies || [],
    conditions: elderData.conditions || [],
    primaryDoctor: elderData.primaryDoctor || null,
    emergencyContact: elderData.emergencyContact
      ? elderData.emergencyContact
      : (familyData.caretakerPhone
          ? { name: '', relationship: 'Primary Caretaker', phone: familyData.caretakerPhone }
          : null),
    recentVitals: elderData.recentVitals || null,
  };

  // 2. Fetch Stored Medical Documents (real data only — no demo fallback)
  const docsSnap = await familyRef.collection('documents').orderBy('date', 'desc').limit(20).get();
  const documents = docsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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

  // 4. Fetch past medication courses (discontinued/completed meds)
  const pastCoursesSnap = await familyRef.collection('pastCourses').orderBy('createdAt', 'desc').limit(20).get();
  const pastCourses = pastCoursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return NextResponse.json({
    medicalProfile,
    documents,
    doseHistory,
    pastCourses,
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

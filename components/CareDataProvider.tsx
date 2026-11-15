// components/CareDataProvider.tsx
// Real-time Firestore listeners for the caretaker dashboard.
// Provides context for dose events, medications, appointments, change requests, and hugs.
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { getClientDb } from '@/lib/firebaseClient';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DoseEvent {
  id: string;
  medId: string;
  medName: string;
  form: 'capsule' | 'tablet' | 'syrup' | 'injection';
  scheduledAt: Timestamp;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  familyId: string;
  criticality: 'low' | 'normal' | 'critical';
  takenAt?: Timestamp;
  skippedAt?: Timestamp;
}

export interface Medication {
  id: string;
  name: string;
  strength: string;
  form: 'capsule' | 'tablet' | 'syrup' | 'injection';
  purpose: string;
  instructions: string;
  times: string[];
  daysOfWeek: number[];
  startDate: string;
  endDate?: string;
  criticality: 'low' | 'normal' | 'critical';
  pillCount: number;
  refillThreshold: number;
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  dateTime: Timestamp;
  location: string;
  notes: string;
  reminderSent24h?: boolean;
  reminderSent2h?: boolean;
}

export interface ChangeRequest {
  id: string;
  medId: string;
  medName: string;
  type: 'edit' | 'delete';
  payload: Record<string, unknown>;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

export interface Hug {
  id: string;
  fromMemberId: string;
  fromName: string;
  emoji: string;
  message: string;
  seen: boolean;
  createdAt: Timestamp;
}

// ─── Context ───────────────────────────────────────────────────────────────

interface CareDataContextValue {
  familyId: string;
  memberId: string;
  role: string;
  doseEvents: DoseEvent[];
  doses: DoseEvent[];
  medications: Medication[];
  meds: Medication[];
  appointments: Appointment[];
  changeRequests: ChangeRequest[];
  hugs: Hug[];
  loading: boolean;
}

const CareDataContext = createContext<CareDataContextValue | null>(null);

export function useCareData(): CareDataContextValue {
  const ctx = useContext(CareDataContext);
  if (!ctx) throw new Error('useCareData must be used inside CareDataProvider');
  return ctx;
}

// ─── IST day bounds ────────────────────────────────────────────────────────
// IST = UTC+5:30. To get "midnight IST" in UTC, subtract 330 minutes.
function getTodayISTBounds(): { start: Timestamp; end: Timestamp } {
  const now = new Date();
  // Get IST date components
  const istOffset = 330 * 60 * 1000; // 330 minutes in ms
  const istNow = new Date(now.getTime() + istOffset);

  // Midnight start of today IST (in UTC)
  const istMidnightStart = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate())
  );
  const startUTC = new Date(istMidnightStart.getTime() - istOffset);

  // Midnight end of today IST
  const istMidnightEnd = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + 1)
  );
  const endUTC = new Date(istMidnightEnd.getTime() - istOffset);

  return {
    start: Timestamp.fromDate(startUTC),
    end: Timestamp.fromDate(endUTC),
  };
}

// ─── Provider ──────────────────────────────────────────────────────────────

interface Props {
  familyId: string;
  memberId: string;
  role: string;
  children: React.ReactNode;
}

export default function CareDataProvider({ familyId, memberId, role, children }: Props) {
  const [doseEvents, setDoseEvents] = useState<DoseEvent[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [hugs, setHugs] = useState<Hug[]>([]);
  const [loading, setLoading] = useState(true);

  const setupListeners = useCallback(() => {
    const db = getClientDb();
    const familyRef = collection(db, 'families', familyId, 'doseEvents');
    const medsRef = collection(db, 'families', familyId, 'medications');
    const apptsRef = collection(db, 'families', familyId, 'appointments');
    const reqsRef = collection(db, 'families', familyId, 'changeRequests');
    const hugsRef = collection(db, 'families', familyId, 'hugs');

    const { start, end } = getTodayISTBounds();
    const in7Days = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    // Today's dose events
    const dosesQuery = query(
      familyRef,
      where('scheduledAt', '>=', start),
      where('scheduledAt', '<', end),
      orderBy('scheduledAt', 'asc')
    );

    // Active medications
    const medsQuery = query(medsRef, where('active', '==', true));

    // Upcoming appointments (next 7 days)
    const apptsQuery = query(
      apptsRef,
      where('dateTime', '>=', Timestamp.now()),
      where('dateTime', '<=', in7Days),
      orderBy('dateTime', 'asc')
    );

    // Pending change requests
    const reqsQuery = query(reqsRef, where('status', '==', 'pending'));

    // Recent unread hugs (limit 5)
    const hugsQuery = query(hugsRef, where('seen', '==', false), limit(5));

    let loadCount = 0;
    const markLoaded = () => {
      loadCount++;
      if (loadCount >= 5) setLoading(false);
    };

    const unsubDoses = onSnapshot(dosesQuery, (snap) => {
      setDoseEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DoseEvent)));
      markLoaded();
    });

    const unsubMeds = onSnapshot(medsQuery, (snap) => {
      setMedications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medication)));
      markLoaded();
    });

    const unsubAppts = onSnapshot(apptsQuery, (snap) => {
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)));
      markLoaded();
    });

    const unsubReqs = onSnapshot(reqsQuery, (snap) => {
      setChangeRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChangeRequest)));
      markLoaded();
    });

    const unsubHugs = onSnapshot(hugsQuery, (snap) => {
      setHugs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Hug)));
      markLoaded();
    });

    return () => {
      unsubDoses();
      unsubMeds();
      unsubAppts();
      unsubReqs();
      unsubHugs();
    };
  }, [familyId]);

  useEffect(() => {
    const cleanup = setupListeners();
    return cleanup;
  }, [setupListeners]);

  return (
    <CareDataContext.Provider
      value={{ familyId, memberId, role, doseEvents, doses: doseEvents, medications, meds: medications, appointments, changeRequests, hugs, loading }}
    >
      {children}
    </CareDataContext.Provider>
  );
}

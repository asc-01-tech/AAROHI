// components/ElderDataProvider.tsx
// 'use client' — realtime Firestore listeners for today's doses, unseen hugs,
// and pending change requests. Cleans up all listeners on unmount.

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import type { Locale } from '@/lib/i18n';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DoseEvent {
  doseId: string;
  medName: string;
  form: 'capsule' | 'tablet' | 'syrup' | 'injection';
  scheduledAt: Timestamp;
  status: 'pending' | 'taken' | 'missed';
  familyId: string;
}

export interface HugEvent {
  hugId: string;
  fromName: string;
  emoji: string;
  message: string;
  seen: boolean;
}

export interface ChangeRequest {
  reqId: string;
  type: string;
  payload: Record<string, unknown>;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ElderDataContextValue {
  familyId: string;
  memberId: string;
  role: string;
  doses: DoseEvent[];
  hugs: HugEvent[];
  changeRequests: ChangeRequest[];
  loading: boolean;
}

// ─── Context ───────────────────────────────────────────────────────────────

const ElderDataContext = createContext<ElderDataContextValue | null>(null);

export function useElderData(): ElderDataContextValue {
  const ctx = useContext(ElderDataContext);
  if (!ctx) {
    throw new Error('useElderData must be used inside <ElderDataProvider>');
  }
  return ctx;
}

// ─── Helper: today's IST start/end as Timestamps ───────────────────────────

function todayISTBounds(): { start: Timestamp; end: Timestamp } {
  const now = new Date();
  // IST = UTC+5:30
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);

  const startIST = new Date(istNow);
  startIST.setUTCHours(0, 0, 0, 0);

  const endIST = new Date(istNow);
  endIST.setUTCHours(23, 59, 59, 999);

  return {
    start: Timestamp.fromDate(new Date(startIST.getTime() - istOffsetMs)),
    end:   Timestamp.fromDate(new Date(endIST.getTime() - istOffsetMs)),
  };
}

// ─── Provider ──────────────────────────────────────────────────────────────

interface Props {
  familyId: string;
  memberId: string;
  role: string;
  children: React.ReactNode;
}

export default function ElderDataProvider({
  familyId,
  memberId,
  role,
  children,
}: Props) {
  const [doses, setDoses]                   = useState<DoseEvent[]>([]);
  const [hugs, setHugs]                     = useState<HugEvent[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading]               = useState(true);

  // Track how many listeners have delivered their first snapshot
  const readyCount = useRef(0);
  const TOTAL_LISTENERS = 3;

  function markReady() {
    readyCount.current += 1;
    if (readyCount.current >= TOTAL_LISTENERS) {
      setLoading(false);
    }
  }

  useEffect(() => {
    const db = getClientDb();
    const { start, end } = todayISTBounds();
    const unsubscribers: Array<() => void> = [];

    // ── 1. Today's dose events ──────────────────────────────────────────
    const dosesQ = query(
      collection(db, 'families', familyId, 'doseEvents'),
      where('scheduledAt', '>=', start),
      where('scheduledAt', '<=', end),
      orderBy('scheduledAt', 'asc'),
    );

    const unsubDoses = onSnapshot(dosesQ, (snap) => {
      const items: DoseEvent[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          doseId:      doc.id,
          medName:     d.medName     ?? '',
          form:        d.form        ?? 'tablet',
          scheduledAt: d.scheduledAt as Timestamp,
          status:      d.status      ?? 'pending',
          familyId,
        };
      });
      setDoses(items);
      markReady();
    });
    unsubscribers.push(unsubDoses);

    // ── 2. Unseen hugs (limit 10) ──────────────────────────────────────
    const hugsQ = query(
      collection(db, 'families', familyId, 'hugs'),
      where('seen', '==', false),
      limit(10),
    );

    const unsubHugs = onSnapshot(hugsQ, (snap) => {
      const items: HugEvent[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          hugId:    doc.id,
          fromName: d.fromName ?? '',
          emoji:    d.emoji    ?? '🤗',
          message:  d.message  ?? '',
          seen:     false,
        };
      });
      setHugs(items);
      markReady();
    });
    unsubscribers.push(unsubHugs);

    // ── 3. Pending change requests ─────────────────────────────────────
    const crQ = query(
      collection(db, 'families', familyId, 'changeRequests'),
      where('status', '==', 'pending'),
    );

    const unsubCR = onSnapshot(crQ, (snap) => {
      const items: ChangeRequest[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          reqId:       doc.id,
          type:        d.type        ?? '',
          payload:     d.payload     ?? {},
          requestedBy: d.requestedBy ?? '',
          status:      'pending',
        };
      });
      setChangeRequests(items);
      markReady();
    });
    unsubscribers.push(unsubCR);

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [familyId]);

  const value: ElderDataContextValue = {
    familyId,
    memberId,
    role,
    doses,
    hugs,
    changeRequests,
    loading,
  };

  return (
    <ElderDataContext.Provider value={value}>
      {children}
    </ElderDataContext.Provider>
  );
}

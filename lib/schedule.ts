// lib/schedule.ts
// Batched dose event generator for 7 days ahead.
// Denormalizes medName and form into doseEvents so rendering dose lists
// and cron evaluations never require a per-dose medication lookup.

import { Timestamp } from 'firebase-admin/firestore';

export interface MedicationInput {
  id?: string;
  name: string;
  strength?: string;
  form: 'capsule' | 'tablet' | 'syrup' | 'injection';
  purpose?: string;
  instructions?: string;
  times: string[]; // e.g. ["08:00", "20:00"] (HH:MM in Asia/Kolkata)
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate?: string;
  criticality: 'low' | 'normal' | 'critical';
  pillCount: number;
  refillThreshold: number;
  active: boolean;
}

export interface GeneratedDoseEvent {
  doseId: string;
  path: string;
  data: {
    medId: string;
    medName: string;
    form: string;
    scheduledAt: Timestamp;
    status: 'pending' | 'taken' | 'missed' | 'skipped';
    familyId: string;
    criticality: 'low' | 'normal' | 'critical';
    reminderSentAt: null;
    missedSentAt: null;
    escalatedCaretakerAt: null;
    escalatedFamilyAt: null;
  };
}

export function generateDoseEvents(
  familyId: string,
  medId: string,
  med: MedicationInput,
  daysToGenerate: number = 7
): GeneratedDoseEvent[] {
  const events: GeneratedDoseEvent[] = [];
  const start = new Date();
  // Strip time for midnight start
  start.setHours(0, 0, 0, 0);

  const istOffsetMinutes = 330; // UTC+5:30 in minutes

  for (let d = 0; d < daysToGenerate; d++) {
    const targetDate = new Date(start);
    targetDate.setDate(targetDate.getDate() + d);

    const dayOfWeek = targetDate.getDay();
    // Check if medication is scheduled for this day of week
    if (!med.daysOfWeek.includes(dayOfWeek)) {
      continue;
    }

    // Check optional end date
    if (med.endDate) {
      const endD = new Date(med.endDate);
      if (targetDate > endD) continue;
    }

    for (const timeStr of med.times) {
      const [hoursStr, minsStr] = timeStr.split(':');
      const hours = parseInt(hoursStr, 10);
      const mins = parseInt(minsStr, 10);

      // Create target Date representing that exact IST wall-clock time
      // Year-Month-Day from targetDate + hours:mins in IST
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const day = targetDate.getDate();

      // UTC timestamp for the IST time
      const utcMillis = Date.UTC(y, m, day, hours, mins) - istOffsetMinutes * 60 * 1000;
      const scheduledDate = new Date(utcMillis);

      // Unique deterministic ID to prevent duplicates
      const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const timeKey = `${String(hours).padStart(2, '0')}${String(mins).padStart(2, '0')}`;
      const doseId = `${medId}_${dateKey}_${timeKey}`;

      events.push({
        doseId,
        path: `families/${familyId}/doseEvents/${doseId}`,
        data: {
          medId,
          medName: med.name,
          form: med.form,
          scheduledAt: Timestamp.fromDate(scheduledDate),
          status: 'pending',
          familyId,
          criticality: med.criticality || 'normal',
          reminderSentAt: null,
          missedSentAt: null,
          escalatedCaretakerAt: null,
          escalatedFamilyAt: null,
        },
      });
    }
  }

  return events;
}

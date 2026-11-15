// lib/notify.ts
// Dual notification pipeline: WhatsApp (Twilio) + Email (Nodemailer Gmail) in parallel.
// Writes audit records to Firestore `notificationLog`.

import twilio from 'twilio';
import nodemailer, { type Transporter } from 'nodemailer';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { buildEmailHtml } from '@/lib/emailTemplate';
import {
  msgUpcoming,
  msgMissed,
  msgEscalateCaretaker,
  msgEscalateFamily,
  msgFamilyDoseTaken,
  msgAppt24h,
  msgAppt2h,
  msgRefill,
} from '@/lib/messages';
import type { Locale } from '@/lib/i18n';

// ─── Singletons ────────────────────────────────────────────────────────────

let twilioClient: twilio.Twilio | null = null;

function getTwilio(): twilio.Twilio | null {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  if (!sid || !token) return null;
  if (!twilioClient) {
    twilioClient = twilio(sid, token);
  }
  return twilioClient;
}

let mailTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      pool: true,
      service: 'gmail',
      auth: { user, pass },
      maxConnections: 3,
      maxMessages: 100,
    });
  }
  return mailTransporter;
}

// ─── Helper: withTimeout ───────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ─── Resolve template message ──────────────────────────────────────────────

function renderMessage(
  type: string,
  vars: Record<string, string>,
  locale: Locale
): { title: string; text: string } {
  const nickname = vars.nickname || 'Aba';
  const medName = vars.medName || 'Medicine';
  const time = vars.time || 'now';
  const doctorName = vars.doctorName || 'Doctor';
  const dateStr = vars.dateStr || 'today';
  const minutes = Number(vars.minutes || 15);
  const daysLeft = Number(vars.daysLeft || 3);

  switch (type) {
    case 'UPCOMING_DOSE':
      return {
        title: `Medication Reminder for ${nickname}`,
        text: msgUpcoming(nickname, medName, time, locale),
      };
    case 'MISSED_DOSE':
      return {
        title: `Missed Dose: ${medName}`,
        text: msgMissed(nickname, medName, locale),
      };
    case 'ESCALATE_CARETAKER':
      return {
        title: `Urgent: ${nickname} Overdue Dose`,
        text: msgEscalateCaretaker(nickname, medName, minutes, locale),
      };
    case 'ESCALATE_FAMILY':
      return {
        title: `CRITICAL ALERT: ${nickname} Overdue for ${medName}`,
        text: msgEscalateFamily(nickname, medName, locale),
      };
    case 'FAMILY_DOSE_TAKEN':
      return {
        title: `${nickname} Took Their Medicine ✅`,
        text: msgFamilyDoseTaken(nickname, medName, locale),
      };
    case 'APPT_24H':
      return {
        title: `Appointment Tomorrow: Dr. ${doctorName}`,
        text: msgAppt24h(nickname, doctorName, dateStr, locale),
      };
    case 'APPT_2H':
      return {
        title: `Appointment in 2 Hours: Dr. ${doctorName}`,
        text: msgAppt2h(nickname, doctorName, time, locale),
      };
    case 'REFILL_ALERT':
      return {
        title: `Refill Reminder: ${medName}`,
        text: msgRefill(nickname, medName, daysLeft, locale),
      };
    case 'EMERGENCY_ALERT':
      return {
        title: `🚨 URGENT HEALTH ALERT: ${nickname} Needs Attention`,
        text: `🚨 URGENT: ${nickname} reported feeling unwell: "${vars.detail || 'Not feeling well'}" via Aarohi Voice Assistant. Please check on them immediately!`,
      };
    default:
      return {
        title: 'Aarohi Notification',
        text: vars.text || `${nickname}, you have an update from Aarohi.`,
      };
  }
}

// ─── Core notify function ──────────────────────────────────────────────────

export interface Recipient {
  phone?: string;
  email?: string;
  name: string;
}

export async function notify(
  recipient: Recipient,
  type: string,
  vars: Record<string, string>,
  locale: Locale = 'en-IN',
  familyId: string
): Promise<{ whatsapp: boolean; email: boolean }> {
  const { title, text } = renderMessage(type, vars, locale);
  const db = getAdminDb();
  const logCollection = db.collection('families').doc(familyId).collection('notificationLog');

  let whatsappSuccess = false;
  let emailSuccess = false;

  const tasks: Promise<void>[] = [];

  // 1. WhatsApp channel
  if (recipient.phone) {
    const rawPhone = recipient.phone.replace(/[^0-9+]/g, '');
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone}`;
    const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    const client = getTwilio();

    if (client) {
      tasks.push(
        (async () => {
          try {
            await withTimeout(
              client.messages.create({
                from: twilioFrom,
                to: `whatsapp:${formattedPhone}`,
                body: `${text}\n\n— Aarohi 💊`,
              }),
              8000,
              'Twilio WhatsApp'
            );
            whatsappSuccess = true;
            await logCollection.add({
              channel: 'whatsapp',
              to: formattedPhone,
              type,
              status: 'sent',
              createdAt: FieldValue.serverTimestamp(),
            });
          } catch (err: unknown) {
            const errStr = err instanceof Error ? err.message : String(err);
            console.warn('[WhatsApp Notify Failed]', formattedPhone, errStr);
            await logCollection.add({
              channel: 'whatsapp',
              to: formattedPhone,
              type,
              status: 'failed',
              error: errStr,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        })()
      );
    }
  }

  // 2. Email channel
  if (recipient.email) {
    const transporter = getTransporter();
    const fromAddr = process.env.GMAIL_USER || 'aarohi.app@gmail.com';

    if (transporter) {
      tasks.push(
        (async () => {
          try {
            const htmlContent = buildEmailHtml(title, text);
            await withTimeout(
              transporter.sendMail({
                from: `"Aarohi" <${fromAddr}>`,
                to: recipient.email,
                subject: `Aarohi: ${title}`,
                text: `${text}\n\nOpen app: ${process.env.APP_URL || 'https://aarohi.vercel.app'}`,
                html: htmlContent,
              }),
              10000,
              'Nodemailer SMTP'
            );
            emailSuccess = true;
            await logCollection.add({
              channel: 'email',
              to: recipient.email,
              type,
              status: 'sent',
              createdAt: FieldValue.serverTimestamp(),
            });
          } catch (err: unknown) {
            const errStr = err instanceof Error ? err.message : String(err);
            console.warn('[Email Notify Failed]', recipient.email, errStr);
            await logCollection.add({
              channel: 'email',
              to: recipient.email,
              type,
              status: 'failed',
              error: errStr,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        })()
      );
    }
  }

  await Promise.allSettled(tasks);
  return { whatsapp: whatsappSuccess, email: emailSuccess };
}

export async function notifyAll(
  recipients: Recipient[],
  type: string,
  vars: Record<string, string>,
  locale: Locale,
  familyId: string
): Promise<void> {
  const promises = recipients.map((r) => notify(r, type, vars, locale, familyId));
  await Promise.allSettled(promises);
}

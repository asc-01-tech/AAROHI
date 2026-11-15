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
    try {
      if (sid.startsWith('SK')) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        if (!accountSid) {
          console.warn('[Twilio] API Key SID (SK...) requires TWILIO_ACCOUNT_SID (AC...)');
          return null;
        }
        twilioClient = twilio(sid, token, { accountSid });
      } else {
        twilioClient = twilio(sid, token);
      }
    } catch (err) {
      console.error('[Twilio] Failed to initialize client:', err);
      return null;
    }
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

// ─── Direct OTP Dispatch Helpers ──────────────────────────────────────────

export async function sendOtpEmail(toEmail: string, otp: string): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[sendOtpEmail] Email transporter not configured');
    return false;
  }

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #fffbeb; border-radius: 24px; border: 2px solid #fde68a; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="font-size: 48px; line-height: 1;">💊</span>
      <h2 style="color: #92400e; font-size: 24px; font-weight: 800; margin: 8px 0 4px;">Aarohi Verification</h2>
      <p style="color: #b45309; font-size: 14px; font-weight: 600; margin: 0;">Your Family Care Companion</p>
    </div>
    <div style="background: white; border-radius: 18px; padding: 24px; text-align: center; border: 1px solid #fef08a;">
      <p style="color: #4b5563; font-size: 15px; margin-top: 0;">Use the 6-digit verification code below:</p>
      <div style="font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #d97706; margin: 20px 0; font-family: monospace;">
        ${otp}
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin-bottom: 0;">This code is valid for 10 minutes. For security, never share it with anyone.</p>
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"Aarohi Health" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `${otp} is your Aarohi verification code`,
      text: `Your Aarohi verification code is: ${otp}. Valid for 10 minutes.`,
      html,
    });
    return true;
  } catch (err) {
    console.error('[sendOtpEmail] Failed:', err);
    return false;
  }
}

export async function sendOtpPhone(phone: string, otp: string): Promise<boolean> {
  const client = getTwilio();
  if (!client) {
    console.warn('[sendOtpPhone] Twilio client not configured');
    return false;
  }

  const raw = phone.replace(/[^0-9+]/g, '');
  const formatted = raw.startsWith('+') ? raw : `+91${raw}`;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  const to = formatted.startsWith('whatsapp:') ? formatted : `whatsapp:${formatted}`;

  try {
    await client.messages.create({
      from,
      to,
      body: `💊 Aarohi Verification Code: *${otp}*\n\nValid for 10 minutes. Never share this code.`,
    });
    return true;
  } catch (err) {
    console.error('[sendOtpPhone] Failed:', err);
    return false;
  }
}

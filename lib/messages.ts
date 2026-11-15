// lib/messages.ts
// All notification templates and praise strings — trilingual.
// Keep this pure (no imports from firebase/server libs) so it can run anywhere.

import type { Locale } from './i18n';

// ─── Dose reminder templates ───────────────────────────────────────────────

export function msgUpcoming(
  nickname: string,
  medName: string,
  time: string,
  locale: Locale,
): string {
  if (locale === 'hi-IN')
    return `${nickname}, ${time} बजे ${medName} लेने का समय है 💊`;
  if (locale === 'mr-IN')
    return `${nickname}, ${time} वाजता ${medName} घेण्याची वेळ आहे 💊`;
  return `${nickname}, time for ${medName} at ${time} 💊`;
}

export function msgMissed(
  nickname: string,
  medName: string,
  locale: Locale,
): string {
  if (locale === 'hi-IN')
    return `${nickname}, आपने अभी तक ${medName} नहीं ली। अभी भी समय है, अभी ले लीजिए 🙏`;
  if (locale === 'mr-IN')
    return `${nickname}, तुम्ही अजून ${medName} घेतली नाही. अजून वेळ आहे, आत्ता घ्या 🙏`;
  return `${nickname}, you haven't taken ${medName} yet. Still time, take it now 🙏`;
}

export function msgEscalateCaretaker(
  nickname: string,
  medName: string,
  minutesOverdue: number,
  locale: Locale,
): string {
  if (locale === 'hi-IN')
    return `${nickname} ने अभी तक ${medName} नहीं ली (${minutesOverdue} मिनट बाद)। कृपया जांचें।`;
  if (locale === 'mr-IN')
    return `${nickname} ने अजून ${medName} घेतली नाही (${minutesOverdue} मिनिटे उशीर). कृपया तपासा.`;
  return `${nickname} hasn't taken ${medName} yet (${minutesOverdue} min overdue). Please check in.`;
}

export function msgEscalateFamily(
  nickname: string,
  medName: string,
  locale: Locale,
): string {
  if (locale === 'hi-IN')
    return `⚠️ ${nickname} ने ${medName} (महत्वपूर्ण दवा) 30 मिनट से नहीं ली। कृपया संपर्क करें।`;
  if (locale === 'mr-IN')
    return `⚠️ ${nickname} ने ${medName} (महत्त्वाचे औषध) 30 मिनिटांत घेतले नाही. कृपया संपर्क करा.`;
  return `⚠️ ${nickname} hasn't taken ${medName} (critical med) in 30 min. Please reach out.`;
}

export function msgFamilyDoseTaken(
  nickname: string,
  medName: string,
  locale: Locale,
): string {
  if (locale === 'hi-IN')
    return `${nickname} ने ${medName} ले ली ✅`;
  if (locale === 'mr-IN')
    return `${nickname} ने ${medName} घेतली ✅`;
  return `${nickname} took ${medName} ✅`;
}

// ─── Appointment reminders ─────────────────────────────────────────────────

export function msgAppt24h(
  nickname: string,
  doctorName: string,
  dateStr: string,
  locale: Locale,
): string {
  if (locale === 'hi-IN')
    return `${nickname}, कल ${dateStr} को Dr. ${doctorName} के साथ अपॉइंटमेंट है 📅`;
  if (locale === 'mr-IN')
    return `${nickname}, उद्या ${dateStr} रोजी Dr. ${doctorName} यांची भेट आहे 📅`;
  return `${nickname}, appointment with Dr. ${doctorName} tomorrow at ${dateStr} 📅`;
}

export function msgAppt2h(
  nickname: string,
  doctorName: string,
  timeStr: string,
  locale: Locale,
): string {
  if (locale === 'hi-IN')
    return `${nickname}, 2 घंटे में Dr. ${doctorName} के साथ अपॉइंटमेंट है (${timeStr}) 🏥`;
  if (locale === 'mr-IN')
    return `${nickname}, 2 तासात Dr. ${doctorName} यांची भेट आहे (${timeStr}) 🏥`;
  return `${nickname}, Dr. ${doctorName} appointment in 2 hours at ${timeStr} 🏥`;
}

// ─── Refill warning ────────────────────────────────────────────────────────

export function msgRefill(
  nickname: string,
  medName: string,
  daysLeft: number,
  locale: Locale,
): string {
  if (locale === 'hi-IN')
    return `${nickname} की ${medName} ${daysLeft} दिनों में खत्म हो जाएगी। रिफिल करवाएं 💊`;
  if (locale === 'mr-IN')
    return `${nickname} ची ${medName} ${daysLeft} दिवसात संपेल. रिफिल करा 💊`;
  return `${nickname}'s ${medName} runs out in ${daysLeft} days. Please refill 💊`;
}

// ─── Praise strings (CapsuleSplit celebration) ────────────────────────────

export const PRAISE: Record<Locale, string[]> = {
  'en-IN': [
    'Congratulations, {nickname}! You took your medicine! 🎉',
    'Well done, {nickname}! You\'re a champion! 🏆',
    'Amazing, {nickname}! Your health is your wealth! 🌟',
    'Superb, {nickname}! Family is proud of you! ❤️',
    'Brilliant, {nickname}! Keep it up! 💪',
  ],
  'hi-IN': [
    'वाह {nickname}, आप तो चैंपियन हो! 🏆',
    'शाबाश {nickname}! आपने दवाई ले ली! 🎉',
    'बहुत अच्छे {nickname}! परिवार को आप पर गर्व है! ❤️',
    'क्या बात है {nickname}! बहुत बढ़िया! 🌟',
    'जय हो {nickname}! सेहत सलामत रहे! 💪',
  ],
  'mr-IN': [
    'व्वा {nickname}, शाबास! 🏆',
    'अभिनंदन {nickname}! तुम्ही औषध घेतले! 🎉',
    'फारच छान {nickname}! कुटुंबाला तुमचा अभिमान आहे! ❤️',
    'वाह {nickname}! असेच राहा! 🌟',
    'एकदम मस्त {nickname}! आरोग्य हीच संपत्ती! 💪',
  ],
};

/** Pick a random praise string, substituting {nickname} */
export function randomPraise(nickname: string, locale: Locale): string {
  const pool = PRAISE[locale];
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace('{nickname}', nickname);
}

// ─── TTS announcement for upcoming dose ───────────────────────────────────

export function ttsUpcoming(
  nickname: string,
  medName: string,
  form: string,
  instructions: string,
  locale: Locale,
): string {
  if (locale === 'hi-IN')
    return `${nickname}, ${medName} लेने का समय है। ${instructions}`;
  if (locale === 'mr-IN')
    return `${nickname}, ${medName} घेण्याची वेळ आहे। ${instructions}`;
  const formLabel = form === 'capsule' ? 'capsule' : form === 'syrup' ? 'syrup' : 'tablet';
  return `${nickname}, take your ${medName}, one ${formLabel}. ${instructions}`;
}


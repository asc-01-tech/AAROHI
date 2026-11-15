// lib/i18n.ts
// Minimal i18n: locale codes, language names, and UI string look-ups.
// All user-facing strings for the elder UI live in lib/messages.ts instead.

export type Locale = 'en-IN' | 'hi-IN' | 'mr-IN';

export const LOCALES: Locale[] = ['en-IN', 'hi-IN', 'mr-IN'];

export const LOCALE_NAMES: Record<Locale, string> = {
  'en-IN': 'English',
  'hi-IN': 'हिंदी',
  'mr-IN': 'मराठी',
};

/** Short day-of-week labels for each locale */
export const DAY_NAMES: Record<Locale, string[]> = {
  'en-IN': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  'hi-IN': ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  'mr-IN': ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
};

/** Greeting by time of day */
export function timeGreeting(hour: number, locale: Locale, nickname: string): string {
  if (locale === 'hi-IN') {
    if (hour < 12) return `सुप्रभात ${nickname}! 🌅`;
    if (hour < 17) return `नमस्ते ${nickname}! ☀️`;
    return `शुभ संध्या ${nickname}! 🌙`;
  }
  if (locale === 'mr-IN') {
    if (hour < 12) return `सुप्रभात ${nickname}! 🌅`;
    if (hour < 17) return `नमस्कार ${nickname}! ☀️`;
    return `शुभ संध्या ${nickname}! 🌙`;
  }
  // en-IN default
  if (hour < 12) return `Good morning, ${nickname}! 🌅`;
  if (hour < 17) return `Good afternoon, ${nickname}! ☀️`;
  return `Good evening, ${nickname}! 🌙`;
}

/** Time-of-day theme tokens (Tailwind class strings) */
export function timeTheme(hour: number): {
  bg: string;
  card: string;
  accent: string;
  label: string;
} {
  if (hour < 12) {
    return {
      bg: 'from-amber-100 via-orange-100 to-yellow-50',
      card: 'bg-white/80',
      accent: 'text-amber-600',
      label: 'morning',
    };
  }
  if (hour < 17) {
    return {
      bg: 'from-orange-200 via-amber-100 to-yellow-100',
      card: 'bg-white/80',
      accent: 'text-orange-500',
      label: 'afternoon',
    };
  }
  return {
    bg: 'from-indigo-900 via-indigo-800 to-purple-900',
    card: 'bg-indigo-800/70',
    accent: 'text-indigo-200',
    label: 'night',
  };
}


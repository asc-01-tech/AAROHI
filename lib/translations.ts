// lib/translations.ts
// Trilingual UI strings for CareCircle (English, Marathi, Hindi).
// Medication names are NEVER translated and remain in English by default.

import type { Locale } from './i18n';

export interface Translations {
  streak: string;
  level: string;
  signOut: string;
  language: string;
  selectLanguage: string;
  close: string;
  noMedsToday: string;
  alreadyTakenToday: string;
  takenBadge: string;
  pullToTake: string;
  letTryAgain: string;
  listen: string;
  oneDose: string;
  stillTimeTake: (medName: string) => string;
  bottomTalk: string;
  bottomCamera: string;
  bottomAppts: string;
  bottomRecords: string;
  recordsTitle: string;
  tabProfile: string;
  tabMedsHistory: string;
  tabDocuments: string;
  bloodGroup: string;
  allergies: string;
  conditions: string;
  doctor: string;
  emergencyContact: string;
  recentVitals: string;
  logoutTitle: string;
  logoutDesc: string;
  logoutPasscodeLabel: string;
  logoutConfirm: string;
  logoutCancel: string;
  voiceTitle: string;
  voiceSubtitle: string;
  voiceTapPrompt: string;
  voiceListening: string;
  voiceThinking: string;
  voiceYouSaid: string;
  voiceAnswer: string;
}

export const UI_TRANSLATIONS: Record<Locale, Translations> = {
  'en-IN': {
    streak: 'Streak',
    level: 'Lv',
    signOut: 'Sign Out',
    language: 'Language',
    selectLanguage: 'Choose Your Language',
    close: 'Close',
    noMedsToday: 'No medications scheduled for today! 🎉',
    alreadyTakenToday: 'Already taken today ✅',
    takenBadge: 'Taken! ✅',
    pullToTake: 'Pull right to take',
    letTryAgain: "Let's try again 🙏",
    listen: 'Listen',
    oneDose: '1 dose',
    stillTimeTake: (med: string) => `Still time, take ${med} now 🙏`,
    bottomTalk: 'Talk',
    bottomCamera: 'Camera',
    bottomAppts: 'Visits',
    bottomRecords: 'Records',
    recordsTitle: 'Health Profile & Records',
    tabProfile: 'Medical Profile',
    tabMedsHistory: 'Past Meds History',
    tabDocuments: 'Prescriptions & Reports',
    bloodGroup: 'Blood Group',
    allergies: 'Allergies',
    conditions: 'Chronic Conditions',
    doctor: 'Primary Doctor',
    emergencyContact: 'Emergency Contact',
    recentVitals: 'Recent Vitals',
    logoutTitle: 'Sign Out & Lock',
    logoutDesc: 'To protect your scheduled medicines, enter your family 6-digit passcode to sign out.',
    logoutPasscodeLabel: 'Enter 6-Digit Passcode',
    logoutConfirm: 'Confirm Sign Out',
    logoutCancel: 'Cancel (Stay Signed In)',
    voiceTitle: 'Aarohi Voice Assistant',
    voiceSubtitle: 'Speak naturally to ask about your medications',
    voiceTapPrompt: 'Tap microphone to speak',
    voiceListening: 'Listening… speak now',
    voiceThinking: 'Thinking…',
    voiceYouSaid: 'You said',
    voiceAnswer: 'Aarohi Assistant',
  },
  'mr-IN': {
    streak: 'सातत्य',
    level: 'पातळी',
    signOut: 'बाहेर पडा',
    language: 'भाषा',
    selectLanguage: 'तुमची भाषा निवडा',
    close: 'बंद करा',
    noMedsToday: 'आजसाठी कोणतीही औषधे नाहीत! 🎉',
    alreadyTakenToday: 'आज घेतलेली औषधे ✅',
    takenBadge: 'घेतले! ✅',
    pullToTake: 'घेण्यासाठी उजवीकडे ओढा',
    letTryAgain: 'पुन्हा प्रयत्न करूया 🙏',
    listen: 'ऐका',
    oneDose: '१ डोस',
    stillTimeTake: (med: string) => `अजून वेळ आहे, ${med} आत्ता घ्या 🙏`,
    bottomTalk: 'संभाषण',
    bottomCamera: 'कॅमेरा',
    bottomAppts: 'भेटी',
    bottomRecords: 'कागदपत्रे',
    recordsTitle: 'आरोग्य माहिती व कागदपत्रे',
    tabProfile: 'वैद्यकीय माहिती',
    tabMedsHistory: 'मागील औषधे',
    tabDocuments: 'प्रिस्क्रिप्शन व रिपोर्ट्स',
    bloodGroup: 'रक्तगट',
    allergies: 'अलर्जी',
    conditions: 'दीर्घकालीन आजार',
    doctor: 'मुख्य डॉक्टर',
    emergencyContact: 'तातडीचा संपर्क',
    recentVitals: 'ताजी आरोग्य तपासणी',
    logoutTitle: 'सुरक्षित बाहेर पडा',
    logoutDesc: 'तुमच्या औषधांचे वेळापत्रक सुरक्षित ठेवण्यासाठी, कृपया ६ अंकी कौटुंबिक पासकोड टाका.',
    logoutPasscodeLabel: '६ अंकी पासकोड टाका',
    logoutConfirm: 'बाहेर पडण्याची खात्री करा',
    logoutCancel: 'रद्द करा (आतच रहा)',
    voiceTitle: 'आरोही व्हॉइस असिस्टंट',
    voiceSubtitle: 'औषधांची माहिती मिळवण्यासाठी बोला',
    voiceTapPrompt: 'बोलण्यासाठी माइक दाबा',
    voiceListening: 'ऐकत आहे… आता बोला',
    voiceThinking: 'विचार करत आहे…',
    voiceYouSaid: 'तुम्ही विचारले',
    voiceAnswer: 'आरोही उत्तर',
  },
  'hi-IN': {
    streak: 'क्रम',
    level: 'स्तर',
    signOut: 'लॉगआउट',
    language: 'भाषा',
    selectLanguage: 'अपनी भाषा चुनें',
    close: 'बंद करें',
    noMedsToday: 'आज के लिए कोई दवा निर्धारित नहीं है! 🎉',
    alreadyTakenToday: 'आज ली गई दवाइयां ✅',
    takenBadge: 'ले लिया! ✅',
    pullToTake: 'लेने के लिए दाईं ओर खींचें',
    letTryAgain: 'फिर से प्रयास करें 🙏',
    listen: 'सुनें',
    oneDose: '१ खुराक',
    stillTimeTake: (med: string) => `अभी भी समय है, ${med} अभी लें 🙏`,
    bottomTalk: 'बातचीत',
    bottomCamera: 'कैमरा',
    bottomAppts: 'अपॉइंटमेंट',
    bottomRecords: 'रिकॉर्ड्स',
    recordsTitle: 'स्वास्थ्य प्रोफ़ाइल व रिकॉर्ड्स',
    tabProfile: 'चिकित्सा प्रोफ़ाइल',
    tabMedsHistory: 'पिछली दवाइयाँ',
    tabDocuments: 'पर्चे व रिपोर्ट्स',
    bloodGroup: 'रक्त समूह',
    allergies: 'एलर्जी',
    conditions: 'पुरानी बीमारियाँ',
    doctor: 'प्राथमिक डॉक्टर',
    emergencyContact: 'आपातकालीन संपर्क',
    recentVitals: 'हालिया स्वास्थ्य जांच',
    logoutTitle: 'सुरक्षित लॉगआउट',
    logoutDesc: 'अपनी दवाइयों का शेड्यूल सुरक्षित रखने के लिए, कृपया ६ अंकों का पारिवारिक पासकोड दर्ज करें।',
    logoutPasscodeLabel: '६ अंकों का पासकोड दर्ज करें',
    logoutConfirm: 'लॉगआउट की पुष्टि करें',
    logoutCancel: 'रद्द करें (लॉगिन रहें)',
    voiceTitle: 'आरोही वॉइस असिस्टेंट',
    voiceSubtitle: 'अपनी दवाइयों के बारे में पूछने के लिए बोलें',
    voiceTapPrompt: 'बोलने के लिए माइक दबाएं',
    voiceListening: 'सुन रहे हैं… अब बोलिए',
    voiceThinking: 'सोच रहे हैं…',
    voiceYouSaid: 'आपने पूछा',
    voiceAnswer: 'आरोही उत्तर',
  },
};

/** Get translations for a locale, fallback to en-IN */
export function getTranslations(locale: Locale): Translations {
  return UI_TRANSLATIONS[locale] || UI_TRANSLATIONS['en-IN'];
}

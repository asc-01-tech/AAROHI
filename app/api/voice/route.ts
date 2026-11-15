// app/api/voice/route.ts
// AI-Powered Voice Clinical Assistant for Aarohi.
// Handles colloquial/visual pill questions ("Did I take the red pill?", "Have I taken the big pill?").
// Automatically detects health distress ("I am not feeling well") and triggers emergency caretaker alerts.

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { generateJSON } from '@/lib/gemini';
import { notify } from '@/lib/notify';
import { FieldValue } from 'firebase-admin/firestore';
import { withTiming } from '@/lib/withTiming';
import type { Locale } from '@/lib/i18n';

export const runtime = 'nodejs';

// Visual pill reference knowledge base
const PILL_VISUALS = [
  {
    medName: 'Vitamin D3',
    keywords: ['red', 'orange', 'softgel', 'capsule', 'लाल', 'लाल गोळी', 'लाल दवा'],
    descEn: 'red capsule',
    descMr: 'लाल कॅप्सूल',
    descHi: 'लाल कैप्सूल',
  },
  {
    medName: 'Metformin',
    keywords: ['big', 'large', 'white', 'diabetes', 'sugar', 'मोठी', 'बड़ी', 'सफेद', 'पांढरी', 'डायबिटीज'],
    descEn: 'big white tablet',
    descMr: 'मोठी पांढरी गोळी',
    descHi: 'बड़ी सफेद गोली',
  },
  {
    medName: 'Amlodipine',
    keywords: ['small', 'bp', 'blood pressure', 'pressure', 'लहान', 'छोटी', 'बीपी'],
    descEn: 'small round blood pressure pill',
    descMr: 'लहान बीपीची गोळी',
    descHi: 'छोटी बीपी की गोली',
  },
  {
    medName: 'Atorvastatin',
    keywords: ['night', 'evening', 'cholesterol', 'रात्री', 'रात्रीची', 'रात', 'कोलेस्ट्रॉल'],
    descEn: 'evening cholesterol pill',
    descMr: 'रात्रीची कोलेस्ट्रॉल गोळी',
    descHi: 'रात की कोलेस्ट्रॉल गोली',
  },
  {
    medName: 'Aspirin',
    keywords: ['heart', 'blood thinner', 'thinner', 'हार्ट', 'हृदय'],
    descEn: 'small heart aspirin pill',
    descMr: 'हृदयाची अस्पिरिन गोळी',
    descHi: 'दिल की एस्पिरिन गोली',
  },
];

export const POST = withTiming('POST /api/voice', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { familyId, memberId } = session;
  const body = await req.json();
  const { transcript, lang = 'en-IN' } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Missing transcript' }, { status: 400 });
    }

  const db = getAdminDb();
  const familyRef = db.collection('families').doc(familyId);

  // 1. Fetch family & elder profile
  const familyDoc = await familyRef.get();
  if (!familyDoc.exists) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  const familyData = familyDoc.data()!;
  const elder = familyData.elder || {};
  const nickname = elder.nickname || elder.name || 'Aba';
  const caretakerPhone = familyData.caretakerPhone || '';
  const caretakerEmail = familyData.caretakerEmail || '';
  const locale: Locale = (lang === 'mr-IN' || lang === 'hi-IN') ? lang : 'en-IN';

  // Find caretaker name
  const membersSnap = await familyRef.collection('members').where('role', '==', 'caretaker').limit(1).get();
  const caretakerName = membersSnap.docs[0]?.data()?.name || 'your caretaker';

  const lower = transcript.toLowerCase();

  // ──────────────────────────────────────────────────────────────────────────
  // FEATURE 1: EMERGENCY DISTRESS SOS TRIGGER ("I am not feeling well")
  // ──────────────────────────────────────────────────────────────────────────
  const isEmergency = /not feeling well|feel sick|unwell|dizzy|headache|pain|chest pain|fever|vomit|fell|help me|hurt|suffering|bare vatat nahi|बरे वाटत नाही|त्रास होतो|चक्कर|दुखत|छातीत|पडलो|मदत|अशक्त|tabiyat kharab|तबीयत खराब|दर्द|सीने में|गिर गया|उल्टी/i.test(lower);

  if (isEmergency) {
    // 1. Dispatch emergency alert to caretaker via WhatsApp and Email
    if (caretakerPhone || caretakerEmail) {
      notify(
        { phone: caretakerPhone, email: caretakerEmail, name: caretakerName },
        'EMERGENCY_ALERT',
        { detail: transcript },
        locale,
        familyId
      ).catch(err => console.warn('[Emergency notify error]', err));
    }

    // 2. Log urgent activity
    familyRef.collection('activityLog').add({
      actorId: memberId,
      actorName: nickname,
      action: 'EMERGENCY_ALERT',
      humanText: `🚨 URGENT HEALTH ALERT: ${ nickname } reported feeling unwell ("${transcript}") via Voice Assistant.`,
      createdAt: FieldValue.serverTimestamp(),
    }).catch(err => console.warn('[Emergency log error]', err));

    // 3. Return comforting reassurance in requested language
    const emergencyReply =
      locale === 'mr-IN'
        ? `${ nickname }, काळजी करू नका! मी त्वरित ${ caretakerName } यांना आणीबाणीचा संदेश पाठवला आहे.कृपया शांत बसा, थोडे पाणी प्या आणि विश्रांती घ्या.`
        : locale === 'hi-IN'
        ? `${ nickname }, चिंता मत कीजिए! मैंने तुरंत ${ caretakerName } को इमरजेंसी अलर्ट भेज दिया है। कृपया आराम से बैठिए और थोड़ा पानी पीजिए।`
        : `${ nickname }, please don't worry! I have alerted ${caretakerName} immediately. Please sit down comfortably, drink some water, and rest. Help is on the way.`;

    return NextResponse.json({
      intent: 'emergency_distress',
      params: { symptom: transcript },
      replyText: emergencyReply,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FEATURE 2: VISUAL & COLLOQUIAL PILL UNDERSTANDING ("Did I take the red pill?")
  // ──────────────────────────────────────────────────────────────────────────
  // Fetch today's doses from Firestore
  const todayStr = new Date(Date.now() + 330 * 60 * 1000).toISOString().split('T')[0];
  const dosesSnap = await familyRef.collection('doseEvents')
    .where('scheduledDate', '==', todayStr)
    .get();

  const todayDoses = dosesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  // Check which pill the elder is asking about by visual descriptor or name
  let matchedPill = PILL_VISUALS.find(p =>
    p.keywords.some(kw => lower.includes(kw.toLowerCase())) ||
    lower.includes(p.medName.toLowerCase())
  );

  if (matchedPill) {
    // Match fuzzy against today's doses
    const matchingDose = todayDoses.find(d => {
      const name = (d.medName || '').toLowerCase();
      const target = matchedPill!.medName.toLowerCase();
      return name.includes(target) || target.includes(name);
    });
    const pillLabel = locale === 'mr-IN' ? matchedPill.descMr : locale === 'hi-IN' ? matchedPill.descHi : matchedPill.descEn;

    if (matchingDose) {
      if (matchingDose.status === 'taken') {
        const reply =
          locale === 'mr-IN'
            ? `होय ${nickname}! तुम्ही आज तुमची ${pillLabel} (${matchingDose.medName}) आधीच घेतली आहे. सर्व सुरक्षित आहे! ✅`
            : locale === 'hi-IN'
              ? `हाँ ${nickname}! आपने आज अपनी ${pillLabel} (${matchingDose.medName}) पहले ही ले ली है। सब ठीक है! ✅`
              : `Yes, ${nickname}! You already took your ${pillLabel} (${matchingDose.medName}) today. You are all set! ✅`;

        return NextResponse.json({
          intent: 'confirm_dose',
          params: { medName: matchingDose.medName, status: 'taken' },
          replyText: reply,
        });
      } else {
        const reply =
          locale === 'mr-IN'
            ? `नाही ${nickname}. तुम्ही अजून आज तुमची ${pillLabel} (${matchingDose.medName}) घेतलेली नाही. ती तुमच्या स्क्रीनवर वाट पाहत आहे. कृपया आत्ता घ्या 🙏`
            : locale === 'hi-IN'
              ? `नहीं ${nickname}। आपने अभी तक आज अपनी ${pillLabel} (${matchingDose.medName}) नहीं ली है। वह आपकी स्क्रीन पर है, कृपया अभी ले लीजिए 🙏`
              : `No, ${nickname}. You haven't taken your ${pillLabel} (${matchingDose.medName}) today yet. It is ready on your screen now. Please take it with water 🙏`;

        return NextResponse.json({
          intent: 'ask_schedule',
          params: { medName: matchingDose.medName, status: 'pending' },
          replyText: reply,
        });
      }
    } else {
      // Pill is in medicine knowledge base but not scheduled for today
      const reply =
        locale === 'mr-IN'
          ? `${nickname}, तुमच्या आजच्या वेळापत्रकात ${pillLabel} (${matchedPill.medName}) नाही. इतर सर्व औषधे व्यवस्थित चालू आहेत.`
          : locale === 'hi-IN'
            ? `${nickname}, आपके आज के शेड्यूल में ${pillLabel} (${matchedPill.medName}) नहीं है। बाकी दवाइयाँ सही चल रही हैं।`
            : `${nickname}, you do not have ${pillLabel} (${matchedPill.medName}) scheduled for today. Everything else is on track.`;

      return NextResponse.json({
        intent: 'ask_schedule',
        params: { medName: matchedPill.medName, status: 'not_scheduled_today' },
        replyText: reply,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FEATURE 3: GENERAL AI-POWERED QUERY (Gemini Flash with Local Fallback)
  // ──────────────────────────────────────────────────────────────────────────
  const activeMedsSummary = todayDoses.map(d =>
    `- ${d.medName} (${d.status === 'taken' ? 'TAKEN' : 'PENDING'} at ${d.scheduledTime || 'today'})`
  ).join('\n');

  const aiPrompt = `
You are Aarohi, a warm, patient, and caring AI healthcare assistant speaking to an elderly person named ${nickname}.
Language requested: ${locale}
Patient's medications today:
${activeMedsSummary || 'Routine daily vitamins and blood pressure medicine'}
User said: "${transcript}"

Answer in 1-2 friendly, simple sentences in ${locale}.
If they ask what medicine is for, explain gently. Always keep medicine names in English.
Speak like a loving grandchild. Do not use jargon.
Return ONLY valid JSON:
{
  "intent": "ask_med_info" | "confirm_dose" | "ask_schedule" | "unknown",
  "replyText": "your comforting 1-2 sentence answer"
}
`;

  try {
    const aiRes = await generateJSON<any>(aiPrompt, 8000);
    if (aiRes && aiRes.replyText) {
      return NextResponse.json({
        intent: aiRes.intent || 'ask_med_info',
        params: {},
        replyText: aiRes.replyText,
      });
    }
  } catch {
    // Graceful fallback using local clinical schedule
  }

  // Clinical default response based on today's schedule
  const pendingCount = todayDoses.filter(d => d.status === 'pending').length;
  const takenCount = todayDoses.filter(d => d.status === 'taken').length;

  const defaultReply =
    locale === 'mr-IN'
      ? `${nickname}, आज तुम्ही ${takenCount} औषधे घेतली आहेत${pendingCount > 0 ? ` आणि ${pendingCount} औषधे बाकी आहेत` : ' आणि सर्व औषधे पूर्ण झाली आहेत'}. मी तुमच्या सेवेसाठी सदैव हजर आहे! ❤️`
      : locale === 'hi-IN'
        ? `${nickname}, आज आपने ${takenCount} दवाइयां ले ली हैं${pendingCount > 0 ? ` और ${pendingCount} दवाइयां बाकी हैं` : ' और सभी दवाइयां पूरी हो गई हैं'}। मैं हमेशा आपकी मदद के लिए यहाँ हूँ! ❤️`
        : `${nickname}, you have taken ${takenCount} medicines today${pendingCount > 0 ? ` and have ${pendingCount} remaining` : ' and finished all doses for today'}. I am always here to help you! ❤️`;

  return NextResponse.json({
    intent: 'ask_schedule',
    params: { pendingCount: String(pendingCount) },
    replyText: defaultReply,
  });
});

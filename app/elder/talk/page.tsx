// app/elder/talk/page.tsx
// Voice Assistant UI for Elder
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mic, MicOff, Volume2 } from 'lucide-react';
import { speak, vibrate } from '@/lib/feedback';
import type { Locale } from '@/lib/i18n';
import { getTranslations } from '@/lib/translations';

export default function TalkPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('en-IN');
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [intent, setIntent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    // Read locale from URL or per-user localStorage
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang') as Locale | null;
    if (urlLang && (urlLang === 'mr-IN' || urlLang === 'hi-IN' || urlLang === 'en-IN')) {
      setLocale(urlLang);
      return;
    }
    try {
      const stored = localStorage.getItem('carecircle_user_locale') as Locale | null;
      if (stored && (stored === 'mr-IN' || stored === 'hi-IN' || stored === 'en-IN')) {
        setLocale(stored);
      }
    } catch { }
  }, []);

  const t = getTranslations(locale);

  const processQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setTranscript(queryText);
    setListening(false);
    setLoading(true);
    setResponse('');
    setIntent('');

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: queryText, lang: locale }),
      });

      const data = await res.json();
      setResponse(data.replyText || 'I am here for you.');
      setIntent(data.intent || '');
      speak(data.replyText, locale);
    } catch {
      const fallback = locale === 'mr-IN'
        ? 'मी तुमच्या सेवेसाठी सदैव हजर आहे. कृपया पुन्हा विचारून पहा.'
        : locale === 'hi-IN'
        ? 'मैं आपकी मदद के लिए यहाँ हूँ। कृपया दोबारा बोलें।'
        : 'I am here for you. Please try speaking again.';
      setResponse(fallback);
      speak(fallback, locale);
    } finally {
      setLoading(false);
    }
  };

  const handleStartListening = () => {
    vibrate([40]);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice microphone recognition is not supported in this browser. You can tap any suggestion chip or type below!');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = locale;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setTranscript('');
      setResponse('');
      setIntent('');
    };

    recognition.onresult = async (event: any) => {
      const speechToText = event.results[0][0].transcript;
      processQuery(speechToText);
    };

    recognition.onerror = () => {
      setListening(false);
      setLoading(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  // Suggestion chips localized
  const SUGGESTIONS = {
    'mr-IN': [
      { label: '🔴 लाल गोळी घेतली का?', query: 'Did I take the red pill?' },
      { label: '⚪ मोठी गोळी घेतली का?', query: 'Did I take the big pill?' },
      { label: '💊 आज कोणती औषधे बाकी आहेत?', query: 'What medicines are left today?' },
      { label: '🚨 मला बरे वाटत नाही (SOS)', query: 'मला बरे वाटत नाही, मदत हवी आहे' },
    ],
    'hi-IN': [
      { label: '🔴 लाल वाली गोली ली क्या?', query: 'Did I take the red pill?' },
      { label: '⚪ बड़ी वाली गोली ली क्या?', query: 'Did I take the big pill?' },
      { label: '💊 आज कौन सी दवाइयाँ बची हैं?', query: 'What medicines are left today?' },
      { label: '🚨 मेरी तबीयत खराब है (SOS)', query: 'मेरी तबीयत खराब है, मदद चाहिए' },
    ],
    'en-IN': [
      { label: '🔴 Did I take the red pill?', query: 'Did I take the red pill?' },
      { label: '⚪ Did I take the big pill?', query: 'Did I take the big pill?' },
      { label: '💊 What medicines left today?', query: 'What medicines are left today?' },
      { label: '🚨 I am not feeling well (SOS)', query: 'I am not feeling well' },
    ],
  };

  const chips = SUGGESTIONS[locale] || SUGGESTIONS['en-IN'];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex flex-col justify-between p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/80 backdrop-blur rounded-2xl shadow-sm text-gray-700"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-black text-amber-800 text-lg">Aarohi Voice</span>
        <div className="w-10" />
      </div>

      {/* Main Conversation Container */}
      <div className="flex-1 flex flex-col justify-center items-center py-6 space-y-4">
        {/* Emergency SOS Banner if triggered */}
        {intent === 'emergency_distress' && (
          <div className="w-full bg-red-600 text-white rounded-3xl p-5 shadow-2xl border-4 border-red-300 animate-pulse text-center space-y-2">
            <div className="text-4xl">🚨</div>
            <p className="text-lg font-black tracking-wide uppercase">
              {locale === 'mr-IN' ? 'आणीबाणी अलर्ट पाठवला!' : locale === 'hi-IN' ? 'इमरजेंसी अलर्ट भेजा गया!' : 'EMERGENCY SOS DISPATCHED!'}
            </p>
            <p className="text-sm font-semibold text-red-100">
              {locale === 'mr-IN'
                ? 'काळजीवाहू आणि कुटुंबीयांना तातडीचा संदेश पाठवला गेला आहे. मदत पोहोचत आहे.'
                : locale === 'hi-IN'
                ? 'केयरटेकर और परिवार को तुरंत संदेश भेजा गया है। मदद आ रही है।'
                : 'Caretaker & family members notified via instant alert. Help is on the way.'}
            </p>
          </div>
        )}

        {transcript && (
          <div className="bg-white rounded-3xl p-5 shadow-md border border-amber-100 max-w-sm w-full text-center">
            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">{t.voiceYouSaid}</p>
            <p className="text-lg font-bold text-gray-800">&quot;{transcript}&quot;</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 bg-amber-500/10 text-amber-900 px-5 py-3 rounded-full font-bold text-base animate-pulse">
            <span>{t.voiceThinking}</span>
          </div>
        )}

        {response && (
          <div className={`text-white rounded-3xl p-6 shadow-xl max-w-sm w-full text-center space-y-3 ${
            intent === 'emergency_distress' ? 'bg-red-700' : 'bg-amber-600'
          }`}>
            <p className="text-xl font-bold leading-relaxed">{response}</p>
            <button
              onClick={() => speak(response, locale)}
              className="inline-flex items-center gap-1.5 text-xs bg-black/20 hover:bg-black/30 px-4 py-2 rounded-full font-bold text-white transition"
            >
              <Volume2 className="w-4 h-4" /> {t.listen}
            </button>
          </div>
        )}

        {!transcript && !response && (
          <div className="text-center space-y-3">
            <p className="text-2xl font-black text-amber-950">{t.voiceTapPrompt}</p>
            <p className="text-sm font-medium text-amber-800/80 max-w-xs">
              {locale === 'mr-IN'
                ? 'माइक दाबा किंवा खालील पर्यायांवर टॅप करा:'
                : locale === 'hi-IN'
                ? 'माइक दबाएं या नीचे दिए विकल्पों पर टैप करें:'
                : 'Tap microphone to speak, or tap any question below:'}
            </p>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="w-full max-w-sm pt-2">
          <p className="text-xs font-bold text-amber-900/60 uppercase tracking-widest text-center mb-2">
            {locale === 'mr-IN' ? 'झटपट प्रश्न' : locale === 'hi-IN' ? 'त्वरित प्रश्न' : 'Quick Voice Queries'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {chips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => processQuery(chip.query)}
                className={`p-3 text-left rounded-2xl text-xs font-bold transition shadow-sm ${
                  chip.label.includes('🚨')
                    ? 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-300'
                    : 'bg-white/90 hover:bg-white text-gray-800 border border-amber-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Microphone Interaction Button & Fallback Input */}
      <div className="flex flex-col items-center space-y-3 pb-4">
        <button
          onClick={handleStartListening}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform active:scale-95 ${
            listening
              ? 'bg-rose-500 ring-8 ring-rose-200 animate-pulse'
              : 'bg-amber-500 ring-8 ring-amber-200 hover:bg-amber-600'
          }`}
          aria-label="Start speaking"
        >
          {listening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
        </button>
        <p className="text-xs font-bold text-amber-900/60 uppercase tracking-widest">
          {listening ? t.voiceListening : t.voiceTapPrompt}
        </p>

        {/* Keyboard Input Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (textInput.trim()) {
              processQuery(textInput);
              setTextInput('');
            }
          }}
          className="w-full max-w-sm flex gap-2 pt-2"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              locale === 'mr-IN'
                ? 'किंवा येथे प्रश्न टाईप करा...'
                : locale === 'hi-IN'
                ? 'या यहाँ सवाल टाइप करें...'
                : 'Or type a question...'
            }
            className="flex-1 bg-white/90 border border-amber-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}

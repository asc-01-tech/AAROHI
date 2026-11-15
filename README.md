# 💊 Aarohi — Your Family Care Companion

> **Hackathon Submission** | Challenge Vertical: **Elder Care / Healthcare Assistant**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-aarohi--bice.vercel.app-orange?style=for-the-badge)](https://aarohi-bice.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-asc--01--tech%2FAAROHI-black?style=for-the-badge&logo=github)](https://github.com/asc-01-tech/AAROHI)

---

## 1. Chosen Vertical

**Elder Care / Healthcare Assistant**

Aarohi is a smart, AI-powered family medication management platform designed around the persona of an **Indian elderly person** living with their family. It bridges the communication gap between elderly patients, their primary caretakers, and remote family members — making daily medication adherence safe, simple, and stress-free.

---

## 2. Project Description

Aarohi (meaning *"ascending"* in Hindi) is a progressive web app that acts as a **shared family care hub**. The elderly user gets a simplified, elder-friendly interface to log medication doses and check in. The caretaker gets a full dashboard to manage prescriptions, track adherence, and receive alerts. Family members stay informed in real time.

The app is built around a **single shared Family Workspace** — one passcode, one family, everyone connected.

---

## 3. Approach and Logic

### Core Design Decisions

| Decision | Rationale |
|---|---|
| **Family workspace model** | A single shared ID + 6-digit passcode lets elders log in without usernames/passwords |
| **Role-based access** | Elder, Caretaker, and Family roles control what each person can see and do |
| **AI-powered features** | Gemini 2.5 Flash handles prescription scanning, drug interaction checks, and voice responses |
| **No app install required** | PWA works on any phone browser — critical for adoption among elderly users |
| **Offline support** | Firebase persistent cache ensures the elder's screen loads even with poor connectivity |
| **Multi-channel alerts** | WhatsApp + Gmail notifications so caretakers never miss a missed dose |

### How AI is Used (Smart, Dynamic Assistant)

1. **Prescription Scan** (`/api/scan`) — Caretaker photographs a prescription; Gemini Vision extracts medication name, dosage, frequency, and duration automatically.
2. **Drug Interaction Check** (`/api/interactions`) — Before adding a new medication, Gemini checks it against all current medications for dangerous interactions.
3. **AI Explain** (`/api/explain`) — Elders or caretakers can ask "what is this medicine for?" in natural language and get a plain-language explanation.
4. **Voice Interface** (`/api/voice`) — Elders can speak commands ("I took my morning pill") and Aarohi processes and logs the dose via voice.
5. **Contextual Decision Making** — The AI adapts responses to the elder's preferred language (English, Hindi, or Marathi) and uses their nickname for a personalized experience.

### Logical Decision Making

```
User logs in
   ├── Elder → Simplified dashboard: today's doses, check-in, hug caretaker
   ├── Caretaker → Full dashboard: medications, adherence streak, alerts, appointments
   └── Family → Read-only view: elder's status, activity log, notifications

Medication due?
   ├── Cron tick (every 15 min) → Check missed doses
   ├── Missed? → WhatsApp alert to caretaker (10-min grace)
   ├── Still missed? → Escalate to all family members (30-min grace)
   └── Taken? → Update streak, celebrate milestone

Change request flow:
   Caretaker proposes change → Elder sees notification → Elder approves/rejects
```

---

## 4. How the Solution Works

### Authentication Flow
1. **Setup** — Caretaker creates a Family Workspace (elder info, their own contact, 6-digit passcode)
2. **Login** — Any family member enters the Family ID + passcode, then selects their role
3. **Google Sign-In** — Caretakers can also sign in with Google (matched by email)
4. **Email OTP** — Alternative verification via 6-digit OTP sent to registered email
5. **Session** — HMAC-SHA256 JWT cookie (httpOnly, 30-day, secure in production)

### Medication Management
- Caretaker adds medications with name, dose, frequency, timing, and duration
- System generates daily `doseEvents` (via cron or on first access)
- Elder marks doses as taken with one tap from their simplified view
- Caretaker can propose changes; elder must approve (elder-first consent model)

### Notifications & Alerts
- **WhatsApp** (Twilio Sandbox) — dose reminders, missed alerts, escalations
- **Email** (Gmail SMTP) — OTP delivery, appointment reminders, weekly reports

### AI Features in Detail
- Prescription photo → Gemini Vision → auto-filled medication form
- Drug interaction analysis → structured JSON response → warning UI
- Natural language dose logging → intent parsing → Firestore update
- Medication explanation → plain-language response in chosen language

### Architecture

```
Next.js 16 (App Router)
├── app/(auth)/          → Login & Setup pages
├── app/care/            → Caretaker dashboard
├── app/elder/           → Elder-simplified view
├── app/api/             → REST API routes (server-side only)
│   ├── auth/            → Setup, login, logout, Google, OTP
│   ├── meds/            → CRUD medication management
│   ├── doses/           → Dose events & take action
│   ├── appointments/    → Appointment management
│   ├── scan/            → AI prescription scanning
│   ├── interactions/    → AI drug interaction check
│   ├── explain/         → AI medication explanation
│   ├── voice/           → AI voice command processing
│   ├── cron/tick        → Scheduled missed-dose checker
│   └── hugs/            → Virtual hug notifications
└── lib/
    ├── firebaseAdmin.ts → Firestore + native RS256 token minting
    ├── firebaseClient.ts→ Client SDK with offline persistence
    ├── session.ts       → Native HMAC-SHA256 JWT (zero external deps)
    ├── gemini.ts        → Gemini AI client
    └── notify.ts        → Email + WhatsApp notification helpers
```

---

## 5. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, React 19) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Database** | Firebase Firestore (real-time, offline-capable) |
| **Auth** | Firebase Auth (Custom Tokens, Google Sign-In, Email OTP) |
| **AI / LLM** | Google Gemini 2.5 Flash (vision + text) |
| **Notifications** | Twilio WhatsApp Sandbox + Nodemailer (Gmail SMTP) |
| **Deployment** | Vercel (Edge-compatible, Node.js 20 runtime) |
| **Validation** | Zod |
| **Animations** | Framer Motion |
| **Security** | Native Node.js `crypto` — no external JWT libraries |

---

## 6. Local Setup

### Prerequisites
- Node.js 20+
- Git
- Firebase project (Firestore enabled)
- Google Gemini API key
- Gmail account with App Password enabled
- Twilio account (optional, for WhatsApp)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/asc-01-tech/AAROHI.git
cd AAROHI/carecircle

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Fill in all values in .env.local (see below)

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```env
# Firebase Client SDK (public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (service account)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=          # Include full PEM with \n newlines

# Google Gemini AI
GEMINI_API_KEY=

# Gmail (OTP emails)
GMAIL_USER=
GMAIL_APP_PASSWORD=            # Gmail App Password (not account password)

# Twilio WhatsApp (optional)
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Session & Security
SESSION_SECRET=                # Random 32+ char string
CRON_SECRET=                   # Random string to protect cron endpoint

# App URL
APP_URL=http://localhost:3000  # Set to your Vercel URL in production
```

---

## 7. Assumptions Made

1. **Single family per workspace** — One elder per workspace (many caretakers/family members can join using the same ID + passcode).
2. **Indian context** — UI defaults assume Indian phone format (+91), and language options are English, Hindi, and Marathi. Timezone is `Asia/Kolkata`.
3. **Shared passcode model** — The 6-digit family passcode is shared; it prioritizes simplicity for elders over individual account security.
4. **Caretaker is the admin** — The caretaker who creates the workspace has full management permissions; elders have read + dose-taking permissions.
5. **WhatsApp Sandbox** — Twilio's free WhatsApp sandbox is used. Recipients must opt-in by sending "join [code]" to the sandbox number before receiving messages.
6. **Prescription AI is advisory** — AI-extracted medication data from photos is always shown to the caretaker for review before saving — never auto-saved.
7. **Elder-first consent** — Any medication change proposed by a caretaker must be approved by the elder (change request workflow).
8. **Stateless cron** — The `/api/cron/tick` endpoint is designed to be called by Vercel Cron Jobs every 15 minutes; it is idempotent and protected by `CRON_SECRET`.

---

## 8. Key Features Summary

- 🏠 **Family Workspace** — Shared ID + passcode for the whole family
- 👴 **Elder-Friendly UI** — Large text, one-tap dose logging, voice support
- 👩‍⚕️ **Caretaker Dashboard** — Full medication CRUD, adherence streaks, dose history
- 🤖 **AI Prescription Scan** — Photo → auto-filled medication form via Gemini Vision
- ⚠️ **Drug Interaction Checker** — AI safety check before adding new medications
- 🔔 **Multi-channel Alerts** — WhatsApp + Email for missed doses and appointments
- 🌱 **Streak & Gamification** — Adherence streaks, plant-growing metaphor, milestone celebrations
- 🤗 **Virtual Hugs** — Family members can send encouragement to the elder
- 📅 **Appointment Tracking** — Doctor appointments with reminders
- 🔐 **Secure Auth** — Google Sign-In, Email OTP, native RS256 JWT (zero external auth deps)
- 📶 **Offline Support** — Firebase persistent cache; works on slow/no network

---

## 9. Project Structure

```
carecircle/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Login page (passcode + Google + OTP)
│   │   └── setup/          # Family workspace creation
│   ├── care/               # Caretaker dashboard
│   ├── elder/              # Elder simplified view
│   ├── offline/            # Offline fallback page
│   └── api/                # All API route handlers
├── components/             # Shared UI components
├── lib/                    # Core utilities
│   ├── firebaseAdmin.ts    # Admin SDK + custom token minting
│   ├── firebaseClient.ts   # Client SDK with offline persistence
│   ├── gemini.ts           # Gemini AI wrapper
│   ├── notify.ts           # Email + WhatsApp helpers
│   ├── session.ts          # JWT session management
│   └── withTiming.ts       # API timing middleware
├── public/                 # Static assets, PWA icons
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore composite indexes
├── next.config.ts          # Next.js configuration
└── vercel.json             # Vercel deployment config
```

---

## 10. Live Demo

🌐 **[https://aarohi-bice.vercel.app](https://aarohi-bice.vercel.app)**

**To try it out:**
1. Go to the live URL → click **"Create a family workspace"**
2. Fill in elder name, nickname, your contact details, and a 6-digit passcode
3. Note your **Family ID** shown on the success screen
4. Log out and log back in with your Family ID + passcode to see the full dashboard

---

*Built with ❤️ for the hackathon — making elder care smarter, safer, and more connected.*

import { NextResponse } from 'next/server';
import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai';

/**
 * Mints an ephemeral auth token for a browser-side Gemini Live session.
 *
 * The real `GEMINI_API_KEY` never reaches the client. Instead the whole session
 * shape (model, modality, persona, voice, transcription) is baked into the
 * token's `liveConnectConstraints`. Because `lockAdditionalFields` is omitted,
 * every field of `LiveConnectConfig` is locked server-side — anything the
 * browser tries to override is silently ignored by the API, so the system
 * instruction cannot be tampered with from devtools.
 */

type SupportedLocale = 'en' | 'ar';

const BASE_PERSONA = `You are an intelligent, articulate voice assistant and technical coordinator representing Omar Gamal on his engineering portfolio website.
You are your own distinct individual speaking on Omar's behalf — never pretend to be Omar yourself. Always refer to Omar in the third person ("Omar", "he", "him").

CORE CAPABILITIES & SCOPE:
Omar is an elite senior full-stack engineer, systems architect, and polyglot builder who can build virtually any production software, web platform, mobile app, desktop engine, hardware integration, or AI-powered system.
Never say no to technical requests or client inquiries — Omar is not limited to any single tech stack. Whether a client needs Python, Rust, Go, TypeScript, C++, React, Next.js, Angular, Vue, Flutter, iOS/Android mobile apps, cloud infrastructure on AWS/GCP, enterprise ERPs, distributed databases, or complex multi-step AI pipelines, Omar can architect and deliver high-performance solutions. If asked whether Omar can build or work with a specific technology or domain, respond with an enthusiastic yes and explain his rapid adaptability and deep architectural expertise.

AI BOUNDARIES & SPECIALIZATION (IMPORTANT):
Omar is an AI systems engineer and architect who builds end-to-end AI-powered applications, autonomous agent workflows, document parsing/OCR pipelines, RAG systems, and real-time voice integrations.
He does NOT specialize in training foundational LLMs from scratch, fine-tuning raw machine learning weights, or theoretical ML research. If asked about training proprietary LLMs from zero, clarify politely that his focus is on architecting production-grade AI-powered applications, pipelines, and integrations rather than model weight pre-training.

PROJECT REFERENCES & CONTEXTUAL GROUNDING:
Whenever applicable, naturally mention relevant portfolio projects as concrete proof points of Omar's work:
- If asked about AI-powered applications, recruitment tech, or resume/document parsing: Reference Kafa'a (an enterprise AI recruitment platform with resume OCR and automated candidate interview intelligence) or AI Career Flow.
- If asked about Real-Time Voice AI, telephony, call centers, or audio DSP: Reference Bionicverse (a carrier-grade sub-200ms Twilio-to-Gemini Live telephony gateway) or Talking AI Terminal (real-time voice with live spectrogram oscilloscope).
- If asked about Offline-First, logistics, warehouses, inventory, or desktop apps: Reference SkyCourt Warehouse Engine (an offline-first inventory system with Turso LibSQL embedded replicas and Tauri desktop) or Step Coworking POS.
- If asked about Local-First data, high-speed SQLite, or markdown PKM: Reference Hard Turso Notes (an OPFS SQLite engine with 0.38ms read latency and live edge sync).
- If asked about Luxury web design, WebGL shaders, 3D graphics, or GSAP motion: Reference O2MATION Agency Flagship, SkyCourt Commercial Portal, or Abaad Architecture.
- If asked about Real estate, PropTech, or financial calculations: Reference DealsHub Luxury Real Estate (with interactive blueprints and mortgage amortization schedules).
- If asked about AI agent orchestration or developer tooling: Reference Antigravity Workflow Suite (a 2-tier agent orchestration system with persistent memory vaults).

CONVERSATIONAL RULES & CADENCE:
- Be warm, articulate, and direct. Avoid repetitive boilerplate filler or polite padding.
- For standard or straightforward inquiries, be crisp and concise: give a direct, punchy answer in 1 to 2 spoken sentences with a brief project mention if relevant.
- For complex, multi-part, or deep architectural questions that require technical thinking, provide a thoughtful, layered breakdown in 3 to 4 spoken sentences.
- Spoken audio delivery only: never output markdown symbols, bullet points, numbered lists, or headers.
- Only direct visitors to the contact section when they specifically ask about hiring, rates, availability, or starting a project.`;

/** Persona + speech settings per locale. Server-only: these are not UI strings. */
const LOCALE_CONFIG: Record<
  SupportedLocale,
  { instruction: string; languageCode: string; voiceName: string }
> = {
  en: {
    instruction: `${BASE_PERSONA}\nSpeak with a refined British accent, clear diction, and natural cadence. Respond in British English unless the visitor speaks another language, in which case mirror their language.`,
    languageCode: 'en-GB',
    voiceName: 'Aoede'
  },
  ar: {
    instruction: `${BASE_PERSONA}\nRespond in Modern Standard Arabic by default in a polite, highly capable professional female assistant tone. Emphasize that Omar can engineer any software or AI system across all technologies, citing his projects (like كفاءة, بيونيك فيرس, سكاي كورت) when relevant. If the visitor switches to English, mirror their language. Keep technical product names in Latin script.`,
    languageCode: 'ar-EG',
    voiceName: 'Aoede'
  }
};

function resolveLocale(value: unknown): SupportedLocale {
  return value === 'ar' ? 'ar' : 'en';
}

/* --------------------------------------------------------------------------
   Lightweight abuse guard
   --------------------------------------------------------------------------
   This route mints billable live sessions, so a public unauthenticated POST
   needs at least a speed bump. The window lives in module scope, which means
   it is per-instance (best effort on serverless) — enough to stop trivial
   scripted farming, not a substitute for KV/Redis if traffic ever justifies it.
   -------------------------------------------------------------------------- */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_TOKENS = 5;
const hits = new Map<string, number[]>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** @returns seconds to wait, or `null` when the request is allowed. */
function rateLimit(ip: string): number | null {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);

  if (recent.length >= RATE_MAX_TOKENS) {
    hits.set(ip, recent);
    return Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000);
  }

  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic sweep so the map cannot grow unbounded.
  if (hits.size > 500) {
    for (const [key, stamps] of hits) {
      if (stamps.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(key);
    }
  }

  return null;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY environment variable is not set.' },
      { status: 500 }
    );
  }

  const retryAfter = rateLimit(clientIp(request));
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: 'Too many voice sessions from this address. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  const body = await request.json().catch(() => null);
  const locale = resolveLocale(
    body && typeof body === 'object' ? (body as { locale?: unknown }).locale : undefined
  );
  const { instruction, languageCode, voiceName } = LOCALE_CONFIG[locale];

  try {
    const ai = new GoogleGenAI({ apiKey });

    const token = await ai.authTokens.create({
      config: {
        // One session per token; the client fetches a fresh one on each connect.
        uses: 1,
        // Short-lived on purpose: limits the blast radius of a leaked token.
        expireTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: 'models/gemini-3.1-flash-live-preview',
          config: {
            // Native audio models are audio-out only; the on-screen transcript
            // comes from outputAudioTranscription, not a TEXT modality.
            responseModalities: [Modality.AUDIO],
            systemInstruction: { parts: [{ text: instruction }] },
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } },
              languageCode
            },
            inputAudioTranscription: {
              languageHints: { languageCodes: [languageCode] }
            },
            outputAudioTranscription: {},
            // Lowest latency; this is a conversational widget, not a reasoner.
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            // Keeps long chats alive past the uncompressed 15-minute ceiling.
            contextWindowCompression: { slidingWindow: {} }
          }
        },
        // Ephemeral token support is v1alpha only.
        httpOptions: { apiVersion: 'v1alpha' }
      }
    });

    if (!token.name) {
      throw new Error('Gemini returned an auth token without a name.');
    }

    return NextResponse.json(
      { token: token.name },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create ephemeral token';
    console.error('Error creating ephemeral token:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

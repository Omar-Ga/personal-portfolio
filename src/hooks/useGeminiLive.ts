"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI, type LiveServerMessage, type Session } from '@google/genai';

/* ==========================================================================
   Gemini Live session hook
   --------------------------------------------------------------------------
   Owns the whole realtime pipeline for the voice assistant:

     mic  →  AudioContext @ 16 kHz  →  AudioWorklet (PCM16)  →  sendRealtimeInput
     model → base64 PCM16 @ 24 kHz  →  AudioContext @ 24 kHz  →  scheduled sources

   The two sample rates are non-negotiable: the Live API takes 16 kHz mono PCM
   in and emits 24 kHz mono PCM out. Sharing one default-rate context (usually
   48 kHz) makes the model hear you at a third speed and makes it sound like a
   chipmunk on the way back, so each direction gets its own context.

   Audio levels are exposed through `getLevels()` rather than React state — the
   orb reads them straight from the render loop, so a 60 fps visualiser never
   triggers a single re-render.
   ========================================================================== */

const MODEL = 'gemini-3.1-flash-live-preview';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const CAPTURE_WORKLET_URL = '/worklets/pcm-capture-worklet.js';

/** Small lead so the first scheduled buffer never lands in the past. */
const PLAYBACK_LEAD_S = 0.08;

export type LivePhase =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'ai';
  text: string;
  /** False while the turn is still streaming in. */
  final: boolean;
}

/** Normalised 0..1 envelopes used to drive the orb. */
export interface AudioLevels {
  /** Overall RMS of whichever side is currently active. */
  level: number;
  low: number;
  mid: number;
  high: number;
}

export interface GeminiLiveHook {
  phase: LivePhase;
  transcript: TranscriptEntry[];
  error: string | null;
  isMuted: boolean;
  /** True once a session is open, regardless of who is talking. */
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendText: (text: string) => void;
  toggleMute: () => void;
  getLevels: () => AudioLevels;
}

const SILENT_LEVELS: AudioLevels = { level: 0, low: 0, mid: 0, high: 0 };

/* --------------------------------------------------------------------------
   Binary helpers
   -------------------------------------------------------------------------- */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Chunked so a long buffer cannot blow the argument limit of String.fromCharCode.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}

/**
 * Creates a context at an exact rate. Firefox and Chrome honour the request;
 * anything that throws or silently lands on a different rate falls back to the
 * hardware rate, and callers resample.
 */
function createContext(sampleRate: number): AudioContext {
  const Ctor: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  try {
    return new Ctor({ sampleRate });
  } catch {
    return new Ctor();
  }
}

/** Cheap linear resample, only used when a browser refuses an explicit rate. */
function resampleLinear(
  input: Float32Array,
  from: number,
  to: number
): Float32Array<ArrayBuffer> {
  const ratio = from / to;
  const output = new Float32Array(Math.round(input.length / ratio));
  for (let i = 0; i < output.length; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    output[i] = a + (b - a) * frac;
  }
  return output;
}

/** RMS + 3-band split from a single analyser. */
function readAnalyser(
  analyser: AnalyserNode,
  timeBuf: Uint8Array,
  freqBuf: Uint8Array
): AudioLevels {
  analyser.getByteTimeDomainData(timeBuf as Uint8Array<ArrayBuffer>);
  let sumSquares = 0;
  for (let i = 0; i < timeBuf.length; i++) {
    const centred = (timeBuf[i] - 128) / 128;
    sumSquares += centred * centred;
  }
  // Speech RMS rarely exceeds ~0.3, so scale up before clamping.
  const rms = Math.sqrt(sumSquares / timeBuf.length);
  const level = Math.min(1, rms * 3.2);

  analyser.getByteFrequencyData(freqBuf as Uint8Array<ArrayBuffer>);
  const third = Math.max(1, Math.floor(freqBuf.length / 3));
  const bandAverage = (start: number, end: number) => {
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqBuf[i];
    return sum / ((end - start) * 255);
  };

  return {
    level,
    low: bandAverage(0, third),
    mid: bandAverage(third, third * 2),
    high: bandAverage(third * 2, freqBuf.length)
  };
}

let entrySeed = 0;
const nextEntryId = () => `live-${Date.now().toString(36)}-${(entrySeed++).toString(36)}`;

/* --------------------------------------------------------------------------
   Hook
   -------------------------------------------------------------------------- */

export function useGeminiLive(locale: string): GeminiLiveHook {
  const [phase, setPhase] = useState<LivePhase>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const captureNodeRef = useRef<AudioWorkletNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);

  /** Scratch buffers, allocated once — `getLevels` runs every frame. */
  const timeBufRef = useRef<Uint8Array | null>(null);
  const freqBufRef = useRef<Uint8Array | null>(null);
  const smoothedRef = useRef<AudioLevels>({ ...SILENT_LEVELS });

  /** Playback scheduling cursor and the set of still-playing sources. */
  const nextStartRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const phaseRef = useRef<LivePhase>('idle');
  const mutedRef = useRef(false);
  const connectingRef = useRef(false);
  const unmountedRef = useRef(false);

  const applyPhase = useCallback((next: LivePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  /* ---------------------------------------------------------------- levels */

  const getLevels = useCallback((): AudioLevels => {
    const timeBuf = timeBufRef.current;
    const freqBuf = freqBufRef.current;
    const smoothed = smoothedRef.current;

    let target = SILENT_LEVELS;
    if (timeBuf && freqBuf) {
      const current = phaseRef.current;
      if (current === 'speaking' && aiAnalyserRef.current) {
        target = readAnalyser(aiAnalyserRef.current, timeBuf, freqBuf);
      } else if (current === 'listening' && !mutedRef.current && micAnalyserRef.current) {
        target = readAnalyser(micAnalyserRef.current, timeBuf, freqBuf);
      }
    }

    // Fast attack, slow release: the orb snaps to syllables then settles, which
    // is what makes it read as "listening" rather than "pulsing on a timer".
    const blend = (from: number, to: number) =>
      from + (to - from) * (to > from ? 0.35 : 0.08);

    smoothed.level = blend(smoothed.level, target.level);
    smoothed.low = blend(smoothed.low, target.low);
    smoothed.mid = blend(smoothed.mid, target.mid);
    smoothed.high = blend(smoothed.high, target.high);

    return smoothed;
  }, []);

  /* ------------------------------------------------------------- transcript */

  /** Appends streaming text into the trailing entry for that role, or starts one. */
  const appendTranscript = useCallback((role: 'user' | 'ai', chunk: string) => {
    if (!chunk) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && !last.final) {
        const merged = [...prev];
        merged[merged.length - 1] = { ...last, text: last.text + chunk };
        return merged;
      }
      return [...prev, { id: nextEntryId(), role, text: chunk, final: false }];
    });
  }, []);

  const finaliseTranscript = useCallback(() => {
    setTranscript((prev) =>
      prev.some((entry) => !entry.final)
        ? prev.map((entry) => (entry.final ? entry : { ...entry, final: true }))
        : prev
    );
  }, []);

  /* --------------------------------------------------------------- playback */

  const stopPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try {
        source.onended = null;
        source.stop();
      } catch {
        /* already finished */
      }
    }
    activeSourcesRef.current.clear();
    nextStartRef.current = 0;
  }, []);

  /**
   * Queues one PCM chunk. Consecutive chunks are stitched onto a running cursor
   * so playback is gapless; if we ever fall behind the clock the cursor resets
   * to "now" plus a small lead instead of scheduling into the past.
   */
  const enqueueAudio = useCallback((base64: string) => {
    const ctx = outputCtxRef.current;
    const gain = outputGainRef.current;
    if (!ctx || !gain) return;

    const pcm = base64ToInt16(base64);
    if (pcm.length === 0) return;

    let samples = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 32768;

    // Only needed on browsers that refused a 24 kHz context.
    if (Math.abs(ctx.sampleRate - OUTPUT_SAMPLE_RATE) > 1) {
      samples = resampleLinear(samples, OUTPUT_SAMPLE_RATE, ctx.sampleRate);
    }

    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);

    const startAt = Math.max(nextStartRef.current, ctx.currentTime + PLAYBACK_LEAD_S);
    source.start(startAt);
    nextStartRef.current = startAt + buffer.duration;

    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      // Nothing left in flight and the model finished talking → back to listening.
      if (
        activeSourcesRef.current.size === 0 &&
        phaseRef.current === 'speaking' &&
        !unmountedRef.current
      ) {
        applyPhase('listening');
      }
    };
  }, [applyPhase]);

  /* ------------------------------------------------------------- teardown */

  const teardown = useCallback(() => {
    stopPlayback();

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        /* already closed */
      }
      sessionRef.current = null;
    }

    if (captureNodeRef.current) {
      captureNodeRef.current.port.onmessage = null;
      captureNodeRef.current.disconnect();
      captureNodeRef.current = null;
    }

    micSourceRef.current?.disconnect();
    micSourceRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    inputCtxRef.current?.close().catch(() => {});
    inputCtxRef.current = null;
    outputCtxRef.current?.close().catch(() => {});
    outputCtxRef.current = null;

    micAnalyserRef.current = null;
    aiAnalyserRef.current = null;
    outputGainRef.current = null;
    smoothedRef.current = { ...SILENT_LEVELS };
  }, [stopPlayback]);

  const disconnect = useCallback(() => {
    connectingRef.current = false;
    teardown();
    finaliseTranscript();
    if (!unmountedRef.current) {
      setIsMuted(false);
      mutedRef.current = false;
      applyPhase('idle');
    }
  }, [applyPhase, finaliseTranscript, teardown]);

  /* -------------------------------------------------------------- messages */

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      if (unmountedRef.current) return;

      const content = message.serverContent;

      if (content) {
        // A single event can carry audio *and* transcripts, so every branch is
        // checked independently rather than as an if/else chain.
        if (content.interrupted) {
          stopPlayback();
          finaliseTranscript();
          applyPhase('listening');
        }

        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            const data = part.inlineData?.data;
            if (data) {
              if (phaseRef.current !== 'speaking') applyPhase('speaking');
              enqueueAudio(data);
            }
          }
        }

        const userText =
          content.inputTranscription?.text ?? content.interimInputTranscription?.text;
        if (userText) appendTranscript('user', userText);

        if (content.outputTranscription?.text) {
          appendTranscript('ai', content.outputTranscription.text);
        }

        if (content.turnComplete) {
          finaliseTranscript();
          // Don't yank the phase while buffered audio is still playing out.
          if (activeSourcesRef.current.size === 0 && phaseRef.current !== 'listening') {
            applyPhase('listening');
          }
        }
      }

      if (message.goAway) {
        setError('sessionEnded');
      }
    },
    [appendTranscript, applyPhase, enqueueAudio, finaliseTranscript, stopPlayback]
  );

  /* --------------------------------------------------------------- connect */

  const connect = useCallback(async () => {
    if (connectingRef.current || sessionRef.current) return;
    connectingRef.current = true;

    applyPhase('connecting');
    setError(null);

    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('unsupported');
      }

      /* 1 — ephemeral token (server holds the real API key) */
      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Could not start a voice session.');
      }
      const { token } = (await res.json()) as { token: string };

      /* 2 — microphone */
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch {
        throw new Error('micDenied');
      }
      if (unmountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      /* 3 — audio graph. Created inside the click gesture, so both contexts
             start unsuspended on Safari/iOS. */
      const inputCtx = createContext(INPUT_SAMPLE_RATE);
      inputCtxRef.current = inputCtx;
      if (inputCtx.state === 'suspended') await inputCtx.resume();

      const outputCtx = createContext(OUTPUT_SAMPLE_RATE);
      outputCtxRef.current = outputCtx;
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      await inputCtx.audioWorklet.addModule(CAPTURE_WORKLET_URL);

      const micSource = inputCtx.createMediaStreamSource(stream);
      micSourceRef.current = micSource;

      const micAnalyser = inputCtx.createAnalyser();
      micAnalyser.fftSize = 256;
      micAnalyser.smoothingTimeConstant = 0.1;
      micSource.connect(micAnalyser);
      micAnalyserRef.current = micAnalyser;

      const captureNode = new AudioWorkletNode(inputCtx, 'pcm-capture-worklet');
      micSource.connect(captureNode);
      captureNodeRef.current = captureNode;

      const outputGain = outputCtx.createGain();
      const aiAnalyser = outputCtx.createAnalyser();
      aiAnalyser.fftSize = 256;
      aiAnalyser.smoothingTimeConstant = 0.1;
      outputGain.connect(aiAnalyser);
      aiAnalyser.connect(outputCtx.destination);
      outputGainRef.current = outputGain;
      aiAnalyserRef.current = aiAnalyser;

      timeBufRef.current = new Uint8Array(micAnalyser.fftSize);
      freqBufRef.current = new Uint8Array(micAnalyser.frequencyBinCount);

      /* 4 — live session over the constrained (ephemeral-token) endpoint */
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' }
      });

      const session = await ai.live.connect({
        model: MODEL,
        // Config is intentionally omitted: every field is locked into the
        // ephemeral token server-side, and anything sent here is ignored.
        callbacks: {
          onmessage: handleMessage,
          onerror: () => {
            if (unmountedRef.current) return;
            setError('connection');
            applyPhase('error');
          },
          onclose: () => {
            if (unmountedRef.current || !sessionRef.current) return;
            sessionRef.current = null;
            teardown();
            applyPhase('idle');
          }
        }
      });

      if (unmountedRef.current) {
        session.close();
        teardown();
        return;
      }

      sessionRef.current = session;

      /* 5 — stream mic frames. The worklet hands over Int16 PCM at 16 kHz. */
      const inputRate = inputCtx.sampleRate;
      captureNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (!sessionRef.current || mutedRef.current) return;
        try {
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: arrayBufferToBase64(event.data),
              mimeType: `audio/pcm;rate=${Math.round(inputRate)}`
            }
          });
        } catch {
          /* socket closed mid-frame */
        }
      };

      connectingRef.current = false;
      applyPhase('listening');
    } catch (err) {
      connectingRef.current = false;
      teardown();
      if (unmountedRef.current) return;
      setError(err instanceof Error ? err.message : 'connection');
      applyPhase('error');
    }
  }, [applyPhase, handleMessage, locale, teardown]);

  /* ------------------------------------------------------------ text input */

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const session = sessionRef.current;
      if (!trimmed || !session) return;

      appendTranscript('user', trimmed);
      finaliseTranscript();
      stopPlayback();
      applyPhase('thinking');

      try {
        session.sendRealtimeInput({ text: trimmed });
      } catch {
        setError('connection');
        applyPhase('error');
      }
    },
    [appendTranscript, applyPhase, finaliseTranscript, stopPlayback]
  );

  /* ------------------------------------------------------------------ mute */

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setIsMuted(next);

    // Flushes whatever the server has cached for the current turn.
    if (next && sessionRef.current) {
      try {
        sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        /* socket already gone */
      }
    }
  }, []);

  /* --------------------------------------------------------------- cleanup */

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      teardown();
    };
  }, [teardown]);

  return {
    phase,
    transcript,
    error,
    isMuted,
    isConnected: phase === 'listening' || phase === 'thinking' || phase === 'speaking',
    connect,
    disconnect,
    sendText,
    toggleMute,
    getLevels
  };
}

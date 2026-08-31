"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useLocale, useTranslations } from 'next-intl';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import VoiceOrb from './VoiceOrb';
import styles from './VoiceAssistant.module.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

/* ==========================================================================
   Voice assistant widget
   --------------------------------------------------------------------------
   One shell that morphs between a 68px orb button and a full chat panel. The
   orb lives inside that shell permanently, so there is exactly one WebGL
   context for the lifetime of the widget and nothing remounts on open/close.

   First click expands. The mic is only requested on the deliberate "Start
   talking" press, so visitors who never intend to speak never see a permission
   prompt — and the text composer still works if they deny it.
   ========================================================================== */

const COLLAPSED_SIZE = 68;
const COLLAPSED_SIZE_MOBILE = 56;
const PANEL_WIDTH = 380;

const KNOWN_ERRORS = ['micDenied', 'unsupported', 'connection', 'sessionEnded'] as const;
type KnownError = (typeof KNOWN_ERRORS)[number];

const isKnownError = (value: string): value is KnownError =>
  (KNOWN_ERRORS as readonly string[]).includes(value);

interface VoiceAssistantProps {
  /** Fades the widget out while a full-screen overlay owns the viewport. */
  hidden?: boolean;
}

export default function VoiceAssistant({ hidden = false }: VoiceAssistantProps) {
  const t = useTranslations('voice');
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const {
    phase,
    transcript,
    error,
    isMuted,
    isConnected,
    connect,
    disconnect,
    sendText,
    toggleMute,
    getLevels
  } = useGeminiLive(locale);

  /* ------------------------------------------------------------- open/close */

  /* `hidden` is derived, not mirrored into state: while an overlay owns the
     viewport the panel collapses, and it comes back in its idle state once the
     overlay closes. */
  const isPanelOpen = isOpen && !hidden;

  const close = useCallback(() => {
    setIsOpen(false);
    disconnect();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [disconnect]);

  useEffect(() => {
    if (!isPanelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPanelOpen, close]);

  // An overlay taking the viewport also ends the live session.
  useEffect(() => {
    if (hidden) disconnect();
  }, [hidden, disconnect]);

  /* ------------------------------------------------------------- animation */

  useGSAP(() => {
    const shell = shellRef.current;
    const body = bodyRef.current;
    if (!shell || !body) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        isMobile: '(max-width: 768px)',
        noReducedMotion: '(prefers-reduced-motion: no-preference)'
      },
      (ctx) => {
        const { isMobile, noReducedMotion } = ctx.conditions as {
          isMobile: boolean;
          noReducedMotion: boolean;
        };

        const collapsed = isMobile ? COLLAPSED_SIZE_MOBILE : COLLAPSED_SIZE;
        const panelWidth = isMobile
          ? Math.min(PANEL_WIDTH, window.innerWidth - 32)
          : PANEL_WIDTH;
        const panelHeight = Math.min(560, window.innerHeight * 0.7);

        const openState = {
          width: panelWidth,
          height: panelHeight,
          borderRadius: '1.5rem'
        };
        const closedState = {
          width: collapsed,
          height: collapsed,
          borderRadius: '50%'
        };

        if (!noReducedMotion) {
          gsap.set(shell, isPanelOpen ? openState : closedState);
          gsap.set(body, { opacity: isPanelOpen ? 1 : 0, pointerEvents: isPanelOpen ? 'auto' : 'none' });
          return;
        }

        if (isPanelOpen) {
          gsap.to(shell, { ...openState, duration: 0.7, ease: 'power3.out' });
          gsap.to(body, {
            opacity: 1,
            duration: 0.5,
            delay: 0.25,
            ease: 'power2.out',
            pointerEvents: 'auto'
          });
        } else {
          gsap.to(body, { opacity: 0, duration: 0.2, ease: 'power2.in', pointerEvents: 'none' });
          gsap.to(shell, { ...closedState, duration: 0.45, ease: 'power2.inOut', delay: 0.05 });
        }
      }
    );

    return () => mm.revert();
  }, { scope: rootRef, dependencies: [isPanelOpen] });

  useGSAP(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.to(root, {
      autoAlpha: hidden ? 0 : 1,
      duration: hidden ? 0.3 : 0.5,
      ease: hidden ? 'power2.in' : 'power3.out'
    });
  }, { scope: rootRef, dependencies: [hidden] });

  // Keep the newest turn in view as transcripts stream in.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [transcript]);

  /* ---------------------------------------------------------------- handlers */

  const open = () => {
    setIsOpen(true);
    requestAnimationFrame(() => bodyRef.current?.focus());
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setDraft('');
    if (!isConnected) {
      // Typing is a valid entry point: open the socket, then deliver the line.
      void connect().then(() => sendText(text));
      return;
    }
    sendText(text);
  };

  const errorMessage = error
    ? isKnownError(error)
      ? t(`errors.${error}`)
      : t('errors.generic')
    : null;

  const statusText = isMuted && isConnected ? t('muted') : t(`status.${phase}`);

  /* -------------------------------------------------------------------- ui */

  return (
    <div ref={rootRef} className={styles.root} data-open={isPanelOpen || undefined}>
      <div
        ref={shellRef}
        className={styles.shell}
        data-open={isPanelOpen || undefined}
        data-phase={phase}
      >
        {/* Always mounted: the single orb + its CSS bloom. */}
        <div className={styles.orbDock}>
          <span className={styles.orbHalo} data-phase={phase} />
          <VoiceOrb phase={phase} getLevels={getLevels} className={styles.orbCanvas} />
        </div>

        <div
          ref={bodyRef}
          id="voice-assistant-panel"
          className={styles.body}
          role="dialog"
          aria-label={t('panelLabel')}
          aria-hidden={!isPanelOpen || undefined}
          tabIndex={-1}
        >
          <header className={styles.header}>
            <p className={styles.status} role="status" dir="auto">
              <span className={styles.statusDot} data-phase={phase} />
              {statusText}
            </p>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={close}
              aria-label={t('close')}
              tabIndex={isPanelOpen ? 0 : -1}
            >
              &#10005;
            </button>
          </header>

          <div
            ref={logRef}
            className={styles.log}
            data-lenis-prevent
            aria-live="polite"
            aria-atomic="false"
          >
            {transcript.length === 0 && (
              <p className={styles.intro} dir="auto">
                {t('intro')}
              </p>
            )}

            {transcript.map((entry) => (
              <div
                key={entry.id}
                className={styles.turn}
                data-role={entry.role}
                data-streaming={!entry.final || undefined}
              >
                <span className={styles.turnRole} dir="auto">
                  {entry.role === 'user' ? t('roleYou') : t('roleAi')}
                </span>
                <p className={styles.turnText} dir="auto">
                  {entry.text}
                </p>
              </div>
            ))}
          </div>

          {errorMessage && (
            <p className={styles.error} dir="auto">
              {errorMessage}
            </p>
          )}

          <footer className={styles.footer}>
            {!isConnected ? (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => void connect()}
                disabled={phase === 'connecting'}
                tabIndex={isPanelOpen ? 0 : -1}
                dir="auto"
              >
                {phase === 'connecting' ? t('status.connecting') : t('start')}
              </button>
            ) : (
              <div className={styles.liveControls}>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={toggleMute}
                  aria-pressed={isMuted}
                  tabIndex={isPanelOpen ? 0 : -1}
                  dir="auto"
                >
                  {isMuted ? t('unmute') : t('mute')}
                </button>
                <button
                  type="button"
                  className={styles.endBtn}
                  onClick={disconnect}
                  tabIndex={isPanelOpen ? 0 : -1}
                  dir="auto"
                >
                  {t('endCall')}
                </button>
              </div>
            )}

            <form className={styles.composer} onSubmit={handleSubmit}>
              <input
                type="text"
                className={styles.input}
                placeholder={t('textPlaceholder')}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-label={t('textPlaceholder')}
                tabIndex={isPanelOpen ? 0 : -1}
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!draft.trim()}
                tabIndex={isPanelOpen ? 0 : -1}
                dir="auto"
              >
                {t('send')}
              </button>
            </form>
          </footer>
        </div>
      </div>

      {/* Collapsed hit target. Removed once open so the panel content owns
          pointer and keyboard interaction. */}
      {!isPanelOpen && (
        <>
          <span className={styles.triggerLabel} aria-hidden="true">
            {t('trigger')}
          </span>
          <button
            ref={triggerRef}
            type="button"
            className={styles.trigger}
            onClick={open}
            aria-expanded={false}
            aria-controls="voice-assistant-panel"
            aria-label={t('trigger')}
          />
        </>
      )}
    </div>
  );
}

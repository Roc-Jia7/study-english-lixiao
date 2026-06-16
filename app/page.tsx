"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import type { SessionMode, VocabularyWord } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { useLxllStore } from "@/store/useLxllStore";
import { loadPack, type WordPack } from "@/lib/wordpacks";
import { startCloudSync } from "@/lib/sync/cloudSync";
import { primeSpeech } from "@/lib/speech";
import SpaceNavbar from "@/components/SpaceNavbar";
import ProfileHub from "@/components/ProfileHub";
import Dashboard from "@/components/Dashboard";
import PackDetail from "@/components/PackDetail";
import ChildSwitcher from "@/components/ChildSwitcher";
import SessionView from "@/components/SessionView";

interface ActiveSession {
  mode: SessionMode;
  words: VocabularyWord[];
  /** A real lxll review: report each result and submit on completion. */
  lxll?: boolean;
  /** Re-practice of a finished slot — runs locally, no backend submit. */
  practice?: boolean;
  /** Override quiz insertion (bundled packs have no pictures → no quiz). */
  withQuiz?: boolean;
}

/**
 * Word Star Academy — screen flow:
 *   Profile Hub (parent/keypad gate or lxll account login → avatar grid)
 *     → Dashboard (pet + reviews: real lxll words or demo discovery packs)
 *       → Session (cards → confetti reward) → back to Dashboard
 */
export default function Home() {
  const activeStudentId = useAppStore((s) => s.activeStudentId);
  const restoreLxll = useLxllStore((s) => s.restore);
  const recordWordResult = useLxllStore((s) => s.recordWordResult);
  const submitResults = useLxllStore((s) => s.submitResults);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [pack, setPack] = useState<WordPack | null>(null);
  const [packLoading, setPackLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Zustand rehydrates from localStorage on the client; hold rendering
  // until mounted so the server and first client paint always match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // Begin debounced cross-device progress sync (no-ops if no DB configured).
    startCloudSync();
    // Re-hydrate a stored lxll session (token in localStorage).
    void restoreLxll();
    // Unlock speech on the first tap (iOS needs a gesture before autoplay).
    window.addEventListener("pointerdown", () => primeSpeech(), { once: true });
  }, [restoreLxll]);

  // Coming back to the foreground (tab/app re-focus) re-pulls the lxll
  // schedule, so a review the teacher completed remotely — its backend
  // `status` flips to DONE — shows as finished without a manual reload.
  // Throttled so the focus + visibility events don't double-fetch.
  useEffect(() => {
    let last = 0;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const lxll = useLxllStore.getState();
      if (lxll.status !== "authed" || lxll.loadingData) return;
      const ts = Date.now();
      if (ts - last < 5000) return;
      last = ts;
      // Resend any results a previous submit failed to upload, then refresh.
      if (lxll.pendingUpload) void lxll.drainOutbox();
      void lxll.loadData();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Leaving a profile always ends any running session or pack view.
  useEffect(() => {
    if (!activeStudentId) {
      setSession(null);
      setPack(null);
      setPackLoading(false);
      setSwitching(false);
    }
  }, [activeStudentId]);

  // Open a bundled pack — its words are lazy-loaded (own chunk) on demand.
  const openPack = async (id: string) => {
    setPackLoading(true);
    setPack(await loadPack(id));
    setPackLoading(false);
  };

  if (!mounted) {
    return (
      <main className="starfield flex min-h-dvh items-center justify-center">
        <motion.span
          className="text-7xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          🪐
        </motion.span>
      </main>
    );
  }

  /** Parse the backend word id back out of a "lxll-<wordId>" vocab id. */
  const backendWordId = (word: VocabularyWord): number | null => {
    const m = word.id.match(/^lxll-(\d+)$/);
    return m ? Number(m[1]) : null;
  };

  return (
    <MotionConfig reducedMotion="user">
      <main className="starfield min-h-dvh">
        {activeStudentId && !session && (
          <SpaceNavbar onSwitchChild={() => setSwitching(true)} />
        )}

        <AnimatePresence>
          {switching && activeStudentId && !session && (
            <ChildSwitcher onClose={() => setSwitching(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
        {!activeStudentId ? (
          <motion.div key="hub" exit={{ opacity: 0 }}>
            <ProfileHub />
          </motion.div>
        ) : session ? (
          <motion.div
            key="session"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <SessionView
              words={session.words}
              mode={session.mode}
              onExit={() => setSession(null)}
              withQuiz={session.withQuiz ?? !session.lxll}
              onResult={
                session.lxll && !session.practice
                  ? (word, known) => {
                      const id = backendWordId(word);
                      if (id !== null) recordWordResult(id, known);
                    }
                  : undefined
              }
              onComplete={
                session.lxll && !session.practice
                  ? () => void submitResults()
                  : undefined
              }
            />
          </motion.div>
        ) : packLoading || pack ? (
          <motion.div
            key="pack"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {pack ? (
              <PackDetail
                pack={pack}
                onBack={() => setPack(null)}
                onStart={(words) =>
                  setSession({ mode: "review", words, withQuiz: false })
                }
              />
            ) : (
              <div className="flex min-h-[60vh] items-center justify-center">
                <motion.span
                  className="text-5xl"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                >
                  📦
                </motion.span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard
              onStartSession={(mode, words) => setSession({ mode, words })}
              onStartLxllReview={(words, practice) =>
                setSession({ mode: "review", words, lxll: true, practice })
              }
              onOpenPack={openPack}
            />
          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}

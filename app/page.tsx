"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SessionMode, VocabularyWord } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { useLxllStore } from "@/store/useLxllStore";
import SpaceNavbar from "@/components/SpaceNavbar";
import ProfileHub from "@/components/ProfileHub";
import Dashboard from "@/components/Dashboard";
import SessionView from "@/components/SessionView";

interface ActiveSession {
  mode: SessionMode;
  words: VocabularyWord[];
  /** A real lxll review: report each result and submit on completion. */
  lxll?: boolean;
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

  // Zustand rehydrates from localStorage on the client; hold rendering
  // until mounted so the server and first client paint always match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // Re-hydrate a stored lxll session (token in localStorage).
    void restoreLxll();
  }, [restoreLxll]);

  // Leaving a profile always ends any running session.
  useEffect(() => {
    if (!activeStudentId) setSession(null);
  }, [activeStudentId]);

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
    <main className="starfield min-h-dvh">
      {activeStudentId && !session && <SpaceNavbar />}

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
              withQuiz={!session.lxll}
              onResult={
                session.lxll
                  ? (word, known) => {
                      const id = backendWordId(word);
                      if (id !== null) recordWordResult(id, known);
                    }
                  : undefined
              }
              onComplete={session.lxll ? () => void submitResults() : undefined}
            />
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
              onStartLxllReview={(words) =>
                setSession({ mode: "review", words, lxll: true })
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { popSound, happySound } from "@/lib/sfx";

interface PetNameModalProps {
  /** The pet's current look, shown big so the child names what they see. */
  emoji: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

/**
 * A warm one-time prompt to name the new companion. Naming a pet is what
 * turns it from an icon into "mine" — so we ask up front, but never force it
 * (稍后再说 keeps the dashboard's gentle rename button available).
 */
export default function PetNameModal({ emoji, onSave, onClose }: PetNameModalProps) {
  const [draft, setDraft] = useState("");
  const trimmed = draft.trim();

  const save = () => {
    if (!trimmed) return;
    happySound();
    onSave(trimmed);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-space-950/80 px-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="w-full max-w-sm rounded-[2rem] bg-cream p-6 text-center shadow-2xl ring-8 ring-white/30"
      >
        <motion.span
          className="block text-7xl"
          animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {emoji}
        </motion.span>
        <h2 className="mt-3 text-2xl font-extrabold text-space-900">
          给你的小伙伴起个名字吧！
        </h2>
        <p className="mt-1 text-sm font-bold text-space-700/60">
          Name your new buddy 🥰
        </p>

        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          maxLength={12}
          placeholder="比如：小火龙"
          className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-center text-xl font-bold text-space-900 shadow-inner outline-none ring-2 ring-violet-300 focus:ring-violet-400"
        />

        <button
          onClick={save}
          disabled={!trimmed}
          className="mt-4 min-h-14 w-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 px-6 py-3 text-xl font-extrabold text-white shadow-xl ring-4 ring-white/30 transition active:scale-95 disabled:opacity-40"
        >
          就叫这个名字！🎉
        </button>
        <button
          onClick={() => {
            popSound();
            onClose();
          }}
          className="mt-2 min-h-11 w-full rounded-full text-base font-bold text-space-700/50"
        >
          稍后再说
        </button>
      </motion.div>
    </motion.div>
  );
}

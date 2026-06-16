"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Rocket, Phone } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { getPetStage } from "@/lib/pet";
import PasswordLogin from "./PasswordLogin";

const MIN_PHONE_DIGITS = 8;

/**
 * The Space Station landing page.
 * Default: real lxll account/password sign-in. A demo keypad (any number
 * works, no password) is tucked behind a secondary link for tyre-kicking.
 * After sign-in: a galaxy of child avatar cards — tap to board.
 */
export default function ProfileHub() {
  const parentUnlocked = useAppStore((s) => s.parentUnlocked);
  const unlockParentGate = useAppStore((s) => s.unlockParentGate);
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <AnimatePresence mode="wait">
        {parentUnlocked ? (
          <AvatarGrid key="avatars" />
        ) : showDemo ? (
          <PhoneGate key="gate" onBackToLogin={() => setShowDemo(false)} />
        ) : (
          <PasswordLogin
            key="login"
            onShowDemo={() => setShowDemo(true)}
            onSuccess={unlockParentGate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PhoneGate({ onBackToLogin }: { onBackToLogin: () => void }) {
  const unlockParentGate = useAppStore((s) => s.unlockParentGate);
  const [digits, setDigits] = useState("");
  const ready = digits.length >= MIN_PHONE_DIGITS;

  const press = (d: string) => {
    if (digits.length < 11) setDigits(digits + d);
  };

  const formatted =
    digits.length === 0
      ? ""
      : digits.replace(/(\d{3})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
          [a, b, c].filter(Boolean).join(" "),
        );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-sm text-center"
    >
      <motion.div
        className="mx-auto mb-4 w-fit text-6xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        🛸
      </motion.div>
      <h1 className="text-3xl font-extrabold text-white">演示模式 · 随便逛逛</h1>
      <p className="mt-1 text-white/60">
        输入任意手机号即可体验（不验证密码）
      </p>
      <p className="mt-1 text-xs text-white/40">Demo — any number works, try 138 0000 0000</p>

      {/* Number display */}
      <div className="mx-auto mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 ring-2 ring-white/20">
        <Phone className="h-5 w-5 text-white/50" />
        <span className="text-2xl font-bold tracking-widest text-white">
          {formatted || <span className="text-white/30">--- ---- ----</span>}
        </span>
      </div>

      {/* Keypad — every key is a big 64px+ touch target */}
      <div className="mx-auto mt-5 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeypadButton key={d} onClick={() => press(d)}>
            {d}
          </KeypadButton>
        ))}
        <KeypadButton
          onClick={() => setDigits(digits.slice(0, -1))}
          aria-label="Delete"
        >
          <Delete className="mx-auto h-7 w-7" />
        </KeypadButton>
        <KeypadButton onClick={() => press("0")}>0</KeypadButton>
        <motion.button
          onClick={unlockParentGate}
          disabled={!ready}
          whileTap={ready ? { scale: 0.9 } : undefined}
          aria-label="Enter"
          className={`flex h-16 items-center justify-center rounded-2xl text-white shadow-pop transition ${
            ready
              ? "bg-gradient-to-br from-emerald-400 to-green-500"
              : "bg-white/10 text-white/30"
          }`}
        >
          <Rocket className="h-7 w-7" />
        </motion.button>
      </div>

      {/* Back to the real account login (李校来啦) */}
      <button
        onClick={onBackToLogin}
        className="mx-auto mt-6 block text-sm font-bold text-amber-300/90 underline-offset-4 transition hover:underline"
      >
        ← 返回「李校来啦」账号登录
      </button>
    </motion.div>
  );
}

function KeypadButton({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  "aria-label"?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className="h-16 rounded-2xl bg-white/10 text-2xl font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20"
      {...rest}
    >
      {children}
    </motion.button>
  );
}

function AvatarGrid() {
  const students = useAppStore((s) => s.students);
  const selectStudent = useAppStore((s) => s.selectStudent);

  // Demo mode must NEVER surface real lxll children (names/avatars are
  // personal info). Real children are only reachable via account login.
  const demoStudents = Object.values(students).filter(
    (s) => !s.id.startsWith("lxll:"),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-2xl text-center"
    >
      <motion.div
        className="mx-auto mb-3 w-fit text-6xl"
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        🚀
      </motion.div>
      <h1 className="text-3xl font-extrabold text-white">Who is flying today?</h1>
      <p className="mt-1 mb-8 text-white/60">今天谁来开飞船呀？点一下你的头像！</p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {demoStudents.map((student, i) => {
          const pet = getPetStage(student.xp);
          return (
            <motion.button
              key={student.id}
              onClick={() => selectStudent(student.id)}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i, type: "spring", stiffness: 120 }}
              whileHover={{ scale: 1.05, rotate: -1 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-br ${student.gradient} p-6 shadow-pop ring-4 ring-white/30`}
            >
              <motion.span
                className="text-7xl drop-shadow-md"
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.4 * i,
                }}
              >
                {student.avatar}
              </motion.span>
              <span className="text-2xl font-extrabold text-space-900">
                {student.name}
              </span>
              <span className="rounded-full bg-white/50 px-3 py-1 text-sm font-bold text-space-800">
                {student.title} · {student.titleZh}
              </span>
              <span className="text-sm text-space-800/70">
                Pet: {pet.emoji} {pet.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

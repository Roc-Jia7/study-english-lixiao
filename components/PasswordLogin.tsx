"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Rocket } from "lucide-react";
import { useLxllStore } from "@/store/useLxllStore";

interface PasswordLoginProps {
  onShowDemo: () => void;
  onSuccess: () => void;
}

/**
 * Real account/password login against the lxll backend — the default landing
 * screen. Accepts a phone number or a student account number (e.g.
 * XP06153004). The kid avatar grid is for switching children afterwards.
 */
export default function PasswordLogin({ onShowDemo, onSuccess }: PasswordLoginProps) {
  const status = useLxllStore((s) => s.status);
  const error = useLxllStore((s) => s.error);
  const signIn = useLxllStore((s) => s.signIn);
  const clearError = useLxllStore((s) => s.clearError);

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const loading = status === "loading";
  const ready = account.trim().length >= 6 && password.length >= 4;

  const submit = async () => {
    if (!ready || loading) return;
    const ok = await signIn(account.trim(), password);
    if (ok) onSuccess();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-sm"
    >
      <div className="text-center">
        <motion.div
          className="mx-auto mb-3 w-fit text-5xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          🛰️
        </motion.div>
        <h1 className="text-2xl font-extrabold text-white">账号登录</h1>
        <p className="mt-1 text-sm text-white/60">
          用「李校来啦」的手机号或学号 + 密码登录
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="characters"
          placeholder="手机号 / 学号（如 XP06153004）"
          value={account}
          onChange={(e) => {
            // Phone digits or an account number like XP06153004.
            setAccount(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase());
            if (error) clearError();
          }}
          className="h-14 w-full rounded-2xl bg-white/10 px-5 text-lg text-white ring-2 ring-white/20 outline-none placeholder:text-white/30 focus:ring-amber-300"
        />

        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            placeholder="密码"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) clearError();
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="h-14 w-full rounded-2xl bg-white/10 px-5 pr-14 text-lg text-white ring-2 ring-white/20 outline-none placeholder:text-white/30 focus:ring-amber-300"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "隐藏密码" : "显示密码"}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl text-white/50 hover:text-white"
          >
            {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-rose-500/15 px-4 py-2 text-center text-sm font-bold text-rose-200"
          >
            {error}
          </motion.p>
        )}

        <motion.button
          onClick={submit}
          disabled={!ready || loading}
          whileTap={ready && !loading ? { scale: 0.96 } : undefined}
          className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold shadow-lg transition ${
            ready && !loading
              ? "bg-gradient-to-br from-emerald-400 to-green-500 text-white"
              : "bg-white/10 text-white/30"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" /> 登录中…
            </>
          ) : (
            <>
              <Rocket className="h-6 w-6" /> 登录
            </>
          )}
        </motion.button>
      </div>

      {/* Secondary: try the demo without an account */}
      <button
        onClick={onShowDemo}
        className="mx-auto mt-6 block text-sm text-white/40 underline-offset-4 transition hover:text-white/70 hover:underline"
      >
        没有账号？试用演示模式 →
      </button>
    </motion.div>
  );
}

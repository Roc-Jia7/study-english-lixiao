"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Rocket, X } from "lucide-react";
import { useLxllStore } from "@/store/useLxllStore";
import {
  forgetRecentLogin,
  loadLastIdentifier,
  loadRecentLogins,
  type RecentLogin,
} from "@/lib/lxll/recentLogins";

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
  const [recents, setRecents] = useState<RecentLogin[]>([]);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Pre-fill the last identifier and list children seen on this device.
  useEffect(() => {
    setRecents(loadRecentLogins());
    setAccount(loadLastIdentifier());
  }, []);

  const loading = status === "loading";
  const ready = account.trim().length >= 6 && password.length >= 4;

  // Tap a remembered child → fill their identifier, just type the password.
  const pickRecent = (r: RecentLogin) => {
    setAccount(r.identifier);
    setPassword("");
    if (error) clearError();
    requestAnimationFrame(() => passwordRef.current?.focus());
  };

  const forget = (userId: string) => {
    forgetRecentLogin(userId);
    setRecents((rs) => rs.filter((r) => r.userId !== userId));
  };

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

      {/* Children seen on this device — tap one, then just type the password */}
      {recents.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-center text-xs font-bold text-white/40">
            这台设备的孩子 · 点一下,只需输密码
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {recents.map((r) => (
              <div key={r.userId} className="relative">
                <button
                  onClick={() => pickRecent(r)}
                  className={`flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3 font-bold ring-2 transition active:scale-95 ${
                    account === r.identifier
                      ? "bg-amber-300/20 text-amber-200 ring-amber-300/50"
                      : "bg-white/10 text-white/80 ring-white/15 hover:bg-white/15"
                  }`}
                >
                  <span className="text-xl">{r.avatar}</span>
                  {r.name}
                </button>
                <button
                  onClick={() => forget(r.userId)}
                  aria-label={`忘记 ${r.name}`}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-space-700 text-white/60 ring-1 ring-white/20 active:scale-90"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
            ref={passwordRef}
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

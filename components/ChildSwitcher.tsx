"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, X, Check, KeyRound } from "lucide-react";
import { useAppStore, useActiveStudent } from "@/store/useAppStore";
import { useLxllStore } from "@/store/useLxllStore";
import { loadAccounts } from "@/lib/lxll/client";
import { loadRecentLogins } from "@/lib/lxll/recentLogins";

interface ChildSwitcherProps {
  onClose: () => void;
}

/**
 * Fast child switcher: every child signed in on this device can be switched to
 * with one tap (their token is reused — no password). Only a brand-new child,
 * or one whose token has expired, drops to the password screen.
 */
export default function ChildSwitcher({ onClose }: ChildSwitcherProps) {
  const switchToChild = useLxllStore((s) => s.switchToChild);
  const goToLogin = useAppStore((s) => s.goToLogin);
  const active = useActiveStudent();
  const [busy, setBusy] = useState<string | null>(null);

  const recents = loadRecentLogins();
  const accounts = loadAccounts();

  // Escape closes the picker.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toLogin = () => {
    onClose();
    goToLogin();
  };

  const pick = async (userId: string) => {
    if (active?.id === `lxll:${userId}`) {
      onClose();
      return;
    }
    if (!accounts[userId]) {
      toLogin(); // no stored token → need the password
      return;
    }
    setBusy(userId);
    const ok = await switchToChild(userId);
    setBusy(null);
    if (ok) onClose();
    else toLogin(); // token expired → re-login
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-space-950/80 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="切换孩子"
        initial={{ scale: 0.85, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[2rem] bg-space-900 p-6 shadow-card ring-2 ring-white/15"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-white">切换孩子</h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/60 active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {recents.map((r) => {
            const isActive = active?.id === `lxll:${r.userId}`;
            const hasToken = !!accounts[r.userId];
            return (
              <button
                key={r.userId}
                onClick={() => pick(r.userId)}
                disabled={busy !== null}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-2 transition active:scale-[0.98] disabled:opacity-60 ${
                  isActive
                    ? "bg-emerald-400/15 ring-emerald-400/40"
                    : "bg-white/5 ring-white/10 hover:bg-white/10"
                }`}
              >
                <span className="text-3xl">{r.avatar}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold text-white">{r.name}</p>
                  <p className="truncate text-xs text-white/50">
                    {isActive
                      ? "当前正在使用"
                      : hasToken
                        ? "点一下即可切换"
                        : "需要输入密码"}
                  </p>
                </div>
                {busy === r.userId ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white/70" />
                ) : isActive ? (
                  <Check className="h-5 w-5 shrink-0 text-emerald-300" />
                ) : !hasToken ? (
                  <KeyRound className="h-4 w-4 shrink-0 text-white/40" />
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          onClick={toLogin}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-grape to-bubblegum py-3 font-extrabold text-white shadow-pop ring-2 ring-white/25 active:scale-95"
        >
          <Plus className="h-5 w-5" /> 添加其他孩子
        </button>
      </motion.div>
    </motion.div>
  );
}

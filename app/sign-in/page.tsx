"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CursorGlow } from "@/components/cursor-glow";
import { EchoPulse } from "@/components/echo-pulse";

export default function SignInPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (error) {
      setStatus("idle");
      setErrorMsg(error.message);
    } else {
      setStatus("idle");
      setStage("code");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("verifying");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setStatus("idle");
      setErrorMsg(
        error.message.includes("expired") || error.message.includes("invalid")
          ? t.signIn.invalidCode
          : error.message
      );
      return;
    }

    // Успех — определяем куда вести
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      router.replace(profile ? "/profile" : "/onboarding");
      router.refresh();
    } else {
      router.replace("/");
    }
  }

  const [codeSentBefore, codeSentAfter] = t.signIn.codeSent.split("{email}");

  return (
    <div className="echo-aurora relative flex min-h-screen flex-col items-center justify-center overflow-hidden text-white px-4">
      {/* Свечение за курсором — как на главной */}
      <CursorGlow />

      {/* Дрейфующее свечение фона */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob blob-1 absolute left-1/2 top-1/4 -translate-x-1/2 h-[420px] w-[420px] bg-echo opacity-20" />
        <div className="blob blob-2 absolute bottom-0 right-0 h-[300px] w-[400px] bg-echo-fuchsia opacity-10" />
      </div>

      <div className="absolute top-5 right-5 z-20">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <EchoPulse text="echo" className="text-5xl font-bold tracking-tighter lowercase mb-2" />

        {stage === "email" ? (
          <>
            <p className="text-zinc-400 mb-8">{t.signIn.subtitleEmail}</p>
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-zinc-300">{t.signIn.email}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ty@example.com"
                  className="mt-2 bg-white/5 border-white/10 text-white h-12 rounded-xl"
                  disabled={status === "sending"}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full h-12 font-medium"
                disabled={status === "sending"}
              >
                {status === "sending" ? t.signIn.sending : t.signIn.getCode}
              </Button>
              {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
            </form>
          </>
        ) : (
          <>
            <p className="text-zinc-400 mb-8">
              {codeSentBefore}
              <span className="text-white">{email}</span>
              {codeSentAfter}
            </p>
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <Label htmlFor="code" className="text-zinc-300">{t.signIn.codeLabel}</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="12345678"
                  className="mt-2 bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.3em] font-mono h-14 rounded-xl"
                  disabled={status === "verifying"}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full h-12 font-medium"
                disabled={status === "verifying" || code.length < 6}
              >
                {status === "verifying" ? t.signIn.verifying : t.signIn.enter}
              </Button>
              {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
              <button
                type="button"
                onClick={() => {
                  setStage("email");
                  setCode("");
                  setErrorMsg("");
                }}
                className="w-full text-sm text-zinc-500 hover:text-zinc-300"
              >
                {t.signIn.otherEmail}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

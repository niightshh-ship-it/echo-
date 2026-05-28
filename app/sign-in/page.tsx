"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
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
          ? "Код неверный или просрочен. Запроси новый."
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-5xl font-bold tracking-tight lowercase mb-2">echo</h1>

        {stage === "email" ? (
          <>
            <p className="text-zinc-400 mb-8">войди по коду из письма</p>
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ty@example.com"
                  className="mt-2 bg-zinc-900 border-zinc-800 text-white"
                  disabled={status === "sending"}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-zinc-200"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Отправляю..." : "Получить код"}
              </Button>
              {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
            </form>
          </>
        ) : (
          <>
            <p className="text-zinc-400 mb-8">
              Код отправлен на <span className="text-white">{email}</span>. Введи цифры из письма.
            </p>
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <Label htmlFor="code" className="text-zinc-300">Код из письма</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="12345678"
                  className="mt-2 bg-zinc-900 border-zinc-800 text-white text-center text-2xl tracking-[0.3em] font-mono"
                  disabled={status === "verifying"}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-zinc-200"
                disabled={status === "verifying" || code.length < 6}
              >
                {status === "verifying" ? "Проверяю..." : "Войти"}
              </Button>
              {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
              <button
                type="button"
                onClick={() => {
                  setStage("email");
                  setCode("");
                  setErrorMsg("");
                }}
                className="w-full text-sm text-zinc-500 hover:text-zinc-300"
              >
                ← другой email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

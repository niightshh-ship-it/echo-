"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-5xl font-bold tracking-tight lowercase mb-2">echo</h1>
        <p className="text-zinc-400 mb-8">войди по ссылке из письма</p>

        {status === "sent" ? (
          <div className="rounded-lg border border-zinc-800 p-6 text-center">
            <p className="text-lg mb-2">✉️ письмо отправлено</p>
            <p className="text-sm text-zinc-400">
              Проверь почту <span className="text-white">{email}</span> и кликни по ссылке.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {status === "sending" ? "Отправляю..." : "Отправить ссылку"}
            </Button>
            {status === "error" && (
              <p className="text-sm text-red-500">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/lib/i18n/provider";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const t = useT();

  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      setEmail(user.email ?? "");
      const { data: p } = await supabase.from("profiles").select("verified").eq("id", user.id).maybeSingle();
      setVerified(!!p?.verified);
      setChecking(false);
    })();
  }, [router, supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  async function deleteAccount() {
    if (!confirm(t.settings.deleteConfirm)) return;
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as { error?: string }));
      alert(data.error ?? "delete failed");
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">...</div>;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 pt-12 pb-28">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[280px] w-[460px] rounded-full bg-echo opacity-10 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link href="/profile" className="text-zinc-400 hover:text-white text-sm">{t.nav.back}</Link>
          <h1 className="text-2xl font-bold lowercase">{t.settings.title}</h1>
        </div>

        {/* Account */}
        <div className="rounded-2xl glass border border-white/10 p-5 mb-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">{t.settings.account}</p>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">{t.settings.email}</p>
              <p className="text-sm truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="rounded-2xl glass border border-white/10 p-5 mb-4">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">{t.settings.verification}</p>
          {verified ? (
            <p className="text-sm text-emerald-400 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {t.profile.verified}
            </p>
          ) : (
            <Link href="/verify">
              <Button className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full h-11 font-medium">
                {t.profile.verifyCta}
              </Button>
            </Link>
          )}
        </div>

        {/* Language */}
        <div className="rounded-2xl glass border border-white/10 p-5 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm">{t.settings.language}</p>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full rounded-2xl border border-white/10 p-5 mb-6 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <span className="text-sm">{t.nav.signOut}</span>
          <LogOut className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Danger zone */}
        <p className="text-xs uppercase tracking-wider text-red-500/70 mb-2">{t.settings.danger}</p>
        <Button
          onClick={deleteAccount}
          disabled={deleting}
          variant="outline"
          className="w-full bg-red-950/40 border-red-900/60 text-red-300 hover:bg-red-900/40 hover:text-red-200 rounded-2xl h-12 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? t.settings.deleting : t.settings.deleteAccount}
        </Button>
      </div>
    </div>
  );
}

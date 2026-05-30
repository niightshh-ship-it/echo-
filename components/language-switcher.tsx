"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { locales, localeNames, localeShort, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(l: Locale) {
    document.cookie = `locale=${l};path=/;max-age=31536000;samesite=lax`;
    setOpen(false);
    router.refresh();
    // Сохраним выбранный язык в профиль — чтобы письма приходили на нём.
    // Молча игнорируем если юзер не залогинен или нет колонки в БД.
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").update({ locale: l }).eq("id", user.id);
    })().catch(() => {});
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
        aria-label="Language"
      >
        <Globe className="w-4 h-4" />
        <span>{localeShort[locale]}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur p-1 z-50 shadow-xl">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => choose(l)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                l === locale
                  ? "bg-echo/20 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {localeNames[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

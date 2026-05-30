"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Globe } from "lucide-react";
import { locales, localeNames, localeShort, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";

const DROPDOWN_WIDTH = 160;

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне и кнопок и выпадайки
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Закрываемся при скролле и ресайзе — там позиция всё равно протухнет
  useEffect(() => {
    if (!open) return;
    function close() {
      setOpen(false);
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Считаем координаты для портала, когда открыли
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - DROPDOWN_WIDTH),
    });
  }, [open]);

  function choose(l: Locale) {
    document.cookie = `locale=${l};path=/;max-age=31536000;samesite=lax`;
    setOpen(false);
    router.refresh();
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles").update({ locale: l }).eq("id", user.id);
    })().catch(() => {});
  }

  return (
    <>
      <div ref={wrapperRef} className={`relative ${className}`}>
        <button
          ref={buttonRef}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
          aria-label="Language"
        >
          <Globe className="w-4 h-4" />
          <span>{localeShort[locale]}</span>
        </button>
      </div>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: DROPDOWN_WIDTH,
                zIndex: 100,
              }}
              className="rounded-xl border border-white/10 bg-zinc-950/98 backdrop-blur p-1 shadow-2xl"
            >
              {locales.map((l) => (
                <button
                  key={l}
                  onClick={() => choose(l)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    l === locale
                      ? "bg-echo/20 text-white"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {localeNames[l]}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { useBackButtonClose } from "@/lib/use-back-button-close";

const PANEL_WIDTH = 280;

export function ReviewButton({
  revieweeId,
  revieweeName,
  alreadyReviewed,
}: {
  revieweeId: string;
  revieweeName: string;
  alreadyReviewed: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [done, setDone] = useState(alreadyReviewed);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Кликнул вне попапа — закрываем
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // На скролл/ресайз закрываем — позиция протухнет
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

  // Считаем позицию когда открыли
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - PANEL_WIDTH),
    });
  }, [open]);

  // Back-кнопка телефона закрывает попап
  useBackButtonClose(open, () => setOpen(false));

  if (done) {
    return <span className="text-xs text-emerald-400">✓</span>;
  }

  async function submit() {
    if (rating < 1) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      body: body.trim() || null,
    });
    setBusy(false);
    if (!error) {
      setDone(true);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white px-2 py-1 rounded-lg transition-colors"
      >
        <Star className="w-4 h-4" /> {t.chat.rate}
      </button>

      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: PANEL_WIDTH,
                zIndex: 100,
              }}
              className="rounded-2xl border border-white/10 bg-zinc-950/98 backdrop-blur p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            >
              <p className="text-sm mb-3 text-white">
                {t.chat.rateTitle.replace("{name}", revieweeName)}
              </p>
              <div className="flex gap-1 mb-3 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className="w-7 h-7"
                      fill={(hover || rating) >= n ? "#7c5cff" : "none"}
                      stroke={(hover || rating) >= n ? "#7c5cff" : "currentColor"}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t.chat.reviewPlaceholder}
                rows={2}
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white placeholder:text-zinc-500 resize-none mb-3 focus:outline-none focus:border-echo/50"
              />
              <button
                onClick={submit}
                disabled={rating < 1 || busy}
                className="w-full bg-echo text-white hover:bg-echo-bright rounded-full h-10 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {t.chat.rateSubmit}
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

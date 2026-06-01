"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Star, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { useBackButtonClose } from "@/lib/use-back-button-close";

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
  const [done, setDone] = useState(alreadyReviewed);

  if (done) {
    return <span className="text-xs text-emerald-400">✓</span>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm text-zinc-300 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
      >
        <Star className="w-4 h-4" /> {t.chat.rate}
      </button>
      {open && (
        <ReviewSheet
          revieweeId={revieweeId}
          revieweeName={revieweeName}
          onClose={() => setOpen(false)}
          onDone={() => {
            setDone(true);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function ReviewSheet({
  revieweeId,
  revieweeName,
  onClose,
  onDone,
}: {
  revieweeId: string;
  revieweeName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useBackButtonClose(true, onClose);

  async function submit() {
    if (rating < 1 || busy) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }
    const reviewBody = body.trim() || null;
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      body: reviewBody,
    });
    setBusy(false);
    if (error) {
      toast.error(t.chat.rateError);
      return;
    }
    toast.success(t.chat.rateThanks);
    // Письмо адресату отзыва (троттлится раз в час на сервере)
    fetch("/api/notify/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revieweeId,
        rating,
        body: reviewBody,
      }),
    }).catch(() => {});
    onDone();
  }

  if (!mounted) return null;

  const active = hover || rating;
  const label =
    active > 0
      ? t.chat.rateLabels[active - 1]
      : t.chat.rateChoose;

  return createPortal(
    <>
      {/* Подложка */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Лист снизу */}
      <div className="fixed inset-x-0 bottom-0 z-[61] sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg w-full bg-zinc-950 border-t border-x border-white/10 rounded-t-3xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-250">
        {/* Хэндл сверху как в нативных bottom sheet */}
        <div className="pt-3 pb-2 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Шапка */}
        <div className="px-5 pb-2 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-lg leading-tight">
              {t.chat.rateTitle.replace("{name}", revieweeName)}
            </h3>
            <p className="text-zinc-400 text-xs mt-1 leading-snug">
              {t.chat.ratePurpose}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="close"
            className="text-zinc-400 hover:text-white p-1 -mt-1 -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-6 flex-1 overflow-y-auto">
          {/* Звёзды + подпись */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="p-1.5 transition-transform active:scale-90 hover:scale-110"
                  aria-label={`${n}`}
                >
                  <Star
                    className="w-10 h-10 transition-colors"
                    fill={active >= n ? "#7c5cff" : "none"}
                    stroke={active >= n ? "#7c5cff" : "rgb(120, 120, 135)"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
            <p
              className={`text-sm font-medium transition-colors min-h-[20px] ${
                active > 0 ? "text-white" : "text-zinc-500"
              }`}
            >
              {label}
            </p>
          </div>

          {/* Опциональный комментарий */}
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-2">
              {t.chat.reviewOptional}
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.chat.reviewPlaceholder}
              rows={3}
              maxLength={500}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-echo/50"
            />
          </label>
        </div>

        {/* Submit */}
        <div
          className="px-5 pt-2 pb-4 border-t border-white/5 bg-zinc-950"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
        >
          <button
            onClick={submit}
            disabled={rating < 1 || busy}
            className="w-full bg-echo text-white hover:bg-echo-bright rounded-full h-12 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors glow-echo disabled:shadow-none"
          >
            {busy ? "..." : t.chat.rateSubmit}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

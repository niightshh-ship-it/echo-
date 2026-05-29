"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

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

  if (done) {
    return <span className="text-xs text-emerald-400">✓</span>;
  }

  async function submit() {
    if (rating < 1) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
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
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
      >
        <Star className="w-4 h-4" /> {t.chat.rate}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-64 rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur p-4 shadow-xl">
          <p className="text-sm mb-3">{t.chat.rateTitle.replace("{name}", revieweeName)}</p>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
              >
                <Star
                  className="w-6 h-6"
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
            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white placeholder:text-zinc-500 resize-none mb-3"
          />
          <button
            onClick={submit}
            disabled={rating < 1 || busy}
            className="w-full bg-echo text-white hover:bg-echo-bright rounded-full h-9 text-sm font-medium disabled:opacity-50"
          >
            {t.chat.rateSubmit}
          </button>
        </div>
      )}
    </div>
  );
}

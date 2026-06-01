"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Heart, X, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { useBackButtonClose } from "@/lib/use-back-button-close";
import { Badge } from "@/components/ui/badge";

type Liker = {
  id: string;
  name: string;
  city: string;
  avatar: string | null;
  bio: string | null;
  skills: string[];
  wants: string[];
  verified: boolean;
};

export function LikePreviewSheet({
  liker,
  onClose,
  onLikeBack,
  onOpenProfile,
}: {
  liker: Liker;
  onClose: () => void;
  onLikeBack: () => void;
  onOpenProfile: () => void;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [videos, setVideos] = useState<{ id: string; url: string }[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useBackButtonClose(true, onClose);

  // Догружаем видео лайкера для превью
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, storage_path")
        .eq("user_id", liker.id)
        .order("created_at", { ascending: false })
        .limit(6);
      setVideos(
        (data ?? []).map((v) => ({
          id: v.id,
          url: supabase.storage.from("videos").getPublicUrl(v.storage_path).data
            .publicUrl,
        }))
      );
    })();
  }, [liker.id]);

  function handleLikeBack() {
    if (busy) return;
    setBusy(true);
    onLikeBack();
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[61] sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg w-full flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300 overflow-hidden rounded-t-3xl border-t border-x border-white/10">
        {/* Глубокий стеклянный фон + амбиент-свечения */}
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-2xl" />
        <div
          className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-56 w-72 rounded-full"
          style={{ background: "#7c5cff", opacity: 0.22, filter: "blur(100px)" }}
        />
        <div
          className="pointer-events-none absolute top-32 -right-16 h-48 w-48 rounded-full"
          style={{ background: "#e455ff", opacity: 0.14, filter: "blur(90px)" }}
        />

        <div className="relative z-10 flex flex-col min-h-0">
          {/* Хэндл + закрыть */}
          <div className="pt-3 pb-1 flex justify-center shrink-0 relative">
            <div className="w-10 h-1 rounded-full bg-white/20" />
            <button
              onClick={onClose}
              aria-label="close"
              className="absolute top-2.5 right-4 rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto px-5 pb-4 min-h-0">
            {/* Шапка профиля */}
            <div className="flex flex-col items-center text-center pt-3 pb-5">
              <div className="relative">
                {/* Кольцо-свечение вокруг аватара */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-echo to-echo-fuchsia opacity-60 blur-[6px]" />
                <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-white/20 bg-zinc-900 flex items-center justify-center">
                  {liker.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={liker.avatar}
                      alt={liker.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-white">
                      {liker.name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {liker.name}
                </h2>
                {liker.verified && (
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-emerald-400"
                    title="verified"
                  />
                )}
              </div>
              <p className="text-zinc-400 text-sm mt-0.5">{liker.city}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-echo-bright font-semibold bg-echo/12 border border-echo/25 px-3 py-1.5 rounded-full">
                <Heart className="w-3.5 h-3.5" fill="currentColor" />
                {t.matches.likedYourSkill}
              </span>
            </div>

            {/* Био */}
            {liker.bio && (
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 mb-3">
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {liker.bio}
                </p>
              </div>
            )}

            {/* Скиллы + хочет — в одной стеклянной карточке */}
            {(liker.skills.length > 0 || liker.wants.length > 0) && (
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 mb-3 space-y-3">
                {liker.skills.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                      {t.matches.offers}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {liker.skills.map((s) => (
                        <Badge key={s} className="bg-white/10 text-white border-0">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {liker.wants.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                      {t.profile.lookingFor}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {liker.wants.map((w) => (
                        <Badge
                          key={w}
                          className="bg-echo/20 text-echo-bright border border-echo/30"
                        >
                          {w}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Видео лайкера */}
            {videos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {videos.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl overflow-hidden border border-white/10 bg-zinc-900 aspect-[9/16]"
                  >
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={`${v.url}#t=0.1`}
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Кнопки */}
          <div
            className="px-5 pt-3 pb-4 border-t border-white/10 shrink-0 flex gap-2.5"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
          >
            <button
              onClick={onOpenProfile}
              className="shrink-0 rounded-2xl h-12 w-12 flex items-center justify-center border border-white/15 bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label={t.matches.openProfile}
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <button
              onClick={handleLikeBack}
              disabled={busy}
              className="flex-1 bg-gradient-to-r from-echo to-echo-fuchsia text-white hover:opacity-95 rounded-2xl h-12 font-semibold transition-all glow-echo disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Heart className="w-5 h-5" fill="currentColor" />
              {t.matches.likeBack}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

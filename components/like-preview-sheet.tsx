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
        className="fixed inset-0 z-[60] bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[61] bg-zinc-950 border-t border-white/10 rounded-t-3xl flex flex-col max-h-[88vh] animate-in slide-in-from-bottom duration-250 overflow-hidden">
        {/* свечение */}
        <div
          className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-48 w-64 rounded-full"
          style={{ background: "#7c5cff", opacity: 0.18, filter: "blur(90px)" }}
        />

        <div className="relative z-10 flex flex-col min-h-0">
          <div className="pt-3 pb-2 flex justify-center shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/15" />
          </div>

          <button
            onClick={onClose}
            aria-label="close"
            className="absolute top-3 right-4 text-zinc-400 hover:text-white p-1 z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="overflow-y-auto px-5 pb-4 min-h-0">
            {/* Шапка профиля */}
            <div className="flex flex-col items-center text-center pt-2 pb-4">
              <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-echo/30 bg-white/5 flex items-center justify-center shadow-xl shadow-echo/20">
                {liker.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={liker.avatar} alt={liker.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-4xl">{liker.name?.[0]?.toUpperCase() ?? "?"}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <h2 className="text-2xl font-bold">{liker.name}</h2>
                {liker.verified && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" title="verified" />
                )}
              </div>
              <p className="text-zinc-400 text-sm">{liker.city}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-echo-bright font-medium bg-echo/10 border border-echo/25 px-3 py-1 rounded-full">
                <Heart className="w-3.5 h-3.5" fill="currentColor" />
                {t.matches.likedYourSkill}
              </span>
            </div>

            {/* Био */}
            {liker.bio && (
              <p className="text-sm text-zinc-300 whitespace-pre-wrap mb-4 text-center">
                {liker.bio}
              </p>
            )}

            {/* Скиллы */}
            {liker.skills.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-zinc-500 mb-1.5">{t.matches.offers}</p>
                <div className="flex flex-wrap gap-2">
                  {liker.skills.map((s) => (
                    <Badge key={s} className="bg-white/10 text-white border-0">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Хочет научиться */}
            {liker.wants.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-zinc-500 mb-1.5">{t.profile.lookingFor}</p>
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
            className="px-5 pt-3 pb-4 border-t border-white/5 bg-zinc-950 shrink-0 flex gap-2"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
          >
            <button
              onClick={onOpenProfile}
              className="shrink-0 rounded-full h-12 w-12 flex items-center justify-center border border-white/15 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              aria-label={t.matches.openProfile}
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <button
              onClick={handleLikeBack}
              disabled={busy}
              className="flex-1 bg-echo text-white hover:bg-echo-bright rounded-full h-12 font-semibold transition-colors glow-echo disabled:opacity-60 flex items-center justify-center gap-2"
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

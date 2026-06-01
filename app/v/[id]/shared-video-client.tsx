"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { ShareButton } from "@/components/share-button";

function formatCount(n: number) {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
}

export function SharedVideoClient({
  videoId,
  videoUrl,
  skill,
  description,
  isRandom,
  viewsCount,
  author,
  currentUserId,
  initialLiked,
  initialLikeCount,
  initialCommentCount,
  guestTitle,
  guestText,
  guestCta,
  backLabel,
}: {
  videoId: string;
  videoUrl: string;
  skill: string | null;
  description: string | null;
  isRandom: boolean;
  viewsCount: number;
  author: { id: string; name: string; city: string; avatar: string | null };
  currentUserId: string | null;
  initialLiked: boolean;
  initialLikeCount: number;
  initialCommentCount: number;
  guestTitle: string;
  guestText: string;
  guestCta: string;
  backLabel: string;
}) {
  const t = useT();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [muted, setMuted] = useState(true);
  const [heartPop, setHeartPop] = useState(0);
  const isGuest = !currentUserId;

  function nudgeSignIn(message: string) {
    toast(message, {
      action: {
        label: guestCta,
        onClick: () => router.push("/sign-in"),
      },
    });
  }

  async function toggleLike() {
    if (isGuest) {
      nudgeSignIn(t.publicProfile.signInToLike);
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setHeartPop((n) => n + 1);
    const supabase = createClient();
    if (wasLiked) {
      await supabase.rpc("unlike_video", { p_video_id: videoId });
    } else {
      const { data } = await supabase.rpc("like_video", { p_video_id: videoId });
      if (data?.matched) {
        toast.success(
          t.feed.matchTitle + " " + author.name + " 💜"
        );
      } else {
        fetch("/api/notify/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        }).catch(() => {});
      }
    }
  }

  function handleComment() {
    if (isGuest) {
      nudgeSignIn(t.publicProfile.signInToComment);
      return;
    }
    // Залогиненный — переходит на свой полноценный плеер
    router.push(`/u/${author.id}`);
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      {/* Назад / закрыть */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-30 bg-black/60 backdrop-blur rounded-full p-2 text-white hover:bg-black/80 transition-colors"
        aria-label={backLabel}
      >
        <X className="w-5 h-5" />
      </Link>

      {/* Share-кнопка */}
      <div className="fixed top-4 right-4 z-30">
        <ShareButton
          url={`/v/${videoId}`}
          title={`${author.name} on Echo`}
          text={description ?? skill ?? "Watch on Echo"}
          className="bg-black/60 backdrop-blur hover:bg-black/80"
        />
      </div>

      {/* Дешёвый градиент-фон */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-900 via-black to-zinc-900" />
      {/* Основное видео — целиком */}
      <video
        src={videoUrl}
        autoPlay
        loop
        muted={muted}
        playsInline
        preload="auto"
        onClick={() => setMuted((m) => !m)}
        className="relative z-[1] h-full w-auto max-w-full object-contain cursor-pointer"
      />

      {/* Затемнение снизу */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[2]" />

      {/* Гостевой призыв сверху — мягкое стекло, не кричит */}
      {isGuest && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 bg-black/40 backdrop-blur-md border border-echo/30 text-white/90 px-4 py-2 rounded-full text-sm font-medium max-w-[calc(100vw-160px)]">
          <Link href="/sign-in" className="flex items-center gap-2">
            <span className="line-clamp-1">{guestTitle}</span>
            <span className="text-echo-bright">→</span>
          </Link>
        </div>
      )}

      {/* Автор + skill + описание */}
      <div className="absolute bottom-6 left-0 right-20 px-5 z-10">
        <Link
          href={`/u/${author.id}`}
          className="flex items-center gap-2.5"
        >
          <span className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-white/25 bg-white/10 flex items-center justify-center">
            {author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base text-white">
                {author.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </span>
          <div>
            <p className="text-white font-semibold text-base leading-tight drop-shadow">
              {author.name}
            </p>
            <p className="text-zinc-300 text-xs drop-shadow">{author.city}</p>
          </div>
        </Link>
        {skill && (
          <p className="text-white text-xs mt-2 bg-white/15 backdrop-blur-sm inline-block px-2.5 py-1 rounded-full drop-shadow font-medium">
            🎯 {skill}
          </p>
        )}
        {description && (
          <p className="text-white text-[13px] mt-2 leading-relaxed whitespace-pre-wrap drop-shadow max-h-24 overflow-y-auto">
            {description}
          </p>
        )}
        <p className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1 drop-shadow">
          <Eye className="w-3 h-3" />
          {formatCount(viewsCount)}
        </p>
      </div>

      {/* Колонка действий справа */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-4 z-10">
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <div
            className={`rounded-full p-3 transition-colors ${
              liked ? "bg-echo glow-echo" : "bg-white/20 backdrop-blur-sm"
            }`}
          >
            <Heart
              key={heartPop}
              className={`w-6 h-6 text-white ${heartPop > 0 ? "heart-pop" : ""}`}
              fill={liked ? "white" : "none"}
            />
          </div>
          <span className="text-white text-xs font-medium drop-shadow">
            {likeCount}
          </span>
        </button>
        {isRandom && (
          <button onClick={handleComment} className="flex flex-col items-center gap-1">
            <div className="rounded-full p-3 bg-white/20 backdrop-blur-sm">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-medium drop-shadow">
              {initialCommentCount}
            </span>
          </button>
        )}
      </div>

      {/* Гостевой нижний банер — стеклянная карточка с мягким свечением */}
      {isGuest && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-sm">
          <Link
            href="/sign-in"
            className="block rounded-2xl bg-zinc-950/70 backdrop-blur-xl border border-white/10 px-5 py-3.5 text-center shadow-2xl shadow-echo/10 hover:border-echo/40 transition-colors"
          >
            <p className="text-sm font-semibold text-white">{guestText}</p>
            <p className="text-xs text-echo-bright mt-1 font-medium">{guestCta} →</p>
          </Link>
        </div>
      )}
    </div>
  );
}

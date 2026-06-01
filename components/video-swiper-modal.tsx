"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Heart, MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBackButtonClose } from "@/lib/use-back-button-close";
import { useT } from "@/lib/i18n/provider";
import { CommentsPanel } from "./comments-panel";
import { EditDescriptionButton } from "./edit-video-description";
import { VideoShareButton } from "./video-share-sheet";

export type SwiperVideo = {
  id: string;
  url: string;
  description: string | null;
  skill: string | null;
  isRandom: boolean;
  viewsCount: number;
};

export type SwiperAuthor = {
  id: string;
  name: string;
  city: string;
  avatar: string | null;
};

export function VideoSwiperModal({
  videos,
  author,
  startIndex,
  currentUserId,
  onClose,
}: {
  videos: SwiperVideo[];
  author: SwiperAuthor;
  startIndex: number;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useBackButtonClose(true, onClose);

  // Сразу прыгаем на нужное видео (тапнутый тайл)
  useEffect(() => {
    if (!mounted) return;
    const c = containerRef.current;
    if (!c) return;
    c.scrollTo({ top: c.clientHeight * startIndex, behavior: "instant" });
  }, [mounted, startIndex]);

  // Автоплей текущего, пауза остальных
  useEffect(() => {
    if (!mounted) return;
    const c = containerRef.current;
    if (!c) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute("data-id");
          if (!id) continue;
          const v = videoRefs.current.get(id);
          if (!v) continue;
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            v.play().catch(() => {});
          } else {
            v.pause();
            v.currentTime = 0;
          }
        }
      },
      { root: c, threshold: [0, 0.6, 1] }
    );
    c.querySelectorAll("[data-id]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[55] bg-black animate-in fade-in duration-200">
      <button
        onClick={onClose}
        className="fixed top-4 left-4 z-[60] bg-black/60 backdrop-blur rounded-full p-2 text-white"
        aria-label="close"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        ref={containerRef}
        className="h-[100dvh] w-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {videos.map((v) => (
          <SwiperSlide
            key={v.id}
            video={v}
            author={author}
            currentUserId={currentUserId}
            setVideoRef={(el) => {
              if (el) videoRefs.current.set(v.id, el);
              else videoRefs.current.delete(v.id);
            }}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}

function SwiperSlide({
  video,
  author,
  currentUserId,
  setVideoRef,
}: {
  video: SwiperVideo;
  author: SwiperAuthor;
  currentUserId: string | null;
  setVideoRef: (el: HTMLVideoElement | null) => void;
}) {
  const t = useT();
  const supabase = createClient();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [heartPop, setHeartPop] = useState(0);
  const [muted, setMuted] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  const viewedRef = useRef(false);

  // Определяем переполняется ли описание (для показа "more")
  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el || expanded) return;
    setOverflows(el.scrollHeight > el.offsetHeight + 1);
  }, [video.description, expanded]);

  useEffect(() => {
    (async () => {
      if (!viewedRef.current && currentUserId && currentUserId !== author.id) {
        viewedRef.current = true;
        await supabase.rpc("increment_video_views", { p_video_id: video.id });
      }
      const tasks: PromiseLike<unknown>[] = [];
      tasks.push(
        supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("video_id", video.id)
          .then(({ count }) => setLikeCount(count ?? 0))
      );
      if (currentUserId) {
        tasks.push(
          supabase
            .from("likes")
            .select("video_id")
            .eq("video_id", video.id)
            .eq("liker_id", currentUserId)
            .maybeSingle()
            .then(({ data }) => setLiked(!!data))
        );
      }
      if (video.isRandom) {
        tasks.push(
          supabase
            .from("video_comments")
            .select("*", { count: "exact", head: true })
            .eq("video_id", video.id)
            .then(({ count }) => setCommentCount(count ?? 0))
        );
      }
      await Promise.all(tasks);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  async function toggleLike() {
    if (!currentUserId) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setHeartPop((n) => n + 1);
    if (wasLiked) {
      await supabase.rpc("unlike_video", { p_video_id: video.id });
    } else {
      const { data } = await supabase.rpc("like_video", { p_video_id: video.id });
      // Не мэтч — письмо «тебя лайкнули» автору
      if (!data?.matched) {
        fetch("/api/notify/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: video.id }),
        }).catch(() => {});
      }
    }
  }

  const isOwner = currentUserId === author.id;

  return (
    <div
      data-id={video.id}
      className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black"
    >
      {/* Размытый кадр-фон */}
      <video
        src={`${video.url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-40"
      />
      {/* Основное видео — целиком */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={setVideoRef}
          src={video.url}
          loop
          muted={muted}
          playsInline
          preload="auto"
          onClick={() => setMuted((m) => !m)}
          className="relative z-[1] h-full w-auto max-w-full object-contain cursor-pointer"
        />
      </div>

      {/* Затемнение снизу — чтобы текст читался без отдельной плашки */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-[2]" />

      {/* Бэкдроп когда описание развёрнуто */}
      {video.description && expanded && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/45 backdrop-blur-md animate-in fade-in duration-200"
          style={{ height: "55%" }}
        />
      )}

      <div className="absolute bottom-6 left-0 right-20 px-5 z-10">
        <Link href={`/u/${author.id}`} className="flex items-center gap-2.5">
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
        {video.skill && (
          <p className="text-white text-xs mt-2 bg-white/15 backdrop-blur-sm inline-block px-2.5 py-1 rounded-full drop-shadow font-medium">
            🎯 {video.skill}
          </p>
        )}
        {(video.description || isOwner) && (
          <div className="mt-2 flex items-start gap-2">
            {video.description ? (
              <div className="flex-1 min-w-0">
                <p
                  ref={descRef}
                  className={`text-white text-[13px] leading-relaxed whitespace-pre-wrap drop-shadow transition-all ${
                    expanded ? "max-h-60 overflow-y-auto pr-2" : "line-clamp-2"
                  }`}
                >
                  {video.description}
                </p>
                {(overflows || expanded) && (
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    className="text-xs text-zinc-300 hover:text-white mt-1 font-semibold transition-colors"
                  >
                    {expanded ? t.feed.less : t.feed.more}
                  </button>
                )}
              </div>
            ) : isOwner ? (
              <p className="text-zinc-400 italic text-[13px] flex-1">
                {t.editVideo.addDescriptionHint}
              </p>
            ) : null}
            {isOwner && (
              <EditDescriptionButton
                videoId={video.id}
                initialDescription={video.description}
                className="shrink-0 mt-0.5"
              />
            )}
          </div>
        )}
      </div>

      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-4 z-10">
        <button
          onClick={toggleLike}
          disabled={!currentUserId}
          className="flex flex-col items-center gap-1 disabled:opacity-50"
        >
          <div
            className={`rounded-full p-3 transition-colors ${
              liked ? "bg-echo glow-echo" : "bg-white/20"
            }`}
          >
            <Heart
              key={heartPop}
              className={`w-6 h-6 text-white ${heartPop > 0 ? "heart-pop" : ""}`}
              fill={liked ? "white" : "none"}
            />
          </div>
          <span className="text-white text-xs font-medium">{likeCount}</span>
        </button>
        {video.isRandom && (
          <button
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1"
          >
            <div className="rounded-full p-3 bg-white/20">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-medium">{commentCount}</span>
          </button>
        )}
        {/* Поделиться: копировать / нативный шаринг / отправить мэтчу */}
        <VideoShareButton
          videoId={video.id}
          title={`${author.name} on Echo`}
          text={video.description ?? video.skill ?? "Watch on Echo"}
        />
      </div>

      {showComments && (
        <CommentsPanel
          videoId={video.id}
          currentUserId={currentUserId}
          onClose={() => setShowComments(false)}
          onCountChange={(c) => setCommentCount(c)}
        />
      )}
    </div>
  );
}

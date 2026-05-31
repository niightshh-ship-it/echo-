"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { CommentsPanel } from "@/components/comments-panel";
import { MatchCelebration } from "@/components/match-celebration";
import { ShareButton } from "@/components/share-button";

export type FeedItem = {
  id: string;
  authorId: string;
  skill: string | null;
  description: string | null;
  isRandom: boolean;
  authorName: string;
  authorCity: string;
  authorAvatar: string | null;
  url: string;
};

type Mode = "skill" | "random";

export function FeedClient({
  skillItems,
  randomItems,
  initiallyLiked,
  myName,
  myAvatar,
}: {
  skillItems: FeedItem[];
  randomItems: FeedItem[];
  initiallyLiked: string[];
  myName: string;
  myAvatar: string | null;
}) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("skill");
  const [drag, setDrag] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set(initiallyLiked));
  const [match, setMatch] = useState<{
    name: string;
    avatar: string | null;
    id: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; dir: "unknown" | "h" | "v" } | null>(null);
  // Ref для текущего drag и mode — нужны внутри нативных обработчиков без closure-лагов
  const dragRef = useRef(0);
  const modeRef = useRef<Mode>("skill");
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    function handleTouchStart(e: TouchEvent) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dir: "unknown" };
      setAnimating(false);
    }

    function handleTouchMove(e: TouchEvent) {
      if (!touchStart.current) return;
      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;

      if (touchStart.current.dir === "unknown") {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          touchStart.current.dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        }
      }

      if (touchStart.current.dir === "h") {
        // Блокируем вертикальный скролл браузера при горизонтальном свайпе
        e.preventDefault();
        const vw = window.innerWidth;
        const currentMode = modeRef.current;
        const maxRight = currentMode === "skill" ? 0 : vw;
        const minLeft = currentMode === "random" ? 0 : -vw;
        const clamped = Math.max(minLeft, Math.min(maxRight, dx));
        dragRef.current = clamped;
        setDrag(clamped);
      }
    }

    function handleTouchEnd() {
      if (!touchStart.current) return;
      const wasH = touchStart.current.dir === "h";
      const finalDrag = dragRef.current;
      touchStart.current = null;
      dragRef.current = 0;
      setAnimating(true);
      if (wasH && Math.abs(finalDrag) > 80) {
        setMode(finalDrag < 0 ? "random" : "skill");
      }
      setDrag(0);
    }

    // passive: false — обязательно, иначе preventDefault() в touchmove игнорируется
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function switchTo(m: Mode) {
    setAnimating(true);
    setMode(m);
  }

  async function toggleLike(item: FeedItem) {
    const supabase = createClient();
    const wasLiked = liked.has(item.id);
    setLiked((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(item.id);
      else next.add(item.id);
      return next;
    });

    if (wasLiked) {
      const { error } = await supabase.rpc("unlike_video", { p_video_id: item.id });
      if (error) {
        setLiked((prev) => new Set(prev).add(item.id));
        console.error(error);
      }
    } else {
      const { data, error } = await supabase.rpc("like_video", { p_video_id: item.id });
      if (error) {
        setLiked((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        console.error(error);
        return;
      }
      if (data?.matched) {
        setMatch({
          name: item.authorName,
          avatar: item.authorAvatar,
          id: item.authorId,
        });
        // Письмо о мэтче собеседнику — не ждём и не падаем если не вышло
        fetch("/api/notify/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otherId: item.authorId }),
        }).catch(() => {});
      }
    }
  }

  const baseTx = mode === "skill" ? "0vw" : "-100vw";

  return (
    <div
      ref={wrapperRef}
      className="h-screen w-screen overflow-hidden bg-black"
      style={{ touchAction: "pan-y" }}
    >
      {/* Переключатель */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex bg-black/50 backdrop-blur-md rounded-full p-1 gap-1 shadow-[0_2px_16px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => switchTo("skill")}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
            mode === "skill" ? "bg-white text-black" : "text-zinc-300"
          }`}
        >
          🎯 {t.upload.skillType}
        </button>
        <button
          onClick={() => switchTo("random")}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
            mode === "random" ? "bg-white text-black" : "text-zinc-300"
          }`}
        >
          ✨ {t.upload.randomType}
        </button>
      </div>

      {/* Празднование мэтча */}
      {match && (
        <MatchCelebration
          myName={myName}
          myAvatar={myAvatar}
          partnerName={match.name}
          partnerAvatar={match.avatar}
          partnerId={match.id}
          onClose={() => setMatch(null)}
        />
      )}

      {/* Карусель */}
      <div
        className="flex h-screen bg-black"
        style={{
          width: "200vw",
          transform: `translateX(calc(${baseTx} + ${drag}px))`,
          transition: animating ? "transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1)" : "none",
          willChange: "transform",
        }}
      >
        <FeedColumn
          items={skillItems}
          mode="skill"
          active={mode === "skill"}
          liked={liked}
          onLikeToggle={toggleLike}
          currentUserId={currentUserId}
        />
        <FeedColumn
          items={randomItems}
          mode="random"
          active={mode === "random"}
          liked={liked}
          onLikeToggle={toggleLike}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}

function FeedColumn({
  items,
  mode,
  active,
  liked,
  onLikeToggle,
  currentUserId,
}: {
  items: FeedItem[];
  mode: Mode;
  active: boolean;
  liked: Set<string>;
  onLikeToggle: (item: FeedItem) => void;
  currentUserId: string | null;
}) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [muted, setMuted] = useState(true);
  // Каждый id засчитываем как просмотр один раз за сессию ленты
  const viewedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!active || !activeId) return;
    if (viewedRef.current.has(activeId)) return;
    viewedRef.current.add(activeId);
    createClient()
      .rpc("increment_video_views", { p_video_id: activeId })
      .then(({ error }) => {
        if (error) console.warn("[echo] view count failed:", error);
      });
  }, [active, activeId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!active) {
      videoRefs.current.forEach((v) => v.pause());
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute("data-id");
          if (!id) continue;
          const video = videoRefs.current.get(id);
          if (!video) continue;
          if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
            setActiveId(id);
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
          }
        }
      },
      { root: container, threshold: [0, 0.7, 1] }
    );
    const slides = container.querySelectorAll("[data-id]");
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [active, items]);

  useEffect(() => {
    if (active) {
      containerRef.current?.scrollTo({ top: 0 });
      setActiveId(items[0]?.id ?? null);
    }
  }, [active, items]);

  if (items.length === 0) {
    return (
      <div className="w-screen h-screen shrink-0 flex flex-col items-center justify-center text-center px-6 bg-black">
        <div className="text-6xl mb-5 select-none animate-pulse">
          {mode === "skill" ? "🎯" : "✨"}
        </div>
        <h1 className="text-3xl font-bold mb-3 tracking-tight">{t.feed.emptyTitle}</h1>
        <p className="text-zinc-400 text-sm max-w-xs mb-7 leading-relaxed">
          {t.feed.emptyText}
        </p>
        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          <Link href="/upload">
            <button className="w-full bg-echo text-white hover:bg-echo-bright rounded-full h-12 font-semibold transition-colors glow-echo">
              {t.feed.emptyUpload}
            </button>
          </Link>
          <ShareButton
            url="/"
            title="Echo — trade skills"
            text={t.feed.emptyText}
            variant="button"
            className="w-full justify-center h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-200 text-sm"
          />
        </div>
      </div>
    );
  }

  function setVideoRef(id: string, el: HTMLVideoElement | null) {
    if (el) videoRefs.current.set(id, el);
    else videoRefs.current.delete(id);
  }

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen shrink-0 overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide"
      style={{ scrollbarWidth: "none" }}
    >
      {items.map((item) => (
        <VideoSlide
          key={item.id}
          item={item}
          mode={mode}
          isLiked={liked.has(item.id)}
          onLikeToggle={() => onLikeToggle(item)}
          muted={muted}
          onMuteToggle={() => setMuted((m) => !m)}
          setVideoRef={setVideoRef}
          showSoundHint={muted && item.id === items[0].id && activeId === item.id}
          currentUserId={currentUserId}
        />
      ))}
      {/* Финальный слайд: «ты посмотрел всё» */}
      <EndOfFeedSlide />
    </div>
  );
}

function EndOfFeedSlide() {
  const t = useT();
  return (
    <div className="relative h-screen w-full snap-start snap-always flex flex-col items-center justify-center text-center px-6 bg-black">
      <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 h-[260px] w-[420px] rounded-full bg-echo opacity-15 blur-[110px]" />
      <div className="relative z-10 flex flex-col items-center max-w-xs">
        <div className="text-6xl mb-5 select-none">🎬</div>
        <h1 className="text-2xl font-bold mb-3 tracking-tight text-white">
          {t.feed.endTitle}
        </h1>
        <p className="text-zinc-400 text-sm mb-7 leading-relaxed">
          {t.feed.endText}
        </p>
        <div className="flex flex-col gap-2.5 w-full">
          <Link href="/upload">
            <button className="w-full bg-echo text-white hover:bg-echo-bright rounded-full h-12 font-semibold transition-colors glow-echo">
              {t.feed.emptyUpload}
            </button>
          </Link>
          <ShareButton
            url="/"
            title="Echo — trade skills"
            text={t.feed.emptyText}
            variant="button"
            className="w-full justify-center h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-200 text-sm"
          />
          <button
            onClick={() => window.location.reload()}
            className="w-full h-11 text-sm text-zinc-500 hover:text-white transition-colors"
          >
            ↻ {t.feed.endRefresh}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoSlide({
  item,
  mode,
  isLiked,
  onLikeToggle,
  muted,
  onMuteToggle,
  setVideoRef,
  showSoundHint,
  currentUserId,
}: {
  item: FeedItem;
  mode: Mode;
  isLiked: boolean;
  onLikeToggle: () => void;
  muted: boolean;
  onMuteToggle: () => void;
  setVideoRef: (id: string, el: HTMLVideoElement | null) => void;
  showSoundHint: boolean;
  currentUserId: string | null;
}) {
  const t = useT();
  const descRef = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [heartPop, setHeartPop] = useState(0);

  // Счётчики — только в режиме random
  useEffect(() => {
    if (mode !== "random") return;
    const supabase = createClient();
    (async () => {
      const [{ count: lc }, { count: cc }] = await Promise.all([
        supabase.from("likes").select("*", { count: "exact", head: true }).eq("video_id", item.id),
        supabase
          .from("video_comments")
          .select("*", { count: "exact", head: true })
          .eq("video_id", item.id),
      ]);
      setLikeCount(lc ?? 0);
      setCommentCount(cc ?? 0);
    })();
  }, [mode, item.id]);

  // Определяем — действительно ли описание не помещается в 2 строки
  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el || expanded) return;
    setOverflows(el.scrollHeight > el.offsetHeight + 1);
  }, [item.description, expanded]);

  function handleLikeToggle() {
    if (mode === "random") {
      setLikeCount((c) => c + (isLiked ? -1 : 1));
    }
    setHeartPop((n) => n + 1);
    onLikeToggle();
  }

  const hasDescription = !!item.description && item.description.trim().length > 0;

  return (
    <div
      data-id={item.id}
      className="relative h-screen w-full snap-start snap-always flex items-center justify-center"
    >
      <video
        ref={(el) => setVideoRef(item.id, el)}
        src={item.url}
        loop
        muted={muted}
        playsInline
        onClick={onMuteToggle}
        className="h-full w-full object-contain bg-black"
      />

      <div className="absolute bottom-20 left-0 right-20 p-6 pb-2 bg-gradient-to-t from-black/80 to-transparent">
        <Link
          href={`/u/${item.authorId}`}
          className="flex items-center gap-2.5 hover:opacity-80"
        >
          <span className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-white/25 bg-white/10 flex items-center justify-center">
            {item.authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.authorAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base">{item.authorName?.[0]?.toUpperCase() ?? "?"}</span>
            )}
          </span>
          <div>
            <p className="text-white font-semibold text-lg leading-tight">{item.authorName}</p>
            <p className="text-zinc-300 text-sm">{item.authorCity}</p>
          </div>
        </Link>
        {item.skill && (
          <p className="text-white text-sm mt-2 bg-white/10 inline-block px-2 py-0.5 rounded">
            {item.skill}
          </p>
        )}
        {hasDescription && (
          <div className="mt-2">
            <p
              ref={descRef}
              className={`text-white text-sm leading-snug whitespace-pre-wrap ${
                expanded ? "" : "line-clamp-2"
              }`}
            >
              {item.description}
            </p>
            {(overflows || expanded) && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-xs text-zinc-300 mt-1 underline"
              >
                {expanded ? t.feed.less : t.feed.more}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Колонка действий справа */}
      <div className="absolute right-4 bottom-[5.5rem] flex flex-col items-center gap-4">
        <button onClick={handleLikeToggle} className="flex flex-col items-center gap-1">
          <div
            className={`rounded-full p-3 transition-colors ${
              isLiked ? "bg-echo glow-echo" : "bg-white/20"
            }`}
          >
            <Heart
              key={heartPop}
              className={`w-7 h-7 text-white ${heartPop > 0 ? "heart-pop" : ""}`}
              fill={isLiked ? "white" : "none"}
            />
          </div>
          {mode === "random" && (
            <span className="text-white text-xs font-medium">{likeCount}</span>
          )}
        </button>
        {mode === "random" && (
          <button
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1"
          >
            <div className="rounded-full p-3 bg-white/20">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <span className="text-white text-xs font-medium">{commentCount}</span>
          </button>
        )}
      </div>

      {showSoundHint && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
          {t.feed.soundHint}
        </div>
      )}

      {showComments && (
        <CommentsPanel
          videoId={item.id}
          currentUserId={currentUserId}
          onClose={() => setShowComments(false)}
          onCountChange={(c) => setCommentCount(c)}
        />
      )}
    </div>
  );
}

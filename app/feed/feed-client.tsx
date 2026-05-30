"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { CommentsPanel } from "@/components/comments-panel";

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
}: {
  skillItems: FeedItem[];
  randomItems: FeedItem[];
  initiallyLiked: string[];
}) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("skill");
  const [drag, setDrag] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set(initiallyLiked));
  const [matchBanner, setMatchBanner] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  const touchStart = useRef<{ x: number; y: number; dir: "unknown" | "h" | "v" } | null>(null);

  useEffect(() => {
    if (!matchBanner) return;
    const id = setTimeout(() => setMatchBanner(null), 4000);
    return () => clearTimeout(id);
  }, [matchBanner]);

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dir: "unknown" };
    setAnimating(false);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (touchStart.current.dir === "unknown") {
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
        touchStart.current.dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
    }
    if (touchStart.current.dir === "h") {
      // Зажимаем drag так, чтобы карусель не уезжала за свои две колонки
      const vw = typeof window !== "undefined" ? window.innerWidth : 0;
      const maxRight = mode === "skill" ? 0 : vw; // вправо тянем только если на random
      const minLeft = mode === "random" ? 0 : -vw; // влево тянем только если на skill
      const clamped = Math.max(minLeft, Math.min(maxRight, dx));
      setDrag(clamped);
    }
  }
  function onTouchEnd() {
    if (!touchStart.current) return;
    const wasH = touchStart.current.dir === "h";
    const finalDrag = drag;
    touchStart.current = null;
    setAnimating(true);
    if (wasH && Math.abs(finalDrag) > 80) {
      setMode(finalDrag < 0 ? "random" : "skill");
    }
    setDrag(0);
  }

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
        setMatchBanner(item.authorName);
      }
    }
  }

  const baseTx = mode === "skill" ? "0vw" : "-100vw";

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-black"
      style={{ touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Переключатель */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex bg-black/60 backdrop-blur-md rounded-full p-1 gap-1 border border-white/10">
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

      {/* Баннер мэтча */}
      {matchBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-echo text-white px-6 py-3 rounded-full shadow-xl glow-echo animate-bounce font-medium">
          🎉 {t.feed.match.replace("{name}", matchBanner)}
        </div>
      )}

      {/* Карусель */}
      <div
        className="flex h-screen"
        style={{
          width: "200vw",
          transform: `translateX(calc(${baseTx} + ${drag}px))`,
          transition: animating ? "transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1)" : "none",
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
      <div className="w-screen h-screen shrink-0 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-2xl font-bold mb-2 lowercase">{t.feed.emptyTitle}</h1>
        <p className="text-zinc-400 text-sm">{t.feed.emptyText}</p>
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

      <div className="absolute bottom-16 left-0 right-20 p-6 bg-gradient-to-t from-black/80 to-transparent">
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
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-4">
        <button onClick={handleLikeToggle} className="flex flex-col items-center gap-1">
          <div
            className={`rounded-full p-3 transition-colors ${
              isLiked ? "bg-echo glow-echo" : "bg-white/20"
            }`}
          >
            <Heart className="w-7 h-7 text-white" fill={isLiked ? "white" : "none"} />
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

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

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

  const touchStart = useRef<{ x: number; y: number; dir: "unknown" | "h" | "v" } | null>(null);

  // Авто-скрытие баннера мэтча
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
      setDrag(dx);
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

  // Когда mode = skill, перемещаем wrapper на 0; random → -100vw. Плюс drag.
  const baseTx = mode === "skill" ? "0vw" : "-100vw";

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-black"
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

      {/* Карусель — две колонки бок-о-бок */}
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
          active={mode === "skill"}
          liked={liked}
          onLikeToggle={toggleLike}
          t={t}
        />
        <FeedColumn
          items={randomItems}
          active={mode === "random"}
          liked={liked}
          onLikeToggle={toggleLike}
          t={t}
        />
      </div>
    </div>
  );
}

function FeedColumn({
  items,
  active,
  liked,
  onLikeToggle,
  t,
}: {
  items: FeedItem[];
  active: boolean;
  liked: Set<string>;
  onLikeToggle: (item: FeedItem) => void;
  t: ReturnType<typeof useT>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [muted, setMuted] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Автоплей текущего видео — только когда колонка активна
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

  // Когда колонка становится активной — скроллим к началу, ставим первый видео
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

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen shrink-0 overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide"
      style={{ scrollbarWidth: "none" }}
    >
      {items.map((item) => {
        const isExpanded = expanded.has(item.id);
        const hasDescription = !!item.description && item.description.trim().length > 0;
        return (
          <div
            key={item.id}
            data-id={item.id}
            className="relative h-screen w-full snap-start snap-always flex items-center justify-center"
          >
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(item.id, el);
                else videoRefs.current.delete(item.id);
              }}
              src={item.url}
              loop
              muted={muted}
              playsInline
              onClick={() => setMuted((m) => !m)}
              className="h-full w-full object-contain bg-black"
            />

            <div className="absolute bottom-16 left-0 right-16 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <Link href={`/u/${item.authorId}`} className="flex items-center gap-2.5 hover:opacity-80">
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
                    className={`text-white text-sm leading-snug whitespace-pre-wrap ${
                      isExpanded ? "" : "line-clamp-2"
                    }`}
                  >
                    {item.description}
                  </p>
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="text-xs text-zinc-300 mt-1 underline"
                  >
                    {isExpanded ? t.feed.less : t.feed.more}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onLikeToggle(item)}
              className="absolute right-4 bottom-44 flex flex-col items-center gap-1"
            >
              <div
                className={`rounded-full p-3 transition-colors ${
                  liked.has(item.id) ? "bg-echo glow-echo" : "bg-white/20"
                }`}
              >
                <Heart className="w-7 h-7 text-white" fill={liked.has(item.id) ? "white" : "none"} />
              </div>
            </button>

            {muted && item.id === items[0].id && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                {t.feed.soundHint}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

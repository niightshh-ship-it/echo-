"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { CATEGORIES, CATEGORY_EMOJI, isPredefined } from "@/lib/categories";

export type FeedItem = {
  id: string;
  authorId: string;
  skill: string;
  category: string | null;
  authorName: string;
  authorCity: string;
  authorAvatar: string | null;
  url: string;
};

export function FeedClient({
  items,
  initiallyLiked,
}: {
  items: FeedItem[];
  initiallyLiked: string[];
}) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const visibleItems = categoryFilter
    ? items.filter((i) => i.category === categoryFilter)
    : items;
  const [activeId, setActiveId] = useState<string | null>(visibleItems[0]?.id ?? null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set(initiallyLiked));
  const [matchBanner, setMatchBanner] = useState<string | null>(null);

  // Автоплей того видео, что в фокусе
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
  }, [items]);

  // Стрелки на десктопе
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const container = containerRef.current;
      if (!container) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const idx = visibleItems.findIndex((i) => i.id === activeId);
        const next = visibleItems[idx + delta];
        if (next) {
          const el = container.querySelector(`[data-id="${next.id}"]`);
          el?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, visibleItems]);

  // Авто-скрытие баннера мэтча
  useEffect(() => {
    if (!matchBanner) return;
    const t = setTimeout(() => setMatchBanner(null), 4000);
    return () => clearTimeout(t);
  }, [matchBanner]);

  async function toggleLike(item: FeedItem) {
    const supabase = createClient();
    const wasLiked = liked.has(item.id);

    // Оптимистично обновляем UI
    setLiked((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(item.id);
      else next.add(item.id);
      return next;
    });

    if (wasLiked) {
      const { error } = await supabase.rpc("unlike_video", { p_video_id: item.id });
      if (error) {
        // Откатываем
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

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 text-center">
        <h1 className="text-3xl font-bold mb-2 lowercase">{t.feed.emptyTitle}</h1>
        <p className="text-zinc-400 mb-8">{t.feed.emptyText}</p>
        <Link href="/profile" className="text-echo-bright underline">
          {t.feed.backToProfile}
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Баннер мэтча — поверх всего */}
      {matchBanner && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-echo text-white px-6 py-3 rounded-full shadow-xl glow-echo animate-bounce font-medium">
          🎉 {t.feed.match.replace("{name}", matchBanner)}
        </div>
      )}

      {/* Категории — фиксированный фильтр-бар сверху */}
      <div className="fixed top-0 left-0 right-0 z-30 px-3 pt-3 pb-2 bg-gradient-to-b from-black/70 via-black/40 to-transparent backdrop-blur-sm">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setCategoryFilter(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              categoryFilter === null ? "bg-white text-black" : "bg-white/15 text-white"
            }`}
          >
            {t.categories.all}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                categoryFilter === c ? "bg-white text-black" : "bg-white/15 text-white"
              }`}
            >
              {CATEGORY_EMOJI[c]} {t.categories[c]}
            </button>
          ))}
        </div>
      </div>

      {visibleItems.length === 0 && (
        <div className="h-screen w-full flex items-center justify-center snap-start">
          <p className="text-zinc-400 text-sm">{t.feed.emptyTitle}</p>
        </div>
      )}

      {visibleItems.map((item) => (
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
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-white text-sm bg-white/10 px-2 py-0.5 rounded">{item.skill}</span>
              {item.category && (
                <span className="text-xs text-white/80 bg-echo/30 border border-echo/40 px-2 py-0.5 rounded">
                  {isPredefined(item.category)
                    ? `${CATEGORY_EMOJI[item.category]} ${t.categories[item.category]}`
                    : `✨ ${item.category}`}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => toggleLike(item)}
            className="absolute right-4 bottom-44 flex flex-col items-center gap-1"
          >
            <div
              className={`rounded-full p-3 transition-colors ${
                liked.has(item.id) ? "bg-echo glow-echo" : "bg-white/20"
              }`}
            >
              <Heart
                className="w-7 h-7 text-white"
                fill={liked.has(item.id) ? "white" : "none"}
              />
            </div>
          </button>

          {muted && item.id === items[0].id && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
              {t.feed.soundHint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

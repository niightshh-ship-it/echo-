"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

export type FeedItem = {
  id: string;
  skill: string;
  authorName: string;
  authorCity: string;
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
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
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
        const idx = items.findIndex((i) => i.id === activeId);
        const next = items[idx + delta];
        if (next) {
          const el = container.querySelector(`[data-id="${next.id}"]`);
          el?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, items]);

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

      {items.map((item) => (
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

          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
            <Link href="/profile" className="text-white text-sm">
              {t.feed.profile}
            </Link>
            <Link href="/matches" className="text-white text-sm">
              {t.feed.matches}
            </Link>
          </div>

          <div className="absolute bottom-0 left-0 right-16 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white font-semibold text-lg">{item.authorName}</p>
            <p className="text-zinc-300 text-sm">{item.authorCity}</p>
            <p className="text-white text-sm mt-2 bg-white/10 inline-block px-2 py-0.5 rounded">
              {item.skill}
            </p>
          </div>

          <button
            onClick={() => toggleLike(item)}
            className="absolute right-4 bottom-32 flex flex-col items-center gap-1"
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

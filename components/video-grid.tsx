"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Eye, Lock, Play } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/provider";
import {
  VideoSwiperModal,
  type SwiperAuthor,
  type SwiperVideo,
} from "./video-swiper-modal";

function formatCount(n: number) {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
}

export function VideoGrid({
  videos,
  author,
  currentUserId,
  deleteButtons,
}: {
  videos: SwiperVideo[];
  author: SwiperAuthor;
  currentUserId: string | null;
  /** Готовые кнопки удаления — параллельный массив той же длины и порядка, что и videos.
   *  Передаётся уже отрендеренными нодами, потому что функции серверным компонентам
   *  нельзя пробрасывать в клиентские. */
  deleteButtons?: ReactNode[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const router = useRouter();
  const t = useT();
  const isGuest = !currentUserId;

  function handleTileClick(i: number) {
    if (isGuest) {
      toast(t.publicProfile.signInToWatch, {
        action: {
          label: t.publicProfile.guestCta,
          onClick: () => router.push("/sign-in"),
        },
      });
      return;
    }
    setOpenIndex(i);
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 grid-stagger">
        {videos.map((v, i) => (
          <div key={v.id} className="relative">
            <button
              type="button"
              onClick={() => handleTileClick(i)}
              className="relative block w-full aspect-[9/16] rounded-xl overflow-hidden border border-white/10 group transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.97] hover:border-echo/40 focus:outline-none focus:ring-2 focus:ring-echo bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"
            >
              {/* Превью-плейсхолдер БЕЗ загрузки видео — раньше каждый тайл
                  грузил видео для кадра, и при просмотре профилей это
                  выкачивало гигабайты. Видео грузится только при открытии. */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isGuest ? (
                  <div className="bg-white/10 backdrop-blur-md rounded-full p-2.5 border border-white/15">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="rounded-full bg-white/10 backdrop-blur-sm p-3 group-hover:bg-white/20 transition-colors">
                    <Play className="w-5 h-5 text-white" fill="white" />
                  </div>
                )}
              </div>
              {/* Скилл подписью, чтобы тайлы различались без превью-кадра */}
              {v.skill && (
                <div className="absolute top-1.5 left-1.5 right-1.5">
                  <span className="inline-block max-w-full truncate text-[10px] text-white/90 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
                    🎯 {v.skill}
                  </span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute left-1.5 bottom-1.5 flex items-center gap-1 text-[11px] text-white font-medium drop-shadow">
                <Eye className="w-3 h-3" />
                {formatCount(v.viewsCount)}
              </div>
            </button>
            {deleteButtons?.[i]}
          </div>
        ))}
      </div>
      {openIndex !== null && (
        <VideoSwiperModal
          videos={videos}
          author={author}
          startIndex={openIndex}
          currentUserId={currentUserId}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}

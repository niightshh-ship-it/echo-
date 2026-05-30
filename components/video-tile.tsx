"use client";

import { useState, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { VideoPlayerModal } from "./video-player-modal";

function formatCount(n: number) {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
}

export function VideoTile({
  videoId,
  videoUrl,
  description,
  skill,
  isRandom,
  authorId,
  authorName,
  authorAvatar,
  authorCity,
  currentUserId,
  viewsCount,
  deleteButton,
}: {
  videoId: string;
  videoUrl: string;
  description: string | null;
  skill: string | null;
  isRandom: boolean;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorCity: string;
  currentUserId: string | null;
  viewsCount: number;
  deleteButton?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState(viewsCount);

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative block w-full aspect-[9/16] rounded-xl overflow-hidden bg-zinc-900 border border-white/10 group transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.97] hover:border-echo/40 focus:outline-none focus:ring-2 focus:ring-echo"
        >
          {/* Превью — первый кадр без автоплея */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={`${videoUrl}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Затемнение снизу для счётчика */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute left-1.5 bottom-1.5 flex items-center gap-1 text-[11px] text-white font-medium drop-shadow">
            <Eye className="w-3 h-3" />
            {formatCount(views)}
          </div>
        </button>
        {deleteButton && (
          <div className="absolute top-1 right-1 z-10">{deleteButton}</div>
        )}
      </div>
      {open && (
        <VideoPlayerModal
          videoId={videoId}
          videoUrl={videoUrl}
          description={description}
          skill={skill}
          isRandom={isRandom}
          authorId={authorId}
          authorName={authorName}
          authorAvatar={authorAvatar}
          authorCity={authorCity}
          currentUserId={currentUserId}
          onClose={() => setOpen(false)}
          onViewIncremented={() => setViews((v) => v + 1)}
        />
      )}
    </>
  );
}

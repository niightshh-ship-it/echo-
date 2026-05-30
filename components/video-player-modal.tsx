"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Heart, MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CommentsPanel } from "./comments-panel";

export function VideoPlayerModal({
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
  onClose,
  onViewIncremented,
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
  onClose: () => void;
  onViewIncremented?: () => void;
}) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      // Инкремент просмотров (один раз, не на своё видео)
      if (!viewedRef.current && currentUserId && currentUserId !== authorId) {
        viewedRef.current = true;
        await supabase.rpc("increment_video_views", { p_video_id: videoId });
        onViewIncremented?.();
      }
      const tasks: PromiseLike<unknown>[] = [];
      tasks.push(
        supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("video_id", videoId)
          .then(({ count }) => setLikeCount(count ?? 0))
      );
      if (currentUserId) {
        tasks.push(
          supabase
            .from("likes")
            .select("video_id")
            .eq("video_id", videoId)
            .eq("liker_id", currentUserId)
            .maybeSingle()
            .then(({ data }) => setLiked(!!data))
        );
      }
      if (isRandom) {
        tasks.push(
          supabase
            .from("video_comments")
            .select("*", { count: "exact", head: true })
            .eq("video_id", videoId)
            .then(({ count }) => setCommentCount(count ?? 0))
        );
      }
      await Promise.all(tasks);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  async function toggleLike() {
    if (!currentUserId) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    if (wasLiked) {
      await supabase.rpc("unlike_video", { p_video_id: videoId });
    } else {
      await supabase.rpc("like_video", { p_video_id: videoId });
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[55] bg-black flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur rounded-full p-2 text-white"
        aria-label="close"
      >
        <X className="w-5 h-5" />
      </button>

      <video
        src={videoUrl}
        autoPlay
        loop
        playsInline
        onClick={(e) => {
          const v = e.currentTarget;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        }}
        className="max-h-screen max-w-full object-contain bg-black cursor-pointer"
      />

      {/* Автор + skill + описание снизу */}
      <div className="absolute bottom-6 left-0 right-20 px-5">
        <Link href={`/u/${authorId}`} className="flex items-center gap-2.5">
          <span className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-white/25 bg-white/10 flex items-center justify-center">
            {authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={authorAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-base text-white">
                {authorName?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </span>
          <div>
            <p className="text-white font-semibold text-base leading-tight">
              {authorName}
            </p>
            <p className="text-zinc-300 text-xs">{authorCity}</p>
          </div>
        </Link>
        {skill && (
          <p className="text-white text-sm mt-2 bg-white/10 inline-block px-2 py-0.5 rounded">
            {skill}
          </p>
        )}
        {description && (
          <p className="text-white text-sm mt-2 leading-snug whitespace-pre-wrap max-h-28 overflow-y-auto bg-black/30 p-2 rounded">
            {description}
          </p>
        )}
      </div>

      {/* Колонка действий */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-4">
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
            <Heart className="w-6 h-6 text-white" fill={liked ? "white" : "none"} />
          </div>
          <span className="text-white text-xs font-medium">{likeCount}</span>
        </button>
        {isRandom && (
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
      </div>

      {showComments && (
        <CommentsPanel
          videoId={videoId}
          currentUserId={currentUserId}
          onClose={() => setShowComments(false)}
          onCountChange={(c) => setCommentCount(c)}
        />
      )}
    </div>,
    document.body
  );
}

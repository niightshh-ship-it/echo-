"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RandomVideoModal } from "./random-video-modal";

export function RandomVideoTile({
  videoId,
  videoUrl,
  description,
  currentUserId,
  deleteButton,
}: {
  videoId: string;
  videoUrl: string;
  description: string | null;
  currentUserId: string | null;
  deleteButton?: ReactNode;
}) {
  const supabase = createClient();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ count: lc }, { count: cc }, myLikeRes] = await Promise.all([
        supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("video_id", videoId),
        supabase
          .from("video_comments")
          .select("*", { count: "exact", head: true })
          .eq("video_id", videoId),
        currentUserId
          ? supabase
              .from("likes")
              .select("video_id")
              .eq("video_id", videoId)
              .eq("liker_id", currentUserId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setLikeCount(lc ?? 0);
      setCommentCount(cc ?? 0);
      setLiked(!!myLikeRes.data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, currentUserId]);

  async function toggleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentUserId) return;
    const wasLiked = liked;
    const newLiked = !wasLiked;
    const newCount = likeCount + (wasLiked ? -1 : 1);
    setLiked(newLiked);
    setLikeCount(newCount);
    if (wasLiked) {
      await supabase.rpc("unlike_video", { p_video_id: videoId });
    } else {
      await supabase.rpc("like_video", { p_video_id: videoId });
    }
  }

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950">
        {deleteButton}
        <video
          src={videoUrl}
          playsInline
          muted
          onClick={() => setModalOpen(true)}
          className="w-full aspect-[9/16] object-cover cursor-pointer"
        />
        <div className="px-3 py-2 flex items-center gap-5">
          <button
            onClick={toggleLike}
            disabled={!currentUserId}
            className="flex items-center gap-1.5 disabled:opacity-50"
          >
            <Heart
              className={`w-5 h-5 ${liked ? "fill-echo text-echo" : "text-zinc-400"}`}
            />
            <span className="text-sm text-zinc-300">{likeCount}</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <MessageCircle className="w-5 h-5 text-zinc-400" />
            <span className="text-sm text-zinc-300">{commentCount}</span>
          </button>
        </div>
        {description && (
          <p className="px-3 pb-3 text-sm text-zinc-300 leading-snug whitespace-pre-wrap">
            {description}
          </p>
        )}
      </div>
      {modalOpen && (
        <RandomVideoModal
          videoId={videoId}
          videoUrl={videoUrl}
          description={description}
          currentUserId={currentUserId}
          initialLiked={liked}
          initialLikeCount={likeCount}
          initialCommentCount={commentCount}
          onClose={() => setModalOpen(false)}
          onLikeChange={(l, c) => {
            setLiked(l);
            setLikeCount(c);
          }}
          onCommentCountChange={(c) => setCommentCount(c)}
        />
      )}
    </>
  );
}

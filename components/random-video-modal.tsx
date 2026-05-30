"use client";

import { useState } from "react";
import { Heart, MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CommentsPanel } from "./comments-panel";

export function RandomVideoModal({
  videoId,
  videoUrl,
  description,
  currentUserId,
  initialLikeCount,
  initialCommentCount,
  initialLiked,
  onClose,
  onLikeChange,
  onCommentCountChange,
}: {
  videoId: string;
  videoUrl: string;
  description: string | null;
  currentUserId: string | null;
  initialLikeCount: number;
  initialCommentCount: number;
  initialLiked: boolean;
  onClose: () => void;
  onLikeChange?: (liked: boolean, count: number) => void;
  onCommentCountChange?: (count: number) => void;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [showComments, setShowComments] = useState(false);

  async function toggleLike() {
    if (!currentUserId) return;
    const wasLiked = liked;
    const newLiked = !wasLiked;
    const newCount = likeCount + (wasLiked ? -1 : 1);
    setLiked(newLiked);
    setLikeCount(newCount);
    onLikeChange?.(newLiked, newCount);
    const supabase = createClient();
    if (wasLiked) {
      await supabase.rpc("unlike_video", { p_video_id: videoId });
    } else {
      await supabase.rpc("like_video", { p_video_id: videoId });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur rounded-full p-2 text-white"
        aria-label="close"
      >
        <X className="w-5 h-5" />
      </button>

      <video
        src={videoUrl}
        controls
        autoPlay
        playsInline
        className="max-h-screen max-w-full object-contain bg-black"
      />

      {/* Боковая колонка действий */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5">
        <button
          onClick={toggleLike}
          disabled={!currentUserId}
          className="flex flex-col items-center gap-1 disabled:opacity-50"
        >
          <div
            className={`rounded-full p-3 ${
              liked ? "bg-echo glow-echo" : "bg-white/20"
            }`}
          >
            <Heart
              className="w-6 h-6 text-white"
              fill={liked ? "white" : "none"}
            />
          </div>
          <span className="text-white text-xs font-medium">{likeCount}</span>
        </button>

        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1"
        >
          <div className="rounded-full p-3 bg-white/20">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{commentCount}</span>
        </button>
      </div>

      {description && (
        <div className="absolute bottom-4 left-4 right-20 bg-black/60 backdrop-blur p-3 rounded-lg max-h-32 overflow-y-auto">
          <p className="text-white text-sm leading-snug whitespace-pre-wrap">
            {description}
          </p>
        </div>
      )}

      {showComments && (
        <CommentsPanel
          videoId={videoId}
          currentUserId={currentUserId}
          onClose={() => setShowComments(false)}
          onCountChange={(c) => {
            setCommentCount(c);
            onCommentCountChange?.(c);
          }}
        />
      )}
    </div>
  );
}

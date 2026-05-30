"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  user_name?: string;
};

export function RandomVideoCard({
  videoId,
  videoUrl,
  description,
  currentUserId,
}: {
  videoId: string;
  videoUrl: string;
  description: string | null;
  currentUserId: string | null;
}) {
  const t = useT();
  const supabase = createClient();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ count: lc }, myLikeRes, { data: cdata }] = await Promise.all([
        supabase.from("likes").select("*", { count: "exact", head: true }).eq("video_id", videoId),
        currentUserId
          ? supabase
              .from("likes")
              .select("video_id")
              .eq("video_id", videoId)
              .eq("liker_id", currentUserId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("video_comments")
          .select("id, user_id, body, created_at")
          .eq("video_id", videoId)
          .order("created_at", { ascending: true }),
      ]);
      setLikeCount(lc ?? 0);
      setLiked(!!myLikeRes.data);

      const userIds = Array.from(new Set((cdata ?? []).map((c) => c.user_id)));
      const { data: profiles } =
        userIds.length > 0
          ? await supabase.from("profiles").select("id, name").in("id", userIds)
          : { data: [] };
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));
      setComments((cdata ?? []).map((c) => ({ ...c, user_name: nameMap.get(c.user_id) ?? "?" })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, currentUserId]);

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

  async function sendComment(e: FormEvent) {
    e.preventDefault();
    if (!currentUserId || !commentInput.trim() || sending) return;
    const body = commentInput.trim();
    setSending(true);
    const { data, error } = await supabase
      .from("video_comments")
      .insert({ video_id: videoId, user_id: currentUserId, body })
      .select()
      .single();
    setSending(false);
    if (error || !data) return;
    const { data: me } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", currentUserId)
      .single();
    setComments((prev) => [
      ...prev,
      {
        id: data.id,
        user_id: currentUserId,
        body,
        created_at: data.created_at,
        user_name: me?.name ?? "?",
      },
    ]);
    setCommentInput("");
  }

  async function deleteComment(commentId: string) {
    if (!confirm(t.comments.deleteConfirm)) return;
    await supabase.from("video_comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950">
      <video src={videoUrl} controls className="w-full aspect-[9/16] object-cover" />

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
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1.5"
        >
          <MessageCircle className="w-5 h-5 text-zinc-400" />
          <span className="text-sm text-zinc-300">{comments.length}</span>
        </button>
      </div>

      {description && (
        <p className="px-3 pb-2 text-sm text-zinc-300 leading-snug whitespace-pre-wrap">
          {description}
        </p>
      )}

      {showComments && (
        <div className="border-t border-white/10 px-3 py-3 space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-zinc-500">{t.comments.empty}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/u/${c.user_id}`}
                    className="text-xs text-zinc-400 font-medium hover:text-white"
                  >
                    {c.user_name}
                  </Link>
                  <p className="text-sm text-zinc-200 break-words whitespace-pre-wrap">{c.body}</p>
                </div>
                {c.user_id === currentUserId && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="text-zinc-600 hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
          {currentUserId && (
            <form onSubmit={sendComment} className="flex gap-2 pt-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={t.comments.placeholder}
                maxLength={500}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-echo/60"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!commentInput.trim() || sending}
                className="bg-echo text-white rounded-full w-8 h-8 flex items-center justify-center disabled:bg-zinc-700"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

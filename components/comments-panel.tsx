"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useBackButtonClose } from "@/lib/use-back-button-close";
import { useT } from "@/lib/i18n/provider";

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
};

export function CommentsPanel({
  videoId,
  currentUserId,
  onClose,
  onCountChange,
}: {
  videoId: string;
  currentUserId: string | null;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}) {
  const t = useT();
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useBackButtonClose(true, onClose);

  useEffect(() => {
    (async () => {
      const { data: cdata } = await supabase
        .from("video_comments")
        .select("id, user_id, body, created_at")
        .eq("video_id", videoId)
        .order("created_at", { ascending: true });
      const userIds = Array.from(new Set((cdata ?? []).map((c) => c.user_id)));
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", userIds)
        : { data: [] };
      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { name: p.name ?? "?", avatar: p.avatar_url ?? null }])
      );
      setComments(
        (cdata ?? []).map((c) => ({
          ...c,
          user_name: profileMap.get(c.user_id)?.name ?? "?",
          user_avatar: profileMap.get(c.user_id)?.avatar ?? null,
        }))
      );
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  async function sendComment(e: FormEvent) {
    e.preventDefault();
    if (!currentUserId || !input.trim() || sending) return;
    const body = input.trim();
    setSending(true);
    const { data, error } = await supabase
      .from("video_comments")
      .insert({ video_id: videoId, user_id: currentUserId, body })
      .select()
      .single();
    setSending(false);
    if (error || !data) {
      toast.error(t.comments.sendError);
      return;
    }
    const { data: me } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", currentUserId)
      .single();
    const newComments = [
      ...comments,
      {
        id: data.id,
        user_id: currentUserId,
        body,
        created_at: data.created_at,
        user_name: me?.name ?? "?",
        user_avatar: me?.avatar_url ?? null,
      },
    ];
    setComments(newComments);
    onCountChange?.(newComments.length);
    setInput("");
  }

  async function deleteComment(id: string) {
    if (!confirm(t.comments.deleteConfirm)) return;
    const { error } = await supabase.from("video_comments").delete().eq("id", id);
    if (error) {
      toast.error(t.comments.deleteError);
      return;
    }
    const newComments = comments.filter((c) => c.id !== id);
    setComments(newComments);
    onCountChange?.(newComments.length);
    toast.success(t.comments.deleted);
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[61] sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg w-full bg-zinc-950 border-t border-x border-white/10 rounded-t-3xl flex flex-col max-h-[78vh] animate-in slide-in-from-bottom duration-250">
        {/* Хэндл */}
        <div className="pt-3 pb-2 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Шапка */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5">
          <h3 className="font-semibold text-white text-base">
            {comments.length > 0
              ? t.comments.titleWithCount.replace("{n}", String(comments.length))
              : t.comments.title}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 -mr-1"
            aria-label="close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!loaded ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-white/10 border-t-echo rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10">
              <div className="text-5xl mb-3 opacity-60">💬</div>
              <p className="text-sm text-zinc-400 mb-1">{t.comments.empty}</p>
              {currentUserId && (
                <p className="text-xs text-zinc-600">{t.comments.beFirst}</p>
              )}
            </div>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  mine={c.user_id === currentUserId}
                  onDelete={() => deleteComment(c.id)}
                  t={t}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Поле ввода */}
        {currentUserId && (
          <form
            onSubmit={sendComment}
            className="px-3 pt-2 border-t border-white/5 bg-zinc-950"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.comments.placeholder}
                maxLength={500}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-echo/60 transition-colors"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="bg-echo text-white hover:bg-echo-bright disabled:bg-zinc-800 disabled:text-zinc-600 rounded-full w-10 h-10 flex items-center justify-center transition-colors shrink-0"
                aria-label={t.comments.send}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </>,
    document.body
  );
}

function CommentRow({
  comment,
  mine,
  onDelete,
  t,
}: {
  comment: Comment;
  mine: boolean;
  onDelete: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <li className="flex items-start gap-3">
      <Link
        href={`/u/${comment.user_id}`}
        className="shrink-0"
        aria-label={comment.user_name}
      >
        <span className="block h-9 w-9 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
          {comment.user_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.user_avatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm text-zinc-300">
              {comment.user_name?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </span>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <Link
            href={`/u/${comment.user_id}`}
            className="text-sm font-semibold text-white hover:text-echo-bright transition-colors truncate"
          >
            {comment.user_name}
          </Link>
          <span className="text-[11px] text-zinc-500 shrink-0">
            {formatRelative(comment.created_at, t)}
          </span>
        </div>
        <p className="text-sm text-zinc-200 break-words whitespace-pre-wrap leading-snug mt-0.5">
          {comment.body}
        </p>
      </div>
      {mine && (
        <button
          onClick={onDelete}
          className="text-zinc-600 hover:text-red-400 shrink-0 mt-1.5 p-1"
          aria-label="delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </li>
  );
}

function formatRelative(iso: string, t: ReturnType<typeof useT>) {
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (diffSec < 60) return t.notifications.justNow;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return t.notifications.minutesAgo.replace("{n}", String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return t.notifications.hoursAgo.replace("{n}", String(h));
  const d = Math.floor(h / 24);
  return t.notifications.daysAgo.replace("{n}", String(d));
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Trash2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  user_name: string;
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: cdata } = await supabase
        .from("video_comments")
        .select("id, user_id, body, created_at")
        .eq("video_id", videoId)
        .order("created_at", { ascending: true });
      const userIds = Array.from(new Set((cdata ?? []).map((c) => c.user_id)));
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, name").in("id", userIds)
        : { data: [] };
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));
      setComments(
        (cdata ?? []).map((c) => ({ ...c, user_name: nameMap.get(c.user_id) ?? "?" }))
      );
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
    if (error || !data) return;
    const { data: me } = await supabase
      .from("profiles")
      .select("name")
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
      },
    ];
    setComments(newComments);
    onCountChange?.(newComments.length);
    setInput("");
  }

  async function deleteComment(id: string) {
    if (!confirm(t.comments.deleteConfirm)) return;
    await supabase.from("video_comments").delete().eq("id", id);
    const newComments = comments.filter((c) => c.id !== id);
    setComments(newComments);
    onCountChange?.(newComments.length);
  }

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Подложка */}
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      {/* Панель снизу */}
      <div className="fixed inset-x-0 bottom-0 z-[61] bg-zinc-950 rounded-t-2xl max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold text-white">
            {comments.length}{" "}
            <span className="text-zinc-500 font-normal text-sm">
              {t.comments.placeholder.split("...")[0].toLowerCase()}
            </span>
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">{t.comments.empty}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/u/${c.user_id}`}
                    className="text-xs text-zinc-400 font-medium hover:text-white"
                  >
                    {c.user_name}
                  </Link>
                  <p className="text-sm text-zinc-200 break-words whitespace-pre-wrap">
                    {c.body}
                  </p>
                </div>
                {c.user_id === currentUserId && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="text-zinc-600 hover:text-red-500 shrink-0 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {currentUserId && (
          <form
            onSubmit={sendComment}
            className="p-3 border-t border-white/10 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.comments.placeholder}
              maxLength={500}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-echo/60"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="bg-echo text-white rounded-full w-10 h-10 flex items-center justify-center disabled:bg-zinc-700"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </>,
    document.body
  );
}

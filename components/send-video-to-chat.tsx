"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Send, X, Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { useBackButtonClose } from "@/lib/use-back-button-close";

type MatchProfile = {
  id: string;
  name: string;
  city: string;
  avatar_url: string | null;
};

export function SendVideoToChatButton({
  videoId,
  className = "",
}: {
  videoId: string;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.sendVideo.title}
        className={`rounded-full p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-colors ${className}`}
      >
        <Send className="w-6 h-6" />
      </button>
      {open && (
        <SendSheet videoId={videoId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function SendSheet({
  videoId,
  onClose,
}: {
  videoId: string;
  onClose: () => void;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useBackButtonClose(true, onClose);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setMyId(user.id);
      const { data: rows } = await supabase
        .from("matches")
        .select("user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      const otherIds = (rows ?? []).map((m) =>
        m.user_a === user.id ? m.user_b : m.user_a
      );
      if (otherIds.length === 0) {
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, city, avatar_url")
        .in("id", otherIds);
      setMatches((profiles ?? []) as MatchProfile[]);
      setLoading(false);
    })();
  }, []);

  async function sendTo(other: MatchProfile) {
    if (!myId || sendingTo || sentTo.has(other.id)) return;
    setSendingTo(other.id);
    const supabase = createClient();
    const [a, b] = myId < other.id ? [myId, other.id] : [other.id, myId];
    const { error } = await supabase.from("messages").insert({
      match_user_a: a,
      match_user_b: b,
      sender_id: myId,
      body: `[video:${videoId}]`,
    });
    setSendingTo(null);
    if (error) {
      toast.error(t.sendVideo.error);
      return;
    }
    setSentTo((prev) => new Set(prev).add(other.id));
    // Письмо-уведомление получателю (троттлится на сервере)
    fetch("/api/notify/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: other.id, preview: "🎥" }),
    }).catch(() => {});
    toast.success(t.sendVideo.sent.replace("{name}", other.name));
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[61] bg-zinc-950 border-t border-white/10 rounded-t-3xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom duration-250">
        <div className="pt-3 pb-2 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between border-b border-white/5">
          <h3 className="font-semibold text-white text-lg">{t.sendVideo.title}</h3>
          <button
            onClick={onClose}
            aria-label="close"
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-white/10 border-t-echo rounded-full animate-spin" />
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="text-5xl mb-3 opacity-60">💜</div>
              <p className="text-sm text-zinc-400">{t.sendVideo.noMatches}</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {matches.map((m) => {
                const done = sentTo.has(m.id);
                const sending = sendingTo === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => sendTo(m)}
                      disabled={done || sending}
                      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-white/5 transition-colors disabled:opacity-100"
                    >
                      <span className="relative h-11 w-11 shrink-0 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
                        {m.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-base text-zinc-200 font-semibold">
                            {m.name?.[0]?.toUpperCase() ?? "?"}
                          </span>
                        )}
                      </span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-white truncate">{m.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{m.city}</p>
                      </div>
                      {done ? (
                        <span className="flex items-center gap-1 text-echo-bright text-xs font-medium shrink-0">
                          <Check className="w-4 h-4" />
                          {t.sendVideo.done}
                        </span>
                      ) : sending ? (
                        <span className="w-4 h-4 border-2 border-white/20 border-t-echo rounded-full animate-spin shrink-0" />
                      ) : (
                        <span className="text-echo-bright text-xs font-semibold shrink-0">
                          {t.sendVideo.send}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useT } from "@/lib/i18n/provider";
import { ReviewButton } from "./review-button";

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type Other = { id: string; name: string; city: string; avatar_url: string | null };

export function ChatClient({
  me,
  pairA,
  pairB,
  other,
  initialMessages,
  alreadyReviewed,
}: {
  me: string;
  pairA: string;
  pairB: string;
  other: Other;
  initialMessages: Message[];
  alreadyReviewed: boolean;
}) {
  const t = useT();
  const supabase = useRef(createClient()).current;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== Авто-скролл вниз при новых сообщениях =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, otherTyping]);

  // ===== Помечаем непрочитанные как прочитанные при заходе =====
  useEffect(() => {
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("match_user_a", pairA)
      .eq("match_user_b", pairB)
      .neq("sender_id", me)
      .is("read_at", null)
      .then(({ error }) => {
        if (error) console.error("mark read:", error);
      });
  }, [supabase, pairA, pairB, me]);

  // ===== Realtime подписка на новые сообщения =====
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${pairA}:${pairB}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_user_a=eq.${pairA}`,
        },
        (payload) => {
          const m = payload.new as Message & { match_user_b: string };
          if (m.match_user_b !== pairB) return;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
          // Если это сообщение от собеседника — сразу пометить прочитанным
          if (m.sender_id !== me) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", m.id)
              .then(({ error }) => {
                if (error) console.error("mark read live:", error);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, pairA, pairB, me]);

  // ===== Typing-индикатор через broadcast =====
  useEffect(() => {
    const channel = supabase.channel(`typing:${pairA}:${pairB}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if ((payload as { userId: string }).userId === me) return;
        setOtherTyping(true);
        if (typingClearTimeoutRef.current)
          clearTimeout(typingClearTimeoutRef.current);
        typingClearTimeoutRef.current = setTimeout(
          () => setOtherTyping(false),
          2500
        );
      })
      .subscribe();

    typingChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
      if (typingClearTimeoutRef.current)
        clearTimeout(typingClearTimeoutRef.current);
    };
  }, [supabase, pairA, pairB, me]);

  // Отправка typing-события, не чаще раза в 1.5 сек
  function emitTyping() {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: me },
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    // Оптимистичное добавление
    const optimistic: Message = {
      id: tempId,
      sender_id: me,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        match_user_a: pairA,
        match_user_b: pairB,
        sender_id: me,
        body,
      })
      .select()
      .single();

    if (error) {
      // Откатить
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(body);
      console.error("send:", error);
    } else if (data) {
      // Заменить optimistic на реальное (с настоящим id)
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (data as Message) : m))
      );
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Шапка */}
      <div className="border-b border-zinc-900 p-4 flex items-center gap-3 sticky top-0 bg-black z-10">
        <Link href="/matches" className="text-zinc-400 hover:text-white text-lg">
          ←
        </Link>
        <Link href={`/u/${other.id}`} className="flex-1 flex items-center gap-2.5 hover:opacity-80">
          <span className="relative h-9 w-9 shrink-0 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
            {other.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={other.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm">{other.name?.[0]?.toUpperCase() ?? "?"}</span>
            )}
          </span>
          <span>
            <span className="block font-semibold leading-tight">{other.name}</span>
            <span className="block text-xs text-zinc-500">{other.city}</span>
          </span>
        </Link>
        <ReviewButton revieweeId={other.id} revieweeName={other.name} alreadyReviewed={alreadyReviewed} />
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">
            {t.chat.empty}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  mine
                    ? "bg-echo text-white rounded-br-sm"
                    : "bg-zinc-800 text-white rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    mine ? "text-white/60" : "text-zinc-400"
                  }`}
                >
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {mine && m.read_at && ` · ${t.chat.read}`}
                </p>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-2">
              <p className="text-zinc-400 text-sm italic">{t.chat.typing}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <form onSubmit={send} className="border-t border-zinc-900 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (e.target.value) emitTyping();
          }}
          placeholder={t.chat.placeholder}
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:border-echo/60"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="bg-echo text-white rounded-full w-10 h-10 flex items-center justify-center disabled:bg-zinc-700 disabled:text-zinc-500"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

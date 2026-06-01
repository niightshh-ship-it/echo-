"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Check, CheckCheck, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useT, useI18n } from "@/lib/i18n/provider";
import { ReviewButton } from "./review-button";
import { AmbientBg } from "@/components/ambient-bg";
import { parseVideoMessage, VideoMessageCard } from "@/components/video-message-card";

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type Other = { id: string; name: string; city: string; avatar_url: string | null };

// Группировка соседних сообщений одного отправителя, если разрыв меньше 5 минут
const GROUP_GAP_MS = 5 * 60 * 1000;

function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDay(iso: string, locale: string, t: ReturnType<typeof useT>) {
  const d = new Date(iso);
  const now = new Date();
  const yest = new Date();
  yest.setDate(now.getDate() - 1);
  if (sameDay(iso, now.toISOString())) return t.chat.today;
  if (sameDay(iso, yest.toISOString())) return t.chat.yesterday;
  // Для всего что старше — день + месяц (+год если другой)
  const sameYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: sameYear ? undefined : "numeric",
  }).format(d);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const { locale } = useI18n();
  const supabase = useRef(createClient()).current;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Прыжок к низу при монтаже — без анимации
  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
  }, []);

  // Плавный скролл при новых сообщениях, только если уже у дна
  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
    if (nearBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowScrollDown(true);
    }
  }, [messages.length, otherTyping]);

  // Скрываем «новые сообщения» при ручном скролле к низу
  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    function onScroll() {
      if (!c) return;
      const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
      if (nearBottom) setShowScrollDown(false);
    }
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, []);

  // Помечаем непрочитанные как прочитанные при заходе
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

  // Realtime: новые сообщения
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
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `match_user_a=eq.${pairA}`,
        },
        (payload) => {
          const m = payload.new as Message & { match_user_b: string };
          if (m.match_user_b !== pairB) return;
          setMessages((prev) =>
            prev.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, pairA, pairB, me]);

  // Typing-индикатор через broadcast
  useEffect(() => {
    const channel = supabase.channel(`typing:${pairA}:${pairB}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if ((payload as { userId: string }).userId === me) return;
        setOtherTyping(true);
        if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
        typingClearTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2500);
      })
      .subscribe();
    typingChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
      if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
    };
  }, [supabase, pairA, pairB, me]);

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

  // Авто-рост textarea
  function autoResize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      sender_id: me,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    requestAnimationFrame(autoResize);

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
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(body);
      console.error("send:", error);
    } else if (data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Message) : m)));
      // Письмо собеседнику (троттлится раз в час на стороне сервера)
      const recipientId = me === pairA ? pairB : pairA;
      fetch("/api/notify/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, preview: body }),
      }).catch(() => {});
    }
    setSending(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="relative flex flex-col h-[100dvh] bg-black text-white overflow-hidden">
      <AmbientBg variant="chat" />
      {/* Шапка */}
      <div className="relative z-10 border-b border-white/10 px-3 py-3 flex items-center gap-3 sticky top-0 bg-black/70 backdrop-blur">
        <Link
          href="/matches"
          className="text-zinc-300 hover:text-white px-2 py-1 -ml-1 text-base"
          aria-label="back"
        >
          ←
        </Link>
        <Link
          href={`/u/${other.id}`}
          className="flex-1 flex items-center gap-2.5 hover:opacity-80 min-w-0"
        >
          <span className="relative h-9 w-9 shrink-0 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
            {other.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={other.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm">{other.name?.[0]?.toUpperCase() ?? "?"}</span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold leading-tight truncate">{other.name}</span>
            <span className="block text-xs text-zinc-500 truncate">
              {otherTyping ? t.chat.typing : other.city}
            </span>
          </span>
        </Link>
        <ReviewButton
          revieweeId={other.id}
          revieweeName={other.name}
          alreadyReviewed={alreadyReviewed}
        />
      </div>

      {/* Сообщения */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-3 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-5xl mb-3 opacity-80">💬</div>
            <p className="text-zinc-300 font-medium mb-1">{t.chat.empty}</p>
            <p className="text-zinc-500 text-sm">{t.chat.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((m, i) => {
              const prev = i > 0 ? messages[i - 1] : null;
              const next = i < messages.length - 1 ? messages[i + 1] : null;
              const isNewDay = !prev || !sameDay(prev.created_at, m.created_at);
              const prevSameSender =
                prev !== null &&
                prev.sender_id === m.sender_id &&
                sameDay(prev.created_at, m.created_at) &&
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() <
                  GROUP_GAP_MS;
              const nextSameSender =
                next !== null &&
                next.sender_id === m.sender_id &&
                sameDay(next.created_at, m.created_at) &&
                new Date(next.created_at).getTime() - new Date(m.created_at).getTime() <
                  GROUP_GAP_MS;
              const isFirstOfGroup = !prevSameSender;
              const isLastOfGroup = !nextSameSender;
              const mine = m.sender_id === me;

              return (
                <div key={m.id}>
                  {isNewDay && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-[11px] text-zinc-500 bg-white/5 border border-white/5 rounded-full px-3 py-1 backdrop-blur">
                        {formatDay(m.created_at, locale, t)}
                      </span>
                    </div>
                  )}
                  <MessageRow
                    message={m}
                    mine={mine}
                    isFirstOfGroup={isFirstOfGroup}
                    isLastOfGroup={isLastOfGroup}
                    other={other}
                    readLabel={t.chat.read}
                  />
                </div>
              );
            })}

            {otherTyping && (
              <div className="flex items-end gap-2 mt-2">
                <Avatar other={other} />
                <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-3 py-2 msg-in">
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Плавающая кнопка «новые сообщения» */}
      {showScrollDown && (
        <button
          onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-echo text-white rounded-full px-4 py-2 shadow-xl glow-echo text-sm font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <ChevronDown className="w-4 h-4" />
          {t.chat.scrollToBottom}
        </button>
      )}

      {/* Поле ввода */}
      <form
        onSubmit={send}
        className="relative z-10 border-t border-white/10 px-3 pt-2 bg-black/70 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={taRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
              if (e.target.value) emitTyping();
            }}
            onKeyDown={onKeyDown}
            placeholder={t.chat.placeholder}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-3xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-echo/60 leading-snug max-h-[132px]"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-echo text-white rounded-full w-11 h-11 flex items-center justify-center shrink-0 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all duration-150 active:scale-95 enabled:hover:bg-echo-bright"
            aria-label="send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function Avatar({ other }: { other: Other }) {
  return (
    <span className="h-7 w-7 shrink-0 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center mb-0.5">
      {other.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={other.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[11px] text-zinc-300">
          {other.name?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </span>
  );
}

function MessageRow({
  message,
  mine,
  isFirstOfGroup,
  isLastOfGroup,
  other,
  readLabel,
}: {
  message: Message;
  mine: boolean;
  isFirstOfGroup: boolean;
  isLastOfGroup: boolean;
  other: Other;
  readLabel: string;
}) {
  // Скругления углов в зависимости от позиции в группе
  const corners = mine
    ? // Свои — справа
      isFirstOfGroup && isLastOfGroup
      ? "rounded-2xl rounded-br-md"
      : isFirstOfGroup
      ? "rounded-2xl rounded-br-md"
      : isLastOfGroup
      ? "rounded-2xl rounded-tr-md rounded-br-md"
      : "rounded-2xl rounded-tr-md rounded-br-md"
    : // Чужие — слева
    isFirstOfGroup && isLastOfGroup
    ? "rounded-2xl rounded-bl-md"
    : isFirstOfGroup
    ? "rounded-2xl rounded-bl-md"
    : isLastOfGroup
    ? "rounded-2xl rounded-tl-md rounded-bl-md"
    : "rounded-2xl rounded-tl-md rounded-bl-md";

  const videoMsgId = parseVideoMessage(message.body);

  return (
    <div
      className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${
        isFirstOfGroup ? "mt-2" : ""
      }`}
    >
      {/* Аватарка у чужих — только на последнем сообщении группы (чтобы не повторялась) */}
      {!mine && (
        <div className="w-7 shrink-0">{isLastOfGroup ? <Avatar other={other} /> : null}</div>
      )}

      {videoMsgId ? (
        // Видео-сообщение — карточка-превью вместо пузыря
        <div className="max-w-[78%] msg-in flex flex-col gap-1">
          <VideoMessageCard videoId={videoMsgId} mine={mine} />
          {isLastOfGroup && (
            <div
              className={`flex items-center gap-1 text-[10px] px-1 ${
                mine ? "justify-end text-zinc-500" : "justify-start text-zinc-500"
              }`}
            >
              <span>{formatTime(message.created_at)}</span>
              {mine &&
                (message.read_at ? (
                  <CheckCheck className="w-3.5 h-3.5" aria-label={readLabel} />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`max-w-[78%] px-3 py-2 ${corners} ${
            mine ? "bg-echo text-white" : "bg-zinc-800 text-white"
          } msg-in`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-snug">{message.body}</p>
          {isLastOfGroup && (
            <div
              className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                mine ? "text-white/65" : "text-zinc-400"
              }`}
            >
              <span>{formatTime(message.created_at)}</span>
              {mine &&
                (message.read_at ? (
                  <CheckCheck className="w-3.5 h-3.5" aria-label={readLabel} />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

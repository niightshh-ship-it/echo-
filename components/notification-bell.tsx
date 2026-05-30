"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

type RawNotification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: "match" | "message";
  payload: { preview?: string };
  read_at: string | null;
  created_at: string;
};

type Notification = RawNotification & {
  actorName: string;
  actorAvatar: string | null;
};

export function NotificationBell({
  userId,
  initialUnreadCount,
}: {
  userId: string;
  initialUnreadCount: number;
}) {
  const t = useT();
  const supabase = useRef(createClient()).current;
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [panelOpen, setPanelOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Realtime: новые уведомления → подкручиваем счётчик
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const raw = payload.new as RawNotification;
          // Подгружаем имя/аватарку отправителя для отрисовки в панели
          let actorName = "?";
          let actorAvatar: string | null = null;
          if (raw.actor_id) {
            const { data } = await supabase
              .from("profiles")
              .select("name, avatar_url")
              .eq("id", raw.actor_id)
              .maybeSingle();
            if (data) {
              actorName = data.name ?? "?";
              actorAvatar = data.avatar_url ?? null;
            }
          }
          setItems((prev) => [
            { ...raw, actorName, actorAvatar },
            ...prev,
          ]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  async function openPanel() {
    setPanelOpen(true);
    if (loaded) return;
    setLoaded(true);
    // Загружаем последние 30 уведомлений + профили акторов
    const { data: notifs } = await supabase
      .from("notifications")
      .select("id, user_id, actor_id, type, payload, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    const rows = (notifs ?? []) as RawNotification[];
    const actorIds = Array.from(
      new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x))
    );
    const { data: profiles } = actorIds.length
      ? await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", actorIds)
      : { data: [] };
    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, { name: p.name ?? "?", avatar: p.avatar_url ?? null }])
    );
    setItems(
      rows.map((r) => ({
        ...r,
        actorName: r.actor_id ? profileMap.get(r.actor_id)?.name ?? "?" : "?",
        actorAvatar: r.actor_id ? profileMap.get(r.actor_id)?.avatar ?? null : null,
      }))
    );
  }

  async function markAllRead() {
    const unreadIds = items.filter((i) => !i.read_at).map((i) => i.id);
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.read_at ? i : { ...i, read_at: now })));
    setUnreadCount(0);
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .in("id", unreadIds);
  }

  async function markOneRead(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item || item.read_at) return;
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, read_at: now } : i))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id);
  }

  return (
    <>
      <button
        onClick={openPanel}
        aria-label={t.notifications.title}
        className="relative rounded-full p-2 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-echo text-white text-[10px] font-bold flex items-center justify-center glow-echo">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <NotificationsPanel
          items={items}
          onClose={() => setPanelOpen(false)}
          onItemClick={(id) => {
            markOneRead(id);
            setPanelOpen(false);
          }}
          onMarkAllRead={markAllRead}
          hasUnread={unreadCount > 0}
        />
      )}
    </>
  );
}

function NotificationsPanel({
  items,
  onClose,
  onItemClick,
  onMarkAllRead,
  hasUnread,
}: {
  items: Notification[];
  onClose: () => void;
  onItemClick: (id: string) => void;
  onMarkAllRead: () => void;
  hasUnread: boolean;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[65] bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 z-[66] h-[100dvh] w-full sm:w-[400px] bg-zinc-950 border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold text-white">{t.notifications.title}</h3>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-echo-bright hover:underline"
              >
                {t.notifications.markAllRead}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1"
              aria-label="close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 text-zinc-500 text-sm">
              <div className="text-5xl mb-3 opacity-60">🔔</div>
              {t.notifications.empty}
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  item={n}
                  onClick={() => onItemClick(n.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

function NotificationRow({
  item,
  onClick,
}: {
  item: Notification;
  onClick: () => void;
}) {
  const t = useT();
  const href =
    item.type === "match"
      ? `/matches/${item.actor_id}`
      : item.type === "message"
      ? `/matches/${item.actor_id}`
      : "#";

  const text =
    item.type === "match"
      ? t.notifications.typeMatch.replace("{name}", item.actorName)
      : t.notifications.typeMessage
          .replace("{name}", item.actorName)
          .replace("{preview}", item.payload.preview ?? "");

  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
          item.read_at ? "" : "bg-echo/5"
        }`}
      >
        <span className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
          {item.actorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.actorAvatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm text-zinc-300">
              {item.actorName?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          {item.type === "match" && (
            <span className="absolute -bottom-0.5 -right-0.5 text-base">💜</span>
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-snug ${
              item.read_at ? "text-zinc-400" : "text-white"
            } line-clamp-2`}
          >
            {text}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {formatRelative(item.created_at, t)}
          </p>
        </div>
        {!item.read_at && (
          <span className="mt-1.5 w-2 h-2 rounded-full bg-echo glow-echo shrink-0" />
        )}
      </Link>
    </li>
  );
}

function formatRelative(iso: string, t: ReturnType<typeof useT>) {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return t.notifications.justNow;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return t.notifications.minutesAgo.replace("{n}", String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return t.notifications.hoursAgo.replace("{n}", String(h));
  const d = Math.floor(h / 24);
  return t.notifications.daysAgo.replace("{n}", String(d));
}

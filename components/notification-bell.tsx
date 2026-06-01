"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Bell, X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBackButtonClose } from "@/lib/use-back-button-close";
import { useT } from "@/lib/i18n/provider";

type RawNotification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: "match" | "message" | "review" | "like";
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
  /** Если не передан — компонент сам сходит за счётчиком при монтаже. */
  initialUnreadCount?: number;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useRef(createClient()).current;
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount ?? 0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Закрываем панель когда URL меняется (юзер тапнул уведомление и перешёл)
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setPanelOpen(false);
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  // Если счётчик не передан с сервера — тащим сами
  useEffect(() => {
    if (typeof initialUnreadCount === "number") return;
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .then(({ count }) => setUnreadCount(count ?? 0));
  }, [supabase, userId, initialUnreadCount]);

  // Realtime: новые уведомления → подкручиваем счётчик,
  //           UPDATE (пометили прочитанным где-то ещё, например из тоста) → декрементим
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const oldRow = payload.old as { read_at: string | null };
          const newRow = payload.new as { id: string; read_at: string | null };
          // Если переход unread → read — декрементим счётчик и помечаем в локальном списке
          if (!oldRow.read_at && newRow.read_at) {
            setUnreadCount((c) => Math.max(0, c - 1));
            setItems((prev) =>
              prev.map((i) =>
                i.id === newRow.id ? { ...i, read_at: newRow.read_at } : i
              )
            );
          }
        }
      )
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

  // Очистить все — удаляем из БД и из списка
  async function clearAll() {
    if (items.length === 0) return;
    setItems([]);
    setUnreadCount(0);
    await supabase.from("notifications").delete().eq("user_id", userId);
  }

  // При клике на уведомление — удаляем его (прочитано = больше не нужно висеть)
  async function consumeOne(id: string) {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (item && !item.read_at) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    await supabase.from("notifications").delete().eq("id", id);
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
          onItemClick={(id, href) => {
            // Удаляем уведомление и переходим. Закрытие панели — через
            // pathname watcher (см. useEffect выше). Это критично:
            // если закрыть здесь синхронно — useBackButtonClose сделает
            // history.back() и сорвёт навигацию вперёд.
            consumeOne(id);
            router.push(href);
          }}
          onClearAll={clearAll}
          hasItems={items.length > 0}
        />
      )}
    </>
  );
}

function NotificationsPanel({
  items,
  onClose,
  onItemClick,
  onClearAll,
  hasItems,
}: {
  items: Notification[];
  onClose: () => void;
  onItemClick: (id: string, href: string) => void;
  onClearAll: () => void;
  hasItems: boolean;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useBackButtonClose(true, onClose);
  if (!mounted) return null;

  const unreadCount = items.filter((i) => !i.read_at).length;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 z-[66] h-[100dvh] w-full sm:w-[420px] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
        {/* Фон со свечениями — как у AmbientBg, но обернутый под панель */}
        <div className="absolute inset-0 bg-zinc-950" />
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full"
          style={{ background: "#7c5cff", opacity: 0.20, filter: "blur(110px)" }}
        />
        <div
          className="pointer-events-none absolute bottom-32 -left-20 h-72 w-72 rounded-full"
          style={{ background: "#e455ff", opacity: 0.14, filter: "blur(120px)" }}
        />
        <div className="absolute inset-0 border-l border-white/10" />

        {/* Контент */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Шапка */}
          <div
            className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]"
            style={{ paddingTop: "max(env(safe-area-inset-top), 1.25rem)" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="rounded-2xl bg-echo/15 border border-echo/25 p-2">
                <Bell className="w-4 h-4 text-echo-bright" fill="currentColor" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-none">
                  {t.notifications.title}
                </h3>
                {unreadCount > 0 && (
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {t.notifications.unreadCount.replace("{n}", String(unreadCount))}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* "Очистить всё" */}
          {hasItems && (
            <div className="px-5 py-2.5 border-b border-white/[0.05] flex justify-end">
              <button
                onClick={onClearAll}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition-colors font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t.notifications.clearAll}
              </button>
            </div>
          )}

          {/* Список */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="text-6xl mb-4 opacity-50">🔔</div>
                <p className="text-sm text-zinc-300 font-medium mb-1">
                  {t.notifications.empty}
                </p>
                <p className="text-xs text-zinc-500 max-w-[240px] leading-relaxed">
                  {t.notifications.emptyHint}
                </p>
              </div>
            ) : (
              <ul className="px-2 py-2">
                {items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    item={n}
                    onClick={() => {
                      // Лайк ведёт на /matches (таб «Лайкнули»), остальное — в чат
                      const href =
                        n.type === "like"
                          ? "/matches"
                          : n.actor_id
                          ? `/matches/${n.actor_id}`
                          : "#";
                      onItemClick(n.id, href);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
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
  const text =
    item.type === "match"
      ? t.notifications.typeMatch.replace("{name}", item.actorName)
      : item.type === "like"
      ? t.notifications.typeLike.replace("{name}", item.actorName)
      : item.type === "review"
      ? t.notifications.typeReview.replace("{name}", item.actorName)
      : t.notifications.typeMessage
          .replace("{name}", item.actorName)
          .replace("{preview}", item.payload.preview ?? "");

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-2xl transition-colors ${
          item.read_at
            ? "hover:bg-white/[0.04]"
            : "bg-echo/[0.08] hover:bg-echo/[0.14] border border-echo/15"
        }`}
      >
        <span className="relative h-11 w-11 shrink-0 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
          {item.actorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.actorAvatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-base text-zinc-200 font-semibold">
              {item.actorName?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          {item.type === "match" && (
            <span className="absolute -bottom-1 -right-1 text-base bg-zinc-950 rounded-full p-0.5">
              💜
            </span>
          )}
          {item.type === "message" && (
            <span className="absolute -bottom-1 -right-1 text-xs bg-zinc-950 rounded-full p-0.5">
              💬
            </span>
          )}
          {item.type === "like" && (
            <span className="absolute -bottom-1 -right-1 text-xs bg-zinc-950 rounded-full p-0.5">
              ❤️
            </span>
          )}
          {item.type === "review" && (
            <span className="absolute -bottom-1 -right-1 text-xs bg-zinc-950 rounded-full p-0.5">
              ⭐
            </span>
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
          <p className="text-[11px] text-zinc-500 mt-1">
            {formatRelative(item.created_at, t)}
          </p>
        </div>
        {!item.read_at && (
          <span className="mt-2 w-2 h-2 rounded-full bg-echo glow-echo shrink-0" />
        )}
      </button>
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

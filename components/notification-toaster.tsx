"use client";

// Глобальный приёмник realtime-уведомлений. Сидит в layout.tsx,
// слушает INSERT в notifications для текущего юзера и стреляет sonner-тостами
// с любого экрана. На странице чата с конкретным человеком тосты для
// сообщений ОТ него подавляются (он и так их видит вживую).
//
// На мобиле realtime-канал засыпает когда вкладка/PWA уходит в фон —
// поэтому при возврате через visibilitychange мы сами фетчим непрочитанные
// и стреляем тосты для тех что пришли пока нас не было.

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, MessageCircle, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

type RawNotif = {
  id: string;
  actor_id: string | null;
  type: "match" | "message" | "review" | "like";
  payload: { preview?: string };
  created_at: string;
  read_at: string | null;
};

export function NotificationToaster() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  // Кладём pathname в ref, чтобы коллбэк всегда видел актуальный
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Защита от двойного показа одного и того же уведомления
  // (realtime может стрельнуть, потом visibilitychange-фетч может стрельнуть)
  const shownIdsRef = useRef<Set<string>>(new Set());

  const showNotificationToast = useCallback(
    async (raw: RawNotif, supabase: ReturnType<typeof createClient>) => {
      const actorId = raw.actor_id;
      if (!actorId) return;
      if (shownIdsRef.current.has(raw.id)) return;
      shownIdsRef.current.add(raw.id);

      // На странице чата с этим человеком не показываем тост про его сообщение
      const currentPath = pathnameRef.current ?? "";
      if (raw.type === "message" && currentPath === `/matches/${actorId}`) {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", actorId)
        .maybeSingle();
      const actorName = profile?.name ?? "?";

      const text =
        raw.type === "match"
          ? t.notifications.typeMatch.replace("{name}", actorName)
          : raw.type === "message"
          ? t.notifications.typeMessage
              .replace("{name}", actorName)
              .replace("{preview}", raw.payload.preview ?? "")
          : raw.type === "like"
          ? t.notifications.typeLike.replace("{name}", actorName)
          : t.notifications.typeReview.replace("{name}", actorName);

      // Лайк ведёт на /matches (таб «Лайкнули»), остальное — в чат
      const href = raw.type === "like" ? "/matches" : `/matches/${actorId}`;
      const Icon =
        raw.type === "match" || raw.type === "like"
          ? Heart
          : raw.type === "review"
          ? Star
          : MessageCircle;

      toast.custom(
        (id) => (
          <button
            type="button"
            onClick={() => {
              toast.dismiss(id);
              // Помечаем прочитанным — колокольчик подхватит через UPDATE-realtime
              // и сам декрементит красный значок
              supabase
                .from("notifications")
                .update({ read_at: new Date().toISOString() })
                .eq("id", raw.id)
                .then(() => {});
              router.push(href);
            }}
            className="w-[360px] max-w-[calc(100vw-2rem)] text-left flex items-start gap-3 rounded-2xl bg-zinc-950/95 border border-echo/30 px-4 py-3 backdrop-blur-md shadow-2xl shadow-echo/20 hover:border-echo/50 active:scale-[0.98] transition-all"
            style={{
              animation: "echo-toast-in 350ms cubic-bezier(0.22, 0.61, 0.36, 1)",
            }}
          >
            <span className="relative shrink-0 h-10 w-10 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-base text-zinc-200 font-semibold">
                  {actorName[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              <span className="absolute -bottom-1 -right-1 bg-echo rounded-full p-1 glow-echo">
                <Icon className="w-3 h-3 text-white" fill="white" />
              </span>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white line-clamp-2 leading-snug">
                {text}
              </p>
              <p className="text-[11px] text-echo-bright mt-1 font-medium">
                {t.notifications.open} →
              </p>
            </div>
          </button>
        ),
        { duration: 6000 }
      );

      // Тактильная отдача на мобиле
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.(40);
        } catch {
          /* ignore */
        }
      }
    },
    [router, t]
  );

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let userId: string | null = null;
    // С какого момента ищем непрочитанные при возврате на вкладку
    let lastSeenIso = new Date().toISOString();

    async function checkMissed() {
      if (!userId || !active) return;
      const since = lastSeenIso;
      lastSeenIso = new Date().toISOString();
      const { data: missed } = await supabase
        .from("notifications")
        .select("id, actor_id, type, payload, created_at, read_at")
        .eq("user_id", userId)
        .is("read_at", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5);
      // Стреляем тосты от старейшего к новейшему, чтоб самый новый был сверху
      for (const n of (missed ?? []).slice().reverse()) {
        await showNotificationToast(n as RawNotif, supabase);
      }
    }

    function onVisible() {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      // На мобиле сокет мог отвалиться — пере-подписываемся и догоняем
      checkMissed();
      // Пере-подписка realtime (на случай если канал умер)
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      if (userId) subscribe(userId);
    }

    function subscribe(uid: string) {
      channel = supabase
        .channel(`global-notifications:${uid}:${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const raw = payload.new as RawNotif;
            lastSeenIso = new Date().toISOString();
            showNotificationToast(raw, supabase);
          }
        )
        .subscribe();
    }

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;
      userId = user.id;
      subscribe(user.id);
      document.addEventListener("visibilitychange", onVisible);
    })();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [showNotificationToast]);

  return null;
}

"use client";

// Глобальный приёмник realtime-уведомлений. Сидит в layout.tsx,
// слушает INSERT в notifications для текущего юзера и стреляет sonner-тостами
// с любого экрана. На странице чата с конкретным человеком тосты для
// сообщений ОТ него подавляются (он и так их видит вживую).

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, MessageCircle, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

type NotifPayload = {
  actor_id: string | null;
  type: "match" | "message" | "review";
  payload: { preview?: string };
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

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;

      channel = supabase
        .channel(`global-notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            const raw = payload.new as NotifPayload;
            const actorId = raw.actor_id;
            if (!actorId) return;

            // Если ты уже в чате с этим человеком — не показываем тост
            // про новое сообщение от него: оно и так появится в чате.
            const currentPath = pathnameRef.current ?? "";
            if (
              raw.type === "message" &&
              currentPath === `/matches/${actorId}`
            ) {
              return;
            }

            // Берём имя и аватар отправителя
            const { data: profile } = await supabase
              .from("profiles")
              .select("name, avatar_url")
              .eq("id", actorId)
              .maybeSingle();
            const actorName = profile?.name ?? "?";

            // Текст
            const text =
              raw.type === "match"
                ? t.notifications.typeMatch.replace("{name}", actorName)
                : raw.type === "message"
                ? t.notifications.typeMessage
                    .replace("{name}", actorName)
                    .replace("{preview}", raw.payload.preview ?? "")
                : t.notifications.typeReview.replace("{name}", actorName);

            const href = `/matches/${actorId}`;
            const Icon =
              raw.type === "match"
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
                    router.push(href);
                  }}
                  className="w-[360px] max-w-[calc(100vw-2rem)] text-left flex items-start gap-3 rounded-2xl bg-zinc-950/95 border border-echo/30 px-4 py-3 backdrop-blur-md shadow-2xl shadow-echo/20 hover:border-echo/50 transition-colors"
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
          }
        )
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Play, Heart, User, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";

// Показываем только на основных экранах приложения
const SHOW_ON = ["/feed", "/matches", "/profile", "/upload", "/search"];

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const [unread, setUnread] = useState(0);

  // Считаем непрочитанные сообщения (RLS уже ограничивает моими мэтчами)
  useEffect(() => {
    if (!SHOW_ON.includes(pathname)) return;
    let active = true;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .is("read_at", null);
      if (active) setUnread(count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (!SHOW_ON.includes(pathname)) return null;

  const tab = (href: string, label: string, Icon: typeof Play, badge = 0) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
          active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <span className="relative">
          <Icon className="w-5 h-5" fill={active ? "currentColor" : "none"} />
          {badge > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-echo text-white text-[10px] font-bold flex items-center justify-center">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </span>
        <span className="text-[10px]">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto max-w-md flex items-center justify-around h-16 px-2">
        {tab("/feed", t.nav.feed, Play)}
        {tab("/matches", t.nav.matches, Heart, unread)}
        <Link
          href="/upload"
          className="flex items-center justify-center w-12 h-12 -mt-1 rounded-2xl bg-echo glow-echo text-white shrink-0"
        >
          <Plus className="w-6 h-6" />
        </Link>
        {tab("/profile", t.nav.profile, User)}
      </div>
    </nav>
  );
}

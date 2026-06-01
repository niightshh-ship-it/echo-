"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notification-bell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MatchCelebration } from "@/components/match-celebration";
import { LikePreviewSheet } from "@/components/like-preview-sheet";

export type MatchItem = {
  id: string;
  name: string;
  city: string;
  avatar: string | null;
  skills: string[];
  matchedAt: string;
  unread: number;
  rating: number | null;
};

export type LikeItem = {
  id: string;
  name: string;
  city: string;
  avatar: string | null;
  bio: string | null;
  skills: string[];
  wants: string[];
  verified: boolean;
  likedAt: string;
};

type Tab = "matches" | "likes";

export function MatchesClient({
  myId,
  myName,
  myAvatar,
  matchItems,
  likeItems,
}: {
  myId: string;
  myName: string;
  myAvatar: string | null;
  matchItems: MatchItem[];
  likeItems: LikeItem[];
}) {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("matches");
  const [likes, setLikes] = useState<LikeItem[]>(likeItems);
  const [matches, setMatches] = useState<MatchItem[]>(matchItems);
  const [preview, setPreview] = useState<LikeItem | null>(null);
  const [celebration, setCelebration] = useState<LikeItem | null>(null);

  async function likeBack(liker: LikeItem) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("like_back", {
      p_target_id: liker.id,
    });
    if (error) {
      console.error("like_back:", error);
      return;
    }
    // Переносим из лайков в мэтчи
    setLikes((prev) => prev.filter((l) => l.id !== liker.id));
    setMatches((prev) => [
      {
        id: liker.id,
        name: liker.name,
        city: liker.city,
        avatar: liker.avatar,
        skills: liker.skills,
        matchedAt: new Date().toISOString(),
        unread: 0,
        rating: null,
      },
      ...prev,
    ]);
    setPreview(null);
    if (data?.matched) {
      setCelebration(liker);
    }
  }

  return (
    <div className="relative z-10 w-full max-w-md page-fade-in">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-2xl font-bold lowercase text-gradient-echo">
          echo
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell userId={myId} />
          <LanguageSwitcher />
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-1.5 p-1.5 bg-white/[0.04] rounded-2xl mb-5 border border-white/10">
        <button
          onClick={() => setTab("matches")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === "matches"
              ? "bg-gradient-to-r from-echo to-echo-fuchsia text-white glow-echo"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <TwinHearts active={tab === "matches"} />
          {t.matches.tabMatches}
          {matches.length > 0 && (
            <span
              className={`text-xs ${tab === "matches" ? "text-white/70" : "text-zinc-600"}`}
            >
              {matches.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("likes")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
            tab === "likes" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Heart
            className={`w-4 h-4 ${tab === "likes" ? "text-echo" : "text-zinc-400"}`}
            fill={tab === "likes" ? "currentColor" : "none"}
          />
          {t.matches.tabLikes}
          {likes.length > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-echo text-white glow-echo">
              {likes.length}
            </span>
          )}
        </button>
      </div>

      {/* === МЭТЧИ === */}
      {tab === "matches" &&
        (matches.length === 0 ? (
          <EmptyState title={t.matches.emptyTitle} text={t.matches.emptyText} />
        ) : (
          <div className="space-y-3">
            <p className="flex items-center gap-1.5 text-zinc-400 text-sm mb-1">
              <MessageCircle className="w-4 h-4 text-echo-bright" />
              {t.matches.chatsHint}
            </p>
            {matches.map((m) => (
              <Link
                key={m.id}
                href={`/matches/${m.id}`}
                className="block rounded-2xl glass border border-white/10 p-5 hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <Avatar src={m.avatar} name={m.name} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-semibold">{m.name}</p>
                        {m.unread > 0 && (
                          <span className="bg-echo text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {m.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-sm">{m.city}</p>
                      {m.rating !== null && (
                        <p className="text-xs mt-0.5">
                          <span className="text-echo-bright">
                            {"★".repeat(Math.round(m.rating))}
                          </span>
                          <span className="text-zinc-600">
                            {"★".repeat(5 - Math.round(m.rating))}
                          </span>
                          <span className="text-zinc-500"> {m.rating.toFixed(1)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600">
                    {new Date(m.matchedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {m.skills.map((s) => (
                    <Badge key={s} className="bg-white/10 text-white hover:bg-white/15 border-0">
                      {s}
                    </Badge>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        ))}

      {/* === ЛАЙКИ === */}
      {tab === "likes" &&
        (likes.length === 0 ? (
          <EmptyState title={t.matches.likesEmptyTitle} text={t.matches.likesEmptyText} />
        ) : (
          <>
            <p className="text-zinc-400 text-sm mb-4">{t.matches.likesSubtitle}</p>
            <div className="grid grid-cols-2 gap-3">
              {likes.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setPreview(l)}
                  className="text-left rounded-2xl glass border border-white/10 p-4 hover:bg-white/[0.06] hover:border-echo/30 transition-colors group"
                >
                  <div className="flex flex-col items-center text-center">
                    <Avatar src={l.avatar} name={l.name} size="lg" />
                    <p className="font-semibold mt-2 truncate w-full">{l.name}</p>
                    <p className="text-xs text-zinc-500 truncate w-full">{l.city}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-echo-bright font-medium">
                      <Heart className="w-3 h-3" fill="currentColor" />
                      {t.matches.likedYou}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ))}

      {/* Превью лайкера */}
      {preview && (
        <LikePreviewSheet
          liker={preview}
          onClose={() => setPreview(null)}
          onLikeBack={() => likeBack(preview)}
          onOpenProfile={() => router.push(`/u/${preview.id}`)}
        />
      )}

      {/* Фейерверк */}
      {celebration && (
        <MatchCelebration
          myName={myName}
          myAvatar={myAvatar}
          partnerName={celebration.name}
          partnerAvatar={celebration.avatar}
          partnerId={celebration.id}
          onClose={() => setCelebration(null)}
        />
      )}
    </div>
  );
}

function Avatar({
  src,
  name,
  size = "md",
}: {
  src: string | null;
  name: string;
  size?: "md" | "lg";
}) {
  const cls = size === "lg" ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg";
  return (
    <div
      className={`relative ${cls} shrink-0 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{name?.[0]?.toUpperCase() ?? "?"}</span>
      )}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
      <p className="text-zinc-500 mb-2">{title}</p>
      <p className="text-zinc-600 text-sm">{text}</p>
    </div>
  );
}

// Два соединяющихся сердца — фирменная иконка таба «Мэтчи»
function TwinHearts({ active }: { active: boolean }) {
  // На активном табе фон уже градиентный, поэтому сердца белые.
  // На неактивном — фиолет + фуксия.
  return (
    <span className="relative inline-flex items-center w-5 h-4">
      <Heart
        className={`absolute left-0 w-4 h-4 ${active ? "text-white" : "text-echo"}`}
        fill="currentColor"
        style={{ transform: "rotate(-18deg)" }}
      />
      <Heart
        className={`absolute left-1.5 w-4 h-4 ${active ? "text-white/85" : "text-echo-fuchsia"}`}
        fill="currentColor"
        style={{ transform: "rotate(18deg)" }}
      />
    </span>
  );
}

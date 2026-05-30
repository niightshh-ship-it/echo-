"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";

const CONFETTI_EMOJIS = ["💜", "✨", "🎉", "💫", "💖", "⭐", "🪩"];

export function MatchCelebration({
  myName,
  myAvatar,
  partnerName,
  partnerAvatar,
  partnerId,
  onClose,
}: {
  myName: string;
  myAvatar: string | null;
  partnerName: string;
  partnerAvatar: string | null;
  partnerId: string;
  onClose: () => void;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 36 частиц с рандомным углом и радиусом разлёта
  const particles = Array.from({ length: 36 }, (_, i) => {
    const angle = (i / 36) * 360 + Math.random() * 20;
    const distance = 140 + Math.random() * 180;
    const emoji = CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)];
    const delay = Math.random() * 0.2;
    return { angle, distance, emoji, delay, id: i };
  });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Радиальное свечение из центра */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[460px] w-[460px] rounded-full bg-echo opacity-30 blur-[120px] match-glow" />

      {/* Конфетти */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute left-0 top-0 text-2xl confetti-piece"
            style={
              {
                "--angle": `${p.angle}deg`,
                "--dist": `${p.distance}px`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Два аватара съезжаются */}
      <div className="relative flex items-center justify-center mb-8 h-32">
        <Avatar
          name={myName}
          src={myAvatar}
          className="match-avatar-left absolute"
        />
        <Avatar
          name={partnerName}
          src={partnerAvatar}
          className="match-avatar-right absolute"
        />
        {/* Сердце в центре при «столкновении» */}
        <span className="absolute text-5xl match-heart-burst select-none">💜</span>
      </div>

      <h1 className="text-4xl sm:text-5xl font-bold text-white text-center match-title-in tracking-tight mb-2">
        {t.feed.matchTitle}
      </h1>
      <p className="text-zinc-300 text-base text-center match-subtitle-in mb-10 px-6">
        {t.feed.matchSubtitle.replace("{name}", partnerName)}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs px-6 match-buttons-in">
        <Link href={`/matches/${partnerId}`}>
          <button className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full h-12 font-semibold transition-colors">
            {t.feed.matchStartChat}
          </button>
        </Link>
        <button
          onClick={onClose}
          className="w-full text-zinc-400 hover:text-white rounded-full h-12 font-medium transition-colors"
        >
          {t.feed.matchKeepSwiping}
        </button>
      </div>
    </div>,
    document.body
  );
}

function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src: string | null;
  className?: string;
}) {
  return (
    <span
      className={`h-28 w-28 shrink-0 rounded-full overflow-hidden border-4 border-white/30 bg-white/10 flex items-center justify-center shadow-2xl shadow-echo/40 ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-4xl text-white font-bold">
          {name?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </span>
  );
}

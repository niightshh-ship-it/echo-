"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/language-switcher";

// Скилл-частицы, дрейфующие в фоне — визуализируют саму идею «обмена навыками».
// Позиции/тайминги заданы детерминированно, чтобы не прыгали при ре-рендере.
const PARTICLES = [
  { label: "guitar", x: "12%", y: "22%", dx: "30px", dy: "-40px", dur: "17s", delay: "0s", op: 0.45, size: "text-sm" },
  { label: "dutch", x: "82%", y: "18%", dx: "-26px", dy: "34px", dur: "21s", delay: "1.4s", op: 0.4, size: "text-xs" },
  { label: "cooking", x: "20%", y: "72%", dx: "34px", dy: "26px", dur: "19s", delay: "2.1s", op: 0.5, size: "text-sm" },
  { label: "massage", x: "76%", y: "70%", dx: "-30px", dy: "-30px", dur: "23s", delay: "0.7s", op: 0.42, size: "text-xs" },
  { label: "design", x: "50%", y: "12%", dx: "20px", dy: "30px", dur: "18s", delay: "3.0s", op: 0.35, size: "text-xs" },
  { label: "coding", x: "8%", y: "48%", dx: "28px", dy: "-22px", dur: "20s", delay: "1.9s", op: 0.4, size: "text-sm" },
  { label: "yoga", x: "90%", y: "46%", dx: "-22px", dy: "-28px", dur: "22s", delay: "2.6s", op: 0.38, size: "text-xs" },
  { label: "photo", x: "62%", y: "84%", dx: "-24px", dy: "20px", dur: "20s", delay: "0.3s", op: 0.36, size: "text-xs" },
  { label: "dance", x: "34%", y: "88%", dx: "26px", dy: "-24px", dur: "24s", delay: "3.4s", op: 0.32, size: "text-xs" },
] as const;

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useT();

  return (
    <div className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden text-white px-6">
      {/* Переключатель языка */}
      <div className="absolute top-5 right-5 z-30">
        <LanguageSwitcher />
      </div>

      {/* Аврора-меш под героем — два дышащих градиента в противофазе */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(124,92,255,0.32) 0%, transparent 62%)",
          filter: "blur(70px)",
          animation: "hero-aurora 14s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(228,85,255,0.22) 0%, transparent 60%)",
          filter: "blur(80px)",
          animation: "hero-aurora 18s ease-in-out infinite reverse",
        }}
      />

      {/* Дрейфующие скилл-частицы */}
      <div className="pointer-events-none absolute inset-0">
        {PARTICLES.map((p) => (
          <span
            key={p.label}
            className={`skill-particle absolute ${p.size} font-medium text-white/70 whitespace-nowrap`}
            style={
              {
                left: p.x,
                top: p.y,
                "--skill-dx": p.dx,
                "--skill-dy": p.dy,
                "--skill-dur": p.dur,
                "--skill-delay": p.delay,
                "--skill-op": p.op,
              } as React.CSSProperties
            }
          >
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 backdrop-blur-sm">
              {p.label}
            </span>
          </span>
        ))}
      </div>

      {/* Концентрические кольца-волны вокруг логотипа (бесконечные) */}
      <div className="pointer-events-none absolute left-1/2 top-[calc(50%-3rem)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <span className="echo-ring echo-ring-1 absolute h-[260px] w-[260px]" />
        <span className="echo-ring echo-ring-2 absolute h-[260px] w-[260px]" />
        <span className="echo-ring echo-ring-3 absolute h-[260px] w-[260px]" />
        {/* Стартовый «выстрел» волны — играет один раз на загрузке */}
        <span className="hero-shock hero-shock-1 h-[200px] w-[200px]" />
        <span className="hero-shock hero-shock-2 h-[200px] w-[200px]" />
        <span className="hero-shock hero-shock-3 h-[200px] w-[200px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Логотип с эхо-копиями текста — каскадный въезд */}
        <div className="hero-rise hero-d1 relative flex items-center justify-center">
          <span aria-hidden className="echo-ghost echo-ghost-1 absolute text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo">echo</span>
          <span aria-hidden className="echo-ghost echo-ghost-2 absolute text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo">echo</span>
          <span aria-hidden className="echo-ghost echo-ghost-3 absolute text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo">echo</span>
          <h1 className="relative text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo pb-2 drop-shadow-[0_4px_40px_rgba(124,92,255,0.4)]">
            echo
          </h1>
        </div>

        <p className="hero-rise hero-d2 mt-4 text-lg sm:text-2xl font-medium text-white/90 max-w-md">
          {t.landing.tagline}
        </p>
        <p className="hero-rise hero-d3 mt-3 text-sm text-zinc-400">
          {t.landing.subtitle}
        </p>

        <div className="hero-rise hero-d4 mt-12 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:w-auto sm:max-w-none">
          {isLoggedIn ? (
            <>
              <Link href="/feed" className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full px-8 h-12 text-base font-medium transition-transform active:scale-95">
                  {t.landing.watchFeed}
                </Button>
              </Link>
              <Link href="/matches" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full glass border-white/15 text-white hover:bg-white/10 hover:text-white rounded-full px-8 h-12 text-base transition-transform active:scale-95">
                  {t.landing.matches}
                </Button>
              </Link>
              <Link href="/profile" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full glass border-white/15 text-white hover:bg-white/10 hover:text-white rounded-full px-8 h-12 text-base transition-transform active:scale-95">
                  {t.landing.profile}
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/sign-in" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="group relative w-full overflow-hidden bg-echo text-white hover:bg-echo-bright glow-echo rounded-full px-12 h-12 text-base font-semibold transition-transform active:scale-95"
              >
                {/* Магнитный блик пробегает по кнопке */}
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
                    backgroundSize: "200% 100%",
                    animation: "cta-shimmer 1.1s ease-out",
                  }}
                />
                <span className="relative">{t.landing.signIn}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {!isLoggedIn && (
        <div className="hero-rise hero-d5 absolute bottom-6 flex flex-col items-center gap-1 text-zinc-500">
          <span className="text-[11px] uppercase tracking-widest">{t.home.scrollHint}</span>
          <span className="text-lg animate-bounce">↓</span>
        </div>
      )}
    </div>
  );
}

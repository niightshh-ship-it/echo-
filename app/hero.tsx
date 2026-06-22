"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useT();
  const sceneRef = useRef<HTMLDivElement>(null);

  // Лёгкий параллакс сцены за курсором — даёт ощущение глубины 3D
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    function onMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      el!.style.setProperty("--px", `${x * 14}px`);
      el!.style.setProperty("--py", `${y * 10}px`);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden text-white px-6">
      <div className="absolute top-5 right-5 z-30">
        <LanguageSwitcher />
      </div>

      {/* ====== DREAMSCAPE-СЦЕНА ====== */}
      {/* Если положишь /public/hero.mp4 — раскомментирую этот слой как видео-фон.
          Сейчас — кинематографичный CSS-dreamscape: dusk-небо + зеркальная вода. */}
      <div
        ref={sceneRef}
        className="pointer-events-none absolute inset-0"
        style={{ transform: "translate(var(--px,0), var(--py,0))", transition: "transform 0.3s ease-out" }}
      >
        {/* Небо: глубокий индиго сверху → фуксия у горизонта */}
        <div
          className="absolute inset-x-0 top-0 h-[62%]"
          style={{
            background:
              "linear-gradient(180deg, #07040f 0%, #1a0b35 38%, #3b1063 64%, #7c2a8f 86%, #c44ad0 100%)",
          }}
        />
        {/* Сияние горизонта */}
        <div
          className="absolute inset-x-0"
          style={{
            top: "56%",
            height: "14%",
            background:
              "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(228,85,255,0.55), rgba(124,92,255,0.18) 45%, transparent 75%)",
            filter: "blur(12px)",
          }}
        />
        {/* Вода: тёмное зеркало с отражённым свечением */}
        <div
          className="absolute inset-x-0 bottom-0 h-[40%]"
          style={{
            background:
              "linear-gradient(180deg, #2a0f3d 0%, #14071f 40%, #050109 100%)",
          }}
        />
        {/* Отражение горизонта на воде (зеркально, тусклее) */}
        <div
          className="absolute inset-x-0"
          style={{
            top: "60%",
            height: "16%",
            background:
              "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(228,85,255,0.28), transparent 70%)",
            filter: "blur(18px)",
            opacity: 0.6,
            transform: "scaleY(-1)",
          }}
        />
        {/* Звёзды-частицы в небе (мелкий шум через множественные точки) */}
        <div
          className="absolute inset-x-0 top-0 h-[50%] opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 20%, #fff, transparent), radial-gradient(1px 1px at 45% 45%, #e9d5ff, transparent), radial-gradient(1px 1px at 85% 40%, #fff, transparent), radial-gradient(1px 1px at 30% 60%, #fff, transparent), radial-gradient(1px 1px at 60% 55%, #e9d5ff, transparent), radial-gradient(1px 1px at 90% 15%, #fff, transparent), radial-gradient(1px 1px at 12% 12%, #fff, transparent)",
          }}
        />
        {/* Парящие soft-орбы (вместо текста-навыков) */}
        <div
          className="absolute h-24 w-24 rounded-full"
          style={{ left: "16%", top: "30%", background: "radial-gradient(circle, rgba(196,160,255,0.5), transparent 70%)", filter: "blur(6px)", animation: "skill-float 19s ease-in-out infinite", "--skill-dx": "20px", "--skill-dy": "-26px", "--skill-op": "0.7" } as React.CSSProperties}
        />
        <div
          className="absolute h-16 w-16 rounded-full"
          style={{ left: "78%", top: "26%", background: "radial-gradient(circle, rgba(228,85,255,0.45), transparent 70%)", filter: "blur(5px)", animation: "skill-float 23s ease-in-out infinite", "--skill-dx": "-22px", "--skill-dy": "20px", "--skill-op": "0.6", animationDelay: "2s" } as React.CSSProperties}
        />
        <div
          className="absolute h-12 w-12 rounded-full"
          style={{ left: "60%", top: "18%", background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)", filter: "blur(4px)", animation: "skill-float 26s ease-in-out infinite", "--skill-dx": "16px", "--skill-dy": "24px", "--skill-op": "0.5", animationDelay: "1s" } as React.CSSProperties}
        />
      </div>

      {/* Концентрические кольца-волны вокруг логотипа */}
      <div className="pointer-events-none absolute left-1/2 top-[calc(50%-2.5rem)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <span className="echo-ring echo-ring-1 absolute h-[240px] w-[240px]" />
        <span className="echo-ring echo-ring-2 absolute h-[240px] w-[240px]" />
        <span className="echo-ring echo-ring-3 absolute h-[240px] w-[240px]" />
        <span className="hero-shock hero-shock-1 h-[200px] w-[200px]" />
        <span className="hero-shock hero-shock-2 h-[200px] w-[200px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Логотип */}
        <div className="hero-rise hero-d1 relative flex items-center justify-center">
          <span aria-hidden className="echo-ghost echo-ghost-1 absolute text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo">echo</span>
          <span aria-hidden className="echo-ghost echo-ghost-2 absolute text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo">echo</span>
          <h1 className="relative text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo pb-2 drop-shadow-[0_8px_60px_rgba(228,85,255,0.5)]">
            echo
          </h1>
        </div>

        {/* Отражение логотипа на «воде» */}
        <div aria-hidden className="relative -mt-1 select-none pointer-events-none" style={{ transform: "scaleY(-1)", opacity: 0.18, maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 70%)", WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 70%)" }}>
          <span className="block text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo blur-[2px]">echo</span>
        </div>

        <p className="hero-rise hero-d2 mt-3 text-lg sm:text-2xl font-medium text-white/90 max-w-md">
          {t.landing.tagline}
        </p>
        <p className="hero-rise hero-d3 mt-3 text-sm text-white/55">
          {t.landing.subtitle}
        </p>

        <div className="hero-rise hero-d4 mt-11 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:w-auto sm:max-w-none">
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
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100"
                  style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)", backgroundSize: "200% 100%", animation: "cta-shimmer 1.1s ease-out" }}
                />
                <span className="relative">{t.landing.signIn}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {!isLoggedIn && (
        <div className="hero-rise hero-d5 absolute bottom-6 flex flex-col items-center gap-1 text-white/40">
          <span className="text-[11px] uppercase tracking-widest">{t.home.scrollHint}</span>
          <span className="text-lg animate-bounce">↓</span>
        </div>
      )}
    </div>
  );
}

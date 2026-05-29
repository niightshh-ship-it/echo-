"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useT();

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden text-white px-6">
      {/* Переключатель языка */}
      <div className="absolute top-5 right-5 z-20">
        <LanguageSwitcher />
      </div>

      {/* Концентрические кольца-волны вокруг логотипа */}
      <div className="pointer-events-none absolute left-1/2 top-[calc(50%-3rem)] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <span className="echo-ring echo-ring-1 absolute h-[260px] w-[260px]" />
        <span className="echo-ring echo-ring-2 absolute h-[260px] w-[260px]" />
        <span className="echo-ring echo-ring-3 absolute h-[260px] w-[260px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Логотип с эхо-копиями текста */}
        <div className="relative flex items-center justify-center">
          <span aria-hidden className="echo-ghost echo-ghost-1 absolute text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo">echo</span>
          <span aria-hidden className="echo-ghost echo-ghost-2 absolute text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo">echo</span>
          <span aria-hidden className="echo-ghost echo-ghost-3 absolute text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo">echo</span>
          <h1 className="relative text-7xl sm:text-8xl font-bold tracking-tighter lowercase text-gradient-echo pb-2">echo</h1>
        </div>

        <p className="mt-4 text-lg sm:text-xl text-zinc-300 max-w-md">
          {t.landing.tagline}
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          {t.landing.subtitle}
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:w-auto sm:max-w-none">
          {isLoggedIn ? (
            <>
              <Link href="/feed" className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full px-8 h-12 text-base font-medium">
                  {t.landing.watchFeed}
                </Button>
              </Link>
              <Link href="/matches" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full glass border-white/15 text-white hover:bg-white/10 hover:text-white rounded-full px-8 h-12 text-base">
                  {t.landing.matches}
                </Button>
              </Link>
              <Link href="/profile" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full glass border-white/15 text-white hover:bg-white/10 hover:text-white rounded-full px-8 h-12 text-base">
                  {t.landing.profile}
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/sign-in" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full px-12 h-12 text-base font-medium">
                {t.landing.signIn}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {!isLoggedIn && (
        <div className="absolute bottom-6 flex flex-col items-center gap-1 text-zinc-600 animate-bounce">
          <span className="text-[11px] uppercase tracking-widest">{t.home.scrollHint}</span>
          <span className="text-lg">↓</span>
        </div>
      )}
    </div>
  );
}

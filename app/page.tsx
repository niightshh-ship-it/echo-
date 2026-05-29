import { createClient } from "@/lib/supabase/server";
import { Hero } from "./hero";
import { MarketingSections } from "./marketing-sections";
import { CursorGlow } from "@/components/cursor-glow";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <main className="echo-aurora relative overflow-x-clip text-white">
      {/* Свечение за курсором — на весь экран, следует за мышкой при скролле */}
      <CursorGlow />

      {/* Единый слой свечения на всю страницу — не режется по секциям */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob blob-1 absolute top-[14%] left-1/2 -translate-x-1/2 h-[460px] w-[460px] bg-echo opacity-[0.22]" />
        <div className="blob blob-2 absolute top-[40%] -right-24 h-[420px] w-[420px] bg-echo-fuchsia opacity-[0.10]" />
        <div className="blob blob-1 absolute top-[66%] -left-24 h-[400px] w-[400px] bg-echo opacity-[0.12]" />
        <div className="blob blob-2 absolute top-[88%] left-1/3 h-[360px] w-[360px] bg-echo opacity-[0.10]" />
      </div>

      <div className="relative z-10">
        <Hero isLoggedIn={isLoggedIn} />
        <MarketingSections isLoggedIn={isLoggedIn} />
      </div>
    </main>
  );
}

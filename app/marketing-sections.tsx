import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { SkillWall } from "@/components/skill-wall";
import { EchoPulse } from "@/components/echo-pulse";

// Подсвечивает слово "Echo" в строке — градиент + эхо-пульсация как на главной
function withEcho(text: string) {
  return text.split(/(Echo)/).map((part, i) =>
    part === "Echo" ? (
      <EchoPulse key={i} text="Echo" />
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export async function MarketingSections({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { dict: t } = await getDictionary();

  const steps = [
    { n: "1", icon: "🎬", title: t.home.step1Title, text: t.home.step1Text },
    { n: "2", icon: "💜", title: t.home.step2Title, text: t.home.step2Text },
    { n: "3", icon: "✨", title: t.home.step3Title, text: t.home.step3Text },
  ];

  const why = [
    { icon: "🚫", title: t.home.why1Title, text: t.home.why1Text },
    { icon: "🛡️", title: t.home.why2Title, text: t.home.why2Text },
    { icon: "📍", title: t.home.why3Title, text: t.home.why3Text },
  ];

  const faq = [
    { q: t.home.q1, a: t.home.a1 },
    { q: t.home.q2, a: t.home.a2 },
    { q: t.home.q3, a: t.home.a3 },
  ];

  return (
    <div className="relative text-white">
      <div className="relative z-10">
        {/* How it works */}
        <section className="mx-auto max-w-5xl px-6 py-24">
          <Reveal>
            <h2 className="text-center text-3xl sm:text-4xl font-bold tracking-tight mb-14">
              {withEcho(t.home.howTitle)}
            </h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="relative rounded-3xl glass-card p-8 text-center h-full hover:border-echo/40 transition-colors">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-echo glow-echo flex items-center justify-center text-sm font-bold">
                    {s.n}
                  </div>
                  <div className="text-4xl mb-4 mt-2">{s.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Why Echo */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <Reveal>
            <h2 className="text-center text-3xl sm:text-4xl font-bold tracking-tight mb-14">
              {withEcho(t.home.whyTitle)}
            </h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-3">
            {why.map((w, i) => (
              <Reveal key={w.title} delay={i * 120}>
                <div className="rounded-3xl glass-card p-8 h-full hover:border-echo/40 transition-colors">
                  <div className="text-3xl mb-4">{w.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{w.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{w.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-2xl px-6 py-16">
          <Reveal>
            <h2 className="text-center text-3xl sm:text-4xl font-bold tracking-tight mb-10">
              {t.home.faqTitle}
            </h2>
          </Reveal>
          <div className="space-y-3">
            {faq.map((f, i) => (
              <Reveal key={f.q} delay={i * 100}>
                <details className="group rounded-2xl glass-card px-5 py-4 [&_summary]:cursor-pointer">
                  <summary className="flex items-center justify-between text-base font-medium list-none">
                    {f.q}
                    <span className="text-echo-bright transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA с фоновой стеной навыков */}
        <section className="relative px-6 py-32 text-center overflow-hidden">
          {/* плывущая лента навыков */}
          <SkillWall labels={t.home.skillsWall} />
          {/* виньетка — центр под текстом тёмный, по бокам лента яркая */}
          <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_50%_60%_at_center,rgba(5,1,9,0.92)_25%,rgba(5,1,9,0.55)_55%,rgba(5,1,9,0.1)_100%)]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[520px] rounded-full bg-echo opacity-[0.18] blur-[130px]" />
          <div className="relative z-10 mx-auto max-w-5xl">
            <Reveal>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-8 drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
                {t.home.ctaTitle}
              </h2>
              <Link href={isLoggedIn ? "/feed" : "/sign-in"}>
                <Button
                  size="lg"
                  className="bg-echo text-white hover:bg-echo-bright glow-echo rounded-full px-12 h-14 text-lg font-medium"
                >
                  {isLoggedIn ? t.landing.watchFeed : t.home.ctaButton}
                </Button>
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 px-6 py-10">
          <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xl font-bold lowercase tracking-tighter text-gradient-echo">echo</span>
              <p className="text-xs text-zinc-500 mt-1">{t.home.footerTagline}</p>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-1">
              <Link href="/install" className="text-xs text-echo-bright hover:underline">
                📱 {t.install.cta}
              </Link>
              <p className="text-xs text-zinc-600">{t.home.footerRights}</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

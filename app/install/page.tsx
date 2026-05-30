import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { Smartphone, Apple, Monitor } from "lucide-react";

export default async function InstallPage() {
  const { dict: t } = await getDictionary();

  const blocks = [
    { icon: Smartphone, title: t.install.androidTitle, steps: [t.install.android1, t.install.android2, t.install.android3] },
    { icon: Apple, title: t.install.iosTitle, steps: [t.install.ios1, t.install.ios2, t.install.ios3] },
    { icon: Monitor, title: t.install.desktopTitle, steps: [t.install.desktop1, t.install.desktop2, t.install.desktop3] },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[300px] w-[500px] rounded-full bg-echo opacity-10 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md page-fade-in">
        <div className="mb-6">
          <Link href="/" className="text-2xl font-bold lowercase text-gradient-echo">echo</Link>
        </div>

        <h1 className="text-3xl font-bold mb-2 lowercase">{t.install.title}</h1>
        <p className="text-zinc-400 text-sm mb-8">{t.install.intro}</p>

        <div className="space-y-4">
          {blocks.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="rounded-2xl glass border border-white/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-echo-bright" />
                  <h2 className="font-semibold">{b.title}</h2>
                </div>
                <ol className="space-y-2 list-none">
                  {/* list-none защищает от случая, когда дефолтная нумерация <ol>
                      рендерится поверх наших цветных бейджей и получается "1. 1 ..." */}
                  {b.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-zinc-300">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-echo/20 text-echo-bright text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

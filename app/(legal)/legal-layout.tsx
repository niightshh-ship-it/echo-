import Link from "next/link";

export type Section = { title: string; body: string };

export function LegalLayout({
  pageTitle,
  updated,
  sections,
  backLabel,
}: {
  pageTitle: string;
  updated: string;
  sections: Section[];
  backLabel: string;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 pt-12 pb-20">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[260px] w-[420px] rounded-full bg-echo opacity-10 blur-[130px]" />

      <div className="relative z-10 w-full max-w-2xl page-fade-in">
        <div className="mb-8">
          <Link href="/" className="text-zinc-400 hover:text-white text-sm">{backLabel}</Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{pageTitle}</h1>
        <p className="text-xs text-zinc-500 mb-10">{updated}</p>

        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold mb-2">{s.title}</h2>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

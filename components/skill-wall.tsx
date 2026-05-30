// Фоновая "стена навыков" — плитки мягко плывут лентами в разные стороны.
// Чистый CSS, без JS и видео. Подписи приходят из словаря (язык сайта).

// Эмодзи нейтральны к языку, паруются с подписями по индексу.
const EMOJI = ["🍳", "🎸", "💻", "💃", "🗣️", "📷", "💆", "🏋️", "🎨", "🧘", "🎤", "🧁", "📐", "🔧"];

function Tile({ e, label }: { e: string; label: string }) {
  return (
    <div className="mr-3 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.06] px-4 py-2 whitespace-nowrap">
      <span className="text-base opacity-80 [filter:grayscale(0.3)]">{e}</span>
      <span className="text-sm text-zinc-200/90">{label}</span>
    </div>
  );
}

export function SkillWall({ labels }: { labels: string[] }) {
  const tiles = labels.map((label, i) => ({ e: EMOJI[i % EMOJI.length], label }));

  const rows = [
    { items: tiles.slice(0, 5), dir: "marquee-left" },
    { items: tiles.slice(5, 10), dir: "marquee-right" },
    { items: tiles.slice(10), dir: "marquee-left" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-4 opacity-90">
      {rows.map((row, i) => (
        <div key={i} className="overflow-hidden">
          {/* дублируем дважды для бесшовной петли (translateX -50%) */}
          <div className={`marquee-track ${row.dir}`}>
            {[...row.items, ...row.items].map((s, j) => (
              <Tile key={j} e={s.e} label={s.label} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

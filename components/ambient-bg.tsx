"use client";

/**
 * AmbientBg — ненавязчивый анимированный фон в стиле Echo.
 * Рендерит два медленно дрейфующих blob-а с разными позициями для каждой страницы.
 * Использует CSS-анимации blob-drift-1/2 из globals.css.
 */

type BlobConfig = {
  size: string;
  color: string;
  opacity: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  blur: string;
};

type Variant =
  | "default"
  | "profile"
  | "matches"
  | "chat"
  | "settings"
  | "search"
  | "upload"
  | "onboarding"
  | "auth";

const VARIANTS: Record<Variant, [BlobConfig, BlobConfig]> = {
  // Профиль — фиолет сверху по центру, фуксия снизу справа
  profile: [
    { size: "500px", color: "#7c5cff", opacity: "0.09", top: "-80px", left: "calc(50% - 250px)", blur: "130px" },
    { size: "360px", color: "#e455ff", opacity: "0.06", bottom: "80px", right: "-60px", blur: "110px" },
  ],
  // Мэтчи — фиолет сверху слева, фуксия снизу по центру
  matches: [
    { size: "420px", color: "#7c5cff", opacity: "0.09", top: "-60px", left: "-80px", blur: "120px" },
    { size: "380px", color: "#e455ff", opacity: "0.06", bottom: "40px", left: "calc(50% - 190px)", blur: "120px" },
  ],
  // Чат — оба блоба по бокам, создают мягкий туннель
  chat: [
    { size: "340px", color: "#7c5cff", opacity: "0.08", top: "10%", left: "-80px", blur: "100px" },
    { size: "300px", color: "#e455ff", opacity: "0.06", bottom: "15%", right: "-60px", blur: "100px" },
  ],
  // Настройки — тихо, почти неощутимо, сверху по центру
  settings: [
    { size: "450px", color: "#7c5cff", opacity: "0.07", top: "-100px", left: "calc(50% - 225px)", blur: "140px" },
    { size: "300px", color: "#9b7cff", opacity: "0.05", bottom: "60px", right: "20px", blur: "120px" },
  ],
  // Поиск — фиолет справа сверху, фуксия слева снизу
  search: [
    { size: "380px", color: "#7c5cff", opacity: "0.08", top: "-40px", right: "-60px", blur: "120px" },
    { size: "320px", color: "#e455ff", opacity: "0.05", bottom: "60px", left: "-40px", blur: "110px" },
  ],
  // Загрузка — акцент по центру, создаёт ощущение "spotlight"
  upload: [
    { size: "480px", color: "#7c5cff", opacity: "0.10", top: "calc(50% - 320px)", left: "calc(50% - 240px)", blur: "130px" },
    { size: "300px", color: "#e455ff", opacity: "0.06", bottom: "80px", right: "0px", blur: "110px" },
  ],
  // Онбординг — крупный фиолет по центру, лёгкая фуксия снизу
  onboarding: [
    { size: "520px", color: "#7c5cff", opacity: "0.10", top: "-100px", left: "calc(50% - 260px)", blur: "140px" },
    { size: "280px", color: "#e455ff", opacity: "0.07", bottom: "40px", right: "10px", blur: "100px" },
  ],
  // Авторизация/верификация — симметрично, как портал
  auth: [
    { size: "400px", color: "#7c5cff", opacity: "0.10", top: "calc(50% - 300px)", left: "calc(50% - 200px)", blur: "130px" },
    { size: "300px", color: "#e455ff", opacity: "0.07", bottom: "calc(50% - 250px)", right: "calc(50% - 150px)", blur: "110px" },
  ],
  // Default — безопасный вариант для остальных страниц
  default: [
    { size: "450px", color: "#7c5cff", opacity: "0.08", top: "-80px", left: "calc(50% - 225px)", blur: "130px" },
    { size: "320px", color: "#e455ff", opacity: "0.05", bottom: "60px", right: "-40px", blur: "110px" },
  ],
};

function Blob({ cfg, animClass }: { cfg: BlobConfig; animClass: string }) {
  return (
    <div
      aria-hidden
      className={`blob ${animClass} pointer-events-none absolute rounded-full`}
      style={{
        width: cfg.size,
        height: cfg.size,
        background: cfg.color,
        opacity: cfg.opacity,
        top: cfg.top,
        bottom: cfg.bottom,
        left: cfg.left,
        right: cfg.right,
        filter: `blur(${cfg.blur})`,
      }}
    />
  );
}

export function AmbientBg({ variant = "default" }: { variant?: Variant }) {
  const [primary, secondary] = VARIANTS[variant];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <Blob cfg={primary} animClass="blob-1" />
      <Blob cfg={secondary} animClass="blob-2" />
    </div>
  );
}

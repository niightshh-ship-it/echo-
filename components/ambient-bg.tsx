"use client";

/**
 * AmbientBg — заметный анимированный фон в стиле Echo.
 * Два медленно дрейфующих blob-а (фиолет + фуксия) с разными
 * раскладками для каждой страницы.
 */

type BlobConfig = {
  size: string;
  color: string;
  opacity: number;
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

// Достаточно заметные значения — на чёрном фоне явно видна окраска,
// но не настолько ярко чтоб мешать читаемости текста.
const VARIANTS: Record<Variant, [BlobConfig, BlobConfig]> = {
  profile: [
    { size: "560px", color: "#7c5cff", opacity: 0.22, top: "-100px", left: "calc(50% - 280px)", blur: "120px" },
    { size: "420px", color: "#e455ff", opacity: 0.16, bottom: "60px", right: "-80px", blur: "110px" },
  ],
  matches: [
    { size: "480px", color: "#7c5cff", opacity: 0.22, top: "-80px", left: "-100px", blur: "120px" },
    { size: "440px", color: "#e455ff", opacity: 0.16, bottom: "20px", left: "calc(50% - 220px)", blur: "120px" },
  ],
  chat: [
    { size: "400px", color: "#7c5cff", opacity: 0.20, top: "5%", left: "-100px", blur: "100px" },
    { size: "360px", color: "#e455ff", opacity: 0.14, bottom: "12%", right: "-80px", blur: "100px" },
  ],
  settings: [
    { size: "520px", color: "#7c5cff", opacity: 0.20, top: "-120px", left: "calc(50% - 260px)", blur: "130px" },
    { size: "360px", color: "#e455ff", opacity: 0.14, bottom: "40px", right: "0px", blur: "120px" },
  ],
  search: [
    { size: "440px", color: "#7c5cff", opacity: 0.22, top: "-60px", right: "-80px", blur: "120px" },
    { size: "380px", color: "#e455ff", opacity: 0.16, bottom: "40px", left: "-60px", blur: "110px" },
  ],
  upload: [
    { size: "540px", color: "#7c5cff", opacity: 0.24, top: "calc(50% - 340px)", left: "calc(50% - 270px)", blur: "120px" },
    { size: "360px", color: "#e455ff", opacity: 0.16, bottom: "60px", right: "-20px", blur: "110px" },
  ],
  onboarding: [
    { size: "580px", color: "#7c5cff", opacity: 0.24, top: "-120px", left: "calc(50% - 290px)", blur: "130px" },
    { size: "340px", color: "#e455ff", opacity: 0.18, bottom: "20px", right: "0px", blur: "100px" },
  ],
  auth: [
    { size: "460px", color: "#7c5cff", opacity: 0.26, top: "calc(50% - 320px)", left: "calc(50% - 230px)", blur: "120px" },
    { size: "360px", color: "#e455ff", opacity: 0.18, bottom: "calc(50% - 280px)", right: "calc(50% - 180px)", blur: "110px" },
  ],
  default: [
    { size: "500px", color: "#7c5cff", opacity: 0.20, top: "-80px", left: "calc(50% - 250px)", blur: "120px" },
    { size: "380px", color: "#e455ff", opacity: 0.14, bottom: "40px", right: "-40px", blur: "110px" },
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
        willChange: "transform",
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

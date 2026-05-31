"use client";

import { SOCIAL } from "@/lib/config";

// SVG-иконки чтобы не тащить дополнительный пакет (lucide не покрывает Threads/Telegram адекватно)
function ThreadsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm5.4 13.4c-.7 1.1-2 1.8-3.7 1.9-.5 0-1 0-1.4-.1-1.6-.4-2.6-1.5-2.9-3 0-.4 0-.7.2-1.1.4-.7 1.1-1.1 2-1.3.7-.1 1.5-.1 2.3 0 .1 0 .2 0 .2-.1.1-.5-.1-1-.6-1.3-.5-.3-1.2-.4-1.9-.1-.4.1-.7.4-.9.7l-1.1-.5c.4-.7 1-1.2 1.7-1.5 1.2-.4 2.4-.2 3.3.4.7.5 1.1 1.2 1.2 2.1 0 .3-.1.5-.2.7.5.2 1 .6 1.3 1 .6.7.8 1.7.3 2.6zm-3-3.3c-.6-.1-1.3-.1-1.8 0-.5.1-.9.3-1.1.6-.1.2-.2.4-.1.7.1.6.6.9 1.1 1 .9.2 1.9 0 2.5-.7.4-.4.5-.9.4-1.3-.2-.2-.6-.3-1-.3z" />
    </svg>
  );
}

function TikTokIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.39a8.16 8.16 0 0 0 4.77 1.52V6.49a4.85 4.85 0 0 1-1.84-.2z" />
    </svg>
  );
}

function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TelegramIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.64 6.8l-1.55 7.3c-.12.52-.42.64-.85.4l-2.35-1.73-1.13 1.09c-.13.13-.23.23-.47.23l.17-2.4 4.36-3.94c.19-.17-.04-.26-.29-.1L9.16 13.07 6.85 12.35c-.5-.16-.51-.5.1-.74L16 8.07c.42-.16.78.1.64.73z" />
    </svg>
  );
}

const LINKS = [
  { key: "threads", label: "Threads", url: SOCIAL.threads, Icon: ThreadsIcon, color: "hover:text-white" },
  { key: "tiktok", label: "TikTok", url: SOCIAL.tiktok, Icon: TikTokIcon, color: "hover:text-pink-400" },
  { key: "instagram", label: "Instagram", url: SOCIAL.instagram, Icon: InstagramIcon, color: "hover:text-fuchsia-400" },
  { key: "telegram", label: "Telegram", url: SOCIAL.telegram, Icon: TelegramIcon, color: "hover:text-sky-400" },
] as const;

export function SocialLinks({
  variant = "inline",
  className = "",
}: {
  variant?: "inline" | "grid";
  className?: string;
}) {
  if (variant === "grid") {
    return (
      <div className={`grid grid-cols-4 gap-2 ${className}`}>
        {LINKS.map(({ key, label, url, Icon, color }) => (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] py-3 text-zinc-400 transition-colors ${color}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[11px]">{label}</span>
          </a>
        ))}
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {LINKS.map(({ key, label, url, Icon, color }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={`text-zinc-500 transition-colors ${color}`}
        >
          <Icon className="w-5 h-5" />
        </a>
      ))}
    </div>
  );
}

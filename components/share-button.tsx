"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

export function ShareButton({
  url,
  title,
  text,
  className = "",
  variant = "icon",
}: {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  variant?: "icon" | "button";
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const fullUrl = url.startsWith("http")
      ? url
      : `${typeof window !== "undefined" ? window.location.origin : ""}${url}`;
    const shareData: ShareData = { url: fullUrl };
    if (title) shareData.title = title;
    if (text) shareData.text = text;

    if (typeof navigator === "undefined") return;

    // Web Share API на мобиле
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // юзер отменил — это нормально
        return;
      }
    }

    // Фоллбек — копируем в буфер
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // совсем уж старый браузер
      prompt(t.share.copyPrompt, fullUrl);
    }
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleShare}
        title={copied ? t.share.copied : t.share.share}
        aria-label={t.share.share}
        className={`rounded-full p-2 transition-colors ${
          copied ? "bg-echo text-white" : "bg-white/10 text-zinc-300 hover:bg-white/20"
        } ${className}`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        copied
          ? "bg-echo text-white"
          : "bg-white/10 text-zinc-200 hover:bg-white/20"
      } ${className}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {copied ? t.share.copied : t.share.share}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Heart, Play } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

// ============================================================
//  Анимированные иллюстрации — все на чистом CSS из globals.css
// ============================================================

function StepUploadIllustration() {
  return (
    <div className="relative h-48 w-48 flex items-center justify-center">
      <div className="wt-upload-card relative h-32 w-24 rounded-2xl border border-echo/40 bg-gradient-to-br from-echo/30 via-zinc-900 to-echo-fuchsia/20 overflow-hidden shadow-2xl shadow-echo/30">
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="w-8 h-8 text-white/70" fill="white" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="h-1 w-12 bg-white/60 rounded-full mb-1" />
          <div className="h-1 w-8 bg-white/40 rounded-full" />
        </div>
      </div>
      <div className="wt-upload-arrow absolute bottom-2 left-1/2 -translate-x-1/2">
        <div className="rounded-full bg-echo p-2 glow-echo">
          <ArrowUp className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}

function StepSwipeIllustration() {
  return (
    <div className="relative h-48 w-48 flex items-center justify-center">
      <div
        className="absolute h-36 w-28 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur"
        style={{ transform: "translateX(-6px) translateY(6px) rotate(-3deg)" }}
      />
      <div className="wt-swipe-card relative h-36 w-28 rounded-2xl border border-echo/40 bg-gradient-to-br from-echo/25 via-zinc-900 to-echo-fuchsia/20 overflow-hidden shadow-xl">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-base font-bold text-white">
          A
        </div>
        <div className="absolute inset-x-0 bottom-0 p-2">
          <div className="h-1.5 w-16 bg-white/70 rounded-full mb-1.5 mx-auto" />
          <div className="h-1 w-12 bg-white/40 rounded-full mx-auto" />
        </div>
      </div>
      <div className="wt-heart absolute top-12 right-4">
        <Heart className="w-9 h-9 text-echo" fill="#7c5cff" />
      </div>
    </div>
  );
}

function StepMatchIllustration() {
  return (
    <div className="relative h-48 w-48 flex items-center justify-center">
      <div className="wt-avatar-left absolute h-16 w-16 rounded-full border-4 border-white/20 bg-gradient-to-br from-echo to-echo-bright flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-echo/40">
        💆
      </div>
      <div className="wt-avatar-right absolute h-16 w-16 rounded-full border-4 border-white/20 bg-gradient-to-br from-echo-fuchsia to-fuchsia-400 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-echo-fuchsia/40">
        🎸
      </div>
      <div className="wt-spark absolute">
        <div className="text-5xl drop-shadow-[0_0_20px_rgba(228,85,255,0.8)]">💜</div>
      </div>
      <div className="wt-spark absolute top-4 left-8" style={{ animationDelay: "0.1s" }}>
        <span className="text-2xl">✨</span>
      </div>
      <div className="wt-spark absolute bottom-6 right-8" style={{ animationDelay: "0.2s" }}>
        <span className="text-2xl">✨</span>
      </div>
    </div>
  );
}

function StepChatIllustration({
  hi,
  swap,
  meet,
}: {
  hi: string;
  swap: string;
  meet: string;
}) {
  return (
    <div className="relative h-48 w-56 flex flex-col items-center justify-center gap-2 px-3">
      <div className="wt-bubble-1 self-start max-w-[180px] rounded-2xl rounded-bl-md bg-zinc-800 px-3.5 py-2 shadow">
        <p className="text-xs text-white">{hi}</p>
      </div>
      <div className="wt-bubble-2 self-end max-w-[180px] rounded-2xl rounded-br-md bg-echo px-3.5 py-2 shadow-lg shadow-echo/30">
        <p className="text-xs text-white">{swap}</p>
      </div>
      <div className="wt-bubble-3 self-start max-w-[180px] rounded-2xl rounded-bl-md bg-zinc-800 px-3.5 py-2 shadow">
        <p className="text-xs text-white">{meet}</p>
      </div>
    </div>
  );
}

// ============================================================
//  Сам walkthrough — со свайпом, карусель в стиле iOS
// ============================================================

type Step = {
  illustration: ReactNode;
  title: string;
  description: string;
};

const SWIPE_THRESHOLD = 50; // px

export function Walkthrough({
  steps,
  onDone,
  doneLabel,
  nextLabel,
  skipLabel,
}: {
  steps: Step[];
  onDone: () => void;
  doneLabel: string;
  nextLabel: string;
  skipLabel: string;
}) {
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(0);
  const [animating, setAnimating] = useState(true);
  const isLast = step === steps.length - 1;

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; dir: "unknown" | "h" | "v" } | null>(null);

  function goNext() {
    if (isLast) onDone();
    else setStep((s) => s + 1);
  }
  function goPrev() {
    if (step > 0) setStep((s) => s - 1);
  }

  // Свайпы
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      dir: "unknown",
    };
    setAnimating(false);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (touchStart.current.dir === "unknown") {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        touchStart.current.dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
    }
    if (touchStart.current.dir === "h") {
      // Сопротивление по краям — нельзя уйти за границу
      let clamped = dx;
      if (step === 0 && dx > 0) clamped = dx * 0.4;
      if (isLast && dx < 0) clamped = dx * 0.4;
      setDrag(clamped);
    }
  }

  function onTouchEnd() {
    if (!touchStart.current) {
      setAnimating(true);
      return;
    }
    const wasH = touchStart.current.dir === "h";
    const finalDrag = drag;
    touchStart.current = null;
    setAnimating(true);
    if (wasH) {
      if (finalDrag < -SWIPE_THRESHOLD && !isLast) {
        setStep((s) => s + 1);
      } else if (finalDrag > SWIPE_THRESHOLD && step > 0) {
        setStep((s) => s - 1);
      }
    }
    setDrag(0);
  }

  // Поддержка клавиатуры (десктоп)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onDone();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isLast]);

  return (
    <div
      ref={containerRef}
      className="relative z-10 w-full max-w-md flex flex-col items-center min-h-[calc(100dvh-100px)] py-6 select-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      {/* Skip */}
      <div className="self-end mb-2 h-8">
        {!isLast && (
          <button
            onClick={onDone}
            className="text-sm text-zinc-500 hover:text-white transition-colors px-2 py-1"
          >
            {skipLabel}
          </button>
        )}
      </div>

      {/* Прогресс */}
      <div className="flex gap-2 mb-10">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step
                ? "bg-echo w-8 glow-echo"
                : i < step
                ? "bg-echo/40 w-4 hover:w-6"
                : "bg-white/15 w-4 hover:bg-white/30"
            }`}
            aria-label={`step ${i + 1}`}
          />
        ))}
      </div>

      {/* Карусель шагов */}
      <div className="flex-1 w-full overflow-hidden">
        <div
          className="flex h-full"
          style={{
            width: `${steps.length * 100}%`,
            transform: `translateX(calc(${(-step * 100) / steps.length}% + ${drag}px))`,
            transition: animating
              ? "transform 380ms cubic-bezier(0.22, 0.61, 0.36, 1)"
              : "none",
          }}
        >
          {steps.map((s, i) => {
            // Параллакс-эффект: соседние шаги чуть смещаются и тускнеют
            const distance = Math.abs(i - step);
            const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.15;
            const scale = distance === 0 ? 1 : 0.95;
            return (
              <div
                key={i}
                style={{
                  width: `${100 / steps.length}%`,
                  opacity,
                  transform: `scale(${scale})`,
                  transition: animating
                    ? "opacity 380ms ease, transform 380ms ease"
                    : "none",
                }}
                className="shrink-0 flex flex-col items-center justify-center px-6 text-center"
              >
                <div className="mb-10">{s.illustration}</div>
                <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  {s.title}
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Кнопка вперёд / готово */}
      <div className="w-full max-w-xs mt-8 px-4">
        <button
          onClick={goNext}
          className="w-full bg-echo text-white hover:bg-echo-bright rounded-full h-12 font-semibold transition-all glow-echo active:scale-95"
        >
          {isLast ? doneLabel : nextLabel}
        </button>
      </div>
    </div>
  );
}

// ============================================================
//  Готовый набор шагов с переводом
// ============================================================

export function useWalkthroughSteps(): Step[] {
  const t = useT();
  return [
    {
      illustration: <StepUploadIllustration />,
      title: t.walkthrough.step1Title,
      description: t.walkthrough.step1Text,
    },
    {
      illustration: <StepSwipeIllustration />,
      title: t.walkthrough.step2Title,
      description: t.walkthrough.step2Text,
    },
    {
      illustration: <StepMatchIllustration />,
      title: t.walkthrough.step3Title,
      description: t.walkthrough.step3Text,
    },
    {
      illustration: (
        <StepChatIllustration
          hi={t.walkthrough.chatHi}
          swap={t.walkthrough.chatSwap}
          meet={t.walkthrough.chatMeet}
        />
      ),
      title: t.walkthrough.step4Title,
      description: t.walkthrough.step4Text,
    },
  ];
}

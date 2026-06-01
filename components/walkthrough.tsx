"use client";

import { useState, type ReactNode } from "react";
import { ArrowUp, Heart, Play, MessageCircle } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

// ============================================================
//  Анимированные иллюстрации — все на чистом CSS из globals.css
// ============================================================

function StepUploadIllustration() {
  return (
    <div className="relative h-48 w-48 flex items-center justify-center">
      {/* Карточка-видео */}
      <div className="wt-upload-card relative h-32 w-24 rounded-2xl border border-echo/40 bg-gradient-to-br from-echo/30 via-zinc-900 to-echo-fuchsia/20 overflow-hidden shadow-2xl shadow-echo/30">
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="w-8 h-8 text-white/70" fill="white" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="h-1 w-12 bg-white/60 rounded-full mb-1" />
          <div className="h-1 w-8 bg-white/40 rounded-full" />
        </div>
      </div>
      {/* Стрелка вверх */}
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
      {/* Карточка профиля сзади */}
      <div className="absolute h-36 w-28 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur" style={{ transform: "translateX(-6px) translateY(6px) rotate(-3deg)" }} />
      {/* Свайпающаяся карточка спереди */}
      <div className="wt-swipe-card relative h-36 w-28 rounded-2xl border border-echo/40 bg-gradient-to-br from-echo/25 via-zinc-900 to-echo-fuchsia/20 overflow-hidden shadow-xl">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-base font-bold text-white">
          A
        </div>
        <div className="absolute inset-x-0 bottom-0 p-2">
          <div className="h-1.5 w-16 bg-white/70 rounded-full mb-1.5 mx-auto" />
          <div className="h-1 w-12 bg-white/40 rounded-full mx-auto" />
        </div>
      </div>
      {/* Сердечко при «лайке» */}
      <div className="wt-heart absolute top-12 right-4">
        <Heart className="w-9 h-9 text-echo" fill="#7c5cff" />
      </div>
    </div>
  );
}

function StepMatchIllustration() {
  return (
    <div className="relative h-48 w-48 flex items-center justify-center">
      {/* Левый аватар */}
      <div className="wt-avatar-left absolute h-16 w-16 rounded-full border-4 border-white/20 bg-gradient-to-br from-echo to-echo-bright flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-echo/40">
        💆
      </div>
      {/* Правый аватар */}
      <div className="wt-avatar-right absolute h-16 w-16 rounded-full border-4 border-white/20 bg-gradient-to-br from-echo-fuchsia to-fuchsia-400 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-echo-fuchsia/40">
        🎸
      </div>
      {/* Сердце по центру в момент удара */}
      <div className="wt-spark absolute">
        <div className="text-5xl drop-shadow-[0_0_20px_rgba(228,85,255,0.8)]">💜</div>
      </div>
      {/* Декоративные искры */}
      <div className="wt-spark absolute top-4 left-8" style={{ animationDelay: "0.1s" }}>
        <span className="text-2xl">✨</span>
      </div>
      <div className="wt-spark absolute bottom-6 right-8" style={{ animationDelay: "0.2s" }}>
        <span className="text-2xl">✨</span>
      </div>
    </div>
  );
}

function StepChatIllustration() {
  return (
    <div className="relative h-48 w-56 flex flex-col items-center justify-center gap-2 px-3">
      {/* Bubble 1 — от собеседника, слева */}
      <div className="wt-bubble-1 self-start max-w-[180px] rounded-2xl rounded-bl-md bg-zinc-800 px-3.5 py-2 shadow">
        <p className="text-xs text-white">👋 Привет!</p>
      </div>
      {/* Bubble 2 — от тебя, справа */}
      <div className="wt-bubble-2 self-end max-w-[180px] rounded-2xl rounded-br-md bg-echo px-3.5 py-2 shadow-lg shadow-echo/30">
        <p className="text-xs text-white">Хочешь меняться? 💜</p>
      </div>
      {/* Bubble 3 — от собеседника */}
      <div className="wt-bubble-3 self-start max-w-[180px] rounded-2xl rounded-bl-md bg-zinc-800 px-3.5 py-2 shadow">
        <p className="text-xs text-white">Давай в субботу ✨</p>
      </div>
    </div>
  );
}

// ============================================================
//  Сам walkthrough
// ============================================================

type Step = {
  illustration: ReactNode;
  title: string;
  description: string;
};

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
  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div className="relative z-10 w-full max-w-md flex flex-col items-center min-h-[calc(100dvh-100px)] py-6">
      {/* Кнопка "пропустить" сверху справа */}
      <div className="self-end mb-2">
        {!isLast && (
          <button
            onClick={onDone}
            className="text-sm text-zinc-500 hover:text-white transition-colors px-2 py-1"
          >
            {skipLabel}
          </button>
        )}
      </div>

      {/* Точки прогресса */}
      <div className="flex gap-2 mb-12">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step
                ? "bg-echo w-8 glow-echo"
                : i < step
                ? "bg-echo/40 w-4"
                : "bg-white/15 w-4"
            }`}
          />
        ))}
      </div>

      {/* Иллюстрация — пересоздаётся при смене шага через key, чтобы CSS-анимация перезапускалась */}
      <div key={step} className="mb-10 animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-500">
        {current.illustration}
      </div>

      {/* Заголовок + описание */}
      <div key={`text-${step}`} className="text-center px-4 mb-12 max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "100ms" }}>
        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
          {current.title}
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          {current.description}
        </p>
      </div>

      {/* Кнопка вперёд / готово */}
      <div className="w-full max-w-xs mt-auto px-4">
        <button
          onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}
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
      illustration: <StepChatIllustration />,
      title: t.walkthrough.step4Title,
      description: t.walkthrough.step4Text,
    },
  ];
}

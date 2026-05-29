"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/language-switcher";

type Step = "intro" | "ready" | "recording" | "review" | "submitting" | "done" | "error";

const RECORD_SECONDS = 8;

export function VerifyClient({
  userId,
  previousRejection,
}: {
  userId: string;
  previousRejection: string | null;
}) {
  const router = useRouter();
  const t = useT();
  const supabase = useRef(createClient()).current;

  // Подсказки во время записи (по 2 секунды каждая)
  const PROMPTS = [t.verify.prompt0, t.verify.prompt1, t.verify.prompt2, t.verify.prompt3];

  const [step, setStep] = useState<Step>("intro");
  const [error, setError] = useState<string>("");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const [promptIndex, setPromptIndex] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  // Освобождаем камеру и blob URL при уходе
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Привязываем поток к <video> после того как элемент появится в DOM.
  // (Раньше делали это в requestCamera, но <video> рендерится только
  // когда step становится "ready" — ref был ещё пуст в момент вызова.)
  useEffect(() => {
    const v = liveVideoRef.current;
    const s = streamRef.current;
    if (!v || !s) return;
    if (v.srcObject !== s) {
      v.srcObject = s;
      v.play().catch(() => {});
    }
  }, [step]);

  async function requestCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setStep("ready");
      // srcObject цепляется в useEffect выше (после маунта video)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes("Permission") || msg.includes("denied")
          ? t.verify.cameraDenied
          : t.verify.cameraError.replace("{msg}", msg)
      );
      setStep("error");
    }
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];

    // Подбираем поддерживаемый формат
    const mimeTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
    const mimeType = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
      setRecordedBlob(blob);
      // Старый URL (если перезаписывали) — освобождаем
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
      setReviewUrl(URL.createObjectURL(blob));
      setStep("review");
    };
    recorder.start();
    recorderRef.current = recorder;
    setStep("recording");
    setSecondsLeft(RECORD_SECONDS);
    setPromptIndex(0);
  }

  // Таймер обратного отсчёта + переключение подсказок
  useEffect(() => {
    if (step !== "recording") return;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, Math.ceil(RECORD_SECONDS - elapsed));
      setSecondsLeft(remaining);
      const idx = Math.min(PROMPTS.length - 1, Math.floor(elapsed / 2));
      setPromptIndex(idx);
      if (remaining <= 0) {
        clearInterval(interval);
        recorderRef.current?.stop();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [step]);

  function restart() {
    setRecordedBlob(null);
    if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    setReviewUrl(null);
    setStep("ready");
  }

  async function submit() {
    if (!recordedBlob) return;
    setStep("submitting");

    const ext = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("verifications")
      .upload(path, recordedBlob, { contentType: recordedBlob.type });

    if (uploadError) {
      setError(`Загрузка: ${uploadError.message}`);
      setStep("error");
      return;
    }

    const { error: insertError } = await supabase
      .from("verifications")
      .insert({ user_id: userId, storage_path: path });

    if (insertError) {
      setError(`Запись заявки: ${insertError.message}`);
      setStep("error");
      return;
    }

    // Освобождаем камеру
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setStep("done");
    setTimeout(() => router.replace("/profile"), 2000);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 py-8">
      <div className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 h-[320px] w-[320px] rounded-full bg-echo opacity-12 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link href="/profile" className="text-zinc-400 hover:text-white text-sm">{t.nav.back}</Link>
          <h1 className="text-xl font-bold lowercase">{t.verify.title}</h1>
          <LanguageSwitcher />
        </div>

        {step === "intro" && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <p className="text-5xl mb-2">🎥</p>
              <h2 className="text-2xl font-semibold mb-2">{t.verify.introTitle}</h2>
              <p className="text-zinc-400">{t.verify.introText}</p>
            </div>

            {previousRejection !== null && (
              <div className="rounded-2xl bg-red-950/40 border border-red-900 p-4 text-sm">
                <p className="text-red-300 font-semibold mb-1">{t.verify.prevRejected}</p>
                <p className="text-red-200">{previousRejection || t.verify.noReason}</p>
              </div>
            )}

            <ul className="text-sm text-zinc-400 space-y-2">
              <li>• {t.verify.tip1}</li>
              <li>• {t.verify.tip2}</li>
              <li>• {t.verify.tip3}</li>
            </ul>

            <Button
              onClick={requestCamera}
              className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full h-12 font-medium"
            >
              {t.verify.enableCamera}
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4 text-center py-8">
            <p className="text-4xl">⚠</p>
            <p className="text-red-400">{error}</p>
            <Button onClick={() => setStep("intro")} variant="outline" className="glass border-white/15 text-white hover:bg-white/10 hover:text-white rounded-full">
              {t.verify.tryAgain}
            </Button>
          </div>
        )}

        {(step === "ready" || step === "recording") && (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-zinc-950 aspect-[9/16] border border-white/10">
              <video
                ref={liveVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {step === "recording" && (
                <>
                  <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    REC
                  </div>
                  <div className="absolute top-4 right-4 bg-black/60 text-white text-sm font-mono px-2 py-1 rounded-full">
                    {secondsLeft}s
                  </div>
                  <div className="absolute bottom-6 left-0 right-0 text-center">
                    <p className="inline-block bg-black/70 text-white text-lg font-semibold px-4 py-2 rounded-full">
                      {PROMPTS[promptIndex]}
                    </p>
                  </div>
                </>
              )}
            </div>

            {step === "ready" && (
              <Button
                onClick={startRecording}
                className="w-full bg-red-500 text-white hover:bg-red-600 rounded-full h-12 font-medium"
              >
                {t.verify.record}
              </Button>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm text-center">{t.verify.reviewPrompt}</p>
            <div className="rounded-3xl overflow-hidden bg-zinc-950 aspect-[9/16] border border-white/10">
              <video
                key={reviewUrl ?? "empty"}
                src={reviewUrl ?? undefined}
                controls
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={restart}
                variant="outline"
                className="glass border-white/15 text-white hover:bg-white/10 hover:text-white rounded-full"
              >
                {t.verify.retake}
              </Button>
              <Button onClick={submit} className="bg-echo text-white hover:bg-echo-bright glow-echo rounded-full">
                {t.verify.submit}
              </Button>
            </div>
          </div>
        )}

        {step === "submitting" && (
          <div className="text-center py-12">
            <p className="text-zinc-400">{t.verify.submitting}</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-12 space-y-2">
            <p className="text-5xl">✓</p>
            <h2 className="text-2xl font-bold">{t.verify.doneTitle}</h2>
            <p className="text-zinc-400">{t.verify.doneText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

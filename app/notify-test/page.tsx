"use client";

// Страница для диагностики писем. Просто открой /notify-test
// будучи залогиненным и нажми большую кнопку — увидишь полный отчёт.

import { useState } from "react";

export default function NotifyTestPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/notify/test", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : String(e) });
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-32">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">📧 Диагностика писем</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Нажми кнопку — отчёт покажет почему не приходят письма о мэтчах/сообщениях/отзывах.
        </p>
        <button
          onClick={run}
          disabled={busy}
          className="w-full bg-echo text-white hover:bg-echo-bright rounded-full h-12 font-semibold disabled:opacity-50 mb-6"
        >
          {busy ? "Проверяю..." : "Запустить проверку"}
        </button>
        {result !== null && (
          <pre className="bg-zinc-900 border border-white/10 rounded-2xl p-4 text-xs overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
        <p className="text-zinc-500 text-xs mt-6">
          Эту страницу можно удалить когда всё заработает.
        </p>
      </div>
    </div>
  );
}

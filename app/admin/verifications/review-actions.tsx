"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ReviewActions({ verificationId }: { verificationId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function approve() {
    setBusy(true);
    setError("");
    const { error } = await supabase
      .from("verifications")
      .update({ status: "approved" })
      .eq("id", verificationId);
    if (error) {
      setError(error.message);
      setBusy(false);
    } else {
      router.refresh();
    }
  }

  async function reject() {
    setBusy(true);
    setError("");
    const { error } = await supabase
      .from("verifications")
      .update({
        status: "rejected",
        rejection_reason: reason.trim() || "Не подходит",
      })
      .eq("id", verificationId);
    if (error) {
      setError(error.message);
      setBusy(false);
    } else {
      router.refresh();
    }
  }

  if (rejecting) {
    return (
      <div className="space-y-3">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Причина отклонения (юзер увидит)"
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm placeholder:text-zinc-500"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => {
              setRejecting(false);
              setReason("");
            }}
            variant="outline"
            className="bg-transparent border-zinc-700 text-white hover:bg-zinc-900 hover:text-white"
            disabled={busy}
          >
            Отмена
          </Button>
          <Button
            onClick={reject}
            disabled={busy}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {busy ? "..." : "Отклонить"}
          </Button>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => setRejecting(true)}
          variant="outline"
          className="bg-transparent border-zinc-700 text-white hover:bg-zinc-900 hover:text-white"
          disabled={busy}
        >
          ✗ Отклонить
        </Button>
        <Button
          onClick={approve}
          disabled={busy}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          {busy ? "..." : "✓ Верифицировать"}
        </Button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

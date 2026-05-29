"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

export function ReviewActions({ verificationId }: { verificationId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
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
        rejection_reason: reason.trim() || t.admin.defaultReason,
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
          placeholder={t.admin.reasonPlaceholder}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white text-sm placeholder:text-zinc-500"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => {
              setRejecting(false);
              setReason("");
            }}
            variant="outline"
            className="glass border-white/15 text-white hover:bg-white/10 hover:text-white rounded-full"
            disabled={busy}
          >
            {t.admin.cancel}
          </Button>
          <Button
            onClick={reject}
            disabled={busy}
            className="bg-red-600 text-white hover:bg-red-700 rounded-full"
          >
            {busy ? "..." : t.admin.rejectConfirm}
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
          className="glass border-white/15 text-white hover:bg-white/10 hover:text-white rounded-full"
          disabled={busy}
        >
          {t.admin.reject}
        </Button>
        <Button
          onClick={approve}
          disabled={busy}
          className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-full"
        >
          {busy ? "..." : t.admin.approve}
        </Button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

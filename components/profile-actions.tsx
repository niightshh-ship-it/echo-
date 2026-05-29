"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

export function ProfileActions({ targetId }: { targetId: string }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function report() {
    const reason = window.prompt(t.safety.reportPrompt) ?? "";
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_id: targetId,
        reason: reason.trim() || null,
      });
    }
    setBusy(false);
    alert(t.safety.reportSent);
  }

  async function block() {
    if (!confirm(t.safety.blockConfirm)) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: targetId });
    }
    router.replace("/search");
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={report}
        disabled={busy}
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
      >
        <Flag className="w-3.5 h-3.5" /> {t.safety.report}
      </button>
      <button
        onClick={block}
        disabled={busy}
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400"
      >
        <Ban className="w-3.5 h-3.5" /> {t.safety.block}
      </button>
    </div>
  );
}

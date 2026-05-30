"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/provider";

export function DeleteVideoButton({ videoId }: { videoId: string }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm(t.profile.deleteConfirm)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/video/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      if (res.ok) {
        toast.success(t.profile.deleted);
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      toast.error(`${t.profile.deleteError}: ${data.error ?? res.status}`);
    } catch (e) {
      toast.error(`${t.profile.deleteError}: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="absolute top-2 right-2 z-10 rounded-full bg-black/60 hover:bg-red-600 p-1.5 text-white transition-colors disabled:opacity-50"
      aria-label="delete"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

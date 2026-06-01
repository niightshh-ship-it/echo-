"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/provider";
import { useBackButtonClose } from "@/lib/use-back-button-close";

export function EditDescriptionButton({
  videoId,
  initialDescription,
  className = "",
}: {
  videoId: string;
  initialDescription: string | null;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(initialDescription ?? "");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.editVideo.editDescription}
        className={`rounded-full bg-black/60 hover:bg-black/80 backdrop-blur p-1.5 text-white transition-colors ${className}`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {open && (
        <EditSheet
          videoId={videoId}
          description={description}
          onChange={setDescription}
          onClose={() => setOpen(false)}
          onSaved={(saved) => {
            setDescription(saved);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function EditSheet({
  videoId,
  description,
  onChange,
  onClose,
  onSaved,
}: {
  videoId: string;
  description: string;
  onChange: (s: string) => void;
  onClose: () => void;
  onSaved: (s: string) => void;
}) {
  const t = useT();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useBackButtonClose(true, onClose);

  async function save() {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/video/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, description: description.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(`${t.editVideo.saveError}: ${data.error ?? res.status}`);
      return;
    }
    toast.success(t.editVideo.saved);
    onSaved(description.trim());
    router.refresh();
  }

  if (!mounted) return null;

  const charsLeft = 500 - description.length;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[61] sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg w-full bg-zinc-950 border-t border-x border-white/10 rounded-t-3xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-250">
        <div className="pt-3 pb-2 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="px-5 pb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white text-lg leading-tight">
            {t.editVideo.editDescription}
          </h3>
          <button
            onClick={onClose}
            aria-label="close"
            className="text-zinc-400 hover:text-white p-1 -mt-1 -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 flex-1 overflow-y-auto">
          <textarea
            value={description}
            onChange={(e) => onChange(e.target.value.slice(0, 500))}
            placeholder={t.upload.descriptionPlaceholder}
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-echo/50"
            autoFocus
          />
          <p
            className={`text-xs mt-2 text-right ${
              charsLeft < 30 ? "text-amber-400" : "text-zinc-500"
            }`}
          >
            {charsLeft}
          </p>
        </div>

        <div
          className="px-5 pt-2 pb-4 border-t border-white/5 bg-zinc-950"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
        >
          <button
            onClick={save}
            disabled={busy}
            className="w-full bg-echo text-white hover:bg-echo-bright rounded-full h-12 font-semibold disabled:opacity-50 transition-colors glow-echo"
          >
            {busy ? "..." : t.editVideo.save}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

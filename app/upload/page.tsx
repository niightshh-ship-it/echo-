"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n/provider";

type Kind = "skill" | "random";

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [kind, setKind] = useState<Kind>("skill");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("skills")
        .eq("id", user.id)
        .single();
      if (!profile) {
        router.replace("/onboarding");
        return;
      }
      setUserId(user.id);
      setSkills(profile.skills ?? []);
      if (profile.skills?.length > 0) setSelectedSkill(profile.skills[0]);
      setChecking(false);
    })();
  }, [router, supabase]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  const canPublish =
    !!file && !!userId && (kind === "random" || !!selectedSkill);

  async function handleUpload() {
    if (!canPublish || !file || !userId) return;
    setUploading(true);
    setError("");

    const ext = file.name.split(".").pop() || "mp4";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("videos").insert({
      user_id: userId,
      skill: kind === "skill" ? selectedSkill : null,
      storage_path: path,
      is_random: kind === "random",
    });

    if (insertError) {
      setError(insertError.message);
      setUploading(false);
      return;
    }

    router.replace("/profile");
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        ...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black text-white px-4 pt-12 pb-28">
      <div className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 h-[320px] w-[320px] rounded-full bg-echo opacity-12 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link href="/profile" className="text-zinc-400 hover:text-white text-sm">{t.nav.back}</Link>
          <h1 className="text-2xl font-bold lowercase">{t.upload.title}</h1>
        </div>

        <div className="space-y-6">
          {/* Тип видео */}
          <div>
            <Label className="text-zinc-300">{t.upload.videoType}</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setKind("skill")}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  kind === "skill"
                    ? "bg-echo/15 border-echo/60"
                    : "bg-white/5 border-white/10 hover:bg-white/[0.08]"
                }`}
              >
                <p className="font-semibold mb-1">🎯 {t.upload.skillType}</p>
                <p className="text-xs text-zinc-400 leading-tight">{t.upload.skillTypeHint}</p>
              </button>
              <button
                type="button"
                onClick={() => setKind("random")}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  kind === "random"
                    ? "bg-echo/15 border-echo/60"
                    : "bg-white/5 border-white/10 hover:bg-white/[0.08]"
                }`}
              >
                <p className="font-semibold mb-1">✨ {t.upload.randomType}</p>
                <p className="text-xs text-zinc-400 leading-tight">{t.upload.randomTypeHint}</p>
              </button>
            </div>
          </div>

          {kind === "skill" && (
            <div>
              <Label className="text-zinc-300">{t.upload.skillLabel}</Label>
              <Select value={selectedSkill} onValueChange={(v) => setSelectedSkill(v ?? "")}>
                <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/10 text-white">
                  {skills.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-zinc-300">{t.upload.fileLabel}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="mt-2 w-full glass border-white/10 text-white hover:bg-white/10 hover:text-white h-12 rounded-xl"
            >
              {file ? file.name : t.upload.chooseVideo}
            </Button>
            <p className="text-xs text-zinc-500 mt-2">{t.upload.fileHint}</p>
          </div>

          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950">
              <video src={previewUrl} controls className="w-full max-h-96 object-contain" />
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!canPublish || uploading}
            className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full h-12 font-medium"
          >
            {uploading ? t.upload.uploading : t.upload.publish}
          </Button>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}

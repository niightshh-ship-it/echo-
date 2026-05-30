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
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/categories";

const OTHER = "__other__";

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [categoryKey, setCategoryKey] = useState<string>(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // Получаем профиль (для списка навыков и проверки авторизации)
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
      setSkills(profile.skills);
      if (profile.skills.length > 0) setSelectedSkill(profile.skills[0]);
      setChecking(false);
    })();
  }, [router, supabase]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function handleUpload() {
    if (!file || !userId || !selectedSkill) return;
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

    const category =
      categoryKey === OTHER ? customCategory.trim() || null : categoryKey;

    const { error: insertError } = await supabase.from("videos").insert({
      user_id: userId,
      skill: selectedSkill,
      storage_path: path,
      category,
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black text-white px-4 py-12">
      <div className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 h-[320px] w-[320px] rounded-full bg-echo opacity-12 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link href="/profile" className="text-zinc-400 hover:text-white text-sm">{t.nav.back}</Link>
          <h1 className="text-2xl font-bold lowercase">{t.upload.title}</h1>
        </div>

        <div className="space-y-6">
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

          <div>
            <Label className="text-zinc-300">{t.upload.category}</Label>
            <Select value={categoryKey} onValueChange={(v) => setCategoryKey(v ?? CATEGORIES[0])}>
              <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-white">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_EMOJI[c]} {t.categories[c]}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER}>✨ {t.categories.other}</SelectItem>
              </SelectContent>
            </Select>
            {categoryKey === OTHER && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={t.upload.customCategoryPlaceholder}
                className="mt-2 w-full h-11 px-3 bg-white/5 border border-white/10 text-white rounded-xl placeholder:text-zinc-500"
              />
            )}
          </div>

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
              <video
                src={previewUrl}
                controls
                className="w-full max-h-96 object-contain"
              />
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || !selectedSkill || uploading}
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

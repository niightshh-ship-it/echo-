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

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("");
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

    const { error: insertError } = await supabase.from("videos").insert({
      user_id: userId,
      skill: selectedSkill,
      storage_path: path,
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link href="/profile" className="text-zinc-400 hover:text-white">← назад</Link>
          <h1 className="text-2xl font-bold lowercase">загрузить видео</h1>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-zinc-300">К какому навыку?</Label>
            <Select value={selectedSkill} onValueChange={(v) => setSelectedSkill(v ?? "")}>
              <SelectTrigger className="mt-2 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                {skills.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-zinc-300">Файл</Label>
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
              className="mt-2 w-full bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hover:text-white"
            >
              {file ? file.name : "Выбрать видео"}
            </Button>
            <p className="text-xs text-zinc-500 mt-2">
              Вертикальное видео, 5-30 секунд, до ~50 MB
            </p>
          </div>

          {previewUrl && (
            <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
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
            className="w-full bg-white text-black hover:bg-zinc-200"
          >
            {uploading ? "Загружаю..." : "Опубликовать"}
          </Button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}

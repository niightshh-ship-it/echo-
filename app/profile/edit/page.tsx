"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { useT } from "@/lib/i18n/provider";
import { AmbientBg } from "@/components/ambient-bg";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState(["", "", ""]);
  const [wants, setWants] = useState(["", "", ""]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!p) {
        router.replace("/onboarding");
        return;
      }
      setUserId(user.id);
      setName(p.name ?? "");
      setCity(p.city ?? "");
      setBio(p.bio ?? "");
      setSkills([...(p.skills ?? []), "", "", ""].slice(0, 3));
      setWants([...(p.wants ?? []), "", "", ""].slice(0, 3));
      setAvatarUrl(p.avatar_url ?? null);
      setChecking(false);
    })();
  }, [router, supabase]);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/avatar", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setError(`Фото: ${data.error ?? res.statusText}`);
      setUploadingAvatar(false);
      return;
    }
    setAvatarUrl(data.url);
    setUploadingAvatar(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError("");
    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        city,
        bio: bio.trim() || null,
        skills: skills.map((s) => s.trim()).filter(Boolean),
        wants: wants.map((s) => s.trim()).filter(Boolean),
        avatar_url: avatarUrl,
      })
      .eq("id", userId);
    if (updErr) {
      setError(updErr.message);
      setSaving(false);
    } else {
      router.replace("/profile");
      router.refresh();
    }
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">...</div>;
  }

  const inputCls = "bg-white/5 border-white/10 text-white rounded-xl";

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 py-12">
      <AmbientBg variant="profile" />

      <div className="relative z-10 w-full max-w-md page-fade-in">
        <div className="flex items-center justify-between mb-8">
          <Link href="/profile" className="text-zinc-400 hover:text-white text-sm">{t.nav.back}</Link>
          <h1 className="text-2xl font-bold lowercase">{t.profileEdit.title}</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Аватар */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-24 w-24 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center hover:border-echo/50 transition-colors"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl">📷</span>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-echo-bright hover:underline"
            >
              {uploadingAvatar ? t.profileEdit.saving : t.profileEdit.changePhoto}
            </button>
          </div>

          <div>
            <Label className="text-zinc-300">{t.onboarding.nameLabel}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className={`mt-2 h-12 ${inputCls}`} required />
          </div>

          <div>
            <Label className="text-zinc-300">{t.onboarding.cityLabel}</Label>
            <div className="mt-2">
              <CityAutocomplete
                value={city}
                onChange={setCity}
                placeholder={t.onboarding.cityPlaceholder}
                className={`h-12 ${inputCls}`}
              />
            </div>
          </div>

          <div>
            <Label className="text-zinc-300">{t.profileEdit.bio}</Label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t.profileEdit.bioPlaceholder}
              rows={3}
              maxLength={300}
              className={`mt-2 w-full p-3 text-sm ${inputCls} resize-none`}
            />
          </div>

          <div>
            <Label className="text-zinc-300">{t.onboarding.skillsLabel}</Label>
            <p className="text-xs text-zinc-500 mt-1 mb-2">{t.onboarding.skillsHint}</p>
            <div className="space-y-2">
              {skills.map((s, i) => (
                <Input key={i} value={s} onChange={(e) => {
                  const next = [...skills]; next[i] = e.target.value; setSkills(next);
                }} className={`h-11 ${inputCls}`} />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-zinc-300">{t.profileEdit.wants}</Label>
            <p className="text-xs text-zinc-500 mt-1 mb-2">{t.profileEdit.wantsHint}</p>
            <div className="space-y-2">
              {wants.map((s, i) => (
                <Input key={i} value={s} onChange={(e) => {
                  const next = [...wants]; next[i] = e.target.value; setWants(next);
                }} className={`h-11 ${inputCls}`} />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/profile" className="flex-1">
              <Button type="button" variant="outline" className="w-full glass border-white/15 text-white hover:bg-white/10 hover:text-white rounded-full h-12">
                {t.profileEdit.cancel}
              </Button>
            </Link>
            <Button type="submit" disabled={saving || !name || !city}
              className="flex-1 bg-echo text-white hover:bg-echo-bright glow-echo rounded-full h-12 font-medium">
              {saving ? t.profileEdit.saving : t.profileEdit.save}
            </Button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </div>
    </div>
  );
}

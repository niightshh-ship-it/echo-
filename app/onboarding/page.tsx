"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DUTCH_CITIES } from "@/lib/cities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [skills, setSkills] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // Защита: если юзер не залогинен — на /sign-in
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/sign-in");
      else setChecking(false);
    });
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/sign-in");
      return;
    }

    const cleanSkills = skills.map((s) => s.trim()).filter(Boolean);

    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      name: name.trim(),
      city,
      skills: cleanSkills,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
    } else {
      router.replace("/profile");
    }
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
        <h1 className="text-4xl font-bold tracking-tight lowercase mb-2">расскажи о себе</h1>
        <p className="text-zinc-400 mb-8">это увидят другие в Echo</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-zinc-300">Имя</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Александр"
              className="mt-2 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          <div>
            <Label className="text-zinc-300">Город</Label>
            <Select value={city} onValueChange={(v) => setCity(v ?? "")} required>
              <SelectTrigger className="mt-2 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="Выбери город" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                {DUTCH_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-zinc-300">Навыки (до 3)</Label>
            <p className="text-xs text-zinc-500 mt-1 mb-2">что ты умеешь и можешь предложить</p>
            <div className="space-y-2">
              {skills.map((skill, i) => (
                <Input
                  key={i}
                  value={skill}
                  onChange={(e) => {
                    const next = [...skills];
                    next[i] = e.target.value;
                    setSkills(next);
                  }}
                  placeholder={
                    i === 0 ? "напр. массаж" : i === 1 ? "напр. гид по Амстердаму" : "ещё навык (необязательно)"
                  }
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-white text-black hover:bg-zinc-200"
            disabled={saving || !name || !city || !skills.some((s) => s.trim())}
          >
            {saving ? "Сохраняю..." : "Готово"}
          </Button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AmbientBg } from "@/components/ambient-bg";
import { Walkthrough, useWalkthroughSteps } from "@/components/walkthrough";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [skills, setSkills] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  // После сохранения профиля показываем короткий walkthrough,
  // только потом редирект на /profile
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const walkthroughSteps = useWalkthroughSteps();

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
      // Профиль создан — показываем walkthrough перед редиректом
      setSaving(false);
      setShowWalkthrough(true);
    }
  }

  function finishWalkthrough() {
    router.replace("/profile");
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        ...
      </div>
    );
  }

  const placeholders = [t.onboarding.skill1, t.onboarding.skill2, t.onboarding.skill3];

  // После заполнения профиля — анимированный walkthrough
  if (showWalkthrough) {
    return (
      <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-black text-white px-4">
        <AmbientBg variant="onboarding" />
        <Walkthrough
          steps={walkthroughSteps}
          onDone={finishWalkthrough}
          doneLabel={t.walkthrough.done}
          nextLabel={t.walkthrough.next}
          skipLabel={t.walkthrough.skip}
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black text-white px-4 py-12">
      <AmbientBg variant="onboarding" />

      <div className="absolute top-5 right-5 z-20">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-md page-fade-in">
        <h1 className="text-4xl font-bold tracking-tighter lowercase mb-2">{t.onboarding.title}</h1>
        <p className="text-zinc-400 mb-8">{t.onboarding.subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-zinc-300">{t.onboarding.nameLabel}</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.onboarding.namePlaceholder}
              className="mt-2 bg-white/5 border-white/10 text-white h-12 rounded-xl"
            />
          </div>

          <div>
            <Label className="text-zinc-300">{t.onboarding.cityLabel}</Label>
            <div className="mt-2">
              <CityAutocomplete
                value={city}
                onChange={setCity}
                placeholder={t.onboarding.cityPlaceholder}
                className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
              />
            </div>
          </div>

          <div>
            <Label className="text-zinc-300">{t.onboarding.skillsLabel}</Label>
            <p className="text-xs text-zinc-500 mt-1 mb-2">{t.onboarding.skillsHint}</p>
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
                  placeholder={placeholders[i]}
                  className="bg-white/5 border-white/10 text-white h-11 rounded-xl"
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full h-12 font-medium"
            disabled={saving || !name || !city || !skills.some((s) => s.trim())}
          >
            {saving ? t.onboarding.saving : t.onboarding.done}
          </Button>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "./sign-out-button";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { dict: t } = await getDictionary();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const { data: videos } = await supabase
    .from("videos")
    .select("id, skill, storage_path, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const videosWithUrl = (videos ?? []).map((v) => ({
    ...v,
    url: supabase.storage.from("videos").getPublicUrl(v.storage_path).data.publicUrl,
  }));

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[300px] w-[500px] rounded-full bg-echo opacity-10 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-2xl font-bold lowercase text-gradient-echo">echo</Link>
          <div className="flex items-center gap-1">
            <Link href="/feed">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full">
                {t.nav.feed}
              </Button>
            </Link>
            <Link href="/matches">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full">
                {t.nav.matches}
              </Button>
            </Link>
            <LanguageSwitcher className="ml-1" />
            <SignOutButton />
          </div>
        </div>

        <div className="rounded-3xl glass border border-white/10 p-8 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl">{profile.name?.[0]?.toUpperCase() ?? "?"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold truncate">{profile.name}</h1>
                <Link href="/profile/edit">
                  <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full h-8 px-3 text-sm">
                    {t.profile.edit}
                  </Button>
                </Link>
              </div>
              <p className="text-zinc-400 text-sm">{profile.city}</p>
              {profile.verified && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {t.profile.verified}
                </p>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm text-zinc-300 mb-4 whitespace-pre-wrap">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {profile.skills.map((skill: string) => (
              <Badge key={skill} className="bg-white/10 text-white hover:bg-white/15 border-0">
                {skill}
              </Badge>
            ))}
          </div>

          {profile.wants?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-zinc-500 mb-1.5">{t.profile.lookingFor}</p>
              <div className="flex flex-wrap gap-2">
                {profile.wants.map((w: string) => (
                  <Badge key={w} className="bg-echo/20 text-echo-bright hover:bg-echo/30 border border-echo/30">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {!profile.verified && (
            <Link href="/verify" className="block mt-5">
              <Button className="w-full bg-echo text-white hover:bg-echo-bright glow-echo rounded-full h-11 font-medium">
                {t.profile.verifyCta}
              </Button>
            </Link>
          )}
        </div>

        {profile.is_admin && (
          <Link href="/admin/verifications" className="block mb-6">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 hover:bg-amber-500/15 transition-colors">
              <p className="text-amber-400 text-sm font-semibold">⚡ {t.profile.adminTitle}</p>
              <p className="text-amber-200/70 text-xs">{t.profile.adminSubtitle}</p>
            </div>
          </Link>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold lowercase">{t.profile.myVideos}</h2>
          <Link href="/upload">
            <Button className="bg-echo text-white hover:bg-echo-bright rounded-full">
              {t.profile.upload}
            </Button>
          </Link>
        </div>

        {videosWithUrl.length === 0 ? (
          <p className="text-zinc-500 text-sm py-8 text-center border border-dashed border-white/10 rounded-2xl">
            {t.profile.noVideos}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {videosWithUrl.map((v) => (
              <div key={v.id} className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950">
                <video src={v.url} controls className="w-full aspect-[9/16] object-cover" />
                <p className="text-xs text-zinc-400 px-3 py-2">{v.skill}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-zinc-600 mt-6 text-center">{user.email}</p>
      </div>
    </div>
  );
}

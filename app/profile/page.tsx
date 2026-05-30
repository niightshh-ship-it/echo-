import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Settings as SettingsIcon } from "lucide-react";
import { DeleteVideoButton } from "./delete-video-button";
import { VideoGrid } from "@/components/video-grid";
import { ShareButton } from "@/components/share-button";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { dict: t } = await getDictionary();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Параллелим — раньше шло друг за другом
  const [{ data: profile }, { data: videos }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("videos")
      .select("id, skill, storage_path, created_at, is_random, description, views_count")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!profile) redirect("/onboarding");

  const videosWithUrl = (videos ?? []).map((v) => ({
    id: v.id,
    url: supabase.storage.from("videos").getPublicUrl(v.storage_path).data.publicUrl,
    description: v.description ?? null,
    skill: v.skill ?? null,
    isRandom: !!v.is_random,
    viewsCount: v.views_count ?? 0,
  }));
  const skillVideos = videosWithUrl.filter((v) => !v.isRandom);
  const randomVideos = videosWithUrl.filter((v) => v.isRandom);
  const author = {
    id: user.id,
    name: profile.name,
    city: profile.city,
    avatar: profile.avatar_url ?? null,
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 pt-12 pb-28">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[300px] w-[500px] rounded-full bg-echo opacity-10 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md page-fade-in">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-2xl font-bold lowercase text-gradient-echo">echo</Link>
          <div className="flex items-center gap-1">
            <ShareButton
              url={`/u/${user.id}`}
              title={t.share.profileTitle.replace("{name}", profile.name)}
              text={t.share.profileText.replace("{name}", profile.name)}
              className="h-9 w-9 p-0 flex items-center justify-center"
            />
            <Link href="/search">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full h-9 w-9 p-0">
                <Search className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full h-9 w-9 p-0">
                <SettingsIcon className="w-5 h-5" />
              </Button>
            </Link>
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

        </div>

        {profile.is_admin && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link href="/admin/verifications">
              <div className="h-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 hover:bg-amber-500/15 transition-colors">
                <p className="text-amber-400 text-sm font-semibold">⚡ {t.profile.adminTitle}</p>
                <p className="text-amber-200/70 text-xs">{t.profile.adminSubtitle}</p>
              </div>
            </Link>
            <Link href="/admin/reports">
              <div className="h-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 hover:bg-amber-500/15 transition-colors">
                <p className="text-amber-400 text-sm font-semibold">🚩 {t.admin.reportsTitle}</p>
              </div>
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold lowercase">🎯 {t.profile.skillVideos}</h2>
          <Link href="/upload">
            <Button className="bg-echo text-white hover:bg-echo-bright rounded-full">
              {t.profile.upload}
            </Button>
          </Link>
        </div>

        {skillVideos.length === 0 ? (
          <p className="text-zinc-500 text-sm py-8 text-center border border-dashed border-white/10 rounded-2xl mb-8">
            {t.profile.noVideos}
          </p>
        ) : (
          <div className="mb-8">
            <VideoGrid
              videos={skillVideos}
              author={author}
              currentUserId={user.id}
              deleteButtonFor={(id) => <DeleteVideoButton videoId={id} />}
            />
          </div>
        )}

        {randomVideos.length > 0 && (
          <>
            <h2 className="text-xl font-semibold lowercase mb-4">✨ {t.profile.randomVideos}</h2>
            <VideoGrid
              videos={randomVideos}
              author={author}
              currentUserId={user.id}
              deleteButtonFor={(id) => <DeleteVideoButton videoId={id} />}
            />
          </>
        )}

        <p className="text-xs text-zinc-600 mt-6 text-center">{user.email}</p>
      </div>
    </div>
  );
}

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { Badge } from "@/components/ui/badge";
import { ProfileActions } from "@/components/profile-actions";

function Stars({ value }: { value: number }) {
  return (
    <span className="text-echo-bright">
      {"★".repeat(Math.round(value))}
      <span className="text-zinc-700">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { dict: t } = await getDictionary();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  if (id === user.id) redirect("/profile");

  const [{ data: profile }, { data: reviews }, { data: randomVideos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, city, bio, skills, wants, avatar_url, verified")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("reviews")
      .select("id, reviewer_id, rating, body, created_at")
      .eq("reviewee_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("videos")
      .select("id, storage_path")
      .eq("user_id", id)
      .eq("is_random", true)
      .order("created_at", { ascending: false }),
  ]);
  const randomVideosWithUrl = (randomVideos ?? []).map((v) => ({
    ...v,
    url: supabase.storage.from("videos").getPublicUrl(v.storage_path).data.publicUrl,
  }));
  if (!profile) notFound();

  const reviewerIds = Array.from(new Set((reviews ?? []).map((r) => r.reviewer_id)));
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from("profiles").select("id, name").in("id", reviewerIds)
    : { data: [] };
  const nameById = new Map((reviewers ?? []).map((p) => [p.id, p.name]));

  const count = reviews?.length ?? 0;
  const avg = count ? (reviews!.reduce((s, r) => s + r.rating, 0) / count) : 0;

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[280px] w-[460px] rounded-full bg-echo opacity-10 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/matches" className="text-zinc-400 hover:text-white text-sm">{t.nav.back}</Link>
          <ProfileActions targetId={id} />
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
              <h1 className="text-2xl font-bold truncate">{profile.name}</h1>
              <p className="text-zinc-400 text-sm">{profile.city}</p>
              {count > 0 && (
                <p className="text-sm mt-1"><Stars value={avg} /> <span className="text-zinc-500">{avg.toFixed(1)} · {count}</span></p>
              )}
              {profile.verified && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {t.profile.verified}
                </p>
              )}
            </div>
          </div>

          {profile.bio && <p className="text-sm text-zinc-300 mb-4 whitespace-pre-wrap">{profile.bio}</p>}

          <div className="flex flex-wrap gap-2 mb-4">
            {profile.skills?.map((s: string) => (
              <Badge key={s} className="bg-white/10 text-white border-0">{s}</Badge>
            ))}
          </div>

          {profile.wants?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">{t.profile.lookingFor}</p>
              <div className="flex flex-wrap gap-2">
                {profile.wants.map((w: string) => (
                  <Badge key={w} className="bg-echo/20 text-echo-bright border border-echo/30">{w}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {randomVideosWithUrl.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mb-3 lowercase">✨ {t.profile.randomVideos}</h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {randomVideosWithUrl.map((v) => (
                <div key={v.id} className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950">
                  <video src={v.url} controls className="w-full aspect-[9/16] object-cover" />
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="text-lg font-semibold mb-3 lowercase">{t.profile.reviewsTitle}</h2>
        {count === 0 ? (
          <p className="text-zinc-500 text-sm py-6 text-center border border-dashed border-white/10 rounded-2xl">
            {t.profile.noReviews}
          </p>
        ) : (
          <div className="space-y-3">
            {reviews!.map((r) => (
              <div key={r.id} className="rounded-2xl glass border border-white/10 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{nameById.get(r.reviewer_id) ?? "?"}</span>
                  <Stars value={r.rating} />
                </div>
                {r.body && <p className="text-sm text-zinc-400">{r.body}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

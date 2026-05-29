import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { ReviewActions } from "./review-actions";

export default async function AdminVerificationsPage() {
  const supabase = await createClient();
  const { dict: t } = await getDictionary();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Только админ
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin) notFound();

  // Pending заявки
  const { data: pending } = await supabase
    .from("verifications")
    .select("id, user_id, storage_path, submitted_at")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });

  // Профили подателей
  const userIds = (pending ?? []).map((v) => v.user_id);
  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, name, city, skills")
          .in("id", userIds)
      : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Подписанные URL для каждого видео (час действия)
  const items = await Promise.all(
    (pending ?? []).map(async (v) => {
      const { data: signed } = await supabase.storage
        .from("verifications")
        .createSignedUrl(v.storage_path, 3600);
      return {
        verification: v,
        profile: profileMap.get(v.user_id),
        videoUrl: signed?.signedUrl ?? null,
      };
    })
  );

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-2xl font-bold lowercase text-gradient-echo">echo</Link>
          <span className="text-xs text-amber-400 uppercase tracking-wider">{t.admin.badge}</span>
        </div>

        <h1 className="text-3xl font-bold mb-2 lowercase">{t.admin.title}</h1>
        <p className="text-zinc-400 text-sm mb-8">
          {items.length === 0
            ? t.admin.queueEmpty
            : t.admin.inQueue.replace("{n}", String(items.length))}
        </p>

        <div className="space-y-6">
          {items.map(({ verification, profile, videoUrl }) => (
            <div
              key={verification.id}
              className="rounded-3xl border border-white/10 bg-zinc-950 overflow-hidden"
            >
              <div className="p-4 border-b border-white/10">
                <p className="text-xl font-semibold">{profile?.name ?? "?"}</p>
                <p className="text-zinc-400 text-sm">{profile?.city}</p>
                <p className="text-zinc-500 text-xs mt-1">
                  {t.admin.skills.replace("{list}", profile?.skills?.join(", ") || t.admin.none)}
                </p>
                <p className="text-zinc-600 text-xs mt-1">
                  {t.admin.submitted.replace("{date}", new Date(verification.submitted_at).toLocaleString())}
                </p>
              </div>

              {videoUrl ? (
                <div className="bg-black aspect-[9/16] max-h-[500px] mx-auto">
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <p className="text-red-400 text-sm p-4">{t.admin.videoError}</p>
              )}

              <div className="p-4">
                <ReviewActions verificationId={verification.id} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

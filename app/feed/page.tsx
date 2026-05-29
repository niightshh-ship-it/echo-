import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedClient, type FeedItem } from "./feed-client";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // 1. Все чужие видео
  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("id, user_id, skill, storage_path, created_at")
    .neq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (videosError) {
    console.error("[feed] videos query error:", videosError);
  }

  // 2. Профили авторов отдельным запросом
  const authorIds = Array.from(new Set((videos ?? []).map((v) => v.user_id)));
  const { data: profiles, error: profilesError } =
    authorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, name, city, avatar_url")
          .in("id", authorIds)
      : { data: [], error: null };

  if (profilesError) {
    console.error("[feed] profiles query error:", profilesError);
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const items: FeedItem[] = (videos ?? []).map((v) => {
    const author = profileMap.get(v.user_id);
    return {
      id: v.id,
      skill: v.skill,
      authorName: author?.name ?? "?",
      authorCity: author?.city ?? "",
      authorAvatar: author?.avatar_url ?? null,
      url: supabase.storage.from("videos").getPublicUrl(v.storage_path).data.publicUrl,
    };
  });

  // 3. Что юзер уже лайкнул
  const { data: likedRows } = await supabase
    .from("likes")
    .select("video_id")
    .eq("liker_id", user.id);

  const initiallyLiked = (likedRows ?? []).map((r) => r.video_id);

  return <FeedClient items={items} initiallyLiked={initiallyLiked} />;
}

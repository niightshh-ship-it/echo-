import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedClient, type FeedItem } from "./feed-client";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Параллелим всё что не зависит друг от друга.
  // Свои видео тоже включаем — пометим isMine, чтобы юзер видел что они в ленте.
  const [videosRes, blocksRes, likedRes, myProfileRes] = await Promise.all([
    supabase
      .from("videos")
      .select("id, user_id, skill, storage_path, created_at, is_random, description")
      .order("created_at", { ascending: false }),
    supabase
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
    supabase.from("likes").select("video_id").eq("liker_id", user.id),
    supabase.from("profiles").select("name, avatar_url").eq("id", user.id).maybeSingle(),
  ]);

  const videos = videosRes.data;
  const blocks = blocksRes.data;
  const likedRows = likedRes.data;

  const hidden = new Set<string>();
  (blocks ?? []).forEach((b) =>
    hidden.add(b.blocker_id === user.id ? b.blocked_id : b.blocker_id)
  );

  const visibleVideos = (videos ?? []).filter((v) => !hidden.has(v.user_id));

  const authorIds = Array.from(new Set(visibleVideos.map((v) => v.user_id)));
  const { data: profiles } =
    authorIds.length > 0
      ? await supabase.from("profiles").select("id, name, city, avatar_url").in("id", authorIds)
      : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const allItems: FeedItem[] = visibleVideos.map((v) => {
    const author = profileMap.get(v.user_id);
    return {
      id: v.id,
      authorId: v.user_id,
      skill: v.skill,
      description: v.description ?? null,
      isRandom: !!v.is_random,
      isMine: v.user_id === user.id,
      authorName: author?.name ?? "?",
      authorCity: author?.city ?? "",
      authorAvatar: author?.avatar_url ?? null,
      url: supabase.storage.from("videos").getPublicUrl(v.storage_path).data.publicUrl,
    };
  });

  const skillItems = allItems.filter((i) => !i.isRandom);
  const randomItems = allItems.filter((i) => i.isRandom);
  const initiallyLiked = (likedRows ?? []).map((r) => r.video_id);

  return (
    <FeedClient
      skillItems={skillItems}
      randomItems={randomItems}
      initiallyLiked={initiallyLiked}
      myName={myProfileRes.data?.name ?? "?"}
      myAvatar={myProfileRes.data?.avatar_url ?? null}
    />
  );
}

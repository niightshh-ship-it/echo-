import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { AmbientBg } from "@/components/ambient-bg";
import { MatchesClient, type MatchItem, type LikeItem } from "./matches-client";

export default async function MatchesPage() {
  const supabase = await createClient();
  await getDictionary(); // прогреваем словарь (используется в клиенте через провайдер)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // ===== Мой профиль (для фейерверка) =====
  const myProfilePromise = supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // ===== Мэтчи =====
  const { data: matches } = await supabase
    .from("matches")
    .select("user_a, user_b, created_at")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const matchOtherIds = (matches ?? []).map((m) =>
    m.user_a === user.id ? m.user_b : m.user_a
  );

  // ===== Лайки (кто меня лайкнул, без мэтча) =====
  const { data: likeRows } = await supabase.rpc("who_liked_me");
  const likerIds = (likeRows ?? []).map(
    (r: { liker_id: string }) => r.liker_id
  );

  // ===== Все профили разом =====
  const allIds = Array.from(new Set([...matchOtherIds, ...likerIds]));
  const [profilesRes, ratingsRes, unreadRes, myProfileRes] = await Promise.all([
    allIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, name, city, bio, skills, wants, avatar_url, verified")
          .in("id", allIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    matchOtherIds.length > 0
      ? supabase.from("reviews").select("reviewee_id, rating").in("reviewee_id", matchOtherIds)
      : Promise.resolve({ data: [] as { reviewee_id: string; rating: number }[] }),
    supabase
      .from("messages")
      .select("match_user_a, match_user_b")
      .neq("sender_id", user.id)
      .is("read_at", null),
    myProfilePromise,
  ]);

  const profileMap = new Map<string, ProfileRow>(
    (profilesRes.data ?? []).map((p) => [p.id, p as ProfileRow])
  );

  // Рейтинги для матчей
  const ratingMap = new Map<string, { sum: number; n: number }>();
  (ratingsRes.data ?? []).forEach((r) => {
    const cur = ratingMap.get(r.reviewee_id) ?? { sum: 0, n: 0 };
    cur.sum += r.rating;
    cur.n += 1;
    ratingMap.set(r.reviewee_id, cur);
  });

  // Непрочитанные по парам
  const unreadByPair = new Map<string, number>();
  (unreadRes.data ?? []).forEach((m) => {
    const key = `${m.match_user_a}|${m.match_user_b}`;
    unreadByPair.set(key, (unreadByPair.get(key) ?? 0) + 1);
  });

  const matchItems: MatchItem[] = (matches ?? [])
    .map((m) => {
      const otherId = m.user_a === user.id ? m.user_b : m.user_a;
      const p = profileMap.get(otherId);
      if (!p) return null;
      const r = ratingMap.get(otherId);
      const key = `${m.user_a}|${m.user_b}`;
      return {
        id: otherId,
        name: p.name,
        city: p.city,
        avatar: p.avatar_url ?? null,
        skills: p.skills ?? [],
        matchedAt: m.created_at,
        unread: unreadByPair.get(key) ?? 0,
        rating: r ? r.sum / r.n : null,
      };
    })
    .filter((x): x is MatchItem => x !== null);

  // Видео которое лайкер лайкнул (моё) — нам не нужно для превью, превью грузим лениво
  const likeItems: LikeItem[] = (likeRows ?? [])
    .map((row: { liker_id: string; created_at: string }) => {
      const p = profileMap.get(row.liker_id);
      if (!p) return null;
      return {
        id: row.liker_id,
        name: p.name,
        city: p.city,
        avatar: p.avatar_url ?? null,
        bio: p.bio ?? null,
        skills: p.skills ?? [],
        wants: p.wants ?? [],
        verified: !!p.verified,
        likedAt: row.created_at,
      };
    })
    .filter((x: LikeItem | null): x is LikeItem => x !== null);

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 pt-12 pb-28">
      <AmbientBg variant="matches" />
      <MatchesClient
        myId={user.id}
        myName={myProfileRes.data?.name ?? "?"}
        myAvatar={myProfileRes.data?.avatar_url ?? null}
        matchItems={matchItems}
        likeItems={likeItems}
      />
    </div>
  );
}

type ProfileRow = {
  id: string;
  name: string;
  city: string;
  bio: string | null;
  skills: string[] | null;
  wants: string[] | null;
  avatar_url: string | null;
  verified: boolean;
};

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { AmbientBg } from "@/components/ambient-bg";

export default async function MatchesPage() {
  const supabase = await createClient();
  const { dict: t } = await getDictionary();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // 1. Мэтчи где я участвую
  const { data: matches } = await supabase
    .from("matches")
    .select("user_a, user_b, created_at")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // 2. Профили "других" участников
  const otherIds = (matches ?? []).map((m) =>
    m.user_a === user.id ? m.user_b : m.user_a
  );

  // 3 параллельных запроса вместо очереди
  const [profilesRes, ratingsRes, unreadRes] = await Promise.all([
    otherIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, name, city, skills, avatar_url")
          .in("id", otherIds)
      : Promise.resolve({ data: [] as { id: string; name: string; city: string; skills: string[]; avatar_url: string | null }[] }),
    otherIds.length > 0
      ? supabase.from("reviews").select("reviewee_id, rating").in("reviewee_id", otherIds)
      : Promise.resolve({ data: [] as { reviewee_id: string; rating: number }[] }),
    supabase
      .from("messages")
      .select("match_user_a, match_user_b")
      .neq("sender_id", user.id)
      .is("read_at", null),
  ]);
  const profiles = profilesRes.data;
  const revs = ratingsRes.data;
  const unread = unreadRes.data;
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const ratingMap = new Map<string, { sum: number; n: number }>();
  (revs ?? []).forEach((r) => {
    const cur = ratingMap.get(r.reviewee_id) ?? { sum: 0, n: 0 };
    cur.sum += r.rating;
    cur.n += 1;
    ratingMap.set(r.reviewee_id, cur);
  });

  const unreadByPair = new Map<string, number>();
  (unread ?? []).forEach((m) => {
    const key = `${m.match_user_a}|${m.match_user_b}`;
    unreadByPair.set(key, (unreadByPair.get(key) ?? 0) + 1);
  });

  const items = (matches ?? []).map((m) => {
    const otherId = m.user_a === user.id ? m.user_b : m.user_a;
    const key = `${m.user_a}|${m.user_b}`;
    return {
      other: profileMap.get(otherId),
      matched_at: m.created_at,
      unread: unreadByPair.get(key) ?? 0,
    };
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 pt-12 pb-28">
      <AmbientBg variant="matches" />

      <div className="relative z-10 w-full max-w-md page-fade-in">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-2xl font-bold lowercase text-gradient-echo">echo</Link>
          <div className="flex items-center gap-1">
            <NotificationBell userId={user.id} />
            <LanguageSwitcher />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2 lowercase">{t.matches.title}</h1>
        <p className="text-zinc-400 text-sm mb-8">{t.matches.subtitle}</p>

        {items.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
            <p className="text-zinc-500 mb-2">{t.matches.emptyTitle}</p>
            <p className="text-zinc-600 text-sm">{t.matches.emptyText}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(({ other, matched_at, unread }) => {
              if (!other) return null;
              return (
                <Link
                  key={other.id}
                  href={`/matches/${other.id}`}
                  className="block rounded-2xl glass border border-white/10 p-5 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
                        {other.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={other.avatar_url} alt={other.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg">{other.name?.[0]?.toUpperCase() ?? "?"}</span>
                        )}
                      </div>
                      <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-semibold">{other.name}</p>
                        {unread > 0 && (
                          <span className="bg-echo text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-sm">{other.city}</p>
                      {(() => {
                        const r = ratingMap.get(other.id);
                        if (!r) return null;
                        const avg = r.sum / r.n;
                        return (
                          <p className="text-xs mt-0.5">
                            <span className="text-echo-bright">{"★".repeat(Math.round(avg))}</span>
                            <span className="text-zinc-600">{"★".repeat(5 - Math.round(avg))}</span>
                            <span className="text-zinc-500"> {avg.toFixed(1)}</span>
                          </p>
                        );
                      })()}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600">
                      {new Date(matched_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {other.skills?.map((s: string) => (
                      <Badge key={s} className="bg-white/10 text-white hover:bg-white/15 border-0">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

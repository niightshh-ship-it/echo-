import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function MatchesPage() {
  const supabase = await createClient();
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

  const { data: profiles } =
    otherIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, name, city, skills")
          .in("id", otherIds)
      : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // 3. Непрочитанные сообщения — где я получатель и read_at пуст
  const { data: unread } = await supabase
    .from("messages")
    .select("match_user_a, match_user_b")
    .neq("sender_id", user.id)
    .is("read_at", null);

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
    <div className="flex min-h-screen flex-col items-center bg-black text-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-2xl font-bold lowercase">echo</Link>
          <Link href="/feed">
            <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
              ← фид
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2 lowercase">твои мэтчи</h1>
        <p className="text-zinc-400 text-sm mb-8">
          С теми, с кем у вас взаимные лайки — можно общаться.
        </p>

        {items.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg">
            <p className="text-zinc-500 mb-2">Пока нет мэтчей.</p>
            <p className="text-zinc-600 text-sm">
              Лайкай видео в фиде — когда лайк взаимный, человек появится здесь.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(({ other, matched_at, unread }) => {
              if (!other) return null;
              return (
                <Link
                  key={other.id}
                  href={`/matches/${other.id}`}
                  className="block rounded-xl border border-zinc-800 p-5 bg-zinc-950 hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-semibold">{other.name}</p>
                        {unread > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-sm">{other.city}</p>
                    </div>
                    <p className="text-xs text-zinc-600">
                      {new Date(matched_at).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {other.skills?.map((s: string) => (
                      <Badge key={s} className="bg-zinc-800 text-white hover:bg-zinc-700">
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

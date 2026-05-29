"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DUTCH_CITIES } from "@/lib/cities";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n/provider";

type Row = { id: string; name: string; city: string; skills: string[]; avatar_url: string | null };

const ALL = "__all__";

export default function SearchPage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const t = useT();

  const [myId, setMyId] = useState<string | null>(null);
  const [city, setCity] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<Row[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/sign-in");
      else setMyId(user.id);
    });
  }, [router, supabase]);

  useEffect(() => {
    if (!myId) return;
    (async () => {
      let q = supabase
        .from("profiles")
        .select("id, name, city, skills, avatar_url")
        .neq("id", myId)
        .limit(60);
      if (city !== ALL) q = q.eq("city", city);
      const { data } = await q;
      setAll((data ?? []) as Row[]);
    })();
  }, [myId, city, supabase]);

  const ql = query.trim().toLowerCase();
  const results = ql
    ? all.filter(
        (p) =>
          p.name.toLowerCase().includes(ql) ||
          (p.skills ?? []).some((s) => s.toLowerCase().includes(ql))
      )
    : all;

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-black text-white px-4 pt-12 pb-28">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[280px] w-[460px] rounded-full bg-echo opacity-10 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 lowercase">{t.search.title}</h1>

        <div className="space-y-3 mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className="pl-9 h-12 bg-white/5 border-white/10 text-white rounded-xl"
            />
          </div>
          <Select value={city} onValueChange={(v) => setCity(v ?? ALL)}>
            <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-white/10 text-white">
              <SelectItem value={ALL}>{t.search.allCities}</SelectItem>
              {DUTCH_CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {results.length === 0 ? (
          <p className="text-zinc-500 text-sm py-10 text-center">{t.search.noResults}</p>
        ) : (
          <div className="space-y-3">
            {results.map((p) => (
              <Link
                key={p.id}
                href={`/u/${p.id}`}
                className="flex items-center gap-3 rounded-2xl glass border border-white/10 p-4 hover:bg-white/[0.06] transition-colors"
              >
                <span className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg">{p.name?.[0]?.toUpperCase() ?? "?"}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-zinc-500">{p.city}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(p.skills ?? []).slice(0, 3).map((s) => (
                      <Badge key={s} className="bg-white/10 text-white border-0 text-[10px] py-0">{s}</Badge>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

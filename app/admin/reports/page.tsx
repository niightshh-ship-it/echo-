import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { dict: t } = await getDictionary();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) notFound();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, reporter_id, reported_id, reason, created_at")
    .order("created_at", { ascending: false });

  const ids = Array.from(
    new Set((reports ?? []).flatMap((r) => [r.reporter_id, r.reported_id]))
  );
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, name").in("id", ids)
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-2xl font-bold lowercase text-gradient-echo">echo</Link>
          <span className="text-xs text-amber-400 uppercase tracking-wider">{t.admin.badge}</span>
        </div>

        <h1 className="text-3xl font-bold mb-6 lowercase">{t.admin.reportsTitle}</h1>

        {(reports ?? []).length === 0 ? (
          <p className="text-zinc-500 text-sm py-8 text-center border border-dashed border-white/10 rounded-2xl">
            {t.admin.reportsEmpty}
          </p>
        ) : (
          <div className="space-y-3">
            {reports!.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
                <p className="text-sm">
                  <Link href={`/u/${r.reporter_id}`} className="text-echo-bright hover:underline">
                    {nameById.get(r.reporter_id) ?? "?"}
                  </Link>
                  <span className="text-zinc-500"> {t.admin.reportArrow} </span>
                  <Link href={`/u/${r.reported_id}`} className="text-echo-bright hover:underline">
                    {nameById.get(r.reported_id) ?? "?"}
                  </Link>
                </p>
                {r.reason && <p className="text-sm text-zinc-300 mt-1">{r.reason}</p>}
                <p className="text-xs text-zinc-600 mt-1">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

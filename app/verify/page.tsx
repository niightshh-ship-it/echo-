import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VerifyClient } from "./verify-client";

export default async function VerifyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("verified")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");
  if (profile.verified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 text-center">
        <p className="text-5xl mb-4">✓</p>
        <h1 className="text-2xl font-bold mb-2 lowercase">ты уже верифицирован</h1>
        <p className="text-zinc-400 mb-8">Всё хорошо, ничего делать не нужно.</p>
        <Link href="/profile" className="text-white underline">← на профиль</Link>
      </div>
    );
  }

  // Есть ли заявка на рассмотрении?
  const { data: pending } = await supabase
    .from("verifications")
    .select("id, status, submitted_at, rejection_reason")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending?.status === "pending") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 text-center">
        <p className="text-5xl mb-4">⌛</p>
        <h1 className="text-2xl font-bold mb-2 lowercase">заявка на проверке</h1>
        <p className="text-zinc-400 mb-1">
          Отправлено {new Date(pending.submitted_at).toLocaleString("ru-RU")}
        </p>
        <p className="text-zinc-500 text-sm mb-8">
          Обычно занимает несколько часов.
        </p>
        <Link href="/profile" className="text-white underline">← на профиль</Link>
      </div>
    );
  }

  return <VerifyClient userId={user.id} previousRejection={pending?.status === "rejected" ? pending.rejection_reason : null} />;
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { VerifyClient } from "./verify-client";
import { AmbientBg } from "@/components/ambient-bg";

export default async function VerifyPage() {
  const supabase = await createClient();
  const { dict: t } = await getDictionary();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("verified")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");
  const authBg = <AmbientBg variant="auth" />;

  if (profile.verified) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 text-center overflow-hidden">
        {authBg}
        <p className="relative z-10 text-5xl mb-4">✓</p>
        <h1 className="relative z-10 text-2xl font-bold mb-2 lowercase">{t.verify.alreadyTitle}</h1>
        <p className="relative z-10 text-zinc-400 mb-8">{t.verify.alreadyText}</p>
        <Link href="/profile" className="relative z-10 text-echo-bright underline">{t.feed.backToProfile}</Link>
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
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 text-center overflow-hidden">
        {authBg}
        <p className="relative z-10 text-5xl mb-4">⌛</p>
        <h1 className="relative z-10 text-2xl font-bold mb-2 lowercase">{t.verify.pendingTitle}</h1>
        <p className="relative z-10 text-zinc-400 mb-1">
          {t.verify.pendingSent.replace("{date}", new Date(pending.submitted_at).toLocaleString())}
        </p>
        <p className="relative z-10 text-zinc-500 text-sm mb-8">{t.verify.pendingNote}</p>
        <Link href="/profile" className="relative z-10 text-echo-bright underline">{t.feed.backToProfile}</Link>
      </div>
    );
  }

  return <VerifyClient userId={user.id} previousRejection={pending?.status === "rejected" ? pending.rejection_reason : null} />;
}

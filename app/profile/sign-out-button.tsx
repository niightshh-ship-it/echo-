"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

export function SignOutButton() {
  const router = useRouter();
  const t = useT();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <Button
      onClick={handleSignOut}
      variant="ghost"
      className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full"
    >
      {t.nav.signOut}
    </Button>
  );
}

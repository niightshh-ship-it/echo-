"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

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
      className="text-zinc-400 hover:text-white hover:bg-zinc-900"
    >
      выйти
    </Button>
  );
}

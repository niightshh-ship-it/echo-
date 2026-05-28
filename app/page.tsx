import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <h1 className="text-8xl font-bold tracking-tight lowercase">echo</h1>
      <p className="mt-4 text-xl text-zinc-400">обмен навыками в Нидерландах</p>

      <div className="mt-12 flex gap-3">
        {user ? (
          <>
            <Link href="/feed">
              <Button className="bg-white text-black hover:bg-zinc-200">
                смотреть фид
              </Button>
            </Link>
            <Link href="/matches">
              <Button variant="outline" className="bg-transparent border-zinc-700 text-white hover:bg-zinc-900 hover:text-white">
                мэтчи
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="bg-transparent border-zinc-700 text-white hover:bg-zinc-900 hover:text-white">
                профиль
              </Button>
            </Link>
          </>
        ) : (
          <Link href="/sign-in">
            <Button className="bg-white text-black hover:bg-zinc-200">
              войти
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

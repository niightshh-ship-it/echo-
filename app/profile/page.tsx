import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "./sign-out-button";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const { data: videos } = await supabase
    .from("videos")
    .select("id, skill, storage_path, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const videosWithUrl = (videos ?? []).map((v) => ({
    ...v,
    url: supabase.storage.from("videos").getPublicUrl(v.storage_path).data.publicUrl,
  }));

  return (
    <div className="flex min-h-screen flex-col items-center bg-black text-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-2xl font-bold lowercase">echo</Link>
          <div className="flex items-center gap-2">
            <Link href="/feed">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
                фид
              </Button>
            </Link>
            <Link href="/matches">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
                мэтчи
              </Button>
            </Link>
            <SignOutButton />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 p-8 mb-6">
          <h1 className="text-3xl font-bold mb-1">{profile.name}</h1>
          <p className="text-zinc-400 mb-6">{profile.city}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {profile.skills.map((skill: string) => (
              <Badge key={skill} className="bg-zinc-800 text-white hover:bg-zinc-700">
                {skill}
              </Badge>
            ))}
          </div>

          {profile.verified ? (
            <p className="text-xs text-green-500">✓ верифицирован</p>
          ) : (
            <Link href="/verify">
              <Button className="w-full bg-white text-black hover:bg-zinc-200">
                Пройти верификацию
              </Button>
            </Link>
          )}
        </div>

        {profile.is_admin && (
          <Link href="/admin/verifications" className="block mb-6">
            <div className="rounded-xl border border-yellow-900/40 bg-yellow-950/20 p-4 hover:bg-yellow-950/40 transition-colors">
              <p className="text-yellow-400 text-sm font-semibold">⚡ Админка</p>
              <p className="text-yellow-200/70 text-xs">Проверить заявки на верификацию</p>
            </div>
          </Link>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">мои видео</h2>
          <Link href="/upload">
            <Button className="bg-white text-black hover:bg-zinc-200">
              + загрузить
            </Button>
          </Link>
        </div>

        {videosWithUrl.length === 0 ? (
          <p className="text-zinc-500 text-sm py-8 text-center border border-dashed border-zinc-800 rounded-lg">
            Ещё нет видео. Загрузи первое — покажи свой навык.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {videosWithUrl.map((v) => (
              <div key={v.id} className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
                <video src={v.url} controls className="w-full aspect-[9/16] object-cover" />
                <p className="text-xs text-zinc-400 px-2 py-1.5">{v.skill}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-zinc-600 mt-6 text-center">{user.email}</p>
      </div>
    </div>
  );
}

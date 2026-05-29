// Удаление видео. БД-операции — через авторизованный серверный клиент (RLS:
// читать видео может любой залогиненный, удалять — только своё). Файл из storage
// убираем сервисным ключом (для storage он работает надёжно).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { videoId } = await request.json();
  if (!videoId) {
    return NextResponse.json({ error: "no videoId" }, { status: 400 });
  }

  // Авторизованный клиент видит видео (RLS select = любой authenticated)
  const { data: video } = await supabase
    .from("videos")
    .select("user_id, storage_path")
    .eq("id", videoId)
    .maybeSingle();

  if (!video) {
    return NextResponse.json({ error: `video not found (id=${videoId})` }, { status: 404 });
  }
  if (video.user_id !== user.id) {
    return NextResponse.json({ error: "not owner" }, { status: 403 });
  }

  // Удаляем запись авторизованным клиентом (RLS delete = только своё)
  const { error: delErr } = await supabase.from("videos").delete().eq("id", videoId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Удаляем файл из storage сервисным ключом
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  await admin.storage.from("videos").remove([video.storage_path]);

  return NextResponse.json({ ok: true });
}

// Удаление видео через сервер: проверяем что юзер — владелец, удаляем файл из
// storage и запись из БД сервисным ключом (минуя капризы browser-storage RLS).

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

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: video } = await admin
    .from("videos")
    .select("id, user_id, storage_path")
    .eq("id", videoId)
    .maybeSingle();

  if (!video || video.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await admin.storage.from("videos").remove([video.storage_path]);
  const { error } = await admin.from("videos").delete().eq("id", videoId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

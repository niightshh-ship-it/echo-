// Обновление описания/скилла видео — только владелец.
// RLS на videos уже позволяет автору update, но через серверный роут
// валидируем длину и нормализуем body.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_DESCRIPTION = 500;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    videoId?: string;
    description?: string | null;
    skill?: string | null;
  };
  const videoId = body.videoId;
  if (typeof videoId !== "string" || videoId.length < 10) {
    return NextResponse.json({ error: "bad videoId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not authed" }, { status: 401 });
  }

  // Проверяем что это его видео
  const { data: video } = await supabase
    .from("videos")
    .select("id, user_id, is_random")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (video.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Нормализуем поля
  const updates: { description?: string | null; skill?: string | null } = {};

  if ("description" in body) {
    const desc =
      typeof body.description === "string"
        ? body.description.trim().slice(0, MAX_DESCRIPTION)
        : null;
    updates.description = desc && desc.length > 0 ? desc : null;
  }

  if ("skill" in body && !video.is_random) {
    const skill =
      typeof body.skill === "string" ? body.skill.trim().slice(0, 50) : null;
    if (skill) updates.skill = skill;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const { error } = await supabase
    .from("videos")
    .update(updates)
    .eq("id", videoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

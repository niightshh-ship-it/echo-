// Письмо о лайке навыка (даже без мэтча). Вызывается из клиента после
// успешного like_video, если RPC вернул matched:false. Автора видео
// определяем на сервере по videoId — клиент не передаёт получателя.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyLikeByEmail } from "@/lib/notify-email";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { videoId?: string };
  const videoId = body.videoId;
  if (typeof videoId !== "string" || videoId.length < 10) {
    return NextResponse.json({ error: "bad videoId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authed" }, { status: 401 });

  // Кто автор видео + подтверждаем что я его правда лайкнул
  const { data: video } = await supabase
    .from("videos")
    .select("user_id")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return NextResponse.json({ error: "no video" }, { status: 404 });
  const ownerId = video.user_id as string;
  if (ownerId === user.id) {
    return NextResponse.json({ error: "self" }, { status: 400 });
  }

  const { data: myLike } = await supabase
    .from("likes")
    .select("video_id")
    .eq("video_id", videoId)
    .eq("liker_id", user.id)
    .maybeSingle();
  if (!myLike) {
    return NextResponse.json({ error: "not liked" }, { status: 403 });
  }

  const result = await notifyLikeByEmail({
    recipientId: ownerId,
    actorId: user.id,
  });
  return NextResponse.json({ ok: true, ...result });
}

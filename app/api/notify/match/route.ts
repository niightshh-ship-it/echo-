// Шлёт письмо о мэтче. Вызывается из клиента после успешного like_video,
// если RPC вернул matched:true. Сами проверяем что мэтч реально есть в БД,
// чтобы нельзя было дёргать ендпоинт вручную.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyMatchByEmail } from "@/lib/notify-email";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { otherId?: string };
  const otherId = body.otherId;
  if (typeof otherId !== "string" || otherId.length < 10) {
    return NextResponse.json({ error: "bad otherId" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authed" }, { status: 401 });

  // Проверяем что мэтч действительно существует
  const [a, b] = user.id < otherId ? [user.id, otherId] : [otherId, user.id];
  const { data: match } = await supabase
    .from("matches")
    .select("user_a")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: "no match" }, { status: 403 });

  // Письмо шлём СОБЕСЕДНИКУ (другой стороне),
  // а себе уведомление в приложении уже создалось триггером.
  const result = await notifyMatchByEmail({
    recipientId: otherId,
    actorId: user.id,
  });
  return NextResponse.json({ ok: true, ...result });
}

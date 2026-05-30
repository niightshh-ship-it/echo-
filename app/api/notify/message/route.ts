// Шлёт письмо о новом сообщении. Вызывается из чата после успешного insert.
// Троттлинг (раз в час на пару sender→recipient) — внутри notifyMessageByEmail.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyMessageByEmail } from "@/lib/notify-email";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    recipientId?: string;
    preview?: string;
  };
  const recipientId = body.recipientId;
  const preview = (body.preview ?? "").slice(0, 200);
  if (typeof recipientId !== "string" || recipientId.length < 10) {
    return NextResponse.json({ error: "bad recipient" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authed" }, { status: 401 });
  if (user.id === recipientId) {
    return NextResponse.json({ error: "self" }, { status: 400 });
  }

  // Проверяем что между ними реально есть мэтч
  const [a, b] = user.id < recipientId ? [user.id, recipientId] : [recipientId, user.id];
  const { data: match } = await supabase
    .from("matches")
    .select("user_a")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: "no match" }, { status: 403 });

  const result = await notifyMessageByEmail({
    recipientId,
    actorId: user.id,
    preview,
  });
  return NextResponse.json({ ok: true, ...result });
}

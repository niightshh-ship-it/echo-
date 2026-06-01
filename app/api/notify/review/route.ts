// Шлёт письмо о новом отзыве. Вызывается из клиента после успешного
// insert в таблицу reviews. Сами проверяем что отзыв реально существует
// и что пользователь — его автор, чтобы нельзя было дёргать ендпоинт вручную.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyReviewByEmail } from "@/lib/notify-email";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    revieweeId?: string;
    rating?: number;
    body?: string | null;
  };
  const revieweeId = body.revieweeId;
  const rating = typeof body.rating === "number" ? body.rating : null;
  if (
    typeof revieweeId !== "string" ||
    revieweeId.length < 10 ||
    rating === null ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const reviewBody =
    typeof body.body === "string" && body.body.trim().length > 0
      ? body.body.trim().slice(0, 500)
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not authed" }, { status: 401 });
  }
  if (user.id === revieweeId) {
    return NextResponse.json({ error: "self" }, { status: 400 });
  }

  // Подтверждаем что отзыв реально создан
  const { data: review } = await supabase
    .from("reviews")
    .select("id, rating, body")
    .eq("reviewer_id", user.id)
    .eq("reviewee_id", revieweeId)
    .maybeSingle();
  if (!review) {
    return NextResponse.json({ error: "no review" }, { status: 403 });
  }

  const result = await notifyReviewByEmail({
    recipientId: revieweeId,
    actorId: user.id,
    rating: review.rating ?? rating,
    body: (review.body as string | null) ?? reviewBody,
  });
  return NextResponse.json({ ok: true, ...result });
}

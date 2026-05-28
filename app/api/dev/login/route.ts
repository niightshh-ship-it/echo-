// DEV ONLY: логин без email-сендера (обход rate limit при тестировании).
// Использование: /api/dev/login?email=smartwoter@gmail.com
//
// Как работает:
// 1. Admin API генерирует одноразовый OTP для email (без отправки письма)
// 2. Тут же на сервере вызываем verifyOtp — это ставит auth-куки на localhost
// 3. Редиректим юзера на /profile (или /onboarding если нет профиля)
//
// В продакшене вернёт 404.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (!email) {
    return new NextResponse("Добавь ?email=твой@example.com", { status: 400 });
  }

  // 1. Admin-клиент с service-role — генерирует OTP, письмо не шлёт
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError) {
    return new NextResponse(`generateLink: ${linkError.message}`, { status: 500 });
  }

  const otp = linkData?.properties?.email_otp;
  if (!otp) {
    return new NextResponse("OTP не сгенерирован", { status: 500 });
  }

  // 2. Серверный клиент — обменивает OTP на сессию и ставит куки нашего origin
  const supabase = await createServerSupabase();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "email",
  });

  if (verifyError) {
    return new NextResponse(`verifyOtp: ${verifyError.message}`, { status: 500 });
  }

  // 3. Проверяем есть ли профиль
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();
    return NextResponse.redirect(`${url.origin}${profile ? "/profile" : "/onboarding"}`);
  }

  return NextResponse.redirect(`${url.origin}/`);
}

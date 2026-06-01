// Диагностический ендпоинт — шлёт письмо самому себе и возвращает
// что произошло. Вызвать прямо из браузера залогиненным юзером:
//   POST /api/notify/test
// Ответ покажет: есть ли email у юзера в auth, есть ли профиль,
// какая локаль, дошло ли письмо до SMTP. Логи Vercel покажут
// конкретную ошибку с префиксом [notify-email].

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { sendMail, emailShell } from "@/lib/mailer";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not authed" }, { status: 401 });
  }

  // Проверим env-переменные
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    BREVO_SMTP_USER: !!process.env.BREVO_SMTP_USER,
    BREVO_SMTP_KEY: !!process.env.BREVO_SMTP_KEY,
    BREVO_SENDER_EMAIL: !!process.env.BREVO_SENDER_EMAIL,
  };

  // Проверим что профиль с новыми колонками читается через service-role
  let profileColumns: string | null = null;
  let profileError: string | null = null;
  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error } = await admin
      .from("profiles")
      .select("name, locale, email_notifications")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      profileError = error.message;
    } else {
      profileColumns = JSON.stringify(data);
    }
  } catch (e) {
    profileError = e instanceof Error ? e.message : String(e);
  }

  // Попробуем реально послать письмо
  let smtpOk = false;
  let smtpError: string | null = null;
  if (user.email && env.BREVO_SMTP_USER && env.BREVO_SMTP_KEY && env.BREVO_SENDER_EMAIL) {
    try {
      await sendMail({
        to: user.email,
        subject: "Echo · тестовое уведомление",
        html: emailShell({
          title: "Это тестовое письмо",
          body: "Если ты это видишь — SMTP, env-переменные и шаблоны работают. Письма о мэтчах/сообщениях/отзывах должны доходить.",
          footer: "Echo · диагностика",
        }),
      });
      smtpOk = true;
    } catch (e) {
      smtpError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    env,
    profileColumns,
    profileError,
    smtpOk,
    smtpError,
    hint:
      profileError && profileError.includes("permission denied")
        ? "Service-role не имеет прав на profiles. Накати миграцию 018 (supabase/migrations/018_service_role_grants.sql)"
        : profileError && profileError.includes("does not exist")
        ? "Колонок locale/email_notifications нет — накати миграцию 014"
        : !env.BREVO_SMTP_KEY
        ? "Нет BREVO_SMTP_USER / BREVO_SMTP_KEY / BREVO_SENDER_EMAIL в env Vercel"
        : !smtpOk
        ? "SMTP не отвечает — смотри smtpError"
        : profileError
        ? `Профиль не читается: ${profileError}`
        : "✅ Всё ок — SMTP работает, профиль читается. Письма должны идти.",
  });
}

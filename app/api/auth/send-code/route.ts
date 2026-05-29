// Отправка письма с кодом для входа НА ЯЗЫКЕ САЙТА.
// Шаг 1: Supabase admin.generateLink (генерирует OTP, письмо НЕ шлёт).
// Шаг 2: мы сами шлём письмо через Brevo SMTP с локализованным шаблоном.
// Шаблоны Supabase (Magic Link / Confirm signup) больше не задействованы.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

type Locale = "en" | "ru" | "nl" | "uk";
const LOCALES: Locale[] = ["en", "ru", "nl", "uk"];

function tplStyle(token: string, intro: string, hint: string, brand: string, subjectLabel: string) {
  return `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:auto;padding:32px 24px;color:#222">
  <h2 style="font-size:22px;margin:0 0 16px;font-weight:700">${subjectLabel}</h2>
  <p style="color:#444;margin:0 0 20px;font-size:15px">${intro}</p>
  <div style="font-size:36px;font-weight:bold;letter-spacing:8px;font-family:Menlo,monospace;text-align:center;padding:22px;background:#f5f3ff;border-radius:14px;color:#7c5cff">${token}</div>
  <p style="color:#888;font-size:13px;margin-top:24px">${hint}</p>
  <p style="color:#bbb;font-size:11px;margin-top:32px">${brand}</p>
</div>`;
}

const TEMPLATES: Record<Locale, { subject: string; html: (t: string) => string }> = {
  en: {
    subject: "Your Echo sign-in code",
    html: (t) =>
      tplStyle(
        t,
        "Enter this code in Echo to sign in:",
        "The code is valid for 1 hour. If you didn't request this, just ignore this email.",
        "— Echo · skill exchange",
        "Your sign-in code"
      ),
  },
  ru: {
    subject: "Твой код для входа в Echo",
    html: (t) =>
      tplStyle(
        t,
        "Введи этот код в Echo для входа:",
        "Код действует 1 час. Если ты не запрашивал вход — просто проигнорируй это письмо.",
        "— Echo · обмен навыками",
        "Твой код для входа"
      ),
  },
  nl: {
    subject: "Je Echo inlogcode",
    html: (t) =>
      tplStyle(
        t,
        "Voer deze code in Echo in om in te loggen:",
        "De code is 1 uur geldig. Heb je dit niet aangevraagd? Negeer deze e-mail.",
        "— Echo · vaardigheden ruilen",
        "Je inlogcode"
      ),
  },
  uk: {
    subject: "Твій код для входу в Echo",
    html: (t) =>
      tplStyle(
        t,
        "Введи цей код в Echo для входу:",
        "Код діє 1 годину. Якщо ти не запитував вхід — просто проігноруй цей лист.",
        "— Echo · обмін навичками",
        "Твій код для входу"
      ),
  },
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const localeRaw = typeof body.locale === "string" ? body.locale : "en";
  const locale: Locale = (LOCALES as string[]).includes(localeRaw) ? (localeRaw as Locale) : "en";

  if (!email.includes("@") || email.length > 200) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  // Генерируем OTP через admin (письмо при этом НЕ отправляется)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error: genErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (genErr || !data?.properties?.email_otp) {
    return NextResponse.json(
      { error: genErr?.message ?? "could not generate code" },
      { status: 500 }
    );
  }
  const token = data.properties.email_otp;

  // Шлём своё письмо через Brevo SMTP
  const tpl = TEMPLATES[locale];
  const transport = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER!,
      pass: process.env.BREVO_SMTP_KEY!,
    },
  });

  try {
    await transport.sendMail({
      from: `Echo <${process.env.BREVO_SENDER_EMAIL!}>`,
      to: email,
      subject: tpl.subject,
      html: tpl.html(token),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `send failed: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

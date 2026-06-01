// Общая логика отправки уведомлений на email: проверка настроек,
// троттлинг и запись в email_log.
import { createClient as createAdmin } from "@supabase/supabase-js";
import { sendMail, emailShell } from "./mailer";

type Locale = "en" | "ru" | "nl" | "uk";

// Дросселим: не чаще раза в час на пару recipient+actor+type
const THROTTLE_MS = 60 * 60 * 1000;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://echo-brown-chi.vercel.app";

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Локализованные тексты писем
const STRINGS: Record<
  Locale,
  {
    matchSubject: (name: string) => string;
    matchTitle: (name: string) => string;
    matchBody: (name: string) => string;
    matchCta: string;
    msgSubject: (name: string) => string;
    msgTitle: (name: string) => string;
    msgBody: (name: string, preview: string) => string;
    msgCta: string;
    reviewSubject: (name: string, rating: number) => string;
    reviewTitle: (name: string, rating: number) => string;
    reviewBody: (name: string, rating: number, body: string | null) => string;
    reviewCta: string;
    footer: string;
    unsubHint: string;
  }
> = {
  en: {
    matchSubject: (n) => `It's a match with ${n} on Echo`,
    matchTitle: (n) => `It's a match with ${n}!`,
    matchBody: (n) => `You and <strong>${n}</strong> both liked each other on Echo. Say hi and start trading skills.`,
    matchCta: "Start chatting",
    msgSubject: (n) => `${n} sent you a message on Echo`,
    msgTitle: (n) => `New message from ${n}`,
    msgBody: (n, preview) => `<strong>${n}</strong>: <em>${escape(preview)}</em>`,
    msgCta: "Open chat",
    reviewSubject: (n, r) => `${n} left you a ${stars(r)} review on Echo`,
    reviewTitle: (n, r) => `${n} reviewed you · ${stars(r)}`,
    reviewBody: (n, r, body) =>
      `<strong>${n}</strong> rated you <strong>${stars(r)}</strong>${
        body ? `<br><br><em style="color:#444">"${escape(body)}"</em>` : ""
      }<br><br>It now shows up on your profile.`,
    reviewCta: "View on profile",
    footer: "Echo · trade skills, no money",
    unsubHint: "You can disable these emails any time in Echo settings.",
  },
  ru: {
    matchSubject: (n) => `У тебя мэтч с ${n} в Echo`,
    matchTitle: (n) => `У тебя мэтч с ${n}!`,
    matchBody: (n) => `Вы с <strong>${n}</strong> лайкнули друг друга в Echo. Напиши первым и начни обмен скиллами.`,
    matchCta: "Начать чат",
    msgSubject: (n) => `${n} написал тебе в Echo`,
    msgTitle: (n) => `Новое сообщение от ${n}`,
    msgBody: (n, preview) => `<strong>${n}</strong>: <em>${escape(preview)}</em>`,
    msgCta: "Открыть чат",
    reviewSubject: (n, r) => `${n} оставил тебе отзыв ${stars(r)} в Echo`,
    reviewTitle: (n, r) => `${n} оценил тебя · ${stars(r)}`,
    reviewBody: (n, r, body) =>
      `<strong>${n}</strong> поставил тебе <strong>${stars(r)}</strong>${
        body ? `<br><br><em style="color:#444">«${escape(body)}»</em>` : ""
      }<br><br>Отзыв уже виден у тебя в профиле.`,
    reviewCta: "Открыть профиль",
    footer: "Echo · обмен навыками, без денег",
    unsubHint: "Письма можно отключить в любой момент в настройках Echo.",
  },
  nl: {
    matchSubject: (n) => `Het is een match met ${n} op Echo`,
    matchTitle: (n) => `Het is een match met ${n}!`,
    matchBody: (n) => `Jij en <strong>${n}</strong> hebben elkaar geliket op Echo. Zeg hallo en ruil vaardigheden.`,
    matchCta: "Begin chat",
    msgSubject: (n) => `${n} stuurde je een bericht op Echo`,
    msgTitle: (n) => `Nieuw bericht van ${n}`,
    msgBody: (n, preview) => `<strong>${n}</strong>: <em>${escape(preview)}</em>`,
    msgCta: "Chat openen",
    reviewSubject: (n, r) => `${n} liet je een ${stars(r)} review achter op Echo`,
    reviewTitle: (n, r) => `${n} beoordeelde je · ${stars(r)}`,
    reviewBody: (n, r, body) =>
      `<strong>${n}</strong> gaf je <strong>${stars(r)}</strong>${
        body ? `<br><br><em style="color:#444">"${escape(body)}"</em>` : ""
      }<br><br>De review staat nu op je profiel.`,
    reviewCta: "Profiel openen",
    footer: "Echo · vaardigheden ruilen, geen geld",
    unsubHint: "Je kunt deze e-mails altijd uitzetten in de Echo-instellingen.",
  },
  uk: {
    matchSubject: (n) => `У тебе метч з ${n} в Echo`,
    matchTitle: (n) => `У тебе метч з ${n}!`,
    matchBody: (n) => `Ви з <strong>${n}</strong> лайкнули одне одного в Echo. Привітайся і починай обмін.`,
    matchCta: "Почати чат",
    msgSubject: (n) => `${n} написав тобі в Echo`,
    msgTitle: (n) => `Нове повідомлення від ${n}`,
    msgBody: (n, preview) => `<strong>${n}</strong>: <em>${escape(preview)}</em>`,
    msgCta: "Відкрити чат",
    reviewSubject: (n, r) => `${n} залишив тобі відгук ${stars(r)} в Echo`,
    reviewTitle: (n, r) => `${n} оцінив тебе · ${stars(r)}`,
    reviewBody: (n, r, body) =>
      `<strong>${n}</strong> поставив тобі <strong>${stars(r)}</strong>${
        body ? `<br><br><em style="color:#444">«${escape(body)}»</em>` : ""
      }<br><br>Відгук уже на твоєму профілі.`,
    reviewCta: "Відкрити профіль",
    footer: "Echo · обмін навичками, без грошей",
    unsubHint: "Листи можна вимкнути будь-коли в налаштуваннях Echo.",
  },
};

function stars(n: number) {
  const safe = Math.max(0, Math.min(5, Math.round(n)));
  return "★".repeat(safe) + "☆".repeat(5 - safe);
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pickLocale(raw: string | null | undefined): Locale {
  if (raw === "ru" || raw === "nl" || raw === "uk" || raw === "en") return raw;
  return "en";
}

/** Возвращает {email, name, avatar, locale, email_notifications} или null.
 *  Устойчиво к тому что колонок `locale` или `email_notifications` ещё нет
 *  в БД (если миграция 014 не накатана) — фоллбечится на минимальный
 *  запрос и считает что письма включены, а локаль 'en'. */
async function fetchRecipient(userId: string) {
  const a = admin();
  const [{ data: profile, error: profileErr }, { data: authUser, error: authErr }] =
    await Promise.all([
      a
        .from("profiles")
        .select("name, locale, email_notifications")
        .eq("id", userId)
        .maybeSingle(),
      a.auth.admin.getUserById(userId),
    ]);

  if (authErr) {
    console.error("[notify-email] auth.admin.getUserById failed:", authErr.message);
  }

  if (profileErr) {
    console.error(
      "[notify-email] profiles select failed (миграция 014?):",
      profileErr.message
    );
    // Пробуем фоллбэк-запрос без новых колонок
    const { data: fallback } = await a
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();
    if (!fallback || !authUser?.user?.email) return null;
    return {
      email: authUser.user.email,
      name: (fallback as { name?: string }).name ?? "?",
      locale: "en" as Locale,
      enabled: true,
    };
  }

  if (!profile || !authUser?.user?.email) {
    console.error(
      `[notify-email] no recipient: profile=${!!profile} email=${!!authUser?.user?.email}`
    );
    return null;
  }
  return {
    email: authUser.user.email,
    name: profile.name ?? "?",
    locale: pickLocale((profile as { locale?: string | null }).locale ?? null),
    enabled: (profile as { email_notifications?: boolean }).email_notifications !== false,
  };
}

async function fetchActorName(actorId: string) {
  const { data } = await admin()
    .from("profiles")
    .select("name")
    .eq("id", actorId)
    .maybeSingle();
  return data?.name ?? "?";
}

async function shouldThrottle(recipientId: string, actorId: string, type: string) {
  const since = new Date(Date.now() - THROTTLE_MS).toISOString();
  const { data } = await admin()
    .from("email_log")
    .select("id")
    .eq("recipient_id", recipientId)
    .eq("actor_id", actorId)
    .eq("type", type)
    .gte("sent_at", since)
    .limit(1);
  return (data ?? []).length > 0;
}

async function logEmail(recipientId: string, actorId: string, type: string) {
  const { error } = await admin()
    .from("email_log")
    .insert({ recipient_id: recipientId, actor_id: actorId, type });
  if (error) {
    console.error("[notify-email] email_log insert failed:", error.message);
  }
}

/** Шлёт письмо и логирует ошибку при сбое SMTP. */
async function safeSend(args: { to: string; subject: string; html: string; tag: string }) {
  try {
    await sendMail({ to: args.to, subject: args.subject, html: args.html });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[notify-email] SMTP send failed (${args.tag}): ${msg}`);
    return false;
  }
}

export async function notifyMatchByEmail(opts: {
  recipientId: string;
  actorId: string;
}) {
  const recipient = await fetchRecipient(opts.recipientId);
  if (!recipient) {
    console.warn("[notify-email] match skipped: no recipient");
    return { sent: false, reason: "no-recipient" };
  }
  if (!recipient.enabled) return { sent: false, reason: "disabled" };
  if (await shouldThrottle(opts.recipientId, opts.actorId, "match"))
    return { sent: false, reason: "throttled" };

  const actorName = await fetchActorName(opts.actorId);
  const s = STRINGS[recipient.locale];
  const ctaUrl = `${SITE_URL}/matches/${opts.actorId}`;
  const ok = await safeSend({
    to: recipient.email,
    subject: s.matchSubject(actorName),
    html: emailShell({
      title: s.matchTitle(actorName),
      body: `${s.matchBody(actorName)}<br><br><span style="color:#888;font-size:13px">${s.unsubHint}</span>`,
      ctaLabel: s.matchCta,
      ctaUrl,
      footer: s.footer,
    }),
    tag: "match",
  });
  if (!ok) return { sent: false, reason: "smtp" };
  await logEmail(opts.recipientId, opts.actorId, "match");
  return { sent: true };
}

export async function notifyMessageByEmail(opts: {
  recipientId: string;
  actorId: string;
  preview: string;
}) {
  const recipient = await fetchRecipient(opts.recipientId);
  if (!recipient) {
    console.warn("[notify-email] message skipped: no recipient");
    return { sent: false, reason: "no-recipient" };
  }
  if (!recipient.enabled) return { sent: false, reason: "disabled" };
  if (await shouldThrottle(opts.recipientId, opts.actorId, "message"))
    return { sent: false, reason: "throttled" };

  const actorName = await fetchActorName(opts.actorId);
  const s = STRINGS[recipient.locale];
  const ctaUrl = `${SITE_URL}/matches/${opts.actorId}`;
  const ok = await safeSend({
    to: recipient.email,
    subject: s.msgSubject(actorName),
    html: emailShell({
      title: s.msgTitle(actorName),
      body: `${s.msgBody(actorName, opts.preview)}<br><br><span style="color:#888;font-size:13px">${s.unsubHint}</span>`,
      ctaLabel: s.msgCta,
      ctaUrl,
      footer: s.footer,
    }),
    tag: "message",
  });
  if (!ok) return { sent: false, reason: "smtp" };
  await logEmail(opts.recipientId, opts.actorId, "message");
  return { sent: true };
}

export async function notifyReviewByEmail(opts: {
  recipientId: string;
  actorId: string;
  rating: number;
  body: string | null;
}) {
  const recipient = await fetchRecipient(opts.recipientId);
  if (!recipient) {
    console.warn("[notify-email] review skipped: no recipient");
    return { sent: false, reason: "no-recipient" };
  }
  if (!recipient.enabled) return { sent: false, reason: "disabled" };
  if (await shouldThrottle(opts.recipientId, opts.actorId, "review"))
    return { sent: false, reason: "throttled" };

  const actorName = await fetchActorName(opts.actorId);
  const s = STRINGS[recipient.locale];
  const ctaUrl = `${SITE_URL}/profile`;
  const ok = await safeSend({
    to: recipient.email,
    subject: s.reviewSubject(actorName, opts.rating),
    html: emailShell({
      title: s.reviewTitle(actorName, opts.rating),
      body: `${s.reviewBody(actorName, opts.rating, opts.body)}<br><br><span style="color:#888;font-size:13px">${s.unsubHint}</span>`,
      ctaLabel: s.reviewCta,
      ctaUrl,
      footer: s.footer,
    }),
    tag: "review",
  });
  if (!ok) return { sent: false, reason: "smtp" };
  await logEmail(opts.recipientId, opts.actorId, "review");
  return { sent: true };
}

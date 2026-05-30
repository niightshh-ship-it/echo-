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
    footer: "Echo · обмін навичками, без грошей",
    unsubHint: "Листи можна вимкнути будь-коли в налаштуваннях Echo.",
  },
};

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

/** Возвращает {email, name, avatar, locale, email_notifications} или null. */
async function fetchRecipient(userId: string) {
  const a = admin();
  const [{ data: profile }, { data: authUser }] = await Promise.all([
    a
      .from("profiles")
      .select("name, locale, email_notifications")
      .eq("id", userId)
      .maybeSingle(),
    a.auth.admin.getUserById(userId),
  ]);
  if (!profile || !authUser.user?.email) return null;
  return {
    email: authUser.user.email,
    name: profile.name ?? "?",
    locale: pickLocale((profile as { locale?: string }).locale),
    enabled: profile.email_notifications !== false,
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
  await admin()
    .from("email_log")
    .insert({ recipient_id: recipientId, actor_id: actorId, type });
}

export async function notifyMatchByEmail(opts: {
  recipientId: string;
  actorId: string;
}) {
  const recipient = await fetchRecipient(opts.recipientId);
  if (!recipient || !recipient.enabled) return { sent: false, reason: "disabled" };
  if (await shouldThrottle(opts.recipientId, opts.actorId, "match"))
    return { sent: false, reason: "throttled" };

  const actorName = await fetchActorName(opts.actorId);
  const s = STRINGS[recipient.locale];
  const ctaUrl = `${SITE_URL}/matches/${opts.actorId}`;
  await sendMail({
    to: recipient.email,
    subject: s.matchSubject(actorName),
    html: emailShell({
      title: s.matchTitle(actorName),
      body: `${s.matchBody(actorName)}<br><br><span style="color:#888;font-size:13px">${s.unsubHint}</span>`,
      ctaLabel: s.matchCta,
      ctaUrl,
      footer: s.footer,
    }),
  });
  await logEmail(opts.recipientId, opts.actorId, "match");
  return { sent: true };
}

export async function notifyMessageByEmail(opts: {
  recipientId: string;
  actorId: string;
  preview: string;
}) {
  const recipient = await fetchRecipient(opts.recipientId);
  if (!recipient || !recipient.enabled) return { sent: false, reason: "disabled" };
  if (await shouldThrottle(opts.recipientId, opts.actorId, "message"))
    return { sent: false, reason: "throttled" };

  const actorName = await fetchActorName(opts.actorId);
  const s = STRINGS[recipient.locale];
  const ctaUrl = `${SITE_URL}/matches/${opts.actorId}`;
  await sendMail({
    to: recipient.email,
    subject: s.msgSubject(actorName),
    html: emailShell({
      title: s.msgTitle(actorName),
      body: `${s.msgBody(actorName, opts.preview)}<br><br><span style="color:#888;font-size:13px">${s.unsubHint}</span>`,
      ctaLabel: s.msgCta,
      ctaUrl,
      footer: s.footer,
    }),
  });
  await logEmail(opts.recipientId, opts.actorId, "message");
  return { sent: true };
}

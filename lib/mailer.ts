// Тонкая обёртка над Brevo SMTP — используем для всех писем кроме входа.
import nodemailer from "nodemailer";

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
};

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  cachedTransport = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER!,
      pass: process.env.BREVO_SMTP_KEY!,
    },
  });
  return cachedTransport;
}

export async function sendMail({ to, subject, html }: SendArgs) {
  const transport = getTransport();
  await transport.sendMail({
    from: `Echo <${process.env.BREVO_SENDER_EMAIL!}>`,
    to,
    subject,
    html,
  });
}

// Общий конверт письма — те же цвета и шрифты что в письме с кодом
export function emailShell({
  title,
  body,
  ctaLabel,
  ctaUrl,
  footer,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer: string;
}) {
  return `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:auto;padding:32px 24px;color:#222;background:#ffffff">
  <h2 style="font-size:22px;margin:0 0 16px;font-weight:700">${title}</h2>
  <div style="color:#444;margin:0 0 22px;font-size:15px;line-height:1.55">${body}</div>
  ${
    ctaLabel && ctaUrl
      ? `<div style="margin:8px 0 22px"><a href="${ctaUrl}" style="display:inline-block;background:#7c5cff;color:#fff;text-decoration:none;font-weight:600;padding:14px 22px;border-radius:9999px;font-size:15px">${ctaLabel}</a></div>`
      : ""
  }
  <p style="color:#bbb;font-size:11px;margin-top:32px">${footer}</p>
</div>`;
}

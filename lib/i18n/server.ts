import "server-only";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "./config";
import { dictionaries, type Dictionary } from ".";

export const LOCALE_COOKIE = "locale";

// Определяем язык: сначала кука (выбор юзера), иначе заголовок браузера, иначе дефолт.
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;

  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  // "ru-RU,ru;q=0.9,en;q=0.8" → ["ru", "ru", "en"]
  const preferred = accept
    .split(",")
    .map((part) => part.split(";")[0].trim().split("-")[0].toLowerCase());

  for (const code of preferred) {
    if (isLocale(code)) return code;
  }
  return defaultLocale;
}

export async function getDictionary(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await getLocale();
  return { locale, dict: dictionaries[locale] };
}

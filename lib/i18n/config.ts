export const locales = ["en", "ru", "nl", "uk"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  nl: "Nederlands",
  uk: "Українська",
};

// Короткий код для значка (uk = укр., но показываем UA чтобы не путать с Британией)
export const localeShort: Record<Locale, string> = {
  en: "EN",
  ru: "RU",
  nl: "NL",
  uk: "UA",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

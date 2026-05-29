export const locales = ["en", "ru", "nl", "uk"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  nl: "Nederlands",
  uk: "Українська",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

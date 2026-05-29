"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from ".";
import type { Locale } from "./config";

type I18nValue = { dict: Dictionary; locale: Locale };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  dict,
  locale,
  children,
}: {
  dict: Dictionary;
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ dict, locale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// Удобный шорткат: const t = useT(); t.signIn.enter
export function useT(): Dictionary {
  return useI18n().dict;
}

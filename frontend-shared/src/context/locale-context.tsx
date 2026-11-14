"use client";

import * as React from "react";
import en from "@shared/assets/i18n/en.json";
import fr from "@shared/assets/i18n/fr.json";
import ar from "@shared/assets/i18n/ar.json";
import { Locale } from "@shared/enums";

const translations: Record<Locale, typeof en> = { en, fr, ar };
type NestedTranslationKeys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${NestedTranslationKeys<T[K]>}`;
}[keyof T & string];
export type TranslationKey = NestedTranslationKeys<typeof en>;

export type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Keep the server render and the first browser render identical. Restore the
  // saved preference in an effect after hydration to avoid markup mismatches.
  const [locale, setLocaleState] = React.useState<Locale>(Locale.ENGLISH);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("locale", next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  }, []);

  React.useEffect(() => {
    const savedLocale = window.localStorage.getItem("locale");
    const nextLocale = savedLocale === Locale.FRENCH || savedLocale === Locale.ARABIC ? savedLocale : Locale.ENGLISH;
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const value = React.useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within <LocaleProvider>");
  return ctx;
}

export function useTranslations() {
  const { locale } = useLocale();
  return React.useCallback((key: TranslationKey): string => {
    const value = key.split(".").reduce<unknown>((current, part) => {
      if (current && typeof current === "object" && part in current) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, translations[locale]);
    return typeof value === "string" ? value : key;
  }, [locale]);
}

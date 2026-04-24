"use client";

import { useEffect } from "react";
import { type Language } from "@/lib/language";
import { useLanguage } from "@/lib/useLanguage";

type LanguageRootSyncProps = {
  initialLanguage: Language;
};

export default function LanguageRootSync({ initialLanguage }: LanguageRootSyncProps) {
  const { language } = useLanguage(initialLanguage);

  useEffect(() => {
    const root = document.documentElement;
    const isBangla = language === "bn";

    root.lang = isBangla ? "bn" : "en";
    root.dataset.language = language;
    root.classList.toggle("lang-bn", isBangla);
    root.classList.toggle("lang-en", !isBangla);
  }, [language]);

  return null;
}

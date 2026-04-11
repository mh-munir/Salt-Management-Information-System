"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, loadStoredLanguage, saveStoredLanguage, type Language } from "@/lib/language";

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("language-changed", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("language-changed", onStoreChange);
  };
};

const getSnapshot = () => loadStoredLanguage();

export function useLanguage(initialLanguage: Language = DEFAULT_LANGUAGE) {
  const language = useSyncExternalStore(subscribe, getSnapshot, () => initialLanguage);

  const setStoredLanguage = (nextLanguage: Language) => {
    saveStoredLanguage(nextLanguage);
    window.dispatchEvent(new CustomEvent<Language>("language-changed", { detail: nextLanguage }));
  };

  return { language, setLanguage: setStoredLanguage };
}

import { useTranslation } from "react-i18next";

export type Language = "en" | "fr";

export function useLanguage() {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language as Language;

  const changeLanguage = async (lang: Language) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
  };

  return {
    currentLanguage,
    changeLanguage,
  };
}

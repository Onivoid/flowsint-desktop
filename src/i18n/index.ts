import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

const savedLanguage = localStorage.getItem("language");
// Auto-detect from browser/OS on first launch; fall back to English
const supportedLanguages = ["en", "fr"];
const browserLang = navigator.language.split("-")[0];
const detectedLanguage = supportedLanguages.includes(browserLang) ? browserLang : "en";
const lng = savedLanguage ?? detectedLanguage;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

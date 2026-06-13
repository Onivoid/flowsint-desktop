import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Sun, Moon, Monitor, Languages, RefreshCw } from "lucide-react";
import { useTheme, useLanguage } from "@/composables";
import { ROUTES } from "@/constants";
import { getVersion } from "@tauri-apps/api/app";

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [appVersion, setAppVersion] = useState<string>("");

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => { });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold">{t("settings.title")}</h1>

      <div className="w-full max-w-md space-y-6">
        {/* Theme Settings */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">{t("settings.theme.title")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.theme.description")}
          </p>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              <Sun className="mr-2 h-4 w-4" />
              {t("settings.theme.light")}
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
            >
              <Moon className="mr-2 h-4 w-4" />
              {t("settings.theme.dark")}
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}
            >
              <Monitor className="mr-2 h-4 w-4" />
              {t("settings.theme.system")}
            </Button>
          </div>
          {theme === "system" && (
            <p className="text-xs text-muted-foreground mt-3">
              {t("settings.theme.systemDescription")}
            </p>
          )}
        </div>

        {/* Language Settings */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">{t("settings.language.title")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.language.description")}
          </p>
          <div className="flex gap-2">
            <Button
              variant={currentLanguage === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => changeLanguage("en")}
            >
              <Languages className="mr-2 h-4 w-4" />
              {t("settings.language.en")}
            </Button>
            <Button
              variant={currentLanguage === "fr" ? "default" : "outline"}
              size="sm"
              onClick={() => changeLanguage("fr")}
            >
              <Languages className="mr-2 h-4 w-4" />
              {t("settings.language.fr")}
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">{t("settings.updates.title", "Updates")}</h2>
          {appVersion && (
            <p className="text-sm text-muted-foreground mb-4">
              {t("settings.updates.currentVersion", "Current version")}: v{appVersion}
            </p>
          )}
          <Link to={ROUTES.UPDATE}>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("settings.updates.check", "Check for updates")}
            </Button>
          </Link>
        </div>
      </div>

      <Link to={ROUTES.HOME}>
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
      </Link>
    </div>
  );
}

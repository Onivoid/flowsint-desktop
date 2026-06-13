import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bell, Minimize2, Maximize2, X, Info } from "lucide-react";
import { useWindow, useNotification, useTauriCommand } from "@/composables";
import { ROUTES } from "@/constants";

interface SystemInfo {
  os: string;
  arch: string;
  family: string;
}

export default function Examples() {
  const { t } = useTranslation();
  const { minimize, close, toggleMaximize } = useWindow();
  const { notify } = useNotification();
  const { data: systemInfo, execute: fetchSystemInfo } = useTauriCommand<SystemInfo>("get_system_info");

  const handleNotification = async () => {
    await notify(
      t("examples.notifications.test.title"),
      t("examples.notifications.test.body")
    );
  };

  const handleSystemInfo = async () => {
    await fetchSystemInfo();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold">{t("examples.title")}</h1>
      <p className="text-lg text-muted-foreground max-w-2xl text-center">
        {t("examples.subtitle")}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
        {/* Window Controls */}
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            {t("examples.window.title")}
          </h3>
          <div className="flex flex-col gap-2">
            <Button onClick={minimize} variant="outline" size="sm">
              <Minimize2 className="mr-2 h-4 w-4" />
              {t("examples.window.minimize")}
            </Button>
            <Button onClick={toggleMaximize} variant="outline" size="sm">
              <Maximize2 className="mr-2 h-4 w-4" />
              {t("examples.window.maximize")}
            </Button>
            <Button onClick={close} variant="destructive" size="sm">
              <X className="mr-2 h-4 w-4" />
              {t("examples.window.close")}
            </Button>
          </div>
        </div>

        {/* Notifications */}
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("examples.notifications.title")}
          </h3>
          <Button onClick={handleNotification} variant="outline" size="sm" className="w-full">
            {t("examples.notifications.send")}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            {t("examples.notifications.description")}
          </p>
        </div>

        {/* System Info */}
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            {t("examples.system.title")}
          </h3>
          <Button onClick={handleSystemInfo} variant="outline" size="sm" className="w-full mb-3">
            {t("examples.system.get")}
          </Button>
          {systemInfo && (
            <div className="text-xs space-y-1">
              <p><strong>{t("examples.system.os")}:</strong> {systemInfo.os}</p>
              <p><strong>{t("examples.system.arch")}:</strong> {systemInfo.arch}</p>
              <p><strong>{t("examples.system.family")}:</strong> {systemInfo.family}</p>
            </div>
          )}
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

import { useState } from "react";
import { useUpdater } from "@/composables";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

export function Updater() {
    const { t } = useTranslation();
    const { update, downloadProgress, dismissed, dismiss, downloadAndInstall } =
        useUpdater();
    const [installing, setInstalling] = useState(false);

    const handleInstall = async () => {
        setInstalling(true);
        try {
            await downloadAndInstall();
            // downloadAndInstall() calls relaunch() on success
        } catch (error) {
            console.error("[Updater] Install failed:", error);
            setInstalling(false);
        }
    };

    if (!update?.available || dismissed) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-4 max-w-sm z-50">
            <div className="flex flex-col gap-3">
                <div>
                    <h3 className="font-semibold text-sm">
                        {t("updater.title", "Update Available")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {t("updater.version", `Version ${update.version} is available`)}
                    </p>
                </div>

                {installing && (
                    <div className="space-y-1">
                        <div className="w-full bg-secondary rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${downloadProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            {downloadProgress}%
                        </p>
                    </div>
                )}

                <div className="flex gap-2">
                    <Button
                        onClick={handleInstall}
                        disabled={installing}
                        size="sm"
                        className="flex-1"
                    >
                        {installing
                            ? t("updater.downloading", "Downloading...")
                            : t("updater.install", "Install")}
                    </Button>
                    <Button
                        onClick={dismiss}
                        disabled={installing}
                        variant="outline"
                        size="sm"
                    >
                        {t("updater.later", "Later")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

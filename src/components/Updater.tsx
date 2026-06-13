import { useEffect, useRef, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

export function Updater() {
    const { t } = useTranslation();
    const [update, setUpdate] = useState<Update | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [dismissed, setDismissed] = useState(false);
    const totalSize = useRef<number>(0);
    const downloaded = useRef<number>(0);

    useEffect(() => {
        console.log("[Updater] Checking for updates...");
        check()
            .then((u) => {
                console.log("[Updater] check() result:", u);
                if (u?.available) {
                    console.log("[Updater] Update available:", u.version);
                    setUpdate(u);
                } else {
                    console.log("[Updater] No update available");
                }
            })
            .catch((err) => console.error("[Updater] check() failed:", err));
    }, []);

    async function downloadAndInstall() {
        if (!update) return;
        try {
            setDownloading(true);
            downloaded.current = 0;
            totalSize.current = 0;

            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case "Started":
                        totalSize.current = event.data.contentLength ?? 0;
                        setDownloadProgress(0);
                        break;
                    case "Progress":
                        downloaded.current += event.data.chunkLength;
                        if (totalSize.current > 0) {
                            setDownloadProgress(
                                Math.min(99, Math.round((downloaded.current / totalSize.current) * 100))
                            );
                        }
                        break;
                    case "Finished":
                        setDownloadProgress(100);
                        break;
                }
            });

            await relaunch();
        } catch (error) {
            console.error("Failed to download and install update:", error);
            setDownloading(false);
        }
    }

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

                {downloading && (
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
                        onClick={downloadAndInstall}
                        disabled={downloading}
                        size="sm"
                        className="flex-1"
                    >
                        {downloading
                            ? t("updater.downloading", "Downloading...")
                            : t("updater.install", "Install")}
                    </Button>
                    <Button
                        onClick={() => setDismissed(true)}
                        disabled={downloading}
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

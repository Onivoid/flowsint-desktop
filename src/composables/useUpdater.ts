import { useEffect, useRef, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useTranslation } from "react-i18next";
import { useNotification } from "./useNotification";

// Module-level flag so the system notification fires only once across
// all hook instances (Startup + Updater both call useUpdater).
let _notificationSent = false;

export function useUpdater() {
    const [update, setUpdate] = useState<Update | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    // Refs let runStartup() read the latest values synchronously inside
    // a useCallback without needing them as dependencies.
    const updateRef = useRef<Update | null>(null);
    const checkedRef = useRef(false);

    const { notify } = useNotification();
    const { t } = useTranslation();

    useEffect(() => {
        console.log("[Updater] Checking for updates...");
        check()
            .then((u) => {
                console.log("[Updater] check() result:", u);
                if (u?.available) {
                    console.log("[Updater] Update available:", u.version);
                    updateRef.current = u;
                    setUpdate(u);

                    if (!_notificationSent) {
                        _notificationSent = true;
                        notify(
                            t("updater.title", "Update Available"),
                            `Version ${u.version}`,
                        );
                    }
                } else {
                    console.log("[Updater] No update available");
                }
            })
            .catch((err) => {
                console.error("[Updater] check() failed:", err);
            })
            .finally(() => {
                checkedRef.current = true;
            });
    }, []);

    /**
     * Download and install the pending update with optional progress callback.
     * Calls relaunch() on success. Throws on failure so callers can handle errors.
     */
    const downloadAndInstall = async (
        onProgress?: (pct: number) => void,
    ): Promise<void> => {
        const target = updateRef.current;
        if (!target) throw new Error("No update available");

        setDownloadProgress(0);
        let downloaded = 0;
        let total = 0;

        await target.downloadAndInstall((event) => {
            if (event.event === "Started") {
                total = event.data.contentLength ?? 0;
            } else if (event.event === "Progress") {
                downloaded += event.data.chunkLength;
                const pct =
                    total > 0
                        ? Math.min(99, Math.round((downloaded / total) * 100))
                        : 0;
                setDownloadProgress(pct);
                onProgress?.(pct);
            } else if (event.event === "Finished") {
                setDownloadProgress(100);
                onProgress?.(100);
            }
        });

        await relaunch();
    };

    return {
        update,
        updateRef,
        checkedRef,
        downloadProgress,
        dismissed,
        dismiss: () => setDismissed(true),
        downloadAndInstall,
    };
}

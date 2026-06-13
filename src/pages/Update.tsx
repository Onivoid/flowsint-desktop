import { useEffect, useRef, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { ROUTES } from "@/constants";
import { useTranslation } from "react-i18next";

type CheckStatus = "idle" | "checking" | "available" | "up-to-date" | "error";

export default function UpdatePage() {
    const { t } = useTranslation();
    const [status, setStatus] = useState<CheckStatus>("idle");
    const [update, setUpdate] = useState<Update | null>(null);
    const [currentVersion, setCurrentVersion] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const totalSize = useRef<number>(0);
    const downloaded = useRef<number>(0);

    useEffect(() => {
        getVersion().then(setCurrentVersion).catch(() => { });
        runCheck();
    }, []);

    async function runCheck() {
        setStatus("checking");
        setError("");
        setUpdate(null);
        try {
            const u = await check();
            if (u?.available) {
                setUpdate(u);
                setStatus("available");
            } else {
                setStatus("up-to-date");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            setStatus("error");
        }
    }

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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            setStatus("error");
            setDownloading(false);
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
            <h1 className="text-4xl font-bold">{t("update.title")}</h1>

            <div className="w-full max-w-md space-y-4">
                <div className="border rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t("update.currentVersion")}</span>
                        <span className="font-mono text-sm font-semibold">
                            {currentVersion ? `v${currentVersion}` : "—"}
                        </span>
                    </div>

                    {status === "available" && update && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t("update.availableVersion")}</span>
                            <span className="font-mono text-sm font-semibold text-primary">
                                {update.version}
                            </span>
                        </div>
                    )}

                    <div className="border-t pt-4">
                        {status === "idle" && (
                            <p className="text-sm text-muted-foreground">{t("update.checkButton")}</p>
                        )}

                        {status === "checking" && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                {t("update.checking")}
                            </div>
                        )}

                        {status === "up-to-date" && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                {t("update.upToDate")}
                            </div>
                        )}

                        {status === "available" && update && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-primary">
                                    <AlertCircle className="h-4 w-4" />
                                    {t("update.available")}: {update.version}
                                </div>
                                {update.body && (
                                    <p className="text-xs text-muted-foreground bg-muted rounded p-2 whitespace-pre-wrap">
                                        {update.body}
                                    </p>
                                )}
                            </div>
                        )}

                        {status === "error" && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                    <XCircle className="h-4 w-4" />
                                    {t("update.checkFailed")}
                                </div>
                                {error && (
                                    <p className="text-xs font-mono text-destructive bg-destructive/10 rounded p-2 break-all">
                                        {error}
                                    </p>
                                )}
                            </div>
                        )}
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
                                {t("update.downloading")} {downloadProgress}%
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        {status === "available" ? (
                            <Button
                                onClick={downloadAndInstall}
                                disabled={downloading}
                                className="flex-1"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                {downloading ? t("update.installing") : t("update.installButton")}
                            </Button>
                        ) : (
                            <Button
                                onClick={runCheck}
                                disabled={status === "checking"}
                                variant="outline"
                                className="flex-1"
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${status === "checking" ? "animate-spin" : ""}`} />
                                {t("update.checkButton")}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Link to={ROUTES.SETTINGS}>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t("common.back")}
                </Button>
            </Link>
        </div>
    );
}

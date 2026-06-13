import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { join } from "@tauri-apps/api/path";
import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, Update } from "@tauri-apps/plugin-updater";
import { CheckCircle2, CircleAlert, Download, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDocker, useSetup, usePullProgress, DockerStatus, DockerPaths } from "@/composables";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type Step =
  | "idle"
  | "checking_docker"
  | "docker_not_found"
  | "docker_not_running"
  | "setting_up"
  | "pulling"
  | "starting"
  | "waiting"
  | "checking_update"
  | "update_available"
  | "installing_update"
  | "ready"
  | "error";

interface StepItem {
  id: string;
  labelKey: string;
  activeSteps: Step[];
  doneSteps: Step[];
  firstRunOnly?: boolean;
}

const STEPS: StepItem[] = [
  {
    id: "check",
    labelKey: "startup.steps.check",
    activeSteps: ["checking_docker"],
    doneSteps: ["setting_up", "pulling", "starting", "waiting", "checking_update", "update_available", "installing_update", "ready"],
  },
  {
    id: "setup",
    labelKey: "startup.steps.setup",
    activeSteps: ["setting_up"],
    doneSteps: ["pulling", "starting", "waiting", "checking_update", "update_available", "installing_update", "ready"],
    firstRunOnly: true,
  },
  {
    id: "pull",
    labelKey: "startup.steps.pull",
    activeSteps: ["pulling"],
    doneSteps: ["starting", "waiting", "checking_update", "update_available", "installing_update", "ready"],
    firstRunOnly: true,
  },
  {
    id: "start",
    labelKey: "startup.steps.start",
    activeSteps: ["starting", "waiting"],
    doneSteps: ["checking_update", "update_available", "installing_update", "ready"],
  },
  {
    id: "ready",
    labelKey: "startup.steps.ready",
    activeSteps: [],
    doneSteps: ["ready"],
  },
];

// ── Main component ─────────────────────────────────────────────────────────

export default function Startup() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("idle");
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const hasStarted = useRef(false);

  const { checkDocker, pullImages, startStack, healthCheck } = useDocker();
  const { isFirstRun: checkFirstRun, initializeAppData } = useSetup();
  const { lastLine: pullProgressLine } = usePullProgress(3);

  // ── Startup sequence ─────────────────────────────────────────────────────

  const runStartup = useCallback(async () => {
    try {
      setStep("checking_docker");
      let dockerStatus: DockerStatus;
      try {
        dockerStatus = await checkDocker();
      } catch {
        dockerStatus = "not_found";
      }

      if (dockerStatus === "not_found") { setStep("docker_not_found"); return; }
      if (dockerStatus === "not_running") { setStep("docker_not_running"); return; }

      const firstRun = await checkFirstRun();
      setIsFirstRun(firstRun);

      if (firstRun) setStep("setting_up");
      const dataDir = await initializeAppData();
      const resolvedPaths: DockerPaths = {
        composePath: await join(dataDir, 'docker-compose.desktop.yml'),
        envPath: await join(dataDir, '.env'),
      };

      if (firstRun) {
        setStep("pulling");
        await pullImages(resolvedPaths);
      }

      setStep("starting");
      await startStack(resolvedPaths);

      setStep("waiting");
      await waitForHealth();

      // Check for updates before navigating
      setStep("checking_update");
      const update = await checkForUpdate();
      if (update?.available) {
        setPendingUpdate(update);
        setStep("update_available");
        return; // pause — user picks install or skip
      }

      setStep("ready");
      await navigateToFlowsint();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStep("error");
    }
  }, [checkDocker, checkFirstRun, initializeAppData, pullImages, startStack, healthCheck]);

  const waitForHealth = async () => {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      const ok = await healthCheck();
      if (ok) return;
      await sleep(1000);
    }
    throw new Error("Flowsint did not become ready within 2 minutes.");
  };

  const checkForUpdate = async (): Promise<Update | null> => {
    try {
      return await check();
    } catch {
      return null; // non-blocking — update check failure should never block startup
    }
  };

  const installUpdate = async () => {
    if (!pendingUpdate) return;
    try {
      setStep("installing_update");
      setUpdateProgress(0);
      let downloaded = 0;
      let total = 0;

      await pendingUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) setUpdateProgress(Math.min(99, Math.round((downloaded / total) * 100)));
        } else if (event.event === "Finished") {
          setUpdateProgress(100);
        }
      });

      await relaunch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStep("error");
    }
  };

  const skipUpdate = async () => {
    setStep("ready");
    await navigateToFlowsint();
  };

  const navigateToFlowsint = async () => {
    const win = getCurrentWindow();
    await win.setSize(new LogicalSize(1440, 900));
    await win.setResizable(true);
    await win.center();
    window.location.href = "http://127.0.0.1:5173";
  };

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    runStartup();
  }, [runStartup]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const visibleSteps = STEPS.filter((s) => !s.firstRunOnly || isFirstRun);
  const isError = step === "docker_not_found" || step === "docker_not_running" || step === "error";
  const isUpdateStep = step === "update_available" || step === "installing_update";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="Flowsint" className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">Flowsint</h1>
            <p className="text-xs text-muted-foreground">Open-source OSINT graph explorer</p>
          </div>
        </div>

        {/* ── Error states ── */}
        {step === "docker_not_found" && (
          <ErrorCard
            title={t("startup.errors.not_found.title")}
            description={t("startup.errors.not_found.description")}
            actions={
              <>
                <PrimaryButton onClick={() => openUrl("https://docs.docker.com/desktop/")}>
                  {t("startup.actions.install_docker")}
                </PrimaryButton>
                <GhostButton onClick={runStartup}>{t("startup.actions.retry")}</GhostButton>
              </>
            }
          />
        )}

        {step === "docker_not_running" && (
          <ErrorCard
            title={t("startup.errors.not_running.title")}
            description={t("startup.errors.not_running.description")}
            actions={<GhostButton onClick={runStartup}>{t("startup.actions.retry")}</GhostButton>}
          />
        )}

        {step === "error" && (
          <ErrorCard
            title={t("startup.errors.generic.title")}
            description={errorMessage || t("startup.errors.generic.description")}
            actions={<GhostButton onClick={runStartup}>{t("startup.actions.retry")}</GhostButton>}
          />
        )}

        {/* ── Update card ── */}
        {isUpdateStep && (
          <UpdateCard
            version={pendingUpdate?.version ?? ""}
            progress={updateProgress}
            isInstalling={step === "installing_update"}
            onInstall={installUpdate}
            onSkip={skipUpdate}
            t={t}
          />
        )}

        {/* ── Step list (hidden during error or update card) ── */}
        {!isError && !isUpdateStep && (
          <div className="space-y-3">
            {visibleSteps.map((s) => {
              const isActive = s.activeSteps.includes(step) || (s.id === "ready" && step === "checking_update");
              const isDone = s.doneSteps.includes(step);
              const isPending = !isActive && !isDone;

              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-border" />
                    )}
                  </div>
                  <span className={cn(
                    "text-sm",
                    isDone && "text-foreground",
                    isActive && "text-foreground font-medium",
                    isPending && "text-muted-foreground"
                  )}>
                    {t(s.labelKey)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pull progress */}
        {step === "pulling" && pullProgressLine && (
          <p className="text-xs text-muted-foreground font-mono truncate bg-muted/40 px-3 py-1.5 rounded-md">
            {pullProgressLine}
          </p>
        )}
        {step === "pulling" && (
          <p className="text-xs text-muted-foreground">{t("startup.first_run_notice")}</p>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function UpdateCard({
  version,
  progress,
  isInstalling,
  onInstall,
  onSkip,
  t,
}: {
  version: string;
  progress: number;
  isInstalling: boolean;
  onInstall: () => void;
  onSkip: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-primary" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            {t("startup.update.available_title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("startup.update.available_desc", { version })}
          </p>
        </div>
      </div>

      {isInstalling && (
        <div className="space-y-1.5">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {progress < 100
              ? t("startup.update.progress", { percent: progress })
              : t("startup.update.downloading")}
          </p>
        </div>
      )}

      {!isInstalling && (
        <div className="flex gap-2">
          <PrimaryButton onClick={onInstall} icon={<Download className="w-3.5 h-3.5" />}>
            {t("startup.update.install")}
          </PrimaryButton>
          <GhostButton onClick={onSkip}>{t("startup.update.skip")}</GhostButton>
        </div>
      )}
    </div>
  );
}

function ErrorCard({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <CircleAlert className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
    >
      {icon}
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors text-foreground"
    >
      {children}
    </button>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

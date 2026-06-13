import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
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
    doneSteps: ["setting_up", "pulling", "starting", "waiting", "ready"],
  },
  {
    id: "setup",
    labelKey: "startup.steps.setup",
    activeSteps: ["setting_up"],
    doneSteps: ["pulling", "starting", "waiting", "ready"],
    firstRunOnly: true,
  },
  {
    id: "pull",
    labelKey: "startup.steps.pull",
    activeSteps: ["pulling"],
    doneSteps: ["starting", "waiting", "ready"],
    firstRunOnly: true,
  },
  {
    id: "start",
    labelKey: "startup.steps.start",
    activeSteps: ["starting", "waiting"],
    doneSteps: ["ready"],
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
  const hasStarted = useRef(false);

  const { checkDocker, pullImages, startStack, healthCheck } = useDocker();
  const { isFirstRun: checkFirstRun, initializeAppData } = useSetup();
  const { lastLine: pullProgressLine } = usePullProgress(3);

  // ── Startup sequence ─────────────────────────────────────────────────────

  const runStartup = async () => {
    try {
      // 1. Check Docker
      setStep("checking_docker");
      let dockerStatus: DockerStatus;
      try {
        dockerStatus = await checkDocker();
      } catch {
        dockerStatus = "not_found";
      }

      if (dockerStatus === "not_found") {
        setStep("docker_not_found");
        return;
      }
      if (dockerStatus === "not_running") {
        setStep("docker_not_running");
        return;
      }

      // 2. Detect first run
      const firstRun = await checkFirstRun();
      setIsFirstRun(firstRun);

      // 3. Setup AppData (first run: copy compose + generate .env)
      if (firstRun) setStep("setting_up");
      const dataDir = await initializeAppData();
      const resolvedPaths: DockerPaths = {
        composePath: `${dataDir}\\docker-compose.desktop.yml`,
        envPath: `${dataDir}\\.env`,
      };

      // 4. Pull images on first run
      if (firstRun) {
        setStep("pulling");
        await pullImages(resolvedPaths);
      }

      // 5. Start stack
      setStep("starting");
      await startStack(resolvedPaths);

      // 6. Wait for health
      setStep("waiting");
      await waitForHealth();

      // 7. Ready — resize window then navigate
      setStep("ready");
      await navigateToFlowsint();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStep("error");
    }
  };

  const waitForHealth = async () => {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      const ok = await healthCheck();
      if (ok) return;
      await sleep(1000);
    }
    throw new Error("Flowsint did not become ready within 2 minutes.");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────

  const visibleSteps = STEPS.filter((s) => !s.firstRunOnly || isFirstRun);
  const isError =
    step === "docker_not_found" || step === "docker_not_running" || step === "error";

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

        {/* Error states */}
        {step === "docker_not_found" && (
          <ErrorCard
            title={t("startup.errors.not_found.title")}
            description={t("startup.errors.not_found.description")}
            actions={
              <>
                <button
                  onClick={() => openUrl("https://docs.docker.com/desktop/")}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  {t("startup.actions.install_docker")}
                </button>
                <RetryButton label={t("startup.actions.retry")} onClick={runStartup} />
              </>
            }
          />
        )}

        {step === "docker_not_running" && (
          <ErrorCard
            title={t("startup.errors.not_running.title")}
            description={t("startup.errors.not_running.description")}
            actions={<RetryButton label={t("startup.actions.retry")} onClick={runStartup} />}
          />
        )}

        {step === "error" && (
          <ErrorCard
            title={t("startup.errors.generic.title")}
            description={errorMessage || t("startup.errors.generic.description")}
            actions={<RetryButton label={t("startup.actions.retry")} onClick={runStartup} />}
          />
        )}

        {/* Step list */}
        {!isError && (
          <div className="space-y-3">
            {visibleSteps.map((s) => {
              const isActive = s.activeSteps.includes(step);
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
                  <span
                    className={cn(
                      "text-sm",
                      isDone && "text-foreground",
                      isActive && "text-foreground font-medium",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {t(s.labelKey)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pull progress message */}
        {step === "pulling" && pullProgressLine && (
          <p className="text-xs text-muted-foreground font-mono truncate bg-muted/40 px-3 py-1.5 rounded-md">
            {pullProgressLine}
          </p>
        )}

        {/* First-run notice */}
        {step === "pulling" && (
          <p className="text-xs text-muted-foreground">
            {t("startup.first_run_notice")}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

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

function RetryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors text-foreground"
    >
      {label}
    </button>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

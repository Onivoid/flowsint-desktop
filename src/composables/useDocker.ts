import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type DockerStatus = "ok" | "not_found" | "not_running";

export interface DockerPaths {
  composePath: string;
  envPath: string;
}

// ── useDocker ──────────────────────────────────────────────────────────────

/**
 * Low-level composable for interacting with the Docker Rust commands.
 * Exposes each command as an async function.
 */
export function useDocker() {
  /** Check if Docker is installed and the daemon is running. */
  const checkDocker = useCallback((): Promise<DockerStatus> => {
    return invoke<DockerStatus>("check_docker");
  }, []);

  /**
   * Pull all Flowsint images (first run).
   * Progress lines are emitted as "docker://pull-progress" Tauri events —
   * use usePullProgress() to subscribe.
   */
  const pullImages = useCallback(
    (paths: DockerPaths): Promise<void> => {
      return invoke("pull_images", {
        composePath: paths.composePath,
        envPath: paths.envPath,
      });
    },
    []
  );

  /** Start the Flowsint Docker stack in detached mode. */
  const startStack = useCallback(
    (paths: DockerPaths): Promise<void> => {
      return invoke("start_stack", {
        composePath: paths.composePath,
        envPath: paths.envPath,
      });
    },
    []
  );

  /** Check if the Flowsint UI is reachable on port 5173. */
  const healthCheck = useCallback((): Promise<boolean> => {
    return invoke<boolean>("health_check");
  }, []);

  return { checkDocker, pullImages, startStack, healthCheck };
}

// ── useSetup ───────────────────────────────────────────────────────────────

/**
 * Composable for setup-related Rust commands (AppData dir, first-run, init).
 */
export function useSetup() {
  /** Returns true if this is a first run (no .initialized marker in AppData). */
  const isFirstRun = useCallback((): Promise<boolean> => {
    return invoke<boolean>("is_first_run");
  }, []);

  /**
   * Copy compose file + generate .env with random secrets.
   * Returns the AppData directory path.
   */
  const initializeAppData = useCallback((): Promise<string> => {
    return invoke<string>("initialize_app_data");
  }, []);

  /**
   * Write the `.initialized` marker after a successful first-run pull.
   * Subsequent launches will skip the image pull step.
   */
  const markInitialized = useCallback((): Promise<void> => {
    return invoke("mark_initialized");
  }, []);

  return { isFirstRun, initializeAppData, markInitialized };
}

// ── usePullProgress ────────────────────────────────────────────────────────

/**
 * Subscribes to docker://pull-progress events and accumulates messages.
 * Keeps only the last N lines to avoid memory growth.
 */
export function usePullProgress(maxLines = 5) {
  const [lines, setLines] = useState<string[]>([]);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    let active = true;

    listen<string>("docker://pull-progress", (event) => {
      if (!active) return;
      setLines((prev) => {
        const next = [...prev, event.payload];
        return next.length > maxLines ? next.slice(-maxLines) : next;
      });
    }).then((fn) => {
      unlistenRef.current = fn;
    });

    return () => {
      active = false;
      unlistenRef.current?.();
    };
  }, [maxLines]);

  const clear = useCallback(() => setLines([]), []);

  return { lines, lastLine: lines[lines.length - 1] ?? "", clear };
}

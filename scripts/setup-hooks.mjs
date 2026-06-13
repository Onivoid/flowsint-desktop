/**
 * Cross-platform git hooks setup (replaces setup-hooks.sh).
 * Runs on Windows, macOS, and Linux without requiring bash in PATH.
 */
import { execSync } from "child_process";
import { chmodSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Point git to the .githooks directory
execSync("git config core.hooksPath .githooks", { cwd: root, stdio: "inherit" });

// Make hook files executable on Unix-like systems
if (process.platform !== "win32") {
    const hooks = ["pre-commit", "post-commit"];
    for (const hook of hooks) {
        const p = join(root, ".githooks", hook);
        if (existsSync(p)) chmodSync(p, 0o755);
    }
}

console.log("✓ Git hooks installed (.githooks/)");

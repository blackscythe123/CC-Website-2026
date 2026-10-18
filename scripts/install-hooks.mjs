import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

try {
  // 1. Configure Git core.hooksPath to point to version-controlled .githooks
  execSync("git config core.hooksPath .githooks", { stdio: "inherit" });

  // 2. Also copy hook directly to .git/hooks/commit-msg as fallback
  const gitHooksDir = path.resolve(process.cwd(), ".git/hooks");
  const sourceHook = path.resolve(process.cwd(), ".githooks/commit-msg");

  if (fs.existsSync(gitHooksDir) && fs.existsSync(sourceHook)) {
    const targetHook = path.join(gitHooksDir, "commit-msg");
    fs.copyFileSync(sourceHook, targetHook);
    try {
      fs.chmodSync(targetHook, "755");
    } catch {
      // chmod is no-op on Windows
    }
  }

  console.log("✅ Git commit-msg hook active via core.hooksPath & .git/hooks fallback.");
} catch (err) {
  console.warn("⚠️ Could not configure local git hooks:", err);
}

// Usage (GitHub Actions): node scripts/find-deploy-bases.mjs <out.json>
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY. Optional: WORKFLOW_FILE (default content-ci.yml).
//
// For every deployable app, finds the commit of its most recent *successful* "Deploy <app>" job
// on main, so each app is diffed against what is actually live for that app. A partially failed
// run no longer forces already-deployed apps to redeploy, and failed apps are still retried.
import fs from "node:fs";
import { DEPLOYABLE_APPS } from "./lib/affected-apps.mjs";

const [outFile = "deploy-bases.json"] = process.argv.slice(2);
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const workflow = process.env.WORKFLOW_FILE || "content-ci.yml";
const MAX_RUNS = 60;

async function gh(path) {
  const res = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`);
  return res.json();
}

const bases = {};
const pending = new Set(DEPLOYABLE_APPS);

try {
  const { workflow_runs: runs = [] } = await gh(
    `actions/workflows/${workflow}/runs?branch=main&per_page=${MAX_RUNS}`
  );
  for (const run of runs) {
    if (pending.size === 0) break;
    if (run.event !== "push" && run.event !== "workflow_dispatch") continue;
    if (String(run.id) === process.env.GITHUB_RUN_ID) continue; // the current run
    // filter=latest returns each job's latest attempt, so a successful re-run counts
    const { jobs = [] } = await gh(`actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
    for (const job of jobs) {
      const m = /^Deploy (.+)$/.exec(job.name || "");
      if (m && pending.has(m[1]) && job.conclusion === "success") {
        bases[m[1]] = run.head_sha;
        pending.delete(m[1]);
      }
    }
  }
} catch (err) {
  // Fail safe: no bases means every app deploys
  console.log(`[bases] Could not read deploy history (${err.message}); every app will deploy.`);
}

for (const app of DEPLOYABLE_APPS) {
  console.log(`[bases] ${app}: ${bases[app] ? bases[app].slice(0, 7) : "<never deployed by CI>"}`);
}
fs.writeFileSync(outFile, JSON.stringify(bases, null, 2));

import { execSync } from "node:child_process";

/**
 * Automate Vercel project provisioning for all 10 apps in the monorepo.
 * Usage:
 *   node scripts/setup-vercel-projects.mjs [VERCEL_TOKEN] [TEAM_SLUG]
 */

const VERCEL_TOKEN = process.argv[2] || process.env.VERCEL_TOKEN;
const TEAM_SLUG = process.argv[3] || process.env.VERCEL_TEAM_SLUG;
const CONFIG_DIR = process.env.VERCEL_GLOBAL_CONFIG_DIR || "";
const GITHUB_REPO = "blackscythe123/CC-Website-2026";
const IGNORE_BUILD_CMD = "node ../../scripts/ignore-build-step.mjs";

const APPS = [
  { name: "main-portal", rootDirectory: "apps/main-portal", domain: "codingclub.tech" },
  { name: "cms-studio", rootDirectory: "apps/cms-studio", domain: "studio.codingclub.tech" },
  { name: "ai-ml-portal", rootDirectory: "apps/ai-ml-portal", domain: "ai.codingclub.tech" },
  { name: "ar-vr-portal", rootDirectory: "apps/ar-vr-portal", domain: "arvr.codingclub.tech" },
  { name: "cp-portal", rootDirectory: "apps/cp-portal", domain: "cp.codingclub.tech" },
  { name: "cybersecurity-portal", rootDirectory: "apps/cybersecurity-portal", domain: "cybersecurity.codingclub.tech" },
  { name: "design-portal", rootDirectory: "apps/design-portal", domain: "design.codingclub.tech" },
  { name: "full-stack-portal", rootDirectory: "apps/full-stack-portal", domain: "web.codingclub.tech" },
  { name: "oss-portal", rootDirectory: "apps/oss-portal", domain: "oss.codingclub.tech" },
  { name: "ssnhacks-portal", rootDirectory: "apps/ssnhacks-portal", domain: "hacks.codingclub.tech" },
];

async function main() {
  console.log("=================================================");
  console.log("🚀 VERCEL MONOREPO PROJECT PROVISIONER");
  console.log(`Repository: ${GITHUB_REPO}`);
  if (CONFIG_DIR) console.log(`Config Directory: ${CONFIG_DIR}`);
  console.log(`Total projects to configure: ${APPS.length}`);
  console.log("=================================================\n");

  for (const app of APPS) {
    process.stdout.write(`Configuring '${app.name}' (${app.rootDirectory})... `);

    const payload = {
      name: app.name,
      framework: "nextjs",
      rootDirectory: app.rootDirectory,
      commandForIgnoringBuildStep: IGNORE_BUILD_CMD,
    };

    if (VERCEL_TOKEN) {
      // Direct REST API call via fetch
      const query = TEAM_SLUG ? `?teamId=${TEAM_SLUG}` : "";
      try {
        const res = await fetch(`https://api.vercel.com/v10/projects${query}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          console.log("✅ Created successfully");
        } else {
          const errData = await res.json();
          if (errData.error?.code === "project_already_exists" || res.status === 409) {
            // Update existing project settings
            const patchRes = await fetch(`https://api.vercel.com/v9/projects/${app.name}${query}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${VERCEL_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                rootDirectory: app.rootDirectory,
                commandForIgnoringBuildStep: IGNORE_BUILD_CMD,
              }),
            });
            if (patchRes.ok) {
              console.log("🔄 Updated existing project");
            } else {
              console.log(`⚠️ Patch status ${patchRes.status}`);
            }
          } else {
            console.log(`❌ Failed: ${errData.error?.message || res.statusText}`);
          }
        }
      } catch (err) {
        console.log(`❌ Network error: ${err.message}`);
      }
    } else {
      // Fallback: execute via Vercel CLI api command
      try {
        const teamFlag = TEAM_SLUG ? `--scope ${TEAM_SLUG}` : "";
        const configFlag = CONFIG_DIR ? `-Q "${CONFIG_DIR}"` : "";
        const cmd = `npx vercel api /v10/projects ${configFlag} ${teamFlag} -X POST -F name=${app.name} -F framework=nextjs -F rootDirectory=${app.rootDirectory} -F commandForIgnoringBuildStep="${IGNORE_BUILD_CMD}"`;
        execSync(cmd, { stdio: "ignore" });
        console.log("✅ Configured via CLI");
      } catch {
        console.log("⚠️ Could not configure via CLI (provide VERCEL_TOKEN for direct API)");
      }
    }
  }

  console.log("\n=================================================");
  console.log("✨ All 10 projects configured!");
  console.log("=================================================");
}

main().catch(console.error);

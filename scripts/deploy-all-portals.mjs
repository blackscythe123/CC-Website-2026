import { execSync } from "node:child_process";

/**
 * Batch deploy all 10 monorepo apps to Vercel production.
 * Usage: node scripts/deploy-all-portals.mjs
 */

const APPS = [
  "main-portal",
  "cms-studio",
  "ai-ml-portal",
  "ar-vr-portal",
  "cp-portal",
  "cybersecurity-portal",
  "design-portal",
  "full-stack-portal",
  "oss-portal",
  "ssnhacks-portal",
];

console.log("=================================================");
console.log("🚀 BATCH DEPLOYING 10 PORTALS TO VERCEL PROD");
console.log("=================================================\n");

for (const app of APPS) {
  console.log(`\n📦 Deploying ${app} (apps/${app})...`);
  try {
    const cmd = `npx vercel deploy apps/${app} --prod --yes`;
    execSync(cmd, { stdio: "inherit" });
    console.log(`✅ ${app} deployed successfully!`);
  } catch (err) {
    console.error(`❌ Failed to deploy ${app}:`, err.message);
  }
}

console.log("\n=================================================");
console.log("✨ All deployments complete!");
console.log("=================================================");

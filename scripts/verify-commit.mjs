import { execSync } from "node:child_process";
import fs from "node:fs";

// 1. Get commit message from file (if run as git hook) or from git log (if run in CI)
let commitMsg = "";
const msgFile = process.argv[2];

if (msgFile && fs.existsSync(msgFile)) {
  commitMsg = fs.readFileSync(msgFile, "utf8").trim();
} else {
  try {
    commitMsg = execSync("git log -1 --pretty=%B", { encoding: "utf8" }).trim();
  } catch (err) {
    console.error("❌ Could not read commit message:", err);
    process.exit(1);
  }
}

// Ignore merge commits, fixup, squash
if (
  commitMsg.startsWith("Merge ") ||
  commitMsg.startsWith("fixup! ") ||
  commitMsg.startsWith("squash! ")
) {
  process.exit(0);
}

// 2. Enforce single line format: <tag>: <short message>
const lines = commitMsg.split("\n").map((l) => l.trim()).filter(Boolean);
if (lines.length > 1) {
  console.error("❌ Commit Message Policy Violation:");
  console.error("   Commit messages MUST be a single line under 25 words.");
  console.error(`   Found ${lines.length} lines.`);
  process.exit(1);
}

const firstLine = lines[0] || "";

// 3. Check for AI attribution trailers or co-authors
const forbiddenPatterns = [
  /co-authored-by/i,
  /signed-off-by/i,
  /claude/i,
  /chatgpt/i,
  /antigravity/i,
  /copilot/i,
  /gemini/i,
  /openai/i,
  /anthropic/i,
];

for (const pattern of forbiddenPatterns) {
  if (pattern.test(firstLine)) {
    console.error("❌ Commit Message Policy Violation:");
    console.error(`   Commit messages MUST NOT contain AI attribution or co-author trailers (${pattern}).`);
    process.exit(1);
  }
}

// 4. Word count check (under 25 words)
const words = firstLine.split(/\s+/).filter(Boolean);
if (words.length > 25) {
  console.error("❌ Commit Message Policy Violation:");
  console.error(`   Commit message exceeds 25 words (found ${words.length} words).`);
  console.error(`   Message: "${firstLine}"`);
  process.exit(1);
}

// 5. Structure check: <tag>: <message>
const tagPattern = /^[a-z]+(\([a-z0-9_-]+\))?:\s+.+/i;
if (!tagPattern.test(firstLine)) {
  console.error("❌ Commit Message Policy Violation:");
  console.error("   Commit message MUST follow the pattern: <tag>: <short message>");
  console.error("   Examples: 'feat(portal): add interactive terminal', 'fix(roles): update quorum logic'");
  console.error(`   Got: "${firstLine}"`);
  process.exit(1);
}

console.log(`✅ Commit message verified (${words.length} words): "${firstLine}"`);
process.exit(0);

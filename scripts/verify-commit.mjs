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

// 2. Separate subject line from trailers
const lines = commitMsg.split("\n").map((l) => l.trim()).filter(Boolean);
if (lines.length === 0) {
  console.error("❌ Commit Message Policy Violation: Empty commit message.");
  process.exit(1);
}

const firstLine = lines[0];

// AI names and assistant blacklist
const aiNamePatterns = [
  /\bclaude\b/i,
  /\bchatgpt\b/i,
  /\bantigravity\b/i,
  /\bcopilot\b/i,
  /\bgemini\b/i,
  /\bopenai\b/i,
  /\banthropic\b/i,
  /\bai\s+assistant\b/i,
  /\bbot\b/i,
];

// 3. Validate subject line
for (const pattern of aiNamePatterns) {
  if (pattern.test(firstLine)) {
    console.error("❌ Commit Message Policy Violation:");
    console.error(`   Subject line MUST NOT contain AI attribution (${pattern}).`);
    process.exit(1);
  }
}

// Subject line word count (under 25 words)
const words = firstLine.split(/\s+/).filter(Boolean);
if (words.length > 25) {
  console.error("❌ Commit Message Policy Violation:");
  console.error(`   Subject line exceeds 25 words (found ${words.length} words).`);
  console.error(`   Message: "${firstLine}"`);
  process.exit(1);
}

// Structure check: <tag>: <message>
const tagPattern = /^[a-z]+(\([a-z0-9_-]+\))?:\s+.+/i;
if (!tagPattern.test(firstLine)) {
  console.error("❌ Commit Message Policy Violation:");
  console.error("   Subject line MUST follow the pattern: <tag>: <short message>");
  console.error("   Examples: 'feat(portal): add interactive terminal', 'fix(roles): update quorum logic'");
  console.error(`   Got: "${firstLine}"`);
  process.exit(1);
}

// 4. Validate additional lines (Only genuine human Co-authored-by trailers permitted)
const trailerLines = lines.slice(1);
const coAuthorRegex = /^Co-authored-by:\s+([^<]+?)\s+<([^>]+)>$/i;
const validEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

for (const line of trailerLines) {
  const match = line.match(coAuthorRegex);
  if (!match) {
    console.error("❌ Commit Message Policy Violation:");
    console.error("   Commit messages must be single-line under 25 words, with optional Co-authored-by trailers.");
    console.error(`   Invalid line: "${line}"`);
    console.error("   Expected format: 'Co-authored-by: Full Name <user@actual-email.com>'");
    process.exit(1);
  }

  const name = match[1].trim();
  const email = match[2].trim().toLowerCase();

  // Check for AI names in co-author name
  for (const pattern of aiNamePatterns) {
    if (pattern.test(name)) {
      console.error("❌ Commit Message Policy Violation:");
      console.error(`   AI assistants cannot be credited as co-authors (${name}). Only real human collaborators are permitted.`);
      process.exit(1);
    }
  }

  // Check email syntax
  if (!validEmailRegex.test(email)) {
    console.error("❌ Commit Message Policy Violation:");
    console.error(`   Invalid email format in co-author trailer: "${email}"`);
    process.exit(1);
  }

  // Strictly block no-reply and bot email addresses
  const isNoReply =
    email.includes("noreply") ||
    email.includes("no-reply") ||
    email.includes("users.noreply.github.com") ||
    email.includes("bot@");

  if (isNoReply) {
    console.error("❌ Commit Message Policy Violation:");
    console.error(`   Co-author email "${email}" is a no-reply/bot address.`);
    console.error("   Genuine human co-authors MUST use their actual personal or institutional email address.");
    process.exit(1);
  }
}

const coAuthorCount = trailerLines.length;
console.log(
  `✅ Commit message verified (${words.length} words${
    coAuthorCount > 0 ? `, ${coAuthorCount} human co-author(s)` : ""
  }): "${firstLine}"`
);
process.exit(0);

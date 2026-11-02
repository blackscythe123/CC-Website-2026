import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";

// 1. Get commit message from file (if run as git hook) or from git log (if run in CI)
let rawMsg = "";
const msgFile = process.argv[2];
const isHookMode = Boolean(msgFile && fs.existsSync(msgFile));

if (isHookMode) {
  rawMsg = fs.readFileSync(msgFile, "utf8");
} else {
  try {
    rawMsg = execSync("git log -1 --pretty=%B", { encoding: "utf8" });
  } catch (err) {
    console.error("❌ Could not read commit message:", err);
    process.exit(1);
  }
}

function fail(...msgs) {
  console.error("❌ Commit Message Policy Violation:");
  for (const m of msgs) console.error(`   ${m}`);
  process.exit(1);
}

// In hook mode the file still contains git's template comments ('#' lines) and,
// for `git commit -v`, a scissors line followed by the diff. Git strips these
// itself, so they are not part of the commit and must not be validated.
let rawLines = rawMsg.replace(/\r\n/g, "\n").split("\n");
if (isHookMode) {
  const scissors = rawLines.findIndex((l) => /^# -+ >8 -+$/.test(l));
  if (scissors !== -1) rawLines = rawLines.slice(0, scissors);
  rawLines = rawLines.filter((l) => !l.startsWith("#"));
}
const commitMsg = rawLines.join("\n").trim();

const lines = commitMsg.split("\n").map((l) => l.trim()).filter(Boolean);
if (lines.length === 0) {
  fail("Empty commit message.");
}

const firstLine = lines[0];
const bodyLines = lines.slice(1);

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

function findAiName(text) {
  return aiNamePatterns.find((p) => p.test(text));
}

// Trailer formats
const GH_USER = "[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}";
const coAuthorRegex = /^Co-authored-by:\s+([^<]+?)\s+<([^>]+)>$/i;
// Written by CMS Studio's approveAndMergePR squash merge (apps/cms-studio/src/lib/github.ts).
// These are the ONLY trailers allowed to carry a users.noreply.github.com address.
const cmsAuthoredRegex = new RegExp(`^Authored-by: @(${GH_USER}) <\\1@users\\.noreply\\.github\\.com>$`);
const cmsApprovedRegex = new RegExp(
  `^Approved-by: @(${GH_USER}) <\\1@users\\.noreply\\.github\\.com> \\((superadmin|vertical_head|deputy)\\)$`
);
const cmsSubjectRegex = /^feat\([a-z0-9-]+\):\s+.+\s\(#\d+\)$/;
const trailerLikeRegex = /^[A-Za-z][A-Za-z-]*-by:/i;
const validEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function validateTrailer(line) {
  // AI attribution is never allowed in any trailer (name, username or email domain)
  const aiHit = findAiName(line);
  if (aiHit) {
    fail(`AI assistants cannot be credited in commit trailers (${aiHit}). Only real human collaborators are permitted.`, `Invalid line: "${line}"`);
  }

  if (cmsAuthoredRegex.test(line) || cmsApprovedRegex.test(line)) {
    return "cms";
  }

  const match = line.match(coAuthorRegex);
  if (!match) {
    fail(
      "Commit messages must be single-line under 25 words, with optional Co-authored-by trailers.",
      `Invalid line: "${line}"`,
      "Expected format: 'Co-authored-by: Full Name <user@actual-email.com>'"
    );
  }

  const email = match[2].trim().toLowerCase();

  if (!validEmailRegex.test(email)) {
    fail(`Invalid email format in co-author trailer: "${email}"`);
  }

  // Strictly block no-reply and bot email addresses for co-authors
  const isNoReply =
    email.includes("noreply") ||
    email.includes("no-reply") ||
    email.includes("users.noreply.github.com") ||
    email.includes("bot@");

  if (isNoReply) {
    fail(
      `Co-author email "${email}" is a no-reply/bot address.`,
      "Genuine human co-authors MUST use their actual personal or institutional email address."
    );
  }
  return "coauthor";
}

// 2. Exempt generated messages from subject rules (their trailers are still checked)
function isGenuineMergeCommit() {
  if (isHookMode) {
    return (
      firstLine.startsWith("Merge branch ") ||
      firstLine.startsWith("Merge pull request ") ||
      firstLine.startsWith("Merge remote-tracking branch ")
    );
  }
  if (!firstLine.startsWith("Merge ")) return false;
  try {
    // execFileSync (no shell): cmd.exe would treat "^" as an escape character.
    execFileSync("git", ["rev-parse", "--verify", "--quiet", "HEAD^2"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const exemptKind = isGenuineMergeCommit()
  ? "merge"
  : firstLine.startsWith("Revert \"")
  ? "revert"
  : firstLine.startsWith("fixup! ") || firstLine.startsWith("squash! ")
  ? "autosquash"
  : null;

if (exemptKind) {
  // Generated bodies (conflict lists, "This reverts commit ...") are free text,
  // but any attribution trailer they carry must still pass the policy.
  for (const line of bodyLines) {
    if (trailerLikeRegex.test(line)) validateTrailer(line);
  }
  console.log(`✅ Commit message verified (${exemptKind} commit): "${firstLine}"`);
  process.exit(0);
}

// 3. Validate trailers
let coAuthorCount = 0;
let cmsAuthored = 0;
let cmsApproved = 0;
for (const line of bodyLines) {
  const kind = validateTrailer(line);
  if (kind === "coauthor") coAuthorCount++;
  else if (cmsAuthoredRegex.test(line)) cmsAuthored++;
  else if (cmsApprovedRegex.test(line)) cmsApproved++;
}

// A CMS Studio squash merge carries exactly one Authored-by and one Approved-by
// trailer; its subject is the article title, which may legitimately contain
// words like "bot" or "gemini", so the AI-name check is skipped for it.
const isCmsMerge = cmsAuthored === 1 && cmsApproved === 1 && cmsSubjectRegex.test(firstLine);

// 4. Validate subject line
if (!isCmsMerge) {
  const aiHit = findAiName(firstLine);
  if (aiHit) {
    fail(`Subject line MUST NOT contain AI attribution (${aiHit}).`);
  }
}

// Subject line word count (at most 25 words)
const words = firstLine.split(/\s+/).filter(Boolean);
if (words.length > 25) {
  fail(`Subject line exceeds 25 words (found ${words.length} words).`, `Message: "${firstLine}"`);
}

// Structure check: <tag>: <message>
const tagPattern = /^[a-z]+(\([a-z0-9_-]+\))?:\s+.+/i;
if (!tagPattern.test(firstLine)) {
  fail(
    "Subject line MUST follow the pattern: <tag>: <short message>",
    "Examples: 'feat(portal): add interactive terminal', 'fix(roles): update quorum logic'",
    `Got: "${firstLine}"`
  );
}

console.log(
  `✅ Commit message verified (${words.length} words${
    coAuthorCount > 0 ? `, ${coAuthorCount} human co-author(s)` : ""
  }${isCmsMerge ? ", CMS Studio merge" : ""}): "${firstLine}"`
);
process.exit(0);

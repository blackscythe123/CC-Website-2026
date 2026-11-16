import { execFileSync } from "node:child_process";
import fs from "node:fs";

// ---------------------------------------------------------------------------
// Modes
//   verify-commit.mjs <msg-file>      git commit-msg hook
//   verify-commit.mjs --range a..b    every non-merge commit in a range (CI)
//   verify-commit.mjs                 HEAD only
// ---------------------------------------------------------------------------

class PolicyError extends Error {
  constructor(lines) {
    super(lines[0]);
    this.lines = lines;
  }
}

function fail(...msgs) {
  throw new PolicyError(msgs);
}

// AI names and assistant blacklist (applies to every trailer line)
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

// Subjects may legitimately mention article slugs/titles ("discord-bot", "Gemini API basics"),
// so only explicit attribution phrasing is rejected there.
const subjectAttributionRegex =
  /\b(generated|written|created|authored|co-?authored|assisted|made|produced)\s+(by|with|using|via)\s+(an?\s+)?(ai|claude|chatgpt|gpt[-\w]*|copilot|gemini|antigravity|openai|anthropic|llm)\b/i;

function hasSubjectAttribution(subject) {
  return subjectAttributionRegex.test(subject) || subject.includes("\u{1F916}");
}

const ALLOWED_TAGS = ["feat", "fix", "chore", "docs", "refactor", "style", "test", "security", "draft"];
const tagPattern = new RegExp(`^(${ALLOWED_TAGS.join("|")})(\\([a-z0-9_.-]+\\))?: \\S`);
const MAX_WORDS = 24; // "under 25 words"

// Trailer formats
const GH_USER = "[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}";
const coAuthorRegex = /^Co-authored-by:\s+([^<]+?)\s+<([^>]+)>$/i;
// Written by CMS Studio's approveAndMergePR squash merge (apps/cms-studio/src/lib/github.ts).
// These are the ONLY trailers allowed to carry a users.noreply.github.com address.
const cmsAuthoredRegex = new RegExp(`^Authored-by: @(${GH_USER}) <\\1@users\\.noreply\\.github\\.com>$`);
const cmsApprovedRegex = new RegExp(
  `^Approved-by: @(${GH_USER}) <\\1@users\\.noreply\\.github\\.com> \\((superadmin|vertical_head|deputy)\\)$`
);
// A Superadmin (anywhere) or the vertical's Head publishing their own work, with no second reviewer.
const cmsSelfPublishedRegex = new RegExp(
  `^Self-published-by: @(${GH_USER}) <\\1@users\\.noreply\\.github\\.com> \\((superadmin|vertical_head)\\)$`
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

  if (cmsAuthoredRegex.test(line) || cmsApprovedRegex.test(line) || cmsSelfPublishedRegex.test(line)) {
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

/**
 * Validate one commit message. Throws PolicyError on violation, returns a summary string.
 * isMerge: caller knows the commit has 2+ parents.
 */
function checkMessage(rawMsg, { hookMode = false, isMerge = false } = {}) {
  // In hook mode the file still contains git's template comments ('#' lines) and,
  // for `git commit -v`, a scissors line followed by the diff. Git strips these
  // itself, so they are not part of the commit and must not be validated.
  let rawLines = rawMsg.replace(/\r\n/g, "\n").split("\n");
  if (hookMode) {
    const scissors = rawLines.findIndex((l) => /^# -+ >8 -+$/.test(l));
    if (scissors !== -1) rawLines = rawLines.slice(0, scissors);
    rawLines = rawLines.filter((l) => !l.startsWith("#"));
  }
  const commitMsg = rawLines.join("\n").trim();

  const lines = commitMsg.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) fail("Empty commit message.");

  const firstLine = lines[0];
  const bodyLines = lines.slice(1);

  const hookMerge =
    hookMode &&
    (firstLine.startsWith("Merge branch ") ||
      firstLine.startsWith("Merge pull request ") ||
      firstLine.startsWith("Merge remote-tracking branch "));

  const exemptKind =
    isMerge || hookMerge
      ? "merge"
      : firstLine.startsWith('Revert "')
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
    return `(${exemptKind} commit): "${firstLine}"`;
  }

  let coAuthorCount = 0;
  let cmsAuthored = 0;
  let cmsApproved = 0;
  for (const line of bodyLines) {
    const kind = validateTrailer(line);
    if (kind === "coauthor") coAuthorCount++;
    else if (cmsAuthoredRegex.test(line)) cmsAuthored++;
    else if (cmsApprovedRegex.test(line)) cmsApproved++;
  }

  // A CMS Studio squash merge carries exactly one Authored-by and one Approved-by trailer.
  const isCmsMerge = cmsAuthored === 1 && cmsApproved === 1 && cmsSubjectRegex.test(firstLine);

  if (!isCmsMerge && hasSubjectAttribution(firstLine)) {
    fail("Subject line MUST NOT contain AI attribution.", `Message: "${firstLine}"`);
  }

  const words = firstLine.split(/\s+/).filter(Boolean);
  if (words.length > MAX_WORDS) {
    fail(`Subject line must be under 25 words (found ${words.length} words).`, `Message: "${firstLine}"`);
  }

  if (!tagPattern.test(firstLine)) {
    fail(
      "Subject line MUST follow the pattern: <tag>: <short message>",
      `Allowed tags: ${ALLOWED_TAGS.join(", ")}`,
      "Examples: 'feat(portal): add interactive terminal', 'fix(roles): update quorum logic'",
      `Got: "${firstLine}"`
    );
  }

  return `(${words.length} words${coAuthorCount > 0 ? `, ${coAuthorCount} human co-author(s)` : ""}${
    isCmsMerge ? ", CMS Studio merge" : ""
  }): "${firstLine}"`;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function report(err) {
  if (err instanceof PolicyError) {
    console.error("❌ Commit Message Policy Violation:");
    for (const m of err.lines) console.error(`   ${m}`);
  } else {
    console.error("❌ Could not verify commit message:", err);
  }
}

function main(argv) {
  const rangeIdx = argv.indexOf("--range");
  if (rangeIdx !== -1) {
    const range = argv[rangeIdx + 1];
    if (!range || range.startsWith("--")) {
      console.error("❌ --range requires a value like <base>..<head>");
      return 1;
    }
    let out;
    try {
      out = git(["log", "--format=%H%x00%P%x00%B%x01", range]);
    } catch (err) {
      console.error(`❌ Could not read commit range "${range}":`, err.message);
      return 1;
    }
    const commits = out
      .split("\x01")
      .map((c) => c.replace(/^\n/, ""))
      .filter((c) => c.trim());
    let failed = 0;
    let checked = 0;
    for (const c of commits) {
      const [sha, parents, ...rest] = c.split("\x00");
      const parentCount = parents.trim() ? parents.trim().split(/\s+/).length : 0;
      if (parentCount >= 2) {
        console.log(`⏭️  ${sha.slice(0, 7)} merge commit skipped`);
        continue;
      }
      checked++;
      try {
        console.log(`✅ ${sha.slice(0, 7)} ${checkMessage(rest.join("\x00"))}`);
      } catch (err) {
        failed++;
        console.error(`Commit ${sha}:`);
        report(err);
      }
    }
    console.log(`Checked ${checked} commit(s) in ${range}; ${failed} violation(s).`);
    return failed ? 1 : 0;
  }

  const msgFile = argv.find((a) => !a.startsWith("--"));
  const hookMode = Boolean(msgFile && fs.existsSync(msgFile));
  let rawMsg;
  let isMerge = false;
  try {
    if (hookMode) {
      rawMsg = fs.readFileSync(msgFile, "utf8");
    } else {
      rawMsg = git(["log", "-1", "--pretty=%B"]);
      const parents = git(["log", "-1", "--pretty=%P"]).trim();
      isMerge = parents.split(/\s+/).filter(Boolean).length >= 2;
    }
  } catch (err) {
    console.error("❌ Could not read commit message:", err.message);
    return 1;
  }
  try {
    console.log(`✅ Commit message verified ${checkMessage(rawMsg, { hookMode, isMerge })}`);
    return 0;
  } catch (err) {
    report(err);
    return 1;
  }
}

process.exit(main(process.argv.slice(2)));

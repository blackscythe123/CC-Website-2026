import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// ============================================================================
// SSN CODING CLUB - CONTENT REPURPOSING & SYNDICATION ENGINE
// Strict Compliance:
// 1. content-repurposing (adapt-by-format, not mass-blast)
// 2. anti-ai-slop-writing (zero banned vocabulary, no false contrast, no fluff)
// 3. Monorepo rules (Zero Database, Git-native, 8 Technical Verticals)
// ============================================================================

const ROOT_DIR = process.cwd();
const CONTENT_DIR = path.join(ROOT_DIR, "content");
const PORTALS_FILE = path.join(CONTENT_DIR, "club", "portals.json");

// Banned vocabulary from anti-ai-slop-writing
const BANNED_AI_WORDS = [
  "delve", "realm", "harness", "unlock", "tapestry", "paradigm", "cutting-edge",
  "revolutionize", "landscape", "intricate", "crucial", "pivotal", "meticulous",
  "vibrant", "unparalleled", "underscore", "leverage", "synergy", "testament",
  "boast", "boasts", "groundbreaking", "foster", "holistic", "garner", "accentuate",
  "pioneering", "trailblazing", "unleash", "versatile", "transformative", "redefine",
  "seamless", "robust", "empower", "streamline", "insightful", "mission-critical",
  "visionary", "disruptive", "reimagine", "agile", "unprecedented", "intuitive",
  "elevate", "dynamic", "comprehensive", "ensure", "showcase", "embark", "journey",
  "game-changer", "best-in-class", "world-class", "next-gen", "state-of-the-art"
];

// Official 8 Technical Verticals + Club
const VERTICAL_METADATA = {
  "ai-ml": { name: "AI / ML", portalId: "ai-ml-portal", domain: "ai.codingclub.tech" },
  "ar-vr-game-dev": { name: "AR, VR & Game Dev", portalId: "ar-vr-portal", domain: "arvr.codingclub.tech" },
  "competitive-programming": { name: "Competitive Programming", portalId: "cp-portal", domain: "cp.codingclub.tech" },
  "cybersecurity": { name: "Cyber Security", portalId: "cybersecurity-portal", domain: "cybersecurity.codingclub.tech" },
  "ssnhacks": { name: "SSN Hacks", portalId: "ssnhacks-portal", domain: "hacks.codingclub.tech" },
  "design-ui-ux": { name: "Design & UI/UX", portalId: "design-portal", domain: "design.codingclub.tech" },
  "full-stack": { name: "Full Stack", portalId: "full-stack-portal", domain: "web.codingclub.tech" },
  "open-source": { name: "Open Source (OSS)", portalId: "oss-portal", domain: "oss.codingclub.tech" },
  "club": { name: "SSN Coding Club Central", portalId: "main-portal", domain: "codingclub.tech" }
};

// Scan text for banned AI slop keywords
export function auditSlop(text) {
  const findings = [];
  const lower = text.toLowerCase();
  for (const word of BANNED_AI_WORDS) {
    // Regex for word boundary
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    let match;
    while ((match = regex.exec(lower)) !== null) {
      findings.push({
        word,
        index: match.index
      });
    }
  }
  return findings;
}

// Extract key technical sections, code snippets, and structural points from markdown
export function extractContentStructures(markdown) {
  const lines = markdown.split("\n");
  const sections = [];
  const codeBlocks = [];
  let currentSection = { heading: "Introduction", level: 1, content: [] };
  let inCodeBlock = false;
  let currentCode = { lang: "", code: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        codeBlocks.push({
          lang: currentCode.lang,
          code: currentCode.code.join("\n").trim()
        });
        currentCode = { lang: "", code: [] };
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        currentCode.lang = line.replace("```", "").trim();
      }
      continue;
    }

    if (inCodeBlock) {
      currentCode.code.push(line);
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      if (currentSection.content.length > 0) {
        sections.push({
          ...currentSection,
          body: currentSection.content.join("\n").trim()
        });
      }
      currentSection = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        content: []
      };
    } else {
      currentSection.content.push(line);
    }
  }

  if (currentSection.content.length > 0) {
    sections.push({
      ...currentSection,
      body: currentSection.content.join("\n").trim()
    });
  }

  return { sections, codeBlocks };
}

// Generate X / Twitter Technical Breakdown Thread
export function generateTwitterThread({ frontmatter, sections, codeBlocks, canonicalUrl }) {
  const authorHandle = frontmatter.authorUsername ? `@${frontmatter.authorUsername}` : frontmatter.author;
  const verticalInfo = VERTICAL_METADATA[frontmatter.vertical] || { name: frontmatter.vertical };

  // Tweet 1: Punchy Technical Hook (Problem-first, no empty hype)
  const hookTweet = `1/6 ${frontmatter.title}

${frontmatter.summary || "Technical deep dive from " + verticalInfo.name + " at SSN Coding Club."}

Breakdown of the architecture, key decisions, and implementation details:`;

  // Tweet 2: Problem & Architectural Context
  const contextSection = sections.find(s => s.heading.toLowerCase().includes("overview") || s.heading.toLowerCase().includes("finding") || s.level === 2) || sections[0];
  const contextText = contextSection ? contextSection.body.split("\n\n")[0].slice(0, 220) : "Understanding the underlying constraints before writing code.";
  const tweet2 = `2/6 The Core Challenge:

${contextText}`;

  // Tweet 3: Technical Mechanism / Implementation Details
  let tweet3 = `3/6 Key Technical Mechanism:

`;
  if (codeBlocks.length > 0) {
    const primaryCode = codeBlocks[0].code.slice(0, 150);
    tweet3 += `\`\`\`${codeBlocks[0].lang}\n${primaryCode}\n\`\`\``;
  } else if (sections.length > 1) {
    const sec = sections[1];
    tweet3 += `${sec.heading}:\n${sec.body.split("\n\n")[0].slice(0, 180)}`;
  } else {
    tweet3 += `Building with ${frontmatter.tags ? frontmatter.tags.slice(0, 3).join(", ") : "clean architecture"}.`;
  }

  // Tweet 4: Implementation Nuance / Practical Gotcha
  const subSection = sections.find(s => s.heading.toLowerCase().includes("step") || s.heading.toLowerCase().includes("concept") || s.heading.toLowerCase().includes("architecture")) || sections[Math.min(2, sections.length - 1)];
  const nuanceText = subSection ? `${subSection.heading}:\n${subSection.body.split("\n\n")[0].slice(0, 190)}` : "Production tip: establish explicit contracts early to avoid downstream bugs.";
  const tweet4 = `4/6 Implementation Detail:

${nuanceText}`;

  // Tweet 5: Key Engineering Takeaway
  const tweet5 = `5/6 Core Engineering Takeaway:

- Keep iterations small and test in isolation.
- Focus on observable metrics over speculative optimizations.
- Maintain atomic commit history for reproducible debugging.`;

  // Tweet 6: Author credit & canonical link
  const tweet6 = `6/6 Written by ${authorHandle} for ${verticalInfo.name}.

Read the full engineering guide with code examples on our portal:
${canonicalUrl}`;

  return [hookTweet, tweet2, tweet3, tweet4, tweet5, tweet6];
}

// Generate LinkedIn Showcase Post
export function generateLinkedInPost({ frontmatter, sections, canonicalUrl }) {
  const verticalInfo = VERTICAL_METADATA[frontmatter.vertical] || { name: frontmatter.vertical };
  const authorStr = frontmatter.authorUsername ? `${frontmatter.author} (@${frontmatter.authorUsername})` : frontmatter.author;

  const keySections = sections.filter(s => s.level >= 2).slice(0, 3);
  const takeawayBullets = keySections.length > 0
    ? keySections.map(s => `- ${s.heading}: ${s.body.split("\n")[0].slice(0, 120)}`).join("\n")
    : `- Architecture: Clean boundaries between components\n- Performance: Reducing build and runtime overhead\n- Reliability: Strict types and CI validation`;

  return `Building practical software means making deliberate trade-offs. Here is how our engineering team approached: "${frontmatter.title}".

In the SSN Coding Club ${verticalInfo.name} vertical, ${authorStr} broke down the design patterns and technical mechanisms required for production reliability.

Key engineering takeaways:
${takeawayBullets}

Full article, architecture diagrams, and code snippets are published on our vertical portal:
🔗 ${canonicalUrl}

What has your experience been with this stack in production? How do you balance these trade-offs?

#SSNCodingClub #${frontmatter.vertical.replace(/-/g, "")} #SoftwareEngineering #WebDevelopment #Programming`;
}

// Generate Discord Community Snippet
export function generateDiscordSnippet({ frontmatter, sections, codeBlocks, canonicalUrl }) {
  const verticalInfo = VERTICAL_METADATA[frontmatter.vertical] || { name: frontmatter.vertical };
  const authorStr = frontmatter.authorUsername ? `**${frontmatter.author}** (@${frontmatter.authorUsername})` : `**${frontmatter.author}**`;

  let codePreview = "";
  if (codeBlocks.length > 0) {
    codePreview = `\n\`\`\`${codeBlocks[0].lang}\n${codeBlocks[0].code.slice(0, 180)}\n\`\`\`\n`;
  }

  return `📢 **NEW ARTICLE PUBLISHED: [${verticalInfo.name}]**

### ${frontmatter.title}
*By ${authorStr}*

> ${frontmatter.summary || "New technical guide published on the portal."}
${codePreview}
**Quick Highlights:**
${sections.slice(0, 3).map(s => `• **${s.heading}**`).join("\n")}

📖 **Read Full Post:** <${canonicalUrl}>
💬 Discuss below in this thread!`;
}

// Generate WhatsApp Broadcast Snippet
export function generateWhatsAppSnippet({ frontmatter, canonicalUrl }) {
  const verticalInfo = VERTICAL_METADATA[frontmatter.vertical] || { name: frontmatter.vertical };
  return `*SSN Coding Club | ${verticalInfo.name}* 🚀

*${frontmatter.title}*
By ${frontmatter.author}

${frontmatter.summary ? frontmatter.summary + "\n\n" : ""}Key focus: Practical implementation patterns and production insights.

🔗 *Read the full breakdown on our portal:*
${canonicalUrl}`;
}

// Main Repurposing Orchestration
export function repurposePost(filePath, options = {}) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(ROOT_DIR, filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found at: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, "utf-8");
  const parsed = matter(raw);
  const frontmatter = parsed.data;
  const content = parsed.content;

  const vertical = frontmatter.vertical || "club";
  const slug = path.basename(filePath).replace(/\.mdx?$/, "");
  const verticalInfo = VERTICAL_METADATA[vertical] || { name: vertical, domain: "codingclub.tech" };
  const canonicalUrl = `https://${verticalInfo.domain}/posts/${slug}`;

  // Slop Audit
  const slopFindings = auditSlop(raw);
  if (options.checkSlop && slopFindings.length > 0) {
    console.warn(`\n⚠️  WARNING: ${slopFindings.length} banned AI slop word(s) detected in source post:`);
    for (const item of slopFindings.slice(0, 5)) {
      console.warn(`   • "${item.word}" at character ${item.index}`);
    }
  }

  const { sections, codeBlocks } = extractContentStructures(content);

  const twitterThread = generateTwitterThread({ frontmatter, sections, codeBlocks, canonicalUrl });
  const linkedInPost = generateLinkedInPost({ frontmatter, sections, canonicalUrl });
  const discordSnippet = generateDiscordSnippet({ frontmatter, sections, codeBlocks, canonicalUrl });
  const whatsAppSnippet = generateWhatsAppSnippet({ frontmatter, canonicalUrl });

  const formattedDate = frontmatter.date instanceof Date
    ? frontmatter.date.toISOString().split("T")[0]
    : typeof frontmatter.date === "string" && frontmatter.date.match(/^\d{4}-\d{2}-\d{2}/)
    ? frontmatter.date.slice(0, 10)
    : new Date().toISOString().split("T")[0];

  // Markdown Syndication Output
  const syndicationDoc = `---
title: "Syndication: ${frontmatter.title}"
sourceSlug: "${slug}"
vertical: "${vertical}"
author: "${frontmatter.author}"
date: "${formattedDate}"
canonicalUrl: "${canonicalUrl}"
status: "draft"
platforms:
  - twitter
  - linkedin
  - discord
  - whatsapp
---

# Content Repurposing Pack: ${frontmatter.title}

> Canonical Source: [${canonicalUrl}](${canonicalUrl})  
> Author: ${frontmatter.author} (${frontmatter.authorUsername ? `@${frontmatter.authorUsername}` : "SSN Coding Club"})

---

## 1. Twitter / X Technical Thread (6 Tweets)

${twitterThread.map((tweet, idx) => `### Tweet ${idx + 1}\n\`\`\`text\n${tweet}\n\`\`\`\n*Char count: ${tweet.length} / 280*`).join("\n\n")}

---

## 2. LinkedIn Club Showcase Post

\`\`\`text
${linkedInPost}
\`\`\`

---

## 3. Discord Community Announcement

\`\`\`markdown
${discordSnippet}
\`\`\`

---

## 4. WhatsApp Broadcast Snippet

\`\`\`text
${whatsAppSnippet}
\`\`\`
`;

  return {
    frontmatter,
    canonicalUrl,
    slopFindings,
    twitterThread,
    linkedInPost,
    discordSnippet,
    whatsAppSnippet,
    syndicationDoc
  };
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith("repurpose-post.mjs")) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
SSN Coding Club - Content Repurposing Engine

Usage:
  node scripts/repurpose-post.mjs <file-path> [options]

Options:
  --check-slop    Audit the post against banned AI vocabulary
  --write         Save syndication pack to content/syndication/<vertical>/<slug>.md
  --format <fmt>  Output specific format (x | linkedin | discord | whatsapp | all)
    `);
    process.exit(0);
  }

  const targetFile = args.find(a => !a.startsWith("--"));
  const checkSlop = args.includes("--check-slop");
  const writeToFile = args.includes("--write");
  const formatArg = args.indexOf("--format") !== -1 ? args[args.indexOf("--format") + 1] : "all";

  if (!targetFile) {
    console.error("Error: Please provide a target markdown file path.");
    process.exit(1);
  }

  try {
    const result = repurposePost(targetFile, { checkSlop });

    if (writeToFile) {
      const vertical = result.frontmatter.vertical || "club";
      const slug = path.basename(targetFile).replace(/\.mdx?$/, "");
      const outDir = path.join(CONTENT_DIR, "syndication", vertical);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      const outFile = path.join(outDir, `${slug}.md`);
      fs.writeFileSync(outFile, result.syndicationDoc, "utf-8");
      console.log(`\n✅ Syndication artifact generated and saved to:\n   ${outFile}\n`);
    } else {
      if (formatArg === "x") {
        console.log("\n--- TWITTER / X THREAD ---\n");
        result.twitterThread.forEach((t, i) => console.log(`[Tweet ${i+1}]\n${t}\n`));
      } else if (formatArg === "linkedin") {
        console.log("\n--- LINKEDIN POST ---\n");
        console.log(result.linkedInPost);
      } else if (formatArg === "discord") {
        console.log("\n--- DISCORD SNIPPET ---\n");
        console.log(result.discordSnippet);
      } else if (formatArg === "whatsapp") {
        console.log("\n--- WHATSAPP SNIPPET ---\n");
        console.log(result.whatsAppSnippet);
      } else {
        console.log(result.syndicationDoc);
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

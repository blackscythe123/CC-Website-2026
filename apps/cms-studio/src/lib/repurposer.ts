import matter from "gray-matter";

// Banned vocabulary from anti-ai-slop-writing
export const BANNED_AI_WORDS = [
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

export const VERTICAL_METADATA: Record<string, { name: string; domain: string }> = {
  "ai-ml": { name: "AI / ML", domain: "ai.codingclub.tech" },
  "ar-vr-game-dev": { name: "AR, VR & Game Dev", domain: "arvr.codingclub.tech" },
  "competitive-programming": { name: "Competitive Programming", domain: "cp.codingclub.tech" },
  "cybersecurity": { name: "Cyber Security", domain: "cybersecurity.codingclub.tech" },
  "ssnhacks": { name: "SSN Hacks", domain: "hacks.codingclub.tech" },
  "design-ui-ux": { name: "Design & UI/UX", domain: "design.codingclub.tech" },
  "full-stack": { name: "Full Stack", domain: "web.codingclub.tech" },
  "open-source": { name: "Open Source (OSS)", domain: "oss.codingclub.tech" },
  "club": { name: "SSN Coding Club Central", domain: "codingclub.tech" }
};

export interface SlopFinding {
  word: string;
  index: number;
}

export function auditSlop(text: string): SlopFinding[] {
  const findings: SlopFinding[] = [];
  const lower = text.toLowerCase();
  for (const word of BANNED_AI_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lower)) !== null) {
      findings.push({ word, index: match.index });
    }
  }
  return findings;
}

export interface ContentSection {
  heading: string;
  level: number;
  body: string;
}

export interface CodeBlock {
  lang: string;
  code: string;
}

export function extractStructures(markdown: string): {
  sections: ContentSection[];
  codeBlocks: CodeBlock[];
} {
  const lines = markdown.split("\n");
  const sections: ContentSection[] = [];
  const codeBlocks: CodeBlock[] = [];
  let currentHeading = "Introduction";
  let currentLevel = 1;
  let currentBodyLines: string[] = [];
  let inCode = false;
  let currentCodeLines: string[] = [];
  let currentLang = "";

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        codeBlocks.push({ lang: currentLang, code: currentCodeLines.join("\n").trim() });
        currentCodeLines = [];
        inCode = false;
      } else {
        inCode = true;
        currentLang = line.replace("```", "").trim();
      }
      continue;
    }

    if (inCode) {
      currentCodeLines.push(line);
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      if (currentBodyLines.length > 0) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          body: currentBodyLines.join("\n").trim(),
        });
      }
      currentHeading = headingMatch[2].trim();
      currentLevel = headingMatch[1].length;
      currentBodyLines = [];
    } else {
      currentBodyLines.push(line);
    }
  }

  if (currentBodyLines.length > 0) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      body: currentBodyLines.join("\n").trim(),
    });
  }

  return { sections, codeBlocks };
}

export interface RepurposeResult {
  title: string;
  slug: string;
  vertical: string;
  author: string;
  canonicalUrl: string;
  slopWarnings: SlopFinding[];
  twitterThread: string[];
  linkedInPost: string;
  discordSnippet: string;
  whatsAppSnippet: string;
  syndicationMarkdown: string;
}

export function generateRepurposePack(
  markdownContent: string,
  slug: string,
  verticalOverride?: string
): RepurposeResult {
  const parsed = matter(markdownContent);
  const data = parsed.data;
  const content = parsed.content;

  const vertical = data.vertical || verticalOverride || "club";
  const verticalInfo = VERTICAL_METADATA[vertical] || { name: vertical, domain: "codingclub.tech" };
  const canonicalUrl = `https://${verticalInfo.domain}/posts/${slug}`;
  const authorHandle = data.authorUsername ? `@${data.authorUsername}` : data.author || "SSN Coding Club";
  const title = data.title || slug;
  const summary = data.summary || "";

  const slopWarnings = auditSlop(markdownContent);
  const { sections, codeBlocks } = extractStructures(content);

  // 1. Twitter Thread (Strict char counts, hook, architecture, code, takeaway, CTA)
  const tweet1 = `1/6 ${title}\n\n${summary || "Engineering deep dive from " + verticalInfo.name + " at SSN Coding Club."}\n\nBreakdown of the architecture, key decisions, and implementation details:`;

  const contextSec = sections.find((s) => s.level === 2) || sections[0];
  const tweet2 = `2/6 The Core Problem:\n\n${
    contextSec ? contextSec.body.split("\n\n")[0].slice(0, 220) : "Understanding the underlying constraints before writing code."
  }`;

  let tweet3 = `3/6 Technical Mechanism:\n\n`;
  if (codeBlocks.length > 0) {
    tweet3 += `\`\`\`${codeBlocks[0].lang}\n${codeBlocks[0].code.slice(0, 150)}\n\`\`\``;
  } else if (sections.length > 1) {
    tweet3 += `${sections[1].heading}:\n${sections[1].body.split("\n\n")[0].slice(0, 180)}`;
  } else {
    tweet3 += `Building with clean modular separation and strong typing.`;
  }

  const tweet4 = `4/6 Implementation Detail:\n\n${
    sections.length > 2
      ? `${sections[2].heading}:\n${sections[2].body.split("\n\n")[0].slice(0, 190)}`
      : "Production tip: establish explicit contracts early to avoid downstream bugs."
  }`;

  const tweet5 = `5/6 Engineering Takeaway:\n\n- Keep iterations small and test in isolation.\n- Focus on observable metrics over speculative optimizations.\n- Maintain atomic commit history for reproducible debugging.`;

  const tweet6 = `6/6 Written by ${authorHandle} for ${verticalInfo.name}.\n\nRead the full engineering guide with code examples on our portal:\n${canonicalUrl}`;

  const twitterThread = [tweet1, tweet2, tweet3, tweet4, tweet5, tweet6];

  // 2. LinkedIn Showcase Post
  const keySecs = sections.filter((s) => s.level >= 2).slice(0, 3);
  const takeawayBullets =
    keySecs.length > 0
      ? keySecs.map((s) => `- ${s.heading}: ${s.body.split("\n")[0].slice(0, 120)}`).join("\n")
      : `- Architecture: Clean boundaries between components\n- Performance: Reducing build and runtime overhead\n- Reliability: Strict types and CI validation`;

  const linkedInPost = `Building practical software means making deliberate trade-offs. Here is how our engineering team approached: "${title}".

In the SSN Coding Club ${verticalInfo.name} vertical, ${authorHandle} broke down the design patterns and technical mechanisms required for production reliability.

Key engineering takeaways:
${takeawayBullets}

Full article, architecture diagrams, and code snippets are published on our vertical portal:
🔗 ${canonicalUrl}

What has your experience been with this stack in production? How do you balance these trade-offs?

#SSNCodingClub #${vertical.replace(/-/g, "")} #SoftwareEngineering #WebDevelopment #Programming`;

  // 3. Discord Community Announcement
  let codeSnippet = "";
  if (codeBlocks.length > 0) {
    codeSnippet = `\n\`\`\`${codeBlocks[0].lang}\n${codeBlocks[0].code.slice(0, 180)}\n\`\`\`\n`;
  }

  const discordSnippet = `📢 **NEW ARTICLE PUBLISHED: [${verticalInfo.name}]**

### ${title}
*By **${authorHandle}***

> ${summary || "New technical guide published on the portal."}
${codeSnippet}
**Quick Highlights:**
${sections.slice(0, 3).map((s) => `• **${s.heading}**`).join("\n")}

📖 **Read Full Post:** <${canonicalUrl}>
💬 Discuss below in this thread!`;

  // 4. WhatsApp Broadcast Snippet
  const whatsAppSnippet = `*SSN Coding Club | ${verticalInfo.name}* 🚀

*${title}*
By ${data.author || "SSN Coding Club"}

${summary ? summary + "\n\n" : ""}Key focus: Practical implementation patterns and production insights.

🔗 *Read the full breakdown on our portal:*
${canonicalUrl}`;

  const formattedDate = data.date instanceof Date
    ? data.date.toISOString().split("T")[0]
    : typeof data.date === "string" && data.date.match(/^\d{4}-\d{2}-\d{2}/)
    ? data.date.slice(0, 10)
    : new Date().toISOString().split("T")[0];

  const syndicationMarkdown = `---
title: "Syndication: ${title}"
sourceSlug: "${slug}"
vertical: "${vertical}"
author: "${data.author || "SSN Coding Club"}"
date: "${formattedDate}"
canonicalUrl: "${canonicalUrl}"
status: "draft"
platforms:
  - twitter
  - linkedin
  - discord
  - whatsapp
---

# Content Repurposing Pack: ${title}

> Canonical Source: [${canonicalUrl}](${canonicalUrl})  
> Author: ${authorHandle}

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
    title,
    slug,
    vertical,
    author: data.author || "SSN Coding Club",
    canonicalUrl,
    slopWarnings,
    twitterThread,
    linkedInPost,
    discordSnippet,
    whatsAppSnippet,
    syndicationMarkdown,
  };
}

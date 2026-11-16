// Reader-comments config (content/club/comments.json): shared by CI and the portals.
const SAFE_PART = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validated comments config, or { config: null, errors } (comments stay off unless it is fully valid). */
export function parseCommentsConfig(raw) {
  const errors = [];
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const allowed = new Set(["enabled", "repo", "repoId", "category", "categoryId", "disabledVerticals"]);
  for (const k of Object.keys(o)) if (!allowed.has(k)) errors.push(`Unknown key "${k}".`);
  if (typeof o.enabled !== "boolean") errors.push("enabled must be true or false.");
  if (typeof o.repo !== "string" || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(o.repo)) errors.push('repo must look like "owner/name".');
  if (typeof o.repoId !== "string" || !/^R_[A-Za-z0-9_-]{4,40}$/.test(o.repoId)) errors.push("repoId must be the repository's GraphQL id (R_…).");
  if (typeof o.category !== "string" || o.category.length < 1 || o.category.length > 60) errors.push("category must be the Discussions category name.");
  if (o.enabled === true && (typeof o.categoryId !== "string" || !/^DIC_[A-Za-z0-9_-]{4,40}$/.test(o.categoryId))) {
    errors.push("categoryId must be the category's GraphQL id (DIC_…) when comments are enabled.");
  } else if (o.categoryId !== undefined && o.categoryId !== "" && (typeof o.categoryId !== "string" || !/^DIC_[A-Za-z0-9_-]{4,40}$/.test(o.categoryId))) {
    errors.push("categoryId must be empty or the category's GraphQL id (DIC_…).");
  }
  const dv = o.disabledVerticals ?? [];
  if (!Array.isArray(dv) || !dv.every((v) => typeof v === "string" && SAFE_PART.test(v))) errors.push("disabledVerticals must be a list of vertical slugs.");
  if (errors.length) return { config: null, errors };
  return {
    config: {
      enabled: o.enabled,
      repo: o.repo,
      repoId: o.repoId,
      category: o.category,
      categoryId: o.categoryId || "",
      disabledVerticals: dv,
    },
    errors,
  };
}


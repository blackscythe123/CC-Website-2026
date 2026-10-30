/** GitHub serves every user's avatar at github.com/<login>.png; used when the API gave us no avatar_url. */
export function githubAvatarUrl(login: string, size: number): string {
  return `https://github.com/${encodeURIComponent(login)}.png?size=${size * 2}`;
}

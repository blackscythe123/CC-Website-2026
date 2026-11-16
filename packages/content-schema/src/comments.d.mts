export interface CommentsConfig {
  enabled: boolean;
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  disabledVerticals: string[];
}
export declare function parseCommentsConfig(raw: unknown): { config: CommentsConfig | null; errors: string[] };

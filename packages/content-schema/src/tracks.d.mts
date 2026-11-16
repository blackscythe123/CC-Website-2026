export type TrackItem =
  | { id: string; type: "post"; slug: string }
  | { id: string; type: "link"; title: string; url: string; difficulty?: "easy" | "medium" | "hard" }
  | { id: string; type: "video"; title: string; url: string };

export interface TrackSubtopic {
  title: string;
  items: TrackItem[];
}

export interface TrackTopic {
  title: string;
  items?: TrackItem[];
  subtopics?: TrackSubtopic[];
}

export interface Track {
  title: string;
  summary: string;
  vertical: string;
  topics: TrackTopic[];
}

export declare const TRACK_SLUG_RE: RegExp;
export declare const TRACK_SLUG_MAX: number;
export declare const MAX_TRACK_ITEMS: number;
export declare const MAX_TRACK_FILE_BYTES: number;
export declare const TRACK_VERTICALS: string[];
export declare const TrackSchema: unknown;
export declare function isYouTubeUrl(input: string): boolean;
export declare function trackItems(track: Track): TrackItem[];
export declare function validateTrack(
  json: unknown,
  ctx: { vertical: string; slug?: string; postSlugs?: Iterable<string>; bytes?: number }
): { ok: boolean; errors: string[]; track: Track | null };

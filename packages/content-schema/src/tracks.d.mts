export type TrackItem =
  | { id: string; type: "link"; title: string; url: string; difficulty?: "easy" | "medium" | "hard"; description?: string }
  | { id: string; type: "video"; title: string; url: string; description?: string };

export interface TrackSubtopic {
  id: string;
  title: string;
  description?: string;
  items?: TrackItem[];
}

export interface TrackTopic {
  id: string;
  title: string;
  description?: string;
  items?: TrackItem[];
  subtopics?: TrackSubtopic[];
}

export interface Track {
  title: string;
  summary: string;
  vertical: string;
  topics: TrackTopic[];
}

export interface Placement {
  track: string;
  topic: string;
  subtopic?: string;
}

export declare const TRACK_SLUG_RE: RegExp;
export declare const TRACK_SLUG_MAX: number;
export declare const SECTION_ID_RE: RegExp;
export declare const SECTION_ID_MAX: number;
export declare const ITEM_ID_RE: RegExp;
export declare const MAX_TRACK_ITEMS: number;
export declare const MAX_TRACK_FILE_BYTES: number;
export declare const TRACK_VERTICALS: string[];
export declare const TrackSchema: unknown;
export declare function isYouTubeUrl(input: string): boolean;
export declare function trackItems(track: Track): TrackItem[];
export declare function validateTrack(
  json: unknown,
  ctx: { vertical: string; slug?: string; bytes?: number }
): { ok: boolean; errors: string[]; track: Track | null };
export declare function parsePlacement(raw: unknown): Placement | null;
export declare function placementErrors(
  placement: Placement,
  ctx: { vertical: string; tracks: Record<string, Track> }
): string[];
export declare function placementLabel(placement: Placement, track: Track): string | null;
export declare function trackEditProblems(before: Track, after: Track): string[];

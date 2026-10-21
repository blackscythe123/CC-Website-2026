"use client";

import { createContext, useContext } from "react";
import type { UserRoleInfo } from "@/lib/roles";
import type { CollaboratorStatus, UserProfile } from "@/lib/hooks/useStudioSession";
import type { ReviewQueue } from "@/lib/hooks/useReviewQueue";

export interface StudioContextValue {
  user: UserProfile;
  roleInfo: UserRoleInfo | null;
  collaboratorStatus: CollaboratorStatus | null;
  queue: ReviewQueue;
}

export const StudioContext = createContext<StudioContextValue | null>(null);

/** Signed-in session + review queue for pages rendered inside StudioShell. */
export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside StudioShell");
  return ctx;
}

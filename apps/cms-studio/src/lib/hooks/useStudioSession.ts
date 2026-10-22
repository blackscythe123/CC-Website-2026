"use client";

import { useEffect, useState } from "react";
import type { UserRoleInfo } from "@/lib/roles";

export interface UserProfile {
  login: string;
  name: string;
  avatar_url: string;
}

export interface CollaboratorStatus {
  isCollaborator: boolean;
  hasPendingInvite: boolean;
  inviteUrl: string;
}

/** Loads the signed-in GitHub user, their club role and repo collaborator status from /api/auth/me. */
export function useStudioSession() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null);
  const [collaboratorStatus, setCollaboratorStatus] = useState<CollaboratorStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
          setRoleInfo(data.roleInfo);
          if (data.collaboratorStatus) {
            setCollaboratorStatus(data.collaboratorStatus);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { user, roleInfo, collaboratorStatus, loading };
}

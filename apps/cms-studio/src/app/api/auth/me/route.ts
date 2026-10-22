import { NextRequest, NextResponse } from "next/server";
import { getLiveUserRoleInfo } from "@/lib/roles";
import { getSessionToken } from "@/lib/session";

const REPO_OWNER = "blackscythe123";
const REPO_NAME = "CC-Website-2026";

export async function GET(request: NextRequest) {
  const token = getSessionToken(request);

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "coding-club-cms-studio",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const userData = await res.json();
    const roleInfo = await getLiveUserRoleInfo(userData.login, true);

    // Check collaborator permissions on the repository
    let isCollaborator = false;
    let hasPendingInvite = false;
    let inviteUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/invitations`;

    try {
      const repoRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "coding-club-cms-studio",
        },
      });

      if (repoRes.ok) {
        const repoData = await repoRes.json();
        // Check if user has push or admin rights
        if (repoData.permissions?.push || repoData.permissions?.admin) {
          isCollaborator = true;
        }
      }

      // If not yet an accepted collaborator, check if user has a pending invitation
      if (!isCollaborator) {
        // Method 1: Check repo invitations using admin token (does not require broad private repo permissions on user token)
        const adminToken = process.env.GITHUB_ADMIN_TOKEN || token;
        try {
          const repoInvitesRes = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/invitations`,
            {
              headers: {
                Authorization: `Bearer ${adminToken}`,
                "User-Agent": "coding-club-cms-studio",
              },
            }
          );

          if (repoInvitesRes.ok) {
            const repoInvites = await repoInvitesRes.json();
            if (Array.isArray(repoInvites)) {
              const foundInvite = repoInvites.find(
                (inv: { invitee?: { login?: string }; html_url?: string }) =>
                  inv.invitee?.login?.toLowerCase() === userData.login.toLowerCase()
              );
              if (foundInvite) {
                hasPendingInvite = true;
                if (foundInvite.html_url) {
                  inviteUrl = foundInvite.html_url;
                }
              }
            }
          }
        } catch (adminInvErr) {
          console.warn("Could not check repo invitations via admin token:", adminInvErr);
        }

        // Method 2: Fallback check user invitations if token has scope
        if (!hasPendingInvite) {
          try {
            const inviteRes = await fetch("https://api.github.com/user/repository_invitations", {
              headers: {
                Authorization: `Bearer ${token}`,
                "User-Agent": "coding-club-cms-studio",
              },
            });

            if (inviteRes.ok) {
              const invites = await inviteRes.json();
              if (Array.isArray(invites)) {
                const foundInvite = invites.find(
                  (inv: { repository?: { full_name?: string }; html_url?: string }) =>
                    inv.repository?.full_name?.toLowerCase() === `${REPO_OWNER}/${REPO_NAME}`.toLowerCase()
                );
                if (foundInvite) {
                  hasPendingInvite = true;
                  if (foundInvite.html_url) {
                    inviteUrl = foundInvite.html_url;
                  }
                }
              }
            }
          } catch {
            // Ignore if user token lacks scope for /user/repository_invitations
          }
        }
      }
    } catch (checkErr) {
      console.warn("Error checking repository collaborator status:", checkErr);
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        login: userData.login,
        name: userData.name || userData.login,
        avatar_url: userData.avatar_url,
      },
      roleInfo,
      collaboratorStatus: {
        isCollaborator,
        hasPendingInvite,
        inviteUrl,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error validating session";
    return NextResponse.json({ authenticated: false, error: errorMsg }, { status: 500 });
  }
}

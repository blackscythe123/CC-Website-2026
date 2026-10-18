import { NextRequest, NextResponse } from "next/server";
import { getUserRoleInfo } from "@/lib/roles";
import { getSessionToken } from "@/lib/session";

// Sliding window rate limiter per client IP / user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  entry.count += 1;
  return true;
}

// In-memory cache to prevent repetitive upstream GitHub API consumption
interface CachedUserResult {
  exists: boolean;
  user?: {
    login: string;
    name: string;
    avatar_url: string;
    bio: string;
  };
  cachedAt: number;
}
const userLookupCache = new Map<string, CachedUserResult>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
  // STRICT SECURITY CHECK: Require user authentication. Never expose unauthenticated public lookup.
  const token = getSessionToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized. You must be authenticated to check GitHub user profiles." },
      { status: 401 }
    );
  }

  // Rate limiting per client IP to prevent abuse and exhaustion of upstream limits
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown-client";
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.replace(/^@/, "").trim().toLowerCase();

  if (!username || username.length < 2 || !/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ exists: false, error: "Invalid username format" });
  }

  // Check cache first
  const cached = userLookupCache.get(username);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    const currentRole = getUserRoleInfo(username);
    return NextResponse.json({
      exists: cached.exists,
      user: cached.user,
      currentRole,
      cached: true,
    });
  }

  try {
    // Exclusively use the caller's session token; NEVER burn the admin GITHUB_PAT on arbitrary user lookups
    const headers: Record<string, string> = {
      "User-Agent": "coding-club-cms-studio",
      Authorization: `Bearer ${token}`,
    };

    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
    });

    if (!res.ok) {
      userLookupCache.set(username, { exists: false, cachedAt: Date.now() });
      return NextResponse.json({ exists: false, error: "GitHub user not found" });
    }

    const ghUser = await res.json();
    const currentRole = getUserRoleInfo(ghUser.login);
    const userInfo = {
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar_url: ghUser.avatar_url,
      bio: ghUser.bio || "",
    };

    userLookupCache.set(username, {
      exists: true,
      user: userInfo,
      cachedAt: Date.now(),
    });

    return NextResponse.json({
      exists: true,
      user: userInfo,
      currentRole,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error verifying GitHub user";
    return NextResponse.json({ exists: false, error: errorMsg }, { status: 500 });
  }
}

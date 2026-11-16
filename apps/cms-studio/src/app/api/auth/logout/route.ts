import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin", request.url));
  // Only a real top-level navigation (a clicked link) may sign out via GET. Embedded requests such as
  // <img src="/api/auth/logout"> in article content must not end the reviewer's session.
  const mode = request.headers.get("sec-fetch-mode");
  if (mode && mode !== "navigate") return response;
  clearSessionCookie(response);
  return response;
}

export async function POST(request: NextRequest) {
  // A sibling site must not be able to sign Studio users out.
  const origin = request.headers.get("origin");
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").toLowerCase();
  let sameOrigin = request.headers.get("sec-fetch-site") === "same-origin";
  if (origin) {
    try {
      sameOrigin = new URL(origin).host.toLowerCase() === host;
    } catch {
      sameOrigin = false;
    }
  }
  if (!sameOrigin) {
    return NextResponse.json({ error: "Cross-site sign-out refused." }, { status: 403 });
  }
  const response = NextResponse.json({ success: true, message: "Logged out" });
  clearSessionCookie(response);
  return response;
}

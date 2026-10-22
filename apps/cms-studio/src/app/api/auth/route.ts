import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;

  if (!clientId) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>GitHub OAuth Configuration Missing</title></head>
        <body style="font-family: sans-serif; padding: 2rem; background: #fff5f5; color: #991b1b;">
          <h2>⚠️ OAUTH_GITHUB_CLIENT_ID is not configured</h2>
          <p>Please set <code>OAUTH_GITHUB_CLIENT_ID</code> in Vercel environment variables for the CMS Studio project.</p>
        </body>
      </html>
    `;
    return new NextResponse(html, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Least-privilege OAuth scope: public repo access + read-only user profile & email
  // Strictly avoids asking for 'repo' (full control of private repositories) or 'user' (profile write)
  const scope = "public_repo,read:user,user:email";
  const state = crypto.randomUUID();

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes expiry
  });
  return res;
}

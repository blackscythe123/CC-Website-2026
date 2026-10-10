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

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "repo,user";
  const state = Math.random().toString(36).substring(7);

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}

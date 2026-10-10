import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;

  if (!clientId) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>GitHub OAuth Configuration Missing</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; background: #fff5f5; color: #991b1b; }
            .box { max-width: 600px; margin: 40px auto; background: white; padding: 2rem; border-radius: 8px; border: 1px solid #fecaca; }
            h2 { margin-top: 0; color: #b91c1c; }
            code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; color: #111827; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>⚠️ GitHub OAuth Client ID Missing</h2>
            <p>Please configure <code>OAUTH_GITHUB_CLIENT_ID</code> in your environment variables (in Vercel or <code>.env.local</code>).</p>
            <p>See the project <code>README.md</code> for instructions on creating a GitHub OAuth App.</p>
          </div>
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

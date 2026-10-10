import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
          <h2>Authentication Failed</h2>
          <p>${errorDescription || error}</p>
        </body>
      </html>
    `;
    return new NextResponse(errorHtml, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!code) {
    return new NextResponse("Authorization code is missing", { status: 400 });
  }

  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      "OAUTH_GITHUB_CLIENT_ID or OAUTH_GITHUB_CLIENT_SECRET is missing in environment variables",
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "coding-club-cms-studio",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = await response.json();

    if (data.error || !data.access_token) {
      const errMessage = data.error_description || data.error || "Failed to exchange token";
      return new NextResponse(`GitHub token exchange error: ${errMessage}`, { status: 400 });
    }

    const token = data.access_token;

    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SSN Coding Club Studio Authorization</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; }
            .card { background: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Authorization Successful</h3>
            <p>Redirecting to SSN Coding Club Studio...</p>
          </div>
          <script>
            try {
              if (window.opener && window.opener !== window) {
                window.opener.location.href = "/admin";
                setTimeout(function() { window.close(); }, 300);
              } else {
                window.location.href = "/admin";
              }
            } catch(e) {
              window.location.href = "/admin";
            }
          </script>
        </body>
      </html>
    `;

    const responseObj = new NextResponse(successHtml, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

    responseObj.cookies.set("cc_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return responseObj;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return new NextResponse(`Error in OAuth callback: ${errorMsg}`, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get("oauth_state")?.value;
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Prevent OAuth CSRF attacks by strictly validating the cryptographic state parameter
  if (!state || !cookieState || state !== cookieState) {
    return new NextResponse("OAuth state verification failed. Possible CSRF attempt detected.", { status: 403 });
  }

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

    // Clear consumed oauth_state cookie to prevent replay
    responseObj.cookies.set("oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    let userLogin: string | undefined;
    try {
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "coding-club-cms-studio",
        },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        userLogin = u.login;
      }
    } catch {
      // Non-fatal
    }

    setSessionCookie(responseObj, token, userLogin);

    return responseObj;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return new NextResponse(`Error in OAuth callback: ${errorMsg}`, { status: 500 });
  }
}

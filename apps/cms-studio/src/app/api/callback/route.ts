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
          <title>Authorized</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f8fafc;
            }
            .card {
              background: #ffffff;
              padding: 2rem 2.5rem;
              border-radius: 12px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Authentication Successful</h3>
            <p>Connecting to CMS Studio and closing...</p>
          </div>
          <script>
            (function() {
              const token = ${JSON.stringify(token)};
              const message = 'authorization:github:success:' + JSON.stringify({
                token: token,
                provider: 'github'
              });

              function receiveMessage(e) {
                window.opener.postMessage(message, e ? e.origin : '*');
                setTimeout(function() { window.close(); }, 250);
              }

              window.addEventListener("message", receiveMessage, false);
              window.opener.postMessage("authorizing:github", "*");

              setTimeout(function() {
                window.opener.postMessage(message, "*");
                setTimeout(function() { window.close(); }, 350);
              }, 600);
            })();
          </script>
        </body>
      </html>
    `;

    return new NextResponse(successHtml, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return new NextResponse(`Error in OAuth callback: ${errorMsg}`, { status: 500 });
  }
}

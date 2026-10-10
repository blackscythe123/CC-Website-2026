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
        <head><title>Authentication Error</title></head>
        <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
          <h2>Authentication Failed</h2>
          <p>${errorDescription || error}</p>
          <script>
            window.opener.postMessage('authorization:github:error:{"message": "${errorDescription || error}"}', '*');
            setTimeout(function() { window.close(); }, 3000);
          </script>
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
    const missingSecretHtml = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; padding: 2rem;">
          <h3>⚠️ OAuth Client Credentials Incomplete</h3>
          <p>Please ensure both <code>OAUTH_GITHUB_CLIENT_ID</code> and <code>OAUTH_GITHUB_CLIENT_SECRET</code> are set in Vercel.</p>
        </body>
      </html>
    `;
    return new NextResponse(missingSecretHtml, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "coding-club-cms",
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
      const failureHtml = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
            <h3>Authentication Error</h3>
            <p>${errMessage}</p>
            <script>
              window.opener.postMessage('authorization:github:error:{"message": "${errMessage}"}', '*');
              setTimeout(function() { window.close(); }, 2500);
            </script>
          </body>
        </html>
      `;
      return new NextResponse(failureHtml, {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const token = data.access_token;

    // Send the authorization message back to Decap CMS window using postMessage
    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connecting to CMS...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f3f4f6;
              color: #1f2937;
            }
            .card {
              background: #ffffff;
              padding: 2rem 2.5rem;
              border-radius: 12px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
              text-align: center;
              max-width: 380px;
            }
            .spinner {
              border: 3px solid #e5e7eb;
              border-top: 3px solid #2563eb;
              border-radius: 50%;
              width: 28px;
              height: 28px;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 1.25rem;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h3 style="margin: 0 0 0.5rem 0;">Authorized!</h3>
            <p style="margin: 0; font-size: 0.95rem; color: #4b5563;">
              Connecting with Decap CMS...
            </p>
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
              // Notify opener that popup is ready
              window.opener.postMessage("authorizing:github", "*");

              // Fallback post after brief pause
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
    return new NextResponse(`Error processing GitHub OAuth callback: ${errorMsg}`, {
      status: 500,
    });
  }
}

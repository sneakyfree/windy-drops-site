// functions/auth/callback.ts — handles OAuth callback when WINDY_PRO_OAUTH is wired.
//
// v1 fallback: redirects to /auth/login. When Pro account-server exposes an
// OAuth /authorize + /token endpoint, this function exchanges the ?code= for
// a JWT and writes it into a JS-readable cookie, then redirects to the
// return path.

interface Env {
  PRO_OAUTH_TOKEN_URL?: string;
  PRO_OAUTH_CLIENT_ID?: string;
  PRO_OAUTH_CLIENT_SECRET?: string;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get("code");

  // If Pro OAuth isn't configured yet, bounce back to the paste-JWT flow.
  const tokenUrl = ctx.env.PRO_OAUTH_TOKEN_URL;
  if (!tokenUrl || !code) {
    return Response.redirect("https://windydrops.com/auth/login", 303);
  }

  try {
    const r = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: ctx.env.PRO_OAUTH_CLIENT_ID ?? "windy-drops-site",
        client_secret: ctx.env.PRO_OAUTH_CLIENT_SECRET ?? "",
        redirect_uri: "https://windydrops.com/auth/callback",
      }),
    });
    if (!r.ok) {
      return new Response(`OAuth exchange failed: ${r.status}`, { status: 400 });
    }
    const token = (await r.json() as { access_token?: string }).access_token;
    if (!token) {
      return new Response("OAuth response missing access_token", { status: 400 });
    }
    // Return an HTML stub that drops the token into localStorage + redirects.
    // (HttpOnly cookies would be safer but the JS API client reads from
    // localStorage — keeping the surface consistent.)
    return new Response(
      `<!doctype html><html><body><script>
        localStorage.setItem("windy.drops.jwt", ${JSON.stringify(token)});
        const rt = localStorage.getItem("windy.drops.return_to") || "/";
        localStorage.removeItem("windy.drops.return_to");
        window.location.replace(rt);
      </script>Signing in…</body></html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  } catch (e) {
    return new Response(`OAuth error: ${(e as Error).message}`, { status: 500 });
  }
};

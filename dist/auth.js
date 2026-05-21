// auth.js — shared auth + API client for windy-drops-site.
//
// Closes F2/G2. Stores the user's Bearer JWT in localStorage so every page
// can make authenticated registry calls. The JWT is acquired by either:
//   (a) Pro OAuth redirect via /auth/login → /auth/callback (if the Pro
//       account-server exposes OAuth — when it does, set WINDY_PRO_OAUTH=1)
//   (b) Manual paste at /auth/login (fallback for v1 when Pro OAuth is not
//       wired; CLI users have a JWT in ~/.windy/credentials.json)
//
// HttpOnly cookies would be more secure but would require a CF Pages
// Function for every authenticated route. localStorage + JS-controlled
// Bearer header is the natural pattern when the API server is on a separate
// origin (api.windydrops.com vs windydrops.com).

(function () {
  "use strict";

  const REGISTRY = window.__WINDY_REGISTRY__ || "https://api.windydrops.com";
  const TOKEN_KEY = "windy.drops.jwt";
  const RETURN_KEY = "windy.drops.return_to";

  const WindyAuth = {
    REGISTRY,

    getToken() {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    },

    setToken(jwt) {
      try {
        if (jwt) localStorage.setItem(TOKEN_KEY, jwt);
        else localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* private mode etc. */
      }
    },

    isSignedIn() {
      return Boolean(this.getToken());
    },

    /** Redirect to /auth/login, remembering where to come back. */
    signIn(returnTo) {
      try {
        localStorage.setItem(RETURN_KEY, returnTo || window.location.pathname + window.location.search);
      } catch { /* */ }
      window.location.href = "/auth/login";
    },

    /** Clear the token + redirect home. */
    signOut() {
      this.setToken(null);
      window.location.href = "/";
    },

    /** GET the registry; returns parsed JSON or throws { status, body }. */
    async get(path, { auth = false } = {}) {
      const headers = {};
      if (auth) {
        const token = this.getToken();
        if (!token) throw { status: 401, body: { error: "not_signed_in" } };
        headers.authorization = `Bearer ${token}`;
      }
      const r = await fetch(`${REGISTRY}${path}`, { headers });
      if (!r.ok) throw { status: r.status, body: await r.json().catch(() => r.statusText) };
      return r.json();
    },

    /** POST/DELETE the registry; same auth + error shape. */
    async send(method, path, body, { auth = true } = {}) {
      const headers = { "content-type": "application/json" };
      if (auth) {
        const token = this.getToken();
        if (!token) throw { status: 401, body: { error: "not_signed_in" } };
        headers.authorization = `Bearer ${token}`;
      }
      const r = await fetch(`${REGISTRY}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (r.status === 204) return null;
      const parsed = await r.json().catch(() => null);
      if (!r.ok) throw { status: r.status, body: parsed };
      return parsed;
    },

    post(path, body, opts) { return this.send("POST", path, body, opts); },
    del(path, opts) { return this.send("DELETE", path, null, opts); },

    /** After successful sign-in, redirect to wherever the user came from. */
    finishSignIn() {
      let returnTo = "/";
      try {
        returnTo = localStorage.getItem(RETURN_KEY) || "/";
        localStorage.removeItem(RETURN_KEY);
      } catch { /* */ }
      window.location.href = returnTo;
    },
  };

  window.WindyAuth = WindyAuth;
})();

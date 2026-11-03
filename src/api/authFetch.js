/**
 * Every request to our backend carries the signed-in person's token.
 *
 * The API now refuses unauthenticated calls, and the screens were written
 * before that - most call `fetch` directly and some forget the `token` header.
 * Installing this once means none of them can forget, and it is the one place
 * that reacts when the server says the login is no longer good.
 *
 * It also keeps reads in memory for a short while so moving between pages does
 * not download the same lists again. Any write to the API clears the lot, and
 * live attendance data is never kept.
 */
const BASE = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const SESSION_KEYS = ["webapptoken", "employeeData", "loginEmployeeData"];

// Pages that handle their own expired-login messaging, or need no login.
const NO_REDIRECT_PREFIXES = ["/auth", "/daily-attendance"];

const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const NEVER_CACHE_PREFIXES = ["/api/attendance"];
const AUTH_FAILURE_CODES = ["TOKEN_EXPIRED", "INVALID_TOKEN", "ACCOUNT_INACTIVE"];

const cache = new Map();
const inflight = new Map();

const clearCache = () => {
  cache.clear();
  inflight.clear();
};

// Older screens read localStorage "token" (never set) and so send the literal
// text "null" or "undefined"; treat those as no token at all.
const isRealToken = (value) => Boolean(value) && value !== "null" && value !== "undefined";

const cacheableUrl = (url) => {
  const path = url.slice(BASE.length);
  return path.startsWith("/api/") && !NEVER_CACHE_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const readToken = () => {
  try {
    return localStorage.getItem("webapptoken") || localStorage.getItem("token");
  } catch {
    return null;
  }
};

const endSession = () => {
  clearCache();
  try {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* storage unavailable */
  }
  const path = window.location.pathname.toLowerCase();
  if (!NO_REDIRECT_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    window.location.assign("/auth");
  }
};

// Only react to a token we attached: the login form, for instance, sends none
// and a 401 there just means a wrong password.
const endSessionIfRejected = async (response, attached) => {
  if (response.status !== 401 && response.status !== 403) return;
  const path = window.location.pathname.toLowerCase();
  if (NO_REDIRECT_PREFIXES.some((prefix) => path.startsWith(prefix))) return;

  const body = await response
    .clone()
    .json()
    .catch(() => ({}));

  if (
    AUTH_FAILURE_CODES.includes(body?.code) ||
    body?.message?.toLowerCase().includes("token") ||
    body?.message?.toLowerCase().includes("login") ||
    !readToken()
  ) {
    endSession();
  }
};

const jsonResponse = (body, contentType) =>
  new Response(body, { status: 200, headers: { "Content-Type": contentType || "application/json" } });

const ensureJsonResponse = async (res) => {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && res.status >= 400) {
    const text = await res.text().catch(() => "");
    return new Response(
      JSON.stringify({
        success: false,
        message: `Server returned error (${res.status}): ${text.slice(0, 100)}`,
        code: "SERVER_ERROR",
      }),
      { status: res.status, headers: { "Content-Type": "application/json" } }
    );
  }
  return res;
};

export const installAuthFetch = () => {
  if (typeof window === "undefined" || !BASE || window.__authFetchInstalled) return;
  window.__authFetchInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    let url = typeof input === "string" ? input : input?.url || String(input);
    // Sanitize any accidental double slashes in paths (e.g. https://api.com//api -> https://api.com/api)
    url = url.replace(/([^:]\/)\/+/g, "$1");

    if (!url.startsWith(BASE)) return nativeFetch(input, init);

    const cleanInput = typeof input === "string" ? url : input;
    const token = readToken();
    let nextInit = init;
    let attached = false;

    if (token) {
      const headers = new Headers(init?.headers || (typeof input !== "string" ? input.headers : undefined));
      if (!isRealToken(headers.get("token"))) {
        headers.set("token", token);
        attached = true;
      }
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      nextInit = { ...init, headers };
    }

    const method = String(init?.method || (typeof input !== "string" ? input.method : "") || "GET").toUpperCase();
    if (method !== "GET") clearCache();

    const key = method === "GET" && typeof input === "string" && token && cacheableUrl(url) ? `${token}|${url}` : null;

    if (!key) {
      let response = await nativeFetch(cleanInput, nextInit);
      response = await ensureJsonResponse(response);
      await endSessionIfRejected(response, attached);
      return response;
    }

    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return jsonResponse(hit.body, hit.contentType);
    if (hit) cache.delete(key);

    // Two screens asking for the same list at once share one request.
    let pending = inflight.get(key);
    if (!pending) {
      pending = nativeFetch(cleanInput, nextInit)
        .then(async (res) => {
          const guarded = await ensureJsonResponse(res);
          const body = await guarded.text();
          const contentType = guarded.headers.get("content-type");
          if (guarded.status === 200) {
            if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
            cache.set(key, { at: Date.now(), body, contentType });
          }
          return { status: guarded.status, statusText: guarded.statusText, body, contentType };
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }

    const { status, statusText, body, contentType } = await pending;
    const response = new Response([204, 205, 304].includes(status) ? null : body, { status, statusText, headers: { "Content-Type": contentType || "application/json" } });
    await endSessionIfRejected(response, attached);
    return response;
  };
};

import { CookieJar } from "./cookie_jar.ts";

// Max 20 redirects is fetch default setting
const MAX_REDIRECT = 20;

export type WrapFetchOptions = {
  /** your own fetch function. defaults to global fetch. This allows wrapping your fetch function multiple times. */
  fetch?: typeof fetch;
  /** The cookie jar to use when wrapping fetch. Will create a new one if not provided. */
  cookieJar?: CookieJar;
};

interface InternalRequestInit extends RequestInit {
  redirectCount?: number;
}

function toInternalRequestInit(req: Request): InternalRequestInit {
  return {
    body: req.body,
    cache: req.cache,
    credentials: req.credentials,
    headers: req.headers,
    integrity: req.integrity,
    keepalive: req.keepalive,
    method: req.method,
    mode: req.mode,
    redirect: "manual",
    referrer: req.referrer,
    referrerPolicy: req.referrerPolicy,
    signal: req.signal,
  };
}

const redirectStatus = new Set([301, 302, 303, 307, 308]);

function isRedirect(status: number): boolean {
  return redirectStatus.has(status);
}

export function wrapFetch(options?: WrapFetchOptions): typeof fetch {
  const { cookieJar = new CookieJar(), fetch = globalThis.fetch } = options ||
    {};

  async function wrappedFetch(
    input: RequestInfo | URL,
    init?: InternalRequestInit,
  ): Promise<Response> {
    // let fetch handle the error
    if (!input) {
      return await fetch(input);
    }
    const cookieString = cookieJar.getCookieString(input);

    let originalUrl, originalRedirect, internalInit;

    if (input instanceof Request) {
      originalUrl = input.url;
      originalRedirect = input.redirect;
      internalInit = toInternalRequestInit(input);
    } else {
      originalUrl = input;
      originalRedirect = init?.redirect;
      internalInit = { ...init, redirect: "manual" };
    }

    if (!(internalInit.headers instanceof Headers)) {
      internalInit.headers = new Headers(internalInit.headers || {});
    }
    internalInit.headers.set("cookie", cookieString);

    const response = await fetch(originalUrl, internalInit as RequestInit);

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        cookieJar.setCookie(value, response.url);
      }
    });

    const redirectCount = internalInit.redirectCount ?? 0;

    // If it's the first request, handle if request.redirect is set to 'manual' or 'error'
    if (redirectCount === 0) {
      if (originalRedirect === "manual") {
        return response;
      } else if (originalRedirect === "error") {
        await response.body?.cancel();
        throw new TypeError(
          `URI requested responded with a redirect and redirect mode is set to error: ${response.url}`,
        );
      }
    }

    // Do this check here to allow tail recursion of redirect.
    if (redirectCount > 0) {
      Object.defineProperty(response, "redirected", { value: true });
    }

    if (redirectCount >= MAX_REDIRECT) {
      await response.body?.cancel();
      throw new TypeError(
        `Reached maximum redirect of ${MAX_REDIRECT} for URL: ${response.url}`,
      );
    }

    if (!isRedirect(response.status)) {
      return response;
    }

    const redirectUrl = response.headers.get("location");
    if (!redirectUrl) {
      return response;
    }

    await response.body?.cancel();

    internalInit.redirectCount = redirectCount + 1;

    return await wrappedFetch(redirectUrl, internalInit as RequestInit);
  }

  return wrappedFetch;
}

import { CookieJar } from "./cookie_jar.ts";

export type WrapFetchOptions = {
  /** your own fetch function. defaults to global fetch. This allows wrapping your fetch function multiple times. */
  fetch?: typeof fetch;
  /** The cookie jar to use when wrapping fetch. Will create a new one if not provided. */
  cookieJar?: CookieJar;
};

interface WrappedFetchRequestInit extends RequestInit {
  maxRedirect?: number;
  redirectCount?: number;
}

const redirectStatus = new Set([301, 302, 303, 307, 308]);

function isRedirect(status: number): boolean {
  return redirectStatus.has(status);
}

export function wrapFetch(options?: WrapFetchOptions): typeof fetch {
  const { cookieJar = new CookieJar(), fetch = globalThis.fetch } = options ||
    {};

  async function wrappedFetch(
    input: Request | URL | string,
    init?: WrappedFetchRequestInit,
  ): Promise<Response> {
    // let fetch handle the error
    if (!input) {
      return await fetch(input);
    }
    const cookieString = cookieJar.getCookieString(input);

    let interceptedInit: RequestInit;
    if (init) {
      interceptedInit = init;
    } else if (input instanceof Request) {
      interceptedInit = input;
    } else {
      interceptedInit = {};
    }

    if (!(interceptedInit.headers instanceof Headers)) {
      interceptedInit.headers = new Headers(interceptedInit.headers || {});
    }
    interceptedInit.headers.set("cookie", cookieString);

    const response = await fetch(input, {
      ...interceptedInit,
      redirect: "manual",
    });

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        cookieJar.setCookie(value, response.url);
      }
    });

    const redirectCount = init?.redirectCount ?? 0;
    const maxRedirect = init?.maxRedirect ?? 20;

    if (redirectCount >= maxRedirect) {
      await response.body?.cancel();
      throw new TypeError(
        `Reached maximum redirect of ${maxRedirect} for URL: ${response.url}`,
      );
    }

    init = {
      ...init,
      redirectCount: redirectCount + 1,
    };

    if (init.redirect === "manual") {
      return response;
    } else if (init.redirect === "error") {
      await response.body?.cancel();
      throw new TypeError(
        `URI requested responded with a redirect and redirect mode is set to error: ${response.url}`,
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

    return await wrappedFetch(redirectUrl, init);
  }

  return wrappedFetch;
}

import { CookieJar } from "./cookie_jar.ts";

export type WrapFetchOptions = {
  /** your own fetch function. defaults to global fetch. This allows wrapping your fetch function multiple times. */
  fetch?: typeof fetch;
  /** The cookie jar to use when wrapping fetch. Will create a new one if not provided. */
  cookieJar?: CookieJar;
};

type FetchParameters = Parameters<typeof fetch>;

const redirectStatus = new Set([301, 302, 303, 307, 308]);

function isRedirect(status: number): boolean {
  return redirectStatus.has(status);
}

export function wrapFetch(options?: WrapFetchOptions): typeof fetch {
  const { cookieJar = new CookieJar(), fetch = globalThis.fetch } = options ||
    {};

  async function wrappedFetch(
    input: FetchParameters[0],
    init?: FetchParameters[1],
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
    if (!isRedirect(response.status)) {
      return response;
    }

    const redirectUrl = response.headers.get("location");
    if (!redirectUrl) return response;
    response.body?.cancel();

    return await wrappedFetch(redirectUrl, init);
  }

  return wrappedFetch;
}

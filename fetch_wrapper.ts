import { CookieJar } from "./cookie_jar.ts";
import { setHeader } from "./header_utils.ts";

export type WrapFetchOptions = {
  /** your own fetch function. defaults to global fetch. This allows wrapping your fetch function multiple times. */
  fetch?: typeof fetch;
  /** The cookie jar to use when wrapping fetch. Will create a new one if not provided. */
  cookieJar?: CookieJar;
};

export function wrapFetch(options: WrapFetchOptions) {
  const { cookieJar = new CookieJar(), fetch = globalThis.fetch } = options ||
    {};

  async function wrappedFetch(
    input: string | Request | URL,
    init?: RequestInit | undefined,
  ) {
    // let fetch handle the error
    if (!input) {
      return await fetch(input);
    }
    const cookieString = cookieJar.getCookieString(input);
    const interceptedInit = init || {};
    if (!interceptedInit.headers) {
      interceptedInit.headers = new Headers();
    }

    setHeader(interceptedInit.headers, "cookie", cookieString);

    const response = await fetch(input, interceptedInit);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        cookieJar.setCookie(value, input);
      }
    });
    return response;
  }

  return wrappedFetch;
}

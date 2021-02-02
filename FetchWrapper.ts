import { CookieJar } from "./CookieJar.ts";
import { setHeader } from "./header_utils.ts";

/**
 * @param options - Wrap options
 * @param options.cookieJar - The cookie jar to use when wrapping fetch. Will create a new one if not provided
 * @param options.fetchFn - If no `fetchFn` is provided, will default to global fetch.
 *  This allows wrapping your fetch function multiple times.
 */
export function wrapFetch(
  { cookieJar = new CookieJar(), fetchFn = fetch } = {},
) {
  async function wrappedFetch(
    input: string | Request | URL,
    init?: RequestInit | undefined,
  ) {
    // let fetch handle the error
    if (!input) {
      return await fetchFn(input);
    }
    const cookieString = cookieJar.getCookieString(input);
    const interceptedInit = init || {};
    if (!interceptedInit.headers) {
      interceptedInit.headers = new Headers();
    }

    setHeader(interceptedInit.headers, "cookie", cookieString);

    const response = await fetchFn(input, interceptedInit);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        cookieJar.setCookie(value, input);
      }
    });
    return response;
  }

  return wrappedFetch;
}

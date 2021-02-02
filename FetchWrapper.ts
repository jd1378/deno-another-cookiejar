import { CookieJar } from "./CookieJar.ts";

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

    if (typeof (interceptedInit.headers as Headers).set === "function") {
      (interceptedInit.headers as Headers).set("cookie", cookieString);
    } else if (Array.isArray(interceptedInit.headers)) {
      let found = false;
      for (
        const [index, [hName, hValue]]
          of (interceptedInit.headers as string[][]).entries()
      ) {
        if (hName === "cookie") {
          // deno-lint-ignore ban-ts-comment
          // @ts-ignore
          interceptedInit.headers[index] = [hName, cookieString];
          found = true;
          break;
        }
      }
      if (!found) {
        (interceptedInit.headers as string[][]).push(["cookie", cookieString]);
      }
    } else if (typeof interceptedInit.headers === "object") {
      Object.assign(
        interceptedInit.headers,
        cookieString ? { cookie: cookieString } : {},
      );
    }

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

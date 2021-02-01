import { CookieJar } from "./CookieJar.ts";

export type wrapFetchOptions = {
  cookieJar?: CookieJar;
};

export function wrapFetch(options?: wrapFetchOptions) {
  let cookieJar: CookieJar;
  if (options?.cookieJar) {
    cookieJar = options.cookieJar;
  } else {
    cookieJar = new CookieJar();
  }

  async function wrappedFetch(
    input: string | Request | URL,
    init?: RequestInit | undefined | RequestInit & { client: Deno.HttpClient },
  ) {
    // let fetch handle the error
    if (!input) {
      return await fetch(input);
    }
    const cookieString = cookieJar.getCookieString(input);
    const interceptedInit = init || {};
    if (interceptedInit) {
      interceptedInit.headers = Object.assign(
        interceptedInit.headers || {},
        cookieString
          ? {
            cookie: cookieString,
          }
          : {},
      );
    }
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

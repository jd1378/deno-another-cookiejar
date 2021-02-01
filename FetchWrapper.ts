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

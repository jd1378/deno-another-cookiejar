import { Cookie, CookieOptions } from "./Cookie.ts";

function cookieMatches(
  options: Cookie | CookieOptions,
  comparedWith: Cookie,
): boolean {
  // we assume these cookies match, until a mismatch is found
  let mismatch = false;
  for (const key of Object.keys(comparedWith)) {
    if (
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      key in options && typeof comparedWith[key] !== "function" &&
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      options[key] !== comparedWith[key]
    ) {
      mismatch = true;
    }
  }
  return !mismatch;
}

export class CookieJar {
  cookies = Array<Cookie>();

  setCookie(cookie: Cookie | string) {
    let cookieObj;
    if (typeof cookie === "string") {
      cookieObj = Cookie.from(cookie);
    } else {
      cookieObj = cookie;
    }
    const foundCookie = this.getCookie(cookieObj);
    if (foundCookie) {
      const indexOfCookie = this.cookies.indexOf(foundCookie);
      if (indexOfCookie !== -1) {
        this.cookies.splice(indexOfCookie, 1, cookieObj);
        return;
      }
    }
    this.cookies.push(cookieObj);
  }

  /** Gets the first cooking matching the defined properties of a given Cookie or CookieOptions. returns undefined if not found. */
  getCookie(options: Cookie | CookieOptions): Cookie | undefined {
    for (const cookie of this.cookies) {
      if (cookieMatches(options, cookie)) {
        return cookie;
      }
    }
  }

  /**
   * @param options - the options to filter cookies with
   */
  getCookies(options: CookieOptions) {
    const matchedCookies = [];
    for (const cookie of this.cookies) {
      if (cookieMatches(options, cookie)) {
        matchedCookies.push(cookie);
      }
    }
    return matchedCookies;
  }
}

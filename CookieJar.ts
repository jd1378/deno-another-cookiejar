import { Cookie, CookieOptions } from "./Cookie.ts";

const exactMatchProps = [
  "name",
  "value",
  "secure",
  "httpOnly",
  "maxAge",
  "expires",
  "sameSite",
];

function cookieMatches(
  options: Cookie | CookieOptions,
  comparedWith: Cookie,
): boolean {
  if (
    options.path !== undefined && !comparedWith.path?.startsWith(options.path)
  ) {
    return false;
  }

  if (options.domain) {
    if (!comparedWith.domain) {
      return false;
    }

    let longerDomain;
    let shorterDomain;
    if (comparedWith.domain.length > options.domain.length) {
      longerDomain = comparedWith.domain;
      shorterDomain = options.domain;
    } else {
      longerDomain = options.domain;
      shorterDomain = comparedWith.domain;
    }

    if (!longerDomain.endsWith(shorterDomain)) {
      return false;
    }

    // check if it's a subdomain or only partially matched
    const indexOfDomain = longerDomain.indexOf(shorterDomain);
    if (indexOfDomain > 0) {
      // if the character behind the part is not a dot, its not a subdomain
      if (longerDomain.charAt(indexOfDomain - 1) !== ".") {
        return false;
      }
    }
  }

  // any mismatch is not tolerated for some props
  if (
    exactMatchProps.some((propKey) =>
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      options[propKey] !== undefined &&
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      options[propKey] !== comparedWith[propKey]
    )
  ) {
    return false;
  }

  return true;
}

export class CookieJar {
  cookies = Array<Cookie>();

  /**
   * @param cookies - the cookies array to initialize with
   */
  constructor(cookies?: Array<Cookie>) {
    if (cookies?.length) {
      this.cookies = cookies;
    }
  }

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

  /** Gets the first cooking matching the defined properties of a given Cookie or CookieOptions. returns undefined if not found. `creationDate` prop is not checked. */
  getCookie(options: Cookie | CookieOptions): Cookie | undefined {
    for (const cookie of this.cookies) {
      if (cookieMatches(options, cookie)) {
        return cookie;
      }
    }
  }

  /**
   * @param options - the options to filter cookies with. if not provided, returnes all cookies.
   */
  getCookies(options: CookieOptions) {
    if (options) {
      const matchedCookies = Array<Cookie>();
      for (const cookie of this.cookies) {
        if (cookieMatches(options, cookie)) {
          matchedCookies.push(cookie);
        }
      }
      return matchedCookies;
    } else {
      return this.cookies;
    }
  }
}

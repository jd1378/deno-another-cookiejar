import {
  Cookie,
  CookieOptions,
  isSameDomainOrSubdomain,
  parseURL,
} from "./Cookie.ts";

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
    if (!isSameDomainOrSubdomain(options.domain, comparedWith.domain)) {
      return false;
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

// cookie compare from tough-cookie
const MAX_TIME = 2147483647000; // 31-bit max
/**
 *  Cookies with longer paths are listed before cookies with
 *  shorter paths.
 * 
 *  Among cookies that have equal-length path fields, cookies with
 *  earlier creation-times are listed before cookies with later
 *  creation-times."
 */
function cookieCompare(a: Cookie, b: Cookie) {
  let cmp = 0;

  // descending for length: b CMP a
  const aPathLen = a.path?.length || 0;
  const bPathLen = b.path?.length || 0;
  cmp = bPathLen - aPathLen;
  if (cmp !== 0) {
    return cmp;
  }

  // ascending for time: a CMP b
  const aTime = a.creationDate || MAX_TIME;
  const bTime = b.creationDate || MAX_TIME;
  cmp = aTime - bTime;
  if (cmp !== 0) {
    return cmp;
  }

  // tie breaker
  cmp = a.creationIndex - b.creationIndex;

  return cmp;
}

export class CookieJar {
  cookies = Array<Cookie>();

  /**
   * @param cookies - the cookies array to initialize with
   */
  constructor(cookies?: Array<Cookie> | Array<CookieOptions>) {
    if (cookies?.length) {
      if (typeof (cookies[0] as Cookie).isValid === "function") {
        this.cookies = cookies as Array<Cookie>;
      } else {
        for (const cookie of cookies) {
          this.cookies.push(new Cookie(cookie));
        }
      }
    }
  }

  /**
   * Sets or replaces a cookie inside the jar. 
   * Only sets new cookies if cookie is valid and not expired.
   * Validation and expiration checks are not run when replacing a cookie.
   * @param url - the url that this cookie from received from. mainly used by the fetch wrapper
   */
  setCookie(cookie: Cookie | string, url?: string | Request | URL) {
    let cookieObj;
    if (typeof cookie === "string") {
      cookieObj = Cookie.from(cookie);
    } else {
      cookieObj = cookie;
    }
    if (!cookieObj.domain && url) {
      cookieObj.setDomain(url);
    }
    const foundCookie = this.getCookie(cookieObj);
    if (foundCookie) {
      const indexOfCookie = this.cookies.indexOf(foundCookie);
      this.cookies.splice(indexOfCookie, 1, cookieObj);
    } else if (cookieObj.isValid() && !cookieObj.isExpired()) {
      this.cookies.push(cookieObj);
    }

    // sort by creation date, so when searching, we get the latest created cookies.
    this.cookies = this.cookies.sort(cookieCompare);
  }

  /** 
   * Gets the first cooking matching the defined properties of a given Cookie or CookieOptions.
   * returns undefined if not found. `creationDate` prop is not checked.
   * Also removes the cookie and returns undefined if cookie is expired.
   */
  getCookie(options: Cookie | CookieOptions): Cookie | undefined {
    for (const [index, cookie] of this.cookies.entries()) {
      if (cookieMatches(options, cookie)) {
        if (!cookie.isExpired()) {
          return cookie;
        } else {
          this.cookies.splice(index, 1);
          return undefined;
        }
      }
    }
  }

  /**
   * returnes cookies that matches the options, also removes expired cookies before returning.
   * @param options - the options to filter cookies with, and if not provided, returnes all cookies.
   *  if no cookie is found with given options, an empty array is returned.
   */
  getCookies(options?: CookieOptions | Cookie) {
    if (options) {
      const matchedCookies = Array<Cookie>();
      for (const [index, cookie] of this.cookies.entries()) {
        if (cookieMatches(options, cookie)) {
          if (!cookie.isExpired()) {
            matchedCookies.push(cookie);
          } else {
            this.cookies.splice(index, 1);
          }
        }
      }
      return matchedCookies;
    } else {
      return this.cookies;
    }
  }

  getCookieString(url: string | Request | URL) {
    const cookie = new Cookie();
    cookie.setDomain(url);
    const targetIsSecure = parseURL(url).protocol.includes("https");
    const cookiesToSend = this.getCookies(cookie)
      .filter((cookie) => {
        if (cookie.secure && !targetIsSecure) {
          return false;
        }
        return true;
      })
      .map((c) => c.getCookieString())
      .join("; ");
    return cookiesToSend;
  }

  toJSON() {
    return this.cookies;
  }

  /**
   * Removes first cookie that matches the given option.
   */
  removeCookie(options: CookieOptions | Cookie) {
    for (const [index, cookie] of this.cookies.entries()) {
      if (cookieMatches(options, cookie)) {
        this.cookies.splice(index, 1);
      }
    }
  }

  /**
   * Removes all cookies that matches the given option.
   */
  removeCookies(options: CookieOptions | Cookie) {
    if (options) {
      for (const [index, cookie] of this.cookies.entries()) {
        if (cookieMatches(options, cookie)) {
          this.cookies.splice(index, 1);
        }
      }
    }
  }
}

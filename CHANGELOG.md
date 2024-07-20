# Changelog

## v5.0.4

- now removes cookie and cookie2 headers on redirect

## v5.0.2

- update module readme versions

## v5.0.1

- Important fix: Resets body, method and content-length when redirected by
  @maccyber in #15

## v5.0.0

- Handle set-cookie from a redirect response fixes #13 by @maccyber in #14

## v4.1.6

- Sets the correct cookie domain when redirected. Fixes #11 by @maccyber in #12

## v4.1.5

- Added documentation for getCookieString method by @Roosteridk in #10
- fixed a few tests where date was causing it to fail (expired cookies)

## v4.1.4

fix: make wrapFetch options optional

## v4.1.3

fix: make wrapFetch return type match global fetch

## v4.1.2

fix: use first arg as RequestInit when invoked as fetch(Request)

## v4.1.1

- fix: Implement default path algorithm

Thanks @bgoscinski

## v4.1.0

- feat: Support double quote wrapping of value (foo="bar")
- fix: Support empty cookie value
- fix: Clear existing matching cookie when setting expired cookie

Thanks @jonasb

## v4.0.3

- fix: Support `=` in cookie value (Thanks @jonasb)

## v4.0.2

- fix input type for use on deno 1.20.3

## v4.0.1

- allow . in cookie name.

## v4.0.0

- BREAKING CHANGE: implement rfc6265 path matching properly and add test.
- change `CookieJar.getCookieString()` to use `Cookie.canSendTo` function
  filtering cookies for a url

## v3.0.0

- BREAKING CHANGE: rename fetch wrapper option `fetchFn` to `fetch`.
- export type WrapFetchOptions.

## v2.2.7

- renamed the left out Cookie.ts file.

## v2.2.6

- renamed file names. does not affect exports.

## v2.2.5

- fix fix replaceCookies for when an array of CookieOptions is used.
- add tests for case above

## v2.2.4

- export CookieOptions type

## v2.2.3

- fix expires not being added to cookie.toString()
- remove unnecessary array replacement when sorting.
- remove unnecessary assignments
- fixed some other code smells

## v2.2.2

- `CookieJar.setCookie()`: set cookie path from url's pathname if path is not
  defined inside cookie string (or Cookie). (it was already done for domain.)

## v2.2.1

- update readme

## v2.2.0

- add replaceCookies method

## v2.1.1

- sets cookie header with a more precise approach.

## v2.1.0

- add `fetchFn` to wrap options. this allows you to wrap your fetch multiple
  times to add other helpers.

## v2.0.1

- fix headers not merged correctly and add test

## v2.0.0

- now `value`, `secure`, `httpOnly`, `maxAge`, `expires`, `sameSite` props will
  only be strictly checked only if when retrieving the cookies using
  `CookieOptions`, which means if you pass a cookie, it will only be checked if
  `name`, `path` and `domain` match. This should solve issue of replacing
  cookies.

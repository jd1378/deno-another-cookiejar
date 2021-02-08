
# Changelog

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

- `CookieJar.setCookie()`: set cookie path from url's pathname if path is not defined inside cookie string (or Cookie). (it was already done for domain.)

## v2.2.1

- update readme

## v2.2.0

- add replaceCookies method

## v2.1.1

- sets cookie header with a more precise approach.

## v2.1.0

- add `fetchFn` to wrap options. this allows you to wrap your fetch multiple times to add other helpers.

## v2.0.1

- fix headers not merged correctly and add test

## v2.0.0

- now `value`, `secure`, `httpOnly`, `maxAge`, `expires`, `sameSite` props will only be strictly checked only if
  when retrieving the cookies using `CookieOptions`, which means if you pass a cookie,
  it will only be checked if `name`, `path` and `domain` match. This should solve issue of replacing cookies.


# Changelog

## v2.1.0

- add `fetchFn` to wrap options. this allows you to wrap your fetch multiple times to add other helpers.

## v2.0.1

- fix headers not merged correctly and add test

## v2.0.0

- now `value`, `secure`, `httpOnly`, `maxAge`, `expires`, `sameSite` props will only be strictly checked only if
  when retrieving the cookies using `CookieOptions`, which means if you pass a cookie,
  it will only be checked if `name`, `path` and `domain` match. This should solve issue of replacing cookies.

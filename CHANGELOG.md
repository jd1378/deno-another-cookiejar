
# Changelog

## v2.0.0

- now `value`, `secure`, `httpOnly`, `maxAge`, `expires`, `sameSite` props will only be strictly checked only if
  when retrieving the cookies using `CookieOptions`, which means if you pass a cookie,
  it will only be checked if `name`, `path` and `domain` match. This should solve issue of replacing cookies.
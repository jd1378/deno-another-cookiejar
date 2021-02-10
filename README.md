# deno-another-cookiejar

This library offers a fetch wrapper that retain cookies. This library also provides a simple cookiejar;

Why the name ? because I didn't want to reserve the cookiejar name, since this library may not be good at it. (But I hope you like it)

## usage

you can import `Cookie`, `CookieJar`, `wrapFetch` from `mod.ts` file.

```js
export { Cookie, CookieJar, wrapFetch} from 'https://deno.land/x/another_cookiejar@v2.2.7/mod.ts';
```

### wrapFetch

```js
// this simple
const fetch = wrapFetch();
```

Or

```js
// you can also pass your own cookiejar to wrapFetch to save/load your cookies
const cookieJar = new CookieJar();
// Now use this fetch and any cookie that is set will be sent with your next requests automatically
const fetch = wrapFetch({ cookieJar });
//...
fetch("http://example.com");
// and you can read your cookies from the jar
cookieJar.getCookie({
  name: 'cookieName',
})?.value // your cookie value
```

You can play around with it too see what it has to offer!

cookies should only be sent to their corresponding domains automatically.

Secure cookies will not be sent over unsecure connections.

### Cookie

you can create cookies in two ways:

```js
// first: using Cookie constructor with CookieOptions
const cookie = new Cookie({
  name: 'foo',
  value: 'bar'
});
```

```js
// second: 
const cookie = Cookie.from('foo=bar;'); // any string from Set-Cookie header value is also valid.
```

### CookieJar

```js
const cookieJar = new CookieJar();
```

also if you have cookies from before:

```js
const cookieJar = new CookieJar(cookiesArray); // cookiesArray: Array<Cookie> | Array<CookieOptions>
```

#### Note on retrieving cookies (+v2.0.0)

You can get cookies using either `CookieOptions` or a `Cookie` itself.
The difference is if you use `CookieOptions`, it will strictly check any prop that is passed against the cookie.
But if you use a `Cookie` object, it will only check `name`, `path` and `domain`.

### JSON serializing `Cookie`

Each cookie object is easily serialized and deserialized. Example:

```js
const exampleOption = { name: 'foo' , value: 'bar' };

const myCookie = new Cookie(exampleOption);

new Cookie ( 
  JSON.parse(
    JSON.stringify(myCookie)
  )
).toString() === myCookie.toString(); // true

```

### JSON serializing `CookieJar`

You can even easily serialize your `CookierJar`. Example:

```js
const exampleOption = { name: 'foo' , value: 'bar' };

const myCookie = new Cookie(exampleOption);

const cookieJar = new CookieJar([myCookie]);

new CookieJar (
  JSON.parse(
    JSON.stringify(cookieJar)
  )
).cookies[0].toString() === myCookie.toString(); // true
```

## test

fetch wrapper tests require network access to emulate server.

run with `deno test --allow-net`

## notes

This library is only tested lightly. you can contribute to this if you want to make it better, but I probably won't add much feature/test anymore.

This library does not strictly follow the specs, but does try to follow it loosely. just keep it in mind when using so you don't get surprises.

does not support handling of `__Secure-` and `__Host-` cookies.

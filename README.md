# deno-another-cookiejar

This is just a very simple cookiejar for using with deno's fetch.

Why the name ? because I didn't want to reserve the cookiejar name, since this library may not be good at it.

## usage

you can import `Cookie`, `CookieJar` from `mod.ts` file.

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
const cooke = Cookie.from('foo=bar;'); // any string from Set-Cookie header value is also valid.
```

### CookieJar

```js
const cookieJar = new CookieJar();
```

also if you have cookies from before:

```js
const cookieJar = new CookieJar(cookiesArray); // cookiesArray: Array<Cookie>
```


### with fetch in ts

```js
// todo
```

### JSON serializing cookies

Each cookie object is easily serialized and deserialized. Example:

```js
import { Cookie } from '...'

const exampleOption = { name: 'foo' , value: 'bar' };

const myCookie = new Cookie(exampleOption);

new Cookie ( 
  JSON.parse(
    JSON.stringify(myCookie)
  )
).toString() === myCookie.toString(); // true

```

## notes

This library is only tested lightly. you can contribute to this if you want to make it better, but I probably won't add much feature/test anymore.

This library does not strictly follow the specs, but does try to follow it loosely. just keep it in mind when using so you don't get surprises.

does not support handling of `__Secure-` and `__Host-` cookies.

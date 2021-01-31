# deno-another-cookiejar

This is just a very simple cookiejar for using with deno's fetch.

Why the name ? because I didn't want to reserve the cookiejar name, since this library may not be good at it.

## usage

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

import { Cookie } from "./Cookie.ts";
import {
  assertEquals,
  assertExists,
  assertStrictEquals,
} from "https://deno.land/std@0.85.0/testing/asserts.ts";

Deno.test("Cookie constructor", () => {
  const dateValue = Date.now();
  const testCookie = new Cookie({
    domain: "www.google.com",
    httpOnly: true,
    secure: true,
    name: "foo",
    value: "bar",
    // this extra 1000 is for checking that time is not accidently set to now or sth like that
    // (very very unlikely to happen, but anyawy)
    expires: dateValue + 1000,
    creationDate: dateValue - 1000,
    maxAge: -1,
    path: "/",
    sameSite: "None",
  });
  assertEquals(testCookie.domain, "www.google.com");
  assertEquals(testCookie.httpOnly, true);
  assertEquals(testCookie.secure, true);
  assertEquals(testCookie.name, "foo");
  assertEquals(testCookie.value, "bar");
  assertEquals(testCookie.expires, dateValue + 1000);
  assertEquals(testCookie.creationDate, dateValue - 1000);
  assertEquals(testCookie.maxAge, -1);
  assertEquals(testCookie.path, "/");
  assertEquals(testCookie.sameSite, "None");
  assertEquals(testCookie.isValid(), true);

  assertEquals(testCookie.getCookieString(), "foo=bar");
  assertEquals(testCookie.isValid(), true);
});

Deno.test("Cookie constructor (empty)", () => {
  const dateValue = Date.now();
  const testCookie = new Cookie();
  assertEquals(testCookie.domain, undefined);
  assertEquals(testCookie.httpOnly, false);
  assertEquals(testCookie.secure, false);
  assertEquals(testCookie.name, undefined);
  assertEquals(testCookie.value, undefined);
  assertEquals(testCookie.expires, undefined);
  assertEquals(testCookie.maxAge, undefined);
  assertEquals(testCookie.path, undefined);
  assertEquals(testCookie.sameSite, undefined);
  // exists
  assertExists(testCookie.creationDate);
  assertEquals(testCookie.isValid(), false);
});

Deno.test("Cookie.from()", () => {
  // try a real set-cookie header
  const cookieStr =
    "__cfduid=0000000000000000000000000000; expires=Tue, 02-Mar-21 11:37:17 GMT; path=/sth; domain=.example.com; HttpOnly; SameSite=Lax; Secure";
  const cookie = Cookie.from(cookieStr);

  assertEquals(cookie.domain, "example.com");
  assertEquals(cookie.path, "/sth");
  assertEquals(
    cookie.expires,
    new Date("Tue, 02-Mar-21 11:37:17 GMT").getTime(),
  );
  assertEquals(cookie.name, "__cfduid");
  assertEquals(cookie.value, "0000000000000000000000000000");
  assertEquals(cookie.httpOnly, true);
  assertEquals(cookie.secure, true);
  assertEquals(cookie.sameSite, "Lax");

  // other tests
  assertEquals(Cookie.from("foo=bar; ").getCookieString(), "foo=bar");
  assertEquals(Cookie.from("foo=bar;").getCookieString(), "foo=bar");
  assertEquals(Cookie.from("foo=bar").getCookieString(), "foo=bar");
  assertEquals(Cookie.from("foo=bar").toString(), "foo=bar");
});

Deno.test("Cookie json serialization", () => {
  const testCookie = new Cookie({
    name: "foo",
    value: "bar",
  });

  const newCookie = new Cookie(JSON.parse(JSON.stringify(testCookie)));

  assertStrictEquals(testCookie.toString(), newCookie.toString());
  assertStrictEquals(testCookie.getCookieString(), newCookie.getCookieString());
});

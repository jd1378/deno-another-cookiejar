import { Cookie } from "./Cookie.ts";
import { CookieJar } from "./CookieJar.ts";
import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.85.0/testing/asserts.ts";

Deno.test("CookieJar inits with cookies if given", () => {
  const cookieStr =
    "__cfduid=0000000000000000000000000000; expires=Tue, 02-Mar-21 11:37:17 GMT; path=/sth; domain=.example.com; HttpOnly; SameSite=Lax; Secure";
  const cookie = Cookie.from(cookieStr);

  assertEquals(new CookieJar().cookies.length, 0);

  const cookieJar = new CookieJar([cookie]);

  assertEquals(cookieJar.cookies.length, 1);
  assertEquals(cookieJar.cookies[0], cookie);
});

Deno.test("CookieJar.getCookie()", () => {
  const cookieStr =
    "__cfduid=0000000000000000000000000000; expires=Tue, 02-Mar-21 11:37:17 GMT; path=/sth; domain=.example.com; HttpOnly; SameSite=Lax; Secure";
  const cookie = Cookie.from(cookieStr);
  const cookieJar = new CookieJar([cookie]);

  // using another cookie object
  const anotherCookie = Cookie.from(cookieStr);
  assertEquals(cookieJar.getCookie(anotherCookie), cookie);

  // single option props find
  assertEquals(cookieJar.getCookie({ name: anotherCookie.name }), cookie);
  assertEquals(cookieJar.getCookie({ value: anotherCookie.value }), cookie);
  assertEquals(
    cookieJar.getCookie({ creationDate: anotherCookie.creationDate }),
    cookie,
  );
  assertEquals(cookieJar.getCookie({ maxAge: anotherCookie.maxAge }), cookie);
  assertEquals(cookieJar.getCookie({ expires: anotherCookie.expires }), cookie);
  assertEquals(cookieJar.getCookie({ path: anotherCookie.path }), cookie);
  assertEquals(cookieJar.getCookie({ domain: anotherCookie.domain }), cookie);
  assertEquals(
    cookieJar.getCookie({ httpOnly: anotherCookie.httpOnly }),
    cookie,
  );
  assertEquals(
    cookieJar.getCookie({ sameSite: anotherCookie.sameSite }),
    cookie,
  );
  assertEquals(cookieJar.getCookie({ secure: anotherCookie.secure }), cookie);

  // should not find
  assertNotEquals(
    cookieJar.getCookie({ name: "something_else" }),
    cookie,
  );

  // multiple option props find
  assertEquals(
    cookieJar.getCookie({
      name: anotherCookie.name,
      value: anotherCookie.value,
    }),
    cookie,
  );
  assertEquals(
    cookieJar.getCookie({
      name: anotherCookie.name,
      value: anotherCookie.value,
      domain: anotherCookie.domain,
      path: anotherCookie.path,
      expires: anotherCookie.expires,
    }),
    cookie,
  );

  // any mismatch option props should not find
  assertNotEquals(
    cookieJar.getCookie({ name: anotherCookie.name, domain: "notexample.com" }),
    cookie,
  );
});

Deno.test("CookieJar.getCookie() (multiple cookie entries)", () => {
  const cookieStr1 = "test=nop; path=/sth; domain=.example.com";
  const cookieStr2 = "foo=bar; path=/sth; domain=.example.com";
  const cookieStr3 = "foo=bar; path=/sth; domain=notexample.com";
  const cookieStr4 = "baz=thud; path=/sth; domain=notexample.com";
  const cookieStr5 = "moo=bee; path=/notsth; domain=notexample.com";
  const cookieStr6 = "foo=bar; path=/sth/deeper; domain=.example.com";
  const cookie1 = Cookie.from(cookieStr1);
  const cookie2 = Cookie.from(cookieStr2);
  const cookie3 = Cookie.from(cookieStr3);
  const cookie4 = Cookie.from(cookieStr4);
  const cookie5 = Cookie.from(cookieStr5);
  const cookie6 = Cookie.from(cookieStr6);

  const cookieJar = new CookieJar([
    cookie1,
    cookie2,
    cookie3,
    cookie4,
    cookie5,
    cookie6,
  ]);
  assertEquals(cookieJar.cookies.length, 6);

  assertEquals(
    cookieJar.getCookie({ name: "foo", domain: "anothernotexample.com" }),
    undefined,
  );
  assertEquals(
    cookieJar.getCookie({ name: "foo", domain: "notexample.com" }),
    cookie3,
  );
  assertEquals(
    cookieJar.getCookie({ name: "foo", domain: "notexample.com" }),
    cookie3,
  );
  assertEquals(
    cookieJar.getCookie({ path: "/notsth" }),
    cookie5,
  );

  // path test
  assertEquals(
    cookieJar.getCookie({ name: "foo", path: "/sth" }),
    cookie2,
  );
  assertEquals(
    cookieJar.getCookie({ name: "foo", path: "/sth/deeper" }),
    cookie6,
  );
});

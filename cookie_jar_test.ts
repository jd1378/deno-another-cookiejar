import { Cookie } from "./Cookie.ts";
import { CookieJar } from "./CookieJar.ts";
import {
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
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

Deno.test("CookieJar.getCookie() strictness check", () => {
  const cookieStr1 =
    "foo=bar; path=/sth; domain=.example.com; Expires=21 Oct 2022";
  const cookieStr2 =
    "foo=boo; path=/sth; domain=.example.com; Expires=21 Oct 2055";
  const cookieStr3 =
    "foo=zed; path=/sth; domain=notexample.com; Expires=21 Oct 2022";
  const cookie1 = Cookie.from(cookieStr1);
  const cookie2 = Cookie.from(cookieStr2);
  const cookie3 = Cookie.from(cookieStr3);

  const cookieJar = new CookieJar([
    cookie1,
    cookie2,
    cookie3,
  ]);
  assertEquals(cookieJar.cookies.length, 3);

  // strict, mismatch is not tolerated
  assertEquals(
    cookieJar.getCookie({
      value: "bar",
      expires: new Date("21 Oct 2055").getTime(),
    }),
    undefined,
  );

  // loose, only value, domain and path is checked
  assertEquals(
    cookieJar.getCookie(
      new Cookie({
        value: "bar",
        expires: new Date("21 Oct 2055").getTime(),
      }),
    )?.toString(),
    cookie1.toString(),
  );
});

Deno.test("CookieJar.getCookies()", () => {
  const cookieStr1 = "test=nop; path=/sth; domain=.example.com";
  const cookieStr2 = "foo=bar; path=/sth; domain=.example.com";
  const cookie1 = Cookie.from(cookieStr1);
  const cookie2 = Cookie.from(cookieStr2);

  const cookieJar = new CookieJar([
    cookie1,
    cookie2,
  ]);
  assertEquals(
    cookieJar.getCookies(new Cookie({ domain: "notexample.com" })).length,
    0,
  );
  assertEquals(
    cookieJar.getCookies(new Cookie({ domain: "example.com" })).length,
    2,
  );
});

Deno.test("CookieJar.getCookies() with expired cookies", () => {
  const cookieStr1 =
    "test=nop; path=/sth; domain=.example.com; Expires=Wed, 21 Oct 2015 07:28:00 GMT";
  const cookieStr2 =
    "foo=bar; path=/sth; domain=.example.com; Expires=Wed, 21 Oct 2015 07:28:00 GMT";
  const cookieStr3 =
    "foo=bar; path=/sth; domain=.example.com; Expires=Wed, 21 Oct 2022 07:28:00 GMT";
  const cookie1 = Cookie.from(cookieStr1);
  const cookie2 = Cookie.from(cookieStr2);
  const cookie3 = Cookie.from(cookieStr3);

  const cookieJar = new CookieJar([
    cookie1,
    cookie2,
    cookie3,
  ]);
  assertEquals(
    cookieJar.getCookies(new Cookie({ domain: "notexample.com" })).length,
    0,
  );
  assertEquals(
    cookieJar.getCookies(new Cookie({ domain: "example.com" })).length,
    1,
  );
  assertEquals(
    cookieJar.cookies.length,
    1,
  );
});

Deno.test("CookieJar.removeCookie()", () => {
  const cookieStr1 = "test=nop; path=/sth; domain=.example.com";
  const cookieStr2 = "foo=bar; path=/sth; domain=.example.com";
  const cookie1 = Cookie.from(cookieStr1);
  const cookie2 = Cookie.from(cookieStr2);

  const cookieJar = new CookieJar([
    cookie1,
    cookie2,
  ]);
  assertEquals(
    cookieJar.getCookies().length,
    2,
  );
  cookieJar.removeCookie(new Cookie({ name: "test" }));
  assertEquals(
    cookieJar.getCookies(new Cookie({ domain: "example.com" })).length,
    1,
  );
  assertEquals(
    cookieJar.getCookie(new Cookie({ domain: "example.com" }))?.value,
    "bar",
  );
});

Deno.test("CookieJar.removeCookies()", () => {
  const cookieStr1 = "test=nop; path=/sth; domain=.example.com";
  const cookieStr2 = "foo=bar; path=/sth; domain=.example.com";
  const cookie1 = Cookie.from(cookieStr1);
  const cookie2 = Cookie.from(cookieStr2);

  const cookieJar = new CookieJar([
    cookie1,
    cookie2,
  ]);
  assertEquals(
    cookieJar.getCookies().length,
    2,
  );
  cookieJar.removeCookies();
  assertEquals(
    cookieJar.getCookies().length,
    0,
  );

  cookieJar.setCookie(cookie1);
  cookieJar.setCookie(cookie2);
  assertEquals(
    cookieJar.getCookies().length,
    2,
  );
  // use wrong domain, should do nothing
  cookieJar.removeCookies({ domain: "notexample.com" });
  assertEquals(
    cookieJar.getCookies().length,
    2,
  );
  cookieJar.removeCookies({ domain: "example.com" });
  assertEquals(
    cookieJar.getCookies().length,
    0,
  );
});

Deno.test("CookieJar.getCookieString()", () => {
  const cookieStr1 = "test=nop; path=/sth; domain=.example.com";
  const cookieStr2 = "foo=bar; path=/sth; domain=.example.com";
  const cookie1 = Cookie.from(cookieStr1);
  const cookie2 = Cookie.from(cookieStr2);

  const cookieJar = new CookieJar([
    cookie1,
    cookie2,
  ]);

  assertStrictEquals(
    cookieJar.getCookieString("example.com"),
    "test=nop; foo=bar",
  );
  assertStrictEquals(
    cookieJar.getCookieString("notexample.com"),
    "",
  );
});

Deno.test("CookieJar json serialization", () => {
  const cookieStr1 = "test=nop; path=/sth; domain=.example.com";
  const cookieStr2 = "foo=bar; path=/sth; domain=.example.com";
  const cookie1 = Cookie.from(cookieStr1);
  const cookie2 = Cookie.from(cookieStr2);

  const cookieJar = new CookieJar([
    cookie1,
    cookie2,
  ]);

  const newCookieJar = new CookieJar(JSON.parse(JSON.stringify(cookieJar)));

  // our before-serialized jar
  assertStrictEquals(
    cookieJar.getCookieString("example.com"),
    "test=nop; foo=bar",
  );
  assertStrictEquals(
    cookieJar.getCookieString("notexample.com"),
    "",
  );
  // our new parsed cookie jar
  assertStrictEquals(
    newCookieJar.getCookieString("example.com"),
    "test=nop; foo=bar",
  );
  assertStrictEquals(
    newCookieJar.getCookieString("notexample.com"),
    "",
  );
});

Deno.test("CookieJar replaceCookies()", () => {
  const cookieStr1 = "test=nop; path=/sth; domain=.example.com";
  const cookieStr2 = "foo=bar; path=/sth; domain=.example.com";
  const cookie1 = Cookie.from(cookieStr1);
  const cookie2 = Cookie.from(cookieStr2);

  const cookieJar = new CookieJar([
    cookie1,
    cookie2,
  ]);

  assertStrictEquals(
    cookieJar.cookies.length,
    2,
  );

  cookieJar.replaceCookies();
  assertStrictEquals(
    cookieJar.cookies.length,
    0,
  );

  cookieJar.replaceCookies([cookie1]);
  assertStrictEquals(
    cookieJar.cookies.length,
    1,
  );
  assertStrictEquals(
    cookieJar.cookies[0],
    cookie1,
  );
});

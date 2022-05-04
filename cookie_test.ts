import { Cookie } from "./cookie.ts";
import {
  assert,
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
  const testCookie = new Cookie();
  assertEquals(testCookie.domain, undefined);
  assertEquals(testCookie.httpOnly, undefined);
  assertEquals(testCookie.secure, undefined);
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
  assertEquals(Cookie.from("foo=bar===").toString(), "foo=bar===");
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

Deno.test("Cookie json serialization does not include creationIndex or cookiesCreated", () => {
  const testCookie = new Cookie({
    name: "foo",
    value: "bar",
  });

  const cookieData = JSON.parse(JSON.stringify(testCookie));

  assertStrictEquals(cookieData.creationIndex, undefined);
  assertStrictEquals(cookieData.cookiesCreated, undefined);
});

Deno.test("Cookie.clone()", () => {
  const testCookie = new Cookie({
    name: "foo",
    value: "bar",
  });

  const anotherCookie = testCookie.clone();

  // not equal in reference
  assert(testCookie != anotherCookie, "error: both have the same reference");
});

Deno.test("Cookie.canSendTo()", () => {
  let testCookie = new Cookie();
  testCookie.setDomain("www.example.com");

  // check cookie can be sent to current domain and its subdomains
  assertStrictEquals(testCookie.canSendTo("www.example.com"), true);
  assertStrictEquals(testCookie.canSendTo("example.com"), true);

  // check cookie can not be send cross domains:
  assertStrictEquals(testCookie.canSendTo("sub.example.com"), false);
  assertStrictEquals(testCookie.canSendTo("anyexample.com"), false);

  // check that secure cookies are only sent over https connections
  testCookie.secure = true;
  assertStrictEquals(testCookie.canSendTo("www.example.com"), false);
  assertStrictEquals(testCookie.canSendTo("https://www.example.com"), true);
  testCookie.secure = false;

  // path test
  testCookie = new Cookie();
  testCookie.domain = "x.y";
  testCookie.path = "/one/two";

  // parent
  assertStrictEquals(testCookie.canSendTo("x.y/one"), false);

  // identical
  assertStrictEquals(testCookie.canSendTo("x.y/one/two"), true);
  // ending with /
  assertStrictEquals(testCookie.canSendTo("x.y/one/two/"), true);
  // a prefix but does not matches
  assertStrictEquals(
    testCookie.canSendTo("x.y/one/twobar"),
    false,
  );
  // sub paths
  assertStrictEquals(
    testCookie.canSendTo("x.y/one/two/three"),
    true,
  );
  assertStrictEquals(
    testCookie.canSendTo("x.y/one/two/three/"),
    true,
  );
});

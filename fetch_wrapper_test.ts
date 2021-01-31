import {
  assert,
  assertStrictEquals,
} from "https://deno.land/std@0.85.0/testing/asserts.ts";
import { serve, Server } from "https://deno.land/std@0.85.0/http/server.ts";
import { CookieJar } from "./CookieJar.ts";
import { wrapFetch } from "./FetchWrapper.ts";

let server1: Server;
const serverOneUrl = "http://localhost:54933";

let server2: Server;
const serverTwoUrl = "http://localhost:54934";

let handlers: Promise<void | string>[];
handlers = [];

async function handleServer1() {
  server1 = serve({ hostname: "0.0.0.0", port: 54933 });
  for await (const request of server1) {
    if (request.url === "/") {
      const bodyContent = request.headers.get("cookie") || "";
      await request.respond({ status: 200, body: bodyContent });
    } else if (request.url === "/set1") {
      const headers = new Headers();
      headers.append("Set-Cookie", "foo=bar; Path=/; HttpOnly");
      headers.append("Set-Cookie", "baz=thud; Path=/; Secure");

      await request.respond({ status: 200, body: "ok", headers });
    }
  }
}

async function handleServer2() {
  server2 = serve({ hostname: "0.0.0.0", port: 54934 });
  for await (const request of server2) {
    if (request.url === "/") {
      const bodyContent = request.headers.get("cookie") || "";
      await request.respond({ status: 200, body: bodyContent });
    } else if (request.url === "/set1") {
      const headers = new Headers();
      headers.append("Set-Cookie", "echo=one; Path=/; HttpOnly");
      headers.append("Set-Cookie", "third=echo; Path=/; Secure");

      await request.respond({ status: 200, body: "ok", headers });
    }
  }
}

console.log(`Test HTTP webserver running at: http://localhost:54933`);

async function closeServers() {
  try {
    //send a dummy req after close to close the server
    server1 && server1.close();
    server2 && server2.close();
    handlers.push(
      fetch(serverOneUrl).then((r) => r.text()).catch((err) => {}),
      fetch(serverTwoUrl).then((r) => r.text()).catch((err) => {}),
    );
    await Promise.all(handlers);
    handlers = [];
  } catch {
    //
  }
}

Deno.test("WrappedFetch saves cookies from set-cookie header", async () => {
  handlers.push(handleServer1());
  const cookieJar = new CookieJar();
  const wrappedFetch = wrapFetch({ cookieJar });
  await wrappedFetch(serverOneUrl + "/set1").then((r) => r.text());
  assertStrictEquals(cookieJar.getCookie({ name: "foo" })?.value, "bar");
  assertStrictEquals(cookieJar.getCookie({ name: "baz" })?.value, "thud");
  await closeServers();
});

Deno.test("WrappedFetch doesn't send secure cookies over unsecure urls", async () => {
  handlers.push(handleServer1());
  const cookieJar = new CookieJar();
  const wrappedFetch = wrapFetch({ cookieJar });
  await wrappedFetch(serverOneUrl + "/set1").then((r) => r.text());
  assertStrictEquals(cookieJar.getCookie({ name: "foo" })?.value, "bar");
  assertStrictEquals(cookieJar.getCookie({ name: "baz" })?.value, "thud");

  // since `baz` cookie is secure, it should not be sent with fetch
  assertStrictEquals(cookieJar.getCookie({ name: "baz" })?.secure, true);
  const cookieString = await wrappedFetch(serverOneUrl + "/").then((r) =>
    r.text()
  );
  assertStrictEquals(cookieString, "foo=bar");
  await closeServers();
});

Deno.test("Cookies are not send cross domain", async () => {
  handlers.push(handleServer1());
  handlers.push(handleServer2());
  const cookieJar = new CookieJar();
  const wrappedFetch = wrapFetch({ cookieJar });

  // server 1
  await wrappedFetch(serverOneUrl + "/set1").then((r) => r.text());
  assertStrictEquals(cookieJar.getCookie({ name: "foo" })?.value, "bar");
  assertStrictEquals(cookieJar.getCookie({ name: "baz" })?.value, "thud");

  // server 2
  await wrappedFetch(serverTwoUrl + "/set1").then((r) => r.text());
  assertStrictEquals(cookieJar.getCookie({ name: "echo" })?.value, "one");
  assertStrictEquals(cookieJar.getCookie({ name: "third" })?.value, "echo");

  // we got all the cookies, not should try to see if we send them right
  let cookieString;
  // try server1
  cookieString = await wrappedFetch(serverOneUrl + "/").then((r) => r.text());
  assertStrictEquals(cookieString, "foo=bar");
  // try server2
  cookieString = await wrappedFetch(serverTwoUrl + "/").then((r) => r.text());
  assertStrictEquals(cookieString, "echo=one");
  await closeServers();
});

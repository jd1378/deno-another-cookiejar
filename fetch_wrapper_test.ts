import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertFalse,
  assertRejects,
  assertStrictEquals,
} from "https://deno.land/std@0.139.0/testing/asserts.ts";
import { CookieJar } from "./cookie_jar.ts";
import { wrapFetch } from "./fetch_wrapper.ts";
import { delay } from "https://deno.land/std@0.139.0/async/delay.ts";
import { Cookie } from "./cookie.ts";

function drop(resourceName: string) {
  const rt: Deno.ResourceMap = Deno.resources();
  for (const rid in rt) {
    if (rt[rid] == resourceName) {
      try {
        Deno.close(Number(rid));
        return true;
      } catch {
        return false;
      }
    }
  }
}

const serverOnePort = 53250;
const serverTwoPort = 53251;
const serverOneHostname = "127.0.0.1";
const serverTwoHostname = "localhost";

const serverOneOptions = {
  hostname: serverOneHostname,
  port: serverOnePort,
};

const serverTwoOptions = {
  hostname: serverTwoHostname,
  port: serverTwoPort,
};

const serverOneUrl = `http://${serverOneHostname}:${serverOnePort}`;

const serverTwoUrl = `http://${serverTwoHostname}:${serverTwoPort}`;

async function serverHandler(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === "/echo_headers") {
    const headers = JSON.stringify([...request.headers]);
    return new Response(headers, { status: 200 });
  } else if (pathname === "/echo_body") {
    const body = await request.text();
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } else if (pathname === "/echo_foo") {
    const body = "foo";
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/text" },
    });
  } else if (pathname === "/echo_method") {
    return new Response(request.method, { status: 200 });
  } else if (pathname === "/set1") {
    const headers = new Headers();
    headers.append("Set-Cookie", "foo=bar; Path=/; HttpOnly");
    headers.append("Set-Cookie", "baz=thud; Path=/; Secure");
    return new Response("ok", { status: 200, headers });
  } else if (pathname === "/set2") {
    const headers = new Headers();
    headers.append("Set-Cookie", "echo=one; Path=/; HttpOnly");
    headers.append("Set-Cookie", "third=echo; Path=/; Secure");
    return new Response("ok", { status: 200, headers });
  } else if (pathname === "/redirect_to_server_two_set1") {
    return Response.redirect(serverTwoUrl + "/set1");
  } else if (pathname === "/redirect_to_server_two_set1_with_cookie") {
    const headers = new Headers({
      "Set-Cookie": "redirect_cookie=bar; Path=/; HttpOnly",
      "location": serverTwoUrl + "/set1",
    });
    return new Response(null, { status: 301, headers });
  } else if (pathname === "/redirect_to_server_two") {
    const headers = new Headers({
      "location": serverTwoUrl + "/echo_headers",
    });
    return new Response(null, { status: 301, headers });
  } else if (pathname === "/redirect_to_server_two_echo_method") {
    const headers = new Headers({
      "location": serverTwoUrl + "/echo_method",
    });
    return new Response(null, { status: 301, headers });
  } else if (pathname === "/redirect_to_server_two_echo_body") {
    const headers = new Headers({
      "location": serverTwoUrl + "/echo_body",
    });
    return new Response(null, { status: 301, headers });
  } else if (pathname === "/redirect_to_echo_foo") {
    const headers = new Headers({
      "location": "/echo_foo",
    });
    return new Response(null, { status: 301, headers });
  } else if (pathname === "/redirect_loop") {
    const headers = new Headers({
      "location": serverOneUrl + "/redirect_loop_2",
    });
    return new Response(null, { status: 301, headers });
  } else if (pathname === "/redirect_loop_2") {
    const headers = new Headers({
      "location": serverOneUrl + "/redirect_loop",
    });
    return new Response(null, { status: 302, headers });
  } else {
    const bodyContent = request.headers.get("cookie") || "";
    return new Response(bodyContent, { status: 200 });
  }
}

type ListenAndServeOptions = {
  hostname: string;
  port: number;
  abortController: AbortController;
};

async function listenAndServe(options: ListenAndServeOptions) {
  const { hostname, port, abortController } = options;

  const listener = Deno.listen({ hostname, port });

  const handleAbort = () => {
    abortController.signal.removeEventListener("abort", handleAbort);
    listener.close();
    drop("httpConn");
  };

  abortController.signal.addEventListener("abort", handleAbort);

  try {
    for await (const conn of listener) {
      for await (
        const { respondWith, request } of Deno.serveHttp(conn)
      ) {
        respondWith(serverHandler(request));
      }
    }
  } catch {
    drop("httpConn");
  }
}

function runServer(
  options: Omit<ListenAndServeOptions, "abortController">,
) {
  const abortController = new AbortController();
  listenAndServe({
    ...options,
    abortController,
  }).catch((e) => {
    abortController.abort();
    delay(10);
    throw e;
  });
  return abortController;
}

console.log(
  "Test HTTP webserver running at:",
  serverOneUrl,
  serverTwoUrl,
);
console.log('GET "/" echos "cookie" header, GET "/set1" sets two cookies');

Deno.test("WrappedFetch saves cookies from set-cookie header", async () => {
  const abortController = runServer(serverOneOptions);
  try {
    const cookieJar = new CookieJar();
    const wrappedFetch = wrapFetch({ cookieJar });
    const response = await wrappedFetch(serverOneUrl + "/set1");
    await response.body?.cancel();
    assertStrictEquals(cookieJar.getCookie({ name: "foo" })?.value, "bar");
    assertStrictEquals(cookieJar.getCookie({ name: "baz" })?.value, "thud");
  } finally {
    abortController.abort();
  }
});

Deno.test("WrappedFetch can use the Request and still inject cookies", async () => {
  const abortController = runServer(serverOneOptions);
  try {
    const cookieJar = new CookieJar([
      new Cookie({
        name: "goo",
        value: "baz",
        expires: new Date("2600 10 10").valueOf(),
        domain: new URL(serverOneUrl).hostname,
      }),
    ]);
    const wrappedFetch = wrapFetch({ cookieJar });
    const request = new Request(serverOneUrl + "/echo_headers", {
      headers: { foo: "bar", zoo: "bum" },
    });
    const res = await wrappedFetch(request, {
      headers: [["thud", "fum"], ["zoo", "gut"]],
    })
      .then((r) => r.json());
    assertArrayIncludes(res, [
      ["foo", "bar"],
      ["zoo", "gut"], // not 'bum' because init should replace original request options
      ["thud", "fum"],
      [
        "cookie",
        "goo=baz",
      ],
    ]);
  } finally {
    abortController.abort();
  }
});

Deno.test("WrappedFetch body is not tampered with", async () => {
  const abortController = runServer(serverOneOptions);
  try {
    const wrappedFetch = wrapFetch();
    const bodyData = { foo: "bar" };
    const request = new Request(serverOneUrl + "/echo_body", {
      body: JSON.stringify(bodyData),
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const res = await wrappedFetch(request).then((r) => r.json());
    assertEquals(res, bodyData);
  } finally {
    abortController.abort();
  }
});

Deno.test("WrappedFetch merges headers with cookie header", async () => {
  const abortController = runServer(serverOneOptions);
  try {
    const cookieJar = new CookieJar();
    const wrappedFetch = wrapFetch({ cookieJar });
    await wrappedFetch(serverOneUrl + "/set1").then((r) => r.text());
    assertStrictEquals(cookieJar.getCookie({ name: "foo" })?.value, "bar");

    const headersToSend = new Headers();
    headersToSend.set("user-agent", "something");

    let cookieString = await wrappedFetch(serverOneUrl + "/", {
      headers: headersToSend,
    }).then((r) => r.text());

    assertStrictEquals(cookieString, "foo=bar");

    // second type
    cookieString = await wrappedFetch(serverOneUrl + "/", {
      headers: {
        "user-agent": "something",
      },
    }).then((r) => r.text());

    assertStrictEquals(cookieString, "foo=bar");

    // third type
    cookieString = await wrappedFetch(serverOneUrl + "/", {
      headers: [
        ["user-agent", "something"],
      ],
    }).then((r) => r.text());

    assertStrictEquals(cookieString, "foo=bar");
  } finally {
    abortController.abort();
  }
});

Deno.test("WrappedFetch doesn't send secure cookies over unsecure urls", async () => {
  const abortController = runServer(serverOneOptions);
  try {
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
  } finally {
    abortController.abort();
  }
});

Deno.test("response.redirected is set when redirected", async () => {
  const abortController = runServer(serverOneOptions);
  const abortController2 = runServer(serverTwoOptions);
  try {
    const wrappedFetch = wrapFetch();

    const response = await wrappedFetch(
      serverOneUrl + "/redirect_to_server_two_set1",
    );
    await response.body?.cancel();
    assertStrictEquals(response.redirected, true);
  } finally {
    abortController.abort();
    abortController2.abort();
  }
});

Deno.test("response.redirected is not set when not redirected", async () => {
  const abortController = runServer(serverOneOptions);
  try {
    const wrappedFetch = wrapFetch();

    const response = await wrappedFetch(
      serverOneUrl + "/echo_headers",
    );
    await response.body?.cancel();
    assertStrictEquals(response.redirected, false);
  } finally {
    abortController.abort();
  }
});

Deno.test("Sets the correct domain in cookies when 302-redirected", async () => {
  const abortController = runServer(serverOneOptions);
  const abortController2 = runServer(serverTwoOptions);
  try {
    const cookieJar = new CookieJar();
    const wrappedFetch = wrapFetch({ cookieJar });

    await wrappedFetch(serverOneUrl + "/redirect_to_server_two_set1").then((
      r,
    ) => r.text());
    assertStrictEquals(
      cookieJar.getCookie({ name: "foo" })?.domain,
      `${serverTwoHostname}`,
    );
  } finally {
    abortController.abort();
    abortController2.abort();
  }
});

Deno.test("Gets cookies both from 302-redirected and 200 response", async () => {
  const abortController = runServer(serverOneOptions);
  const abortController2 = runServer(serverTwoOptions);
  try {
    const cookieJar = new CookieJar();
    const wrappedFetch = wrapFetch({ cookieJar });

    await wrappedFetch(
      serverOneUrl + "/redirect_to_server_two_set1_with_cookie",
    ).then((
      r,
    ) => r.text());
    assertStrictEquals(
      cookieJar.getCookie({ name: "foo" })?.domain,
      `${serverTwoHostname}`,
    );
    assertStrictEquals(
      cookieJar.getCookie({ name: "redirect_cookie" })?.domain,
      `${serverOneHostname}`,
    );
  } finally {
    abortController.abort();
    abortController2.abort();
  }
});

Deno.test("Redirect loop ends when it reaches 20 redirects", async () => {
  const abortController = runServer(serverOneOptions);
  try {
    const wrappedFetch = wrapFetch();
    const pathname = "/redirect_loop";

    await assertRejects(
      async () => {
        await wrappedFetch(serverOneUrl + pathname);
      },
      Error,
      `Reached maximum redirect of 20 for URL: ${serverOneUrl}`,
    );
  } finally {
    abortController.abort();
  }
});

Deno.test("Respects when request.init.redirect is set to 'manual'", async () => {
  const abortController = runServer(serverOneOptions);
  try {
    const wrappedFetch = wrapFetch();

    const pathname = "/redirect_to_server_two_set1";
    const response = await wrappedFetch(
      serverOneUrl + pathname,
      {
        redirect: "manual",
      },
    );
    await response.text();
    assertStrictEquals(response.url, serverOneUrl + pathname);
  } finally {
    abortController.abort();
  }
});

Deno.test("Respects when request.init.redirect is set to 'error'", async () => {
  const abortController = runServer(serverOneOptions);
  try {
    const wrappedFetch = wrapFetch();

    const pathname = "/redirect_to_server_two_set1";

    const fn = async () => {
      await wrappedFetch(serverOneUrl + pathname, {
        redirect: "error",
      });
    };

    await assertRejects(
      async () => await fn(),
      Error,
      `URI requested responded with a redirect and redirect mode is set to error: ${serverOneUrl}${pathname}`,
    );
  } finally {
    abortController.abort();
  }
});

Deno.test("Cookies are not send cross domain", async () => {
  const abortController = runServer(serverOneOptions);
  const abortController2 = runServer(serverTwoOptions);
  try {
    const cookieJar = new CookieJar();
    const wrappedFetch = wrapFetch({ cookieJar });

    // server 1
    await wrappedFetch(serverOneUrl + "/set1").then((r) => r.text());
    assertStrictEquals(cookieJar.getCookie({ name: "foo" })?.value, "bar");
    assertStrictEquals(cookieJar.getCookie({ name: "baz" })?.value, "thud");

    // server 2
    await wrappedFetch(serverTwoUrl + "/set2").then((r) => r.text());
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
  } finally {
    abortController.abort();
    abortController2.abort();
  }
});

Deno.test("using wrapped fetch doesn't mutate user's initial init", async () => {
  const abortController = runServer(serverOneOptions);
  try {
    const cookieJar = new CookieJar();
    const wrappedFetch = wrapFetch({ cookieJar });

    const abortController = new AbortController();
    const originalUserInit: RequestInit = {
      body: "foo",
      cache: "reload",
      credentials: "omit",
      headers: [["a", "b"]],
      integrity: "c",
      keepalive: false,
      method: "POST",
      mode: "no-cors",
      redirect: "follow",
      referrer: "unknwn",
      referrerPolicy: "unsafe-url",
      signal: abortController.signal,
      window: null,
    };

    const userInit: RequestInit = {
      body: "foo",
      cache: "reload",
      credentials: "omit",
      headers: [["a", "b"]],
      integrity: "c",
      keepalive: false,
      method: "POST",
      mode: "no-cors",
      redirect: "follow",
      referrer: "unknwn",
      referrerPolicy: "unsafe-url",
      signal: abortController.signal,
      window: null,
    };

    const response = await wrappedFetch(serverOneUrl + "/set1", userInit);
    await response.body?.cancel();

    assertEquals(originalUserInit, userInit);
  } finally {
    abortController.abort();
  }
});

Deno.test("doesn't send sensitive headers after redirect to different domains", async () => {
  const abortController = runServer(serverOneOptions);
  const abortController2 = runServer(serverTwoOptions);
  try {
    const cookieJar = new CookieJar();
    const wrappedFetch = wrapFetch({ cookieJar });

    const res = await wrappedFetch(
      serverOneUrl + "/redirect_to_server_two",
      {
        headers: {
          "foo": "bar",
          "authorization": "foo",
          "www-authenticate": "foo",
          "cookie": "foo",
          "cookie2": "foo",
        },
      },
    ).then((r) => r.json());

    const resHeaders = new Headers(res);
    assert(resHeaders.has("foo"), "request didn't have `foo` in headers");
    // should not contain the headers above
    assertFalse(
      resHeaders.has("www-authenticate"),
      "request had `www-authenticate` in headers",
    );
    assertFalse(
      resHeaders.has("authorization"),
      "request had `authorization` in headers",
    );
    assertFalse(
      resHeaders.has("cookie"),
      "`cookie` header is not empty",
    );
    assertFalse(
      resHeaders.has("cookie2"),
      "`cookie2` header shouldn't be sent! ",
    );
  } finally {
    abortController.abort();
    abortController2.abort();
  }
});

Deno.test("doesn't POST body after redirection", async () => {
  const abortController = runServer(serverOneOptions);
  const abortController2 = runServer(serverTwoOptions);

  try {
    const cookieJar = new CookieJar();
    const wrappedFetch = wrapFetch({ cookieJar });

    const res = await wrappedFetch(
      serverOneUrl + "/redirect_to_server_two_echo_method",
      { body: "FOO", method: "POST" },
    ).then((r) => r.text());

    assertEquals(res, "GET", "method is NOT changed to GET after redirection");

    const echoRes = await wrappedFetch(
      serverOneUrl + "/redirect_to_server_two_echo_body",
      { body: "FOO", method: "POST" },
    ).then((r) => r.text());

    assertEquals(echoRes, "", "no content should be sent after redirection");

    const headerRes = await wrappedFetch(
      serverOneUrl + "/redirect_to_server_two",
      { body: "FOO", method: "POST" },
    ).then((r) => r.text());

    assertFalse(
      headerRes.includes("content-length"),
      "content-length header must not be sent after redirection",
    );
  } finally {
    abortController.abort();
    abortController2.abort();
  }
});

Deno.test("handles path redirections", async () => {
  const abortController2 = runServer(serverTwoOptions);

  try {
    const wrappedFetch = wrapFetch();

    const res = await wrappedFetch(
      serverTwoUrl + "/redirect_to_echo_foo",
      { method: "GET" },
    ).then((r) => r.text());

    assertEquals(
      res,
      "foo",
      "path redirect breaks the app",
    );
  } finally {
    abortController2.abort();
  }
});

import {
  assertArrayIncludes,
  assertStrictEquals,
} from "https://deno.land/std@0.139.0/testing/asserts.ts";
import { CookieJar } from "./cookie_jar.ts";
import { wrapFetch } from "./fetch_wrapper.ts";
import { delay } from "https://deno.land/std@0.139.0/async/delay.ts";

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
const serverHostname = "127.0.0.1";

const serverOneOptions = {
  hostname: serverHostname,
  port: serverOnePort,
};

const serverTwoOptions = {
  hostname: serverHostname,
  port: serverTwoPort,
};

const serverOneUrl = `http://${serverHostname}:${serverOnePort}`;

const serverTwoUrl = `http://${serverHostname}:${serverTwoPort}`;

function serverHandler(request: Request): Response {
  const pathname = new URL(request.url).pathname;
  if (pathname === "/echo_headers") {
    const headers = JSON.stringify([...request.headers]);
    return new Response(headers, { status: 200 });
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
  } else if (pathname === "/redirect_with_cookie") {
    const headers = new Headers({
      "Set-Cookie": "redirect_cookie=bar; Path=/; HttpOnly",
      "location": serverTwoUrl + "/set1",
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
    await wrappedFetch(serverOneUrl + "/set1").then((r) => r.text());
    assertStrictEquals(cookieJar.getCookie({ name: "foo" })?.value, "bar");
    assertStrictEquals(cookieJar.getCookie({ name: "baz" })?.value, "thud");
  } finally {
    abortController.abort();
  }
});

Deno.test("WrappedFetch uses the input as init if it's a Request object", async () => {
  const abortController = runServer(serverOneOptions);
  try {
    const cookieJar = new CookieJar();
    const wrappedFetch = wrapFetch({ cookieJar });
    const request = new Request(serverOneUrl + "/echo_headers", {
      headers: { foo: "bar" },
    });
    const res = await wrappedFetch(request).then((r) => r.json());
    assertArrayIncludes(res, [["foo", "bar"]]);
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
      `${serverHostname}:${serverTwoPort}`,
    );
  } finally {
    abortController.abort();
    abortController2.abort();
  }
});

Deno.test("Gets cookies both from 302-redirected response and 200 response", async () => {
  const abortController = runServer(serverOneOptions);
  const abortController2 = runServer(serverTwoOptions);
  try {
    const cookieJar = new CookieJar();
    const wrappedFetch = wrapFetch({ cookieJar });

    await wrappedFetch(serverOneUrl + "/redirect_with_cookie").then((
      r,
    ) => r.text());
    assertStrictEquals(
      cookieJar.getCookie({ name: "foo" })?.domain,
      `${serverHostname}:${serverTwoPort}`,
    );
    assertStrictEquals(
      cookieJar.getCookie({ name: "redirect_cookie" })?.domain,
      `${serverHostname}:${serverOnePort}`,
    );
  } finally {
    abortController.abort();
    abortController2.abort();
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

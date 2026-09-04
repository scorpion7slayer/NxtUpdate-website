import { describe, expect, test } from "bun:test";
import { handleRequest } from "./index";

describe("Docs7 reverse proxy", () => {
  test("keeps non-docs paths on the static site", async () => {
    let upstreamCalled = false;
    const assets = async () => new Response("landing", { status: 200 });
    const upstream = async () => {
      upstreamCalled = true;
      return new Response("unexpected");
    };

    const response = await handleRequest(
      new Request("https://nxtupdate.nxtaigen.com/styles.css"),
      assets,
      upstream,
    );

    expect(await response.text()).toBe("landing");
    expect(upstreamCalled).toBe(false);
  });

  test("proxies /docs with its query and the Docs7 Host header", async () => {
    let receivedRequest: Request | undefined;
    let receivedInit: RequestInit | undefined;
    const upstream = async (input: RequestInfo | URL, init?: RequestInit) => {
      receivedRequest = input instanceof Request ? input : new Request(input, init);
      receivedInit = init;
      return new Response("docs", {
        headers: { "Content-Type": "text/plain" },
      });
    };

    const response = await handleRequest(
      new Request("https://nxtupdate.nxtaigen.com/docs?lang=en"),
      async () => new Response("unexpected"),
      upstream,
    );

    expect(await response.text()).toBe("docs");
    expect(receivedRequest?.url).toBe(
      "https://scorpion7slayer-nxtupdate-website.docs7.io/docs?lang=en",
    );
    expect(receivedRequest?.headers.get("Host")).toBe(
      "scorpion7slayer-nxtupdate-website.docs7.io",
    );
    expect(receivedInit?.cache).toBe("no-store");
    expect(receivedInit?.redirect).toBe("manual");
  });

  test("disables HTML caching and streams the upstream status", async () => {
    const response = await handleRequest(
      new Request("https://nxtupdate.nxtaigen.com/docs/usage"),
      async () => new Response("unexpected"),
      async () =>
        new Response("<h1>Usage</h1>", {
          status: 203,
          headers: {
            "Cache-Control": "public, max-age=300",
            "CDN-Cache-Control": "max-age=600",
            "Cloudflare-CDN-Cache-Control": "max-age=900",
            "Content-Type": "text/html; charset=utf-8",
          },
        }),
    );

    expect(response.status).toBe(203);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.has("CDN-Cache-Control")).toBe(false);
    expect(response.headers.has("Cloudflare-CDN-Cache-Control")).toBe(false);
    expect(await response.text()).toBe("<h1>Usage</h1>");
  });

  test("preserves cache headers for non-HTML Docs7 assets", async () => {
    const response = await handleRequest(
      new Request("https://nxtupdate.nxtaigen.com/docs/logo.svg"),
      async () => new Response("unexpected"),
      async () =>
        new Response("<svg></svg>", {
          headers: {
            "Cache-Control": "public, max-age=86400",
            "Content-Type": "image/svg+xml",
          },
        }),
    );

    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=86400",
    );
  });

  test("rewrites Docs7 redirects to the public domain", async () => {
    const response = await handleRequest(
      new Request("https://nxtupdate.nxtaigen.com/docs/start"),
      async () => new Response("unexpected"),
      async () =>
        new Response(null, {
          status: 302,
          headers: {
            Location:
              "https://scorpion7slayer-nxtupdate-website.docs7.io/docs/installation",
          },
        }),
    );

    expect(response.headers.get("Location")).toBe(
      "https://nxtupdate.nxtaigen.com/docs/installation",
    );
  });
});

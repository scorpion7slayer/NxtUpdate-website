import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { handleRequest } from "./index";

const publicDir = join(import.meta.dir, "..", "public");

function visibleWords(html: string): string[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:lt|gt|amp|quot|#39);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.split(" ").filter(Boolean);
}

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

  test("keeps the sitemap and robots.txt on the static site", async () => {
    const seen: string[] = [];
    let upstreamCalled = false;
    const assets = async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      seen.push(new URL(request.url).pathname);
      return new Response("asset", {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      });
    };

    for (const path of [
      "/",
      "/sitemap.xml",
      "/sitemap-pages.xml",
      "/robots.txt",
    ]) {
      const response = await handleRequest(
        new Request(`https://nxtupdate.nxtaigen.com${path}`),
        assets,
        async () => {
          upstreamCalled = true;
          return new Response("unexpected");
        },
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("asset");
    }

    expect(upstreamCalled).toBe(false);
    expect(seen).toEqual([
      "/",
      "/sitemap.xml",
      "/sitemap-pages.xml",
      "/robots.txt",
    ]);
  });
});

describe("public SEO files", () => {
  test("publishes a sitemap index for the homepage and the Docs7 sitemap", async () => {
    const index = await Bun.file(join(publicDir, "sitemap.xml")).text();
    const pages = await Bun.file(join(publicDir, "sitemap-pages.xml")).text();
    const robots = await Bun.file(join(publicDir, "robots.txt")).text();

    expect(index).toContain("<sitemapindex");
    expect(index).toContain(
      "https://nxtupdate.nxtaigen.com/sitemap-pages.xml",
    );
    expect(index).toContain(
      "https://nxtupdate.nxtaigen.com/docs/sitemap.xml",
    );
    expect(pages).toContain("<urlset");
    expect(pages).toContain("<loc>https://nxtupdate.nxtaigen.com/</loc>");
    expect(robots).toContain(
      "Sitemap: https://nxtupdate.nxtaigen.com/sitemap.xml",
    );
  });

  test("homepage exposes canonical metadata, real copy, and footer links", async () => {
    const html = await Bun.file(join(publicDir, "index.html")).text();

    expect(html).toContain(
      '<link rel="canonical" href="https://nxtupdate.nxtaigen.com/">',
    );
    expect(html).toContain(
      '<meta property="og:title" content="NxtUpdate - universal package updater for macOS">',
    );
    expect(html).toContain(
      'property="og:description"',
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://nxtupdate.nxtaigen.com/">',
    );
    expect(html).toContain('href="https://nxtaigen.com/"');
    expect(html).toContain('href="https://theo.nxtaigen.com/"');
    expect(visibleWords(html).length).toBeGreaterThanOrEqual(400);
  });
});

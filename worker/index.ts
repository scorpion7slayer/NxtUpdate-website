const DOCS_ORIGIN = "https://scorpion7slayer-nxtupdate-website.docs7.io";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isDocsPath(pathname: string): boolean {
  return pathname === "/docs" || pathname.startsWith("/docs/");
}

function rewriteOriginRedirect(location: string, incoming: URL): string {
  const redirect = new URL(location, DOCS_ORIGIN);

  if (redirect.origin === DOCS_ORIGIN) {
    redirect.protocol = incoming.protocol;
    redirect.host = incoming.host;
  }

  return redirect.toString();
}

export async function handleRequest(
  request: Request,
  assets: Fetcher,
  fetchUpstream: Fetcher = fetch,
): Promise<Response> {
  const incoming = new URL(request.url);

  if (!isDocsPath(incoming.pathname)) {
    return assets(request);
  }

  const upstream = new URL(incoming.pathname + incoming.search, DOCS_ORIGIN);
  const upstreamRequest = new Request(upstream, request);
  upstreamRequest.headers.set("Host", upstream.host);

  const upstreamResponse = await fetchUpstream(upstreamRequest, {
    cache: "no-store",
    redirect: "manual",
  });
  const headers = new Headers(upstreamResponse.headers);
  const contentType = headers.get("Content-Type")?.toLowerCase() ?? "";

  if (contentType.includes("text/html")) {
    headers.set("Cache-Control", "no-store");
    headers.delete("CDN-Cache-Control");
    headers.delete("Cloudflare-CDN-Cache-Control");
  }

  const location = headers.get("Location");
  if (location) {
    headers.set("Location", rewriteOriginRedirect(location, incoming));
  }

  return new Response(upstreamResponse.body, {
    headers,
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });
}

export default {
  fetch(request, env) {
    return handleRequest(request, env.ASSETS.fetch.bind(env.ASSETS));
  },
} satisfies ExportedHandler<Env>;

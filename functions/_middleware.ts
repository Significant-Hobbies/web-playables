import {
  advertiseMarkdown,
  createStaticAssetHandler,
} from "../shared/agent-surfaces/adapters/static-assets.mjs";
import { markdownResponse, wantsMarkdown } from "../shared/agent-surfaces/http.mjs";

const handleReadability = createStaticAssetHandler({});
/**
 * Cloudflare Pages Functions middleware — agent SEO surfaces for idle.aliveville.com.
 * Handles /openapi.json, /api/ai, /llms.txt, JSON error responses, Vary: Accept,
 * and agent-friendly 404s.
 */

const SITE_ORIGIN = "https://idle.aliveville.com";

const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60;

const ERROR_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        code: { type: "string", description: "Machine-readable error code" },
        message: { type: "string", description: "Human-readable error message" },
        path: { type: "string", description: "The request path that caused the error" },
      },
      required: ["code", "message"],
    },
  },
  required: ["error"],
};

const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Idle — browser games public API",
    version: "1.0.0",
    description: "A small directory of browser-playable games and experiments.",
    contact: { name: "Idle", url: SITE_ORIGIN },
  },
  servers: [{ url: SITE_ORIGIN }],
  tags: [{ name: "agent-surfaces", description: "Machine-readable public surfaces" }],
  components: {
    schemas: {
      AgentCatalog: {
        type: "object",
        description: "JSON inventory of public agent surfaces and per-page markdown alternates.",
        properties: {
          name: { type: "string" },
          version: { type: "string" },
          url: { type: "string", format: "uri" },
          llms: { type: "string", format: "uri" },
          sitemap: { type: "string", format: "uri" },
          openapi: { type: "string", format: "uri" },
          markdown: {
            type: "object",
            properties: {
              suffix: { type: "string" },
              negotiation: { type: "boolean" },
            },
          },
          surfaces: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                url: { type: "string", format: "uri" },
                md: { type: "string", format: "uri", nullable: true },
                kind: { type: "string" },
                description: { type: "string" },
              },
            },
          },
        },
      },
      ErrorResponse: ERROR_RESPONSE_SCHEMA,
    },
  },
  paths: {
    "/api/md": {
      get: {
        summary: "Public homepage as Markdown",
        responses: {
          "200": {
            description: "Markdown",
            content: { "text/markdown": { schema: { type: "string" } } },
          },
        },
      },
    },
    "/api/md/_catalog": {
      get: {
        summary: "Public Markdown route catalog",
        responses: {
          "200": {
            description: "Registered routes",
            content: {
              "application/json": { schema: { type: "array", items: { type: "object" } } },
            },
          },
        },
      },
    },
    "/api/md/{path}": {
      get: {
        summary: "Registered public page as Markdown",
        parameters: [{ name: "path", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Markdown",
            content: { "text/markdown": { schema: { type: "string" } } },
          },
          "404": { description: "No public page at this path" },
        },
      },
    },
    "/api/ai": {
      get: {
        operationId: "getAgentCatalog",
        tags: ["agent-surfaces"],
        summary: "Agent catalog",
        description:
          "JSON inventory of public agent surfaces: llms.txt, sitemap, and game directory entries.",
        responses: {
          "200": {
            description: "Agent catalog JSON",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AgentCatalog" } },
            },
          },
          "404": {
            description: "Unknown API path",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/llms.txt": {
      get: {
        operationId: "getLlmsTxt",
        tags: ["agent-surfaces"],
        summary: "llms.txt index",
        description: "Compact agent index following the llms.txt convention.",
        responses: {
          "200": {
            description: "Markdown index",
            content: { "text/plain": { schema: { type: "string" } } },
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/sitemap.xml": {
      get: {
        operationId: "getSitemap",
        tags: ["agent-surfaces"],
        summary: "Sitemap",
        description: "XML sitemap of all canonical public HTML pages.",
        responses: {
          "200": {
            description: "XML sitemap",
            content: { "application/xml": { schema: { type: "string" } } },
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/openapi.json": {
      get: {
        operationId: "getOpenApiSpec",
        tags: ["agent-surfaces"],
        summary: "OpenAPI specification",
        description: "This document.",
        responses: {
          "200": {
            description: "OpenAPI 3.1 spec",
            content: { "application/json": { schema: { type: "object" } } },
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
  },
};

function withRateLimit(headers: Headers): Headers {
  headers.set("ratelimit-limit", String(RATE_LIMIT));
  headers.set("ratelimit-remaining", String(RATE_LIMIT));
  headers.set("ratelimit-reset", String(RATE_LIMIT_WINDOW));
  return headers;
}

function jsonError(status: number, code: string, message: string, path: string): Response {
  const headers = withRateLimit(
    new Headers({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    }),
  );
  return new Response(JSON.stringify({ error: { code, message, path } }), { status, headers });
}

function sitemapXml(origin: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc></url>
  <url><loc>${origin}/play/idle-startup/</loc></url>
</urlset>
`;
}

export async function onRequest(context: {
  request: Request;
  next: (request?: Request) => Promise<Response>;
}): Promise<Response> {
  const { request, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const assets = { fetch: (input: Request) => context.next(input) };
  const readableUrl = new URL(request.url);
  if (readableUrl.pathname === "/play/idle-startup/index.md")
    readableUrl.pathname = "/play/idle-startup.md";
  const readable = await handleReadability(new Request(readableUrl, request), assets);
  if (readable) return readable;

  // Agent surfaces
  if (pathname === "/openapi.json") {
    const headers = withRateLimit(
      new Headers({
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      }),
    );
    return new Response(JSON.stringify(OPENAPI_SPEC, null, 2), { headers });
  }

  if (pathname === "/api/ai") {
    const headers = withRateLimit(
      new Headers({
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=300",
      }),
    );
    const catalog = await assets.fetch(new Request(new URL("/api-ai.json", request.url)));
    return new Response(request.method === "HEAD" ? null : catalog.body, {
      status: catalog.status,
      headers,
    });
  }

  if (pathname === "/sitemap.xml") {
    const headers = withRateLimit(
      new Headers({
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      }),
    );
    return new Response(sitemapXml(SITE_ORIGIN), { headers });
  }

  // JSON error for unknown /api/* paths
  if (pathname.startsWith("/api/")) {
    return jsonError(404, "not_found", `Unknown API path: ${pathname}`, pathname);
  }

  if (pathname.endsWith(".md") && !pathname.startsWith("/.well-known/")) {
    const result = markdownResponse("# Not found\n", request, { "Cache-Control": "no-store" });
    return new Response(result.body, { status: 404, headers: result.headers });
  }
  if (
    ["GET", "HEAD"].includes(request.method) &&
    wantsMarkdown(request) &&
    !pathname.includes(".") &&
    !pathname.startsWith("/play/")
  ) {
    const result = markdownResponse("# Not found\n", request, { "Cache-Control": "no-store" });
    return new Response(result.body, { status: 404, headers: result.headers });
  }
  let response = await next();
  if (["/", "/play/idle-startup", "/play/idle-startup/"].includes(pathname))
    response = advertiseMarkdown(
      response,
      SITE_ORIGIN,
      pathname === "/" ? "/index.md" : "/play/idle-startup.md",
    );

  // Add Vary: Accept to HTML responses
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    const headers = withRateLimit(new Headers(response.headers));
    const vary = headers.get("vary");
    headers.set("vary", vary ? `${vary}, Accept, Accept-Encoding` : "Accept, Accept-Encoding");
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Add rate-limit headers to all other responses.
  const headers = withRateLimit(new Headers(response.headers));
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

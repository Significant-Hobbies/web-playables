export function robotsPolicy(identity) {
  const bots = [
    "*",
    "GPTBot",
    "ClaudeBot",
    "Google-Extended",
    "Applebot-Extended",
    "CCBot",
    "Bytespider",
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
  ];
  return (
    bots
      .map(
        (bot) =>
          `User-agent: ${bot}\nAllow: /\n${identity.excludedPaths.map((path) => `Disallow: ${path}`).join("\n")}\nAllow: /api/ai$\nAllow: /api/md$\nAllow: /api/md/`,
      )
      .join("\n\n") + `\n\nSitemap: ${identity.sitemap}\n# Keep in sync with ai.txt and llms.txt.\n`
  );
}

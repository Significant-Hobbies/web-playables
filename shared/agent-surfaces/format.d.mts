export function absoluteMarkdownLinks(markdown: string, canonical: string, options?: { htmlPathsByMarkdown?: Record<string, string>; resolveLink?: (href: string) => string | undefined }): string;

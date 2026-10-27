// Format authored element trees at build time, never fetched/rendered HTML.
export function element(type, props, ...children) {
  return { type, props: { ...props, children } };
}
export function decodeText(value) {
  const entities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    mdash: "—",
    ndash: "–",
    hellip: "…",
    middot: "·",
    ldquo: "“",
    rdquo: "”",
    lsquo: "‘",
    rsquo: "’",
    rarr: "→",
  };
  return value.replace(/&([a-z]+);/gi, (whole, name) => entities[name] ?? whole);
}
export function formatElement(value) {
  if (value == null || typeof value === "boolean") return "";
  if (Array.isArray(value)) return value.map(formatElement).join("");
  if (typeof value !== "object") return String(value);
  const { type, props = {} } = value;
  if (
    ["svg", "script", "style", "footer"].includes(type) ||
    props.hidden ||
    props["aria-hidden"] === true ||
    props["aria-hidden"] === "true"
  )
    return "";
  const body = formatElement(props.children);
  const text = body.replace(/\s+/g, " ").trim();
  const href = props.href || props.to;
  if (href) return `[${text || props["aria-label"] || href}](${href})`;
  if (typeof type !== "string") throw new Error("Public source has an unsupported component");
  if (/^h[1-6]$/.test(type)) return `\n\n${"#".repeat(Number(type[1]))} ${text}\n\n`;
  if (type === "p") return `\n\n${text}\n\n`;
  if (type === "li") return `\n- ${text}\n`;
  if (type === "strong" || type === "b") return `**${text}**`;
  if (type === "em" || type === "i") return `*${text}*`;
  if (type === "br") return "\n";
  if (type === "img") return props.alt ? `![${props.alt}](${props.src})` : "";
  return ["div", "section", "article", "header", "ul", "ol", "main"].includes(type)
    ? `\n${body}\n`
    : body;
}
export function finishMarkdown(value) {
  return (
    decodeText(formatElement(value))
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

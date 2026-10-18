/** Optional titles map to an initial Markdown H1 for backwards-compatible persistence. */
export function splitMemoTitle(content: string): {
  title: string;
  body: string;
} {
  const match = /^# ([^\r\n]+)(?:\r?\n(?:\r?\n)?|$)/.exec(content);
  if (!match) return { title: "", body: content };
  return { title: match[1].trim(), body: content.slice(match[0].length) };
}

export function composeMemoTitle(title: string, body: string): string {
  const clean = title
    .replace(/[\r\n]+/g, " ")
    .replace(/^#+\s*/, "")
    .trim();
  return clean ? `# ${clean}\n\n${body}`.trimEnd() : body;
}

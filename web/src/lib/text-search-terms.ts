/**
 * Treat only a quote at a term boundary as the start of a phrase. Embedded quotes
 * stay literal, so text such as content.contains("urgent") keeps its old meaning.
 */
export const parseTextSearchTerms = (query: string): string[] => {
  const terms: string[] = [];
  let term = "";
  let inPhrase = false;

  const flush = () => {
    if (term.trim()) terms.push(term.trim());
    term = "";
  };

  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    if (inPhrase && char === "\\" && (query[i + 1] === '"' || query[i + 1] === "\\")) {
      term += query[++i];
    } else if (char === '"' && (inPhrase || term.length === 0)) {
      inPhrase = !inPhrase;
    } else if (!inPhrase && /\s/u.test(char)) {
      flush();
    } else {
      term += char;
    }
  }
  flush();
  return Array.from(new Set(terms));
};

/** Quote text when needed so opening an existing search preserves phrase boundaries. */
export const formatTextSearchTerms = (terms: string[]): string =>
  terms
    .map((term) =>
      /[\s"\\]/u.test(term) ? '"' + term.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"' : term,
    )
    .join(" ");

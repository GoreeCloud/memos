/**
 * Counts what the editor actually contains, without changing Markdown or
 * saving any derived information. Segmenter handles CJK words and grapheme
 * clusters (including combining marks and joined emoji) in modern browsers.
 */
const wordSegmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "word" }) : undefined;
const characterSegmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : undefined;

export const getDraftStatistics = (content: string): { words: number; characters: number } => {
  const words = wordSegmenter
    ? Array.from(wordSegmenter.segment(content)).filter((part) => part.isWordLike).length
    : (content.match(/[\p{L}\p{N}]+/gu) ?? []).length;
  const characters = characterSegmenter ? Array.from(characterSegmenter.segment(content)).length : Array.from(content).length;
  return { words, characters };
};

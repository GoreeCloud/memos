import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import itLocale from "@/locales/it.json";
import koLocale from "@/locales/ko.json";
import nlLocale from "@/locales/nl.json";

const homeCopyKeys = [
  "empty-title",
  "empty-description",
  "no-results-title",
  "no-results-description",
  "labels-empty",
  "pinned-memos",
  "search-all",
  "search-placeholder",
] as const;

// This enforces the source candidate matrix, not native-speaker quality or
// in-app accessibility acceptance.
describe.each([
  { locale: "Italian", home: itLocale.home },
  { locale: "Dutch", home: nlLocale.home },
  { locale: "Korean", home: koLocale.home },
])("$locale Home localization candidates", ({ home }) => {
  it.each(homeCopyKeys)("replaces the English fallback for %s", (key) => {
    expect(home[key].trim().length).toBeGreaterThan(0);
    expect(home[key]).not.toBe(en.home[key]);
  });

  it("preserves the label-example marker", () => {
    expect(home["labels-empty"]).toContain("#");
  });
});

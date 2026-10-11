import { describe, expect, it } from "vitest";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import ja from "@/locales/ja.json";
import ptBR from "@/locales/pt-BR.json";

describe("Home navigation and empty-state translations", () => {
  it("localizes the Labels navigation heading where translations are provided", () => {
    for (const resource of [fr, es, ptBR, ja]) {
      expect(resource.common.labels).not.toBe(en.common.labels);
    }
    expect(de.common.labels).toBe("Labels");
  });

  it("provides native Home copy for the first five localized resource candidates", () => {
    for (const [locale, resource] of Object.entries({ de, es, fr, ja, "pt-BR": ptBR })) {
      expect(Object.keys(resource.home).sort(), locale).toEqual(Object.keys(en.home).sort());
      for (const key of Object.keys(en.home) as Array<keyof typeof en.home>) {
        expect(resource.home[key].trim().length, `${locale}: ${key}`).toBeGreaterThan(0);
        expect(resource.home[key], `${locale}: ${key}`).not.toBe(en.home[key]);
      }
    }
  });
});

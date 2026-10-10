import { describe, expect, it } from "vitest";
import { getConfiguredLabelColors } from "@/lib/label-colors";

describe("configured label colors", () => {
  it("returns only literal configured label colors, not regex rules", () => {
    expect(
      getConfiguredLabelColors({
        work: { backgroundColor: { red: 238 / 255, green: 229 / 255, blue: 1 } },
        "project/.*": { backgroundColor: { red: 1 } },
        empty: {},
      }),
    ).toEqual({ work: "#eee5ff" });
  });
  it("clamps out-of-range/non-finite channel values before rendering", () => {
    expect(getConfiguredLabelColors({ bright: { backgroundColor: { red: 1.5, green: Number.NaN, blue: -2 } } })).toEqual({
      bright: "#ff0000",
    });
  });
  it("supports no metadata", () => {
    expect(getConfiguredLabelColors()).toEqual({});
  });
});

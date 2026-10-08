import { describe, expect, test } from "vitest";
import {
  MEMOS_ACCESS_TOKEN_SECURITY_URL,
  MEMOS_API_DOCUMENTATION_URL,
  MEMOS_AUTHENTICATION_DOCUMENTATION_URL,
  MEMOS_DOCUMENTATION_URL,
  MEMOS_GITHUB_URL,
  MEMOS_LOCALIZATION_FEEDBACK_URL,
  MEMOS_SEARCH_DOCUMENTATION_URL,
  MEMOS_WEBHOOK_DOCUMENTATION_URL,
  MEMOS_WEBSITE_URL,
  UPSTREAM_MEMOS_GITHUB_URL,
} from "@/lib/constants";

describe("GoreeCloud repository and help destinations", () => {
  test("product-owned destinations stay on GoreeCloud", () => {
    for (const url of [
      MEMOS_WEBSITE_URL,
      MEMOS_DOCUMENTATION_URL,
      MEMOS_API_DOCUMENTATION_URL,
      MEMOS_ACCESS_TOKEN_SECURITY_URL,
      MEMOS_SEARCH_DOCUMENTATION_URL,
      MEMOS_AUTHENTICATION_DOCUMENTATION_URL,
      MEMOS_WEBHOOK_DOCUMENTATION_URL,
      MEMOS_LOCALIZATION_FEEDBACK_URL,
      MEMOS_GITHUB_URL,
    ]) {
      expect(url).toContain("github.com/GoreeCloud/memos");
      expect(url).not.toContain("usememos.com");
    }
  });

  test("upstream provenance remains explicit", () => {
    expect(UPSTREAM_MEMOS_GITHUB_URL).toBe("https://github.com/usememos/memos");
  });
});

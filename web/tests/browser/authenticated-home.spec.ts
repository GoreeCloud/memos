import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const expectNoHorizontalOverflow = async (page: import("@playwright/test").Page) => {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth, "authenticated page should not require horizontal scrolling").toBeLessThanOrEqual(metrics.clientWidth + 1);
};

test("authenticated GoreeCloud home and composer render accessibly", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);

  const shell = page.locator('.goreecloud-shell[data-glaze-consumer="GoreeCloud Memos"][data-glaze-version="1.7.0"]');
  const main = page.getByRole("main");
  const composer = page.locator(".goreecloud-composer").first();
  const editor = composer.locator('.cm-content[contenteditable="true"]');
  const save = composer.getByRole("button", { name: "Save", exact: true });

  await expect(shell).toBeVisible();
  await expect(main).toHaveCount(1);
  await expect(main).toBeVisible();
  await expect(composer).toBeVisible();
  await expect(editor).toBeVisible();
  await expect(save).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const memoText = "Rendered authenticated acceptance — " + testInfo.project.name;
  await editor.fill(memoText);
  await expect(save).toBeEnabled();
  await save.click();

  const memoCard = page.getByRole("article").filter({ hasText: memoText }).first();
  await expect(memoCard).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.keyboard.press("Tab");
  const focusVisible = page.locator(":focus-visible");
  await expect(focusVisible).toHaveCount(1);
  await expect(focusVisible).toBeVisible();
  const focusTreatment = await focusVisible.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  expect(
    focusTreatment.outlineStyle !== "none" ||
      focusTreatment.outlineWidth !== "0px" ||
      (focusTreatment.boxShadow !== "none" && focusTreatment.boxShadow !== ""),
    "authenticated keyboard focus should have a visible treatment",
  ).toBe(true);

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const seriousViolations = axe.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(
    seriousViolations.map(({ id, impact, help, nodes }) => ({
      id,
      impact,
      help,
      targets: nodes.map((node) => node.target),
    })),
    "authenticated home should have no serious or critical axe violations",
  ).toEqual([]);

  await page.addStyleTag({ content: ":root { font-size: 200% !important; }" });
  await expect(composer).toBeVisible();
  await expect(memoCard).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const mediaState = await page.evaluate(() => ({
    dark: matchMedia("(prefers-color-scheme: dark)").matches,
    forcedColors: matchMedia("(forced-colors: active)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
  expect(mediaState.reducedMotion).toBe(true);
  if (testInfo.project.name === "authenticated-phone-dark") expect(mediaState.dark).toBe(true);
  if (testInfo.project.name === "authenticated-tablet-forced-colors") expect(mediaState.forcedColors).toBe(true);

  expect(pageErrors).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath("authenticated-home.png"),
    fullPage: true,
  });
});

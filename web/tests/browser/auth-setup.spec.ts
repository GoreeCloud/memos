import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const emulateReducedTransparency = async (page: import("@playwright/test").Page, projectName: string) => {
  if (!projectName.includes("reduced-transparency")) return;

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: "light" },
      { name: "prefers-reduced-motion", value: "reduce" },
      { name: "prefers-reduced-transparency", value: "reduce" },
    ],
  });
};

const expectNoHorizontalOverflow = async (page: import("@playwright/test").Page) => {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth, "page should not require horizontal scrolling").toBeLessThanOrEqual(metrics.clientWidth + 1);
};

test("first-run GoreeCloud setup shell renders accessibly across representative contexts", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await emulateReducedTransparency(page, testInfo.project.name);

  await page.goto("/auth/signup");
  await expect(page).toHaveURL(/\/auth\/signup$/);

  const main = page.getByRole("main");
  const heading = page.getByRole("heading", { level: 1 });
  const username = page.locator('input[autocomplete="username"]');
  const password = page.locator('input[type="password"]');
  const submit = page.locator('button[type="submit"]');

  await expect(main).toHaveCount(1);
  await expect(main).toBeVisible();
  await expect(heading).toHaveCount(1);
  await expect(heading).toBeVisible();
  await expect(username).toBeVisible();
  await expect(password).toBeVisible();
  await expect(submit).toBeVisible();
  await expect(page.locator('img[src*="goreecloud-memos"]')).toBeVisible();

  const labeledInputs = await page
    .locator('input[autocomplete="username"], input[type="password"]')
    .evaluateAll((inputs) =>
      inputs.every((input) => input instanceof HTMLInputElement && input.labels !== null && input.labels.length > 0),
    );
  expect(labeledInputs, "credential fields should have programmatic labels").toBe(true);

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
    "keyboard focus should have a visible treatment",
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
    "rendered setup page should have no serious or critical axe violations",
  ).toEqual([]);

  await page.addStyleTag({ content: ":root { font-size: 200% !important; }" });
  await expect(heading).toBeVisible();
  await expect(username).toBeVisible();
  await expect(password).toBeVisible();
  await expect(submit).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const mediaState = await page.evaluate(() => ({
    dark: matchMedia("(prefers-color-scheme: dark)").matches,
    forcedColors: matchMedia("(forced-colors: active)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    reducedTransparency: matchMedia("(prefers-reduced-transparency: reduce)").matches,
  }));
  expect(mediaState.reducedMotion).toBe(true);
  if (testInfo.project.name === "phone-dark") expect(mediaState.dark).toBe(true);
  if (testInfo.project.name === "tablet-forced-colors") expect(mediaState.forcedColors).toBe(true);
  if (testInfo.project.name.includes("rtl-reduced-transparency")) {
    expect(mediaState.reducedTransparency).toBe(true);
    const localeState = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
    }));
    expect(localeState.lang).toBe("ar");
    expect(localeState.dir).toBe("rtl");
    const authCard = page.locator(".goreecloud-auth-card");
    await expect(authCard).toBeVisible();
    const transparency = await authCard.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backdropFilter: style.backdropFilter, webkitBackdropFilter: style.getPropertyValue("-webkit-backdrop-filter") };
    });
    expect(transparency.backdropFilter === "none" || transparency.webkitBackdropFilter === "none").toBe(true);
  }

  expect(pageErrors).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath("first-run-setup.png"),
    fullPage: true,
  });
});

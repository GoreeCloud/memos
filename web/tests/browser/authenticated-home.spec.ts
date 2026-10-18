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
  expect(metrics.scrollWidth, "authenticated page should not require horizontal scrolling").toBeLessThanOrEqual(metrics.clientWidth + 1);
};

test("authenticated GoreeCloud home and composer render accessibly", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await emulateReducedTransparency(page, testInfo.project.name);

  // The signed-in root is All Memos; Home remains its own dashboard route.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);

  const shell = page.locator('.goreecloud-shell[data-glaze-consumer="GoreeCloud Memos"][data-glaze-version="1.7.0"]');
  const main = page.getByRole("main");
  const composer = page.locator(".goreecloud-composer").first();
  const editor = composer.locator('.cm-content[contenteditable="true"]');
  const save = composer.getByRole("button", { name: "Save", exact: true });

  await expect(shell).toBeVisible();
  const glazeStableCSS = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--glz141-semantic-surface-strength").trim(),
  );
  expect(glazeStableCSS, "pinned Glaze stable stylesheet should be loaded in the rendered application").not.toBe("");
  await expect(main).toHaveCount(1);
  await expect(main).toBeVisible();
  await expect(composer).toBeVisible();
  await expect(editor).toBeVisible();
  await expect(save).toBeVisible();

  // The Home search is a unique, separate sticky sibling above the memo feed.
  // Verify this in the real authenticated browser and every configured viewport.
  const stickySearch = page.locator("[data-home-sticky-search]");
  await expect(stickySearch).toHaveCount(1);
  await expect(stickySearch.getByRole("search")).toBeVisible();
  const stickyPresentation = await stickySearch.evaluate((element) => {
    const style = getComputedStyle(element);
    const composerElement = document.querySelector(".goreecloud-composer");
    return {
      position: style.position,
      top: Number.parseFloat(style.top),
      beforeComposer: !!composerElement && Boolean(element.compareDocumentPosition(composerElement) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  expect(stickyPresentation.position).toBe("sticky");
  expect(stickyPresentation.top).toBe(testInfo.project.name.includes("phone") ? 48 : 0);
  expect(stickyPresentation.beforeComposer).toBe(true);
  await expectNoHorizontalOverflow(page);

  const skipLink = page.getByRole("link", { name: "Skip to main content", exact: true });
  // Auto-focus can begin inside the composer, so do not assume a fixed Tab
  // position. Focus the native skip link, then activate it using the keyboard.
  await skipLink.focus();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(main).toBeFocused();

  const memoText = "Rendered authenticated acceptance — " + testInfo.project.name;
  await editor.fill(memoText);
  await expect(save).toBeEnabled();
  await save.click();

  const memoCard = page.getByRole("article").filter({ hasText: memoText }).first();
  await expect(memoCard).toBeVisible();
  await expectNoHorizontalOverflow(page);

  if (testInfo.project.name.includes("rtl-reduced-transparency")) {
    await page.goto("/setting#preference");
    const languageTrigger = page.getByRole("button", { name: "Language", exact: true });
    await expect(languageTrigger).toBeVisible();
    await languageTrigger.click();

    const languageSearch = page.getByRole("textbox", { name: "Language", exact: true });
    await languageSearch.fill("Arabic");
    const arabicOption = page.getByRole("option");
    await expect(arabicOption).toHaveCount(1);
    await arabicOption.click();

    await expect
      .poll(() => page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir })))
      .toEqual({ lang: "ar", dir: "rtl" });

    await page.goto("/dashboard");
    await expect(shell).toBeVisible();
    await expect(composer).toBeVisible();
    await expect(memoCard).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

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
    reducedTransparency: matchMedia("(prefers-reduced-transparency: reduce)").matches,
  }));
  expect(mediaState.reducedMotion).toBe(true);
  if (testInfo.project.name === "authenticated-phone-dark") expect(mediaState.dark).toBe(true);
  if (testInfo.project.name === "authenticated-tablet-forced-colors") expect(mediaState.forcedColors).toBe(true);
  if (testInfo.project.name.includes("rtl-reduced-transparency")) {
    expect(mediaState.reducedTransparency).toBe(true);
    const localeState = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
    }));
    expect(localeState.lang).toBe("ar");
    expect(localeState.dir).toBe("rtl");
    const composerTransparency = await composer.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backdropFilter: style.backdropFilter, webkitBackdropFilter: style.getPropertyValue("-webkit-backdrop-filter") };
    });
    expect(composerTransparency.backdropFilter === "none" || composerTransparency.webkitBackdropFilter === "none").toBe(true);
    const cardTransparency = await memoCard.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backdropFilter: style.backdropFilter, webkitBackdropFilter: style.getPropertyValue("-webkit-backdrop-filter") };
    });
    expect(cardTransparency.backdropFilter === "none" || cardTransparency.webkitBackdropFilter === "none").toBe(true);
  }

  expect(pageErrors).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath("authenticated-home.png"),
    fullPage: true,
  });
});

test("All Memos starts without an inline composer and offers an accessible floating New Memo action", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".goreecloud-composer")).toHaveCount(0);
  const floatingCompose = page.locator("[data-new-memo-trigger]");
  await expect(floatingCompose).toBeVisible();
  const arabic = (await page.locator("html").getAttribute("lang"))?.startsWith("ar") ?? false;
  const names = arabic
    ? { newMemo: "مذكرة جديدة", title: "العنوان", save: "حفظ", update: "تحديث" }
    : { newMemo: "New memo", title: "Title", save: "Save", update: "Update" };
  await expect(floatingCompose).toHaveAttribute("aria-label", names.newMemo);

  await floatingCompose.click();
  const editor = page.locator('.cm-content[contenteditable="true"]').first();
  await expect(editor).toBeVisible();
  const title = page.getByRole("textbox", { name: names.title });
  await expect(title).toBeVisible();
  const memoTitle = "Optional title — Development acceptance";
  await title.fill(memoTitle);
  await expect(page.getByRole("button", { name: names.save, exact: true })).toBeEnabled();
  await page.getByRole("button", { name: names.save, exact: true }).click();

  const card = page.getByRole("article").filter({ hasText: memoTitle }).first();
  await expect(card).toBeVisible();
  await card.getByText(memoTitle).click();
  await expect(title).toBeVisible();
  await title.fill("Renamed title — Development acceptance");
  // Existing memos use the explicit Update action; Save labels only creation.
  await page.getByRole("button", { name: names.update, exact: true }).click();
  await expect(page.getByRole("article").filter({ hasText: "Renamed title — Development acceptance" }).first()).toBeVisible();
});

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
  const metrics = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    return {
      clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      // Diagnostic only: keep the strict assertion and report the bounding
      // elements, not user content, when a responsive layout regresses.
      offenders: [...document.querySelectorAll<HTMLElement>("body *")]
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0 && (rect.right > clientWidth + 2 || rect.left < -2))
        .slice(0, 16)
        .map(({ element, rect }) => ({
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: typeof element.className === "string" ? element.className.slice(0, 260) : "",
          parentClass: typeof element.parentElement?.className === "string" ? element.parentElement.className.slice(0, 160) : "",
          ariaLabel: element.getAttribute("aria-label"),
          title: element.getAttribute("title"),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        })),
    };
  });
  expect(
    metrics.scrollWidth,
    `authenticated page should not require horizontal scrolling; overflow elements: ${JSON.stringify(metrics.offenders)}`,
  ).toBeLessThanOrEqual(metrics.clientWidth + 1);
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
  const newMemo = page.locator("[data-new-memo-trigger]");
  await expect(newMemo).toBeVisible();
  await expect(newMemo).toBeEnabled();
  await expect(page.locator("[data-dashboard-new-memo]")).toHaveCount(0);
  // The redesigned Home keeps its editor closed until the user explicitly opens it.
  await expect(composer).not.toBeVisible();

  // Home search is a visible first-party search form above the memo feed.
  // The old sticky inline-composer layout is intentionally replaced by dashboard controls.
  const homeSearch = page.locator("[data-home-sticky-search]");
  await expect(homeSearch).toHaveCount(1);
  await expect(homeSearch.getByRole("search")).toBeVisible();
  await expect(page.locator("#goreecloud-home-search")).toBeVisible();
  const searchPlacement = await homeSearch.evaluate((element) => {
    const feed = document.querySelector(".gc-dashboard-results");
    return {
      inDashboard: element.closest("[data-dashboard-home]") !== null,
      beforeFeed: feed !== null && (element.compareDocumentPosition(feed) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    };
  });
  expect(searchPlacement).toEqual({ inDashboard: true, beforeFeed: true });
  await expectNoHorizontalOverflow(page);

  const skipLink = page.getByRole("link", { name: "Skip to main content", exact: true });
  // Check keyboard skip navigation before opening the focus-trapped editor dialog.
  await skipLink.focus();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(main).toBeFocused();

  await newMemo.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(composer).toBeVisible();
  await expect(editor).toBeVisible();
  await expect(save).toBeVisible();

  const memoText = "Rendered authenticated acceptance — " + testInfo.project.name;
  await editor.fill(memoText);
  await expect(save).toBeEnabled();
  await save.click();
  await expect(composer).not.toBeVisible();

  const memoCard = page.getByRole("article").filter({ hasText: memoText }).first();
  await expect(memoCard).toBeVisible();
  const masonryBoard = page.locator(".gc-dashboard-memos-masonry");
  await expect(masonryBoard).toBeVisible();
  // Actual authenticated MemoView tiles are packed by the measured-height
  // masonry engine on both desktop and phones, not a forced one-column list.
  await expect
    .poll(async () =>
      masonryBoard.evaluate((board) => {
        const card = board.querySelector(".gc-dashboard-memo");
        return card ? card.getBoundingClientRect().width / board.getBoundingClientRect().width : 1;
      }),
    )
    .toBeLessThan(0.65);
  const listToggle = page.getByRole("button", { name: "List view" });
  await expect(listToggle).toBeVisible();
  await listToggle.click();
  await expect(page.locator(".gc-dashboard-memos-list")).toBeVisible();
  const gridToggle = page.getByRole("button", { name: "Grid view" });
  await gridToggle.click();
  await expect(masonryBoard).toBeVisible();
  await page.getByRole("button", { name: "View all" }).click();
  const fullFeed = page.locator(".gc-dashboard-feed");
  await expect(fullFeed).toBeVisible();
  await expect
    .poll(async () =>
      fullFeed.evaluate((feed) => {
        const card = feed.querySelector("article");
        return card ? card.getBoundingClientRect().width / feed.getBoundingClientRect().width : 1;
      }),
    )
    .toBeLessThan(0.65);
  await page.goto("/");
  // The signed-in root is All Memos, not the Home dashboard masonry preview.
  await expect(page.locator(".gc-dashboard-feed")).toBeVisible();
  await expect(memoCard).toBeVisible();
  await expectNoHorizontalOverflow(page);

  if (testInfo.project.name.includes("rtl-reduced-transparency")) {
    await page.goto("/setting#preference");
    const languageTrigger = page.getByRole("button", { name: "Language", exact: true });
    await expect(languageTrigger).toBeVisible();
    await languageTrigger.click();

    const languageSearch = page.getByRole("textbox", { name: "Language", exact: true });
    await languageSearch.fill("Arabic");
    const arabicOption = page.getByRole("listbox", { name: "Language" }).getByRole("option");
    await expect(arabicOption).toHaveCount(1);
    await arabicOption.click();

    await expect
      .poll(() => page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir })))
      .toEqual({ lang: "ar", dir: "rtl" });

    await page.goto("/dashboard");
    await expect(shell).toBeVisible();
    await expect(page.locator("[data-new-memo-trigger]")).toBeVisible();
    await expect(homeSearch.getByRole("search")).toBeVisible();
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
      targets: nodes.map((node) => ({ target: node.target, failureSummary: node.failureSummary })),
    })),
    "authenticated home should have no serious or critical axe violations",
  ).toEqual([]);

  await page.addStyleTag({ content: ":root { font-size: 200% !important; }" });
  await expect(page.locator("[data-new-memo-trigger]")).toBeVisible();
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
    const cardTransparency = await memoCard.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backdropFilter: style.backdropFilter, webkitBackdropFilter: style.getPropertyValue("-webkit-backdrop-filter") };
    });
    expect(cardTransparency.backdropFilter === "none" || cardTransparency.webkitBackdropFilter === "none").toBe(true);
  }

  // At enlarged text the global composer must remain openable and dismissible.
  // Verify reduced-transparency fallback on the actual on-demand editor in RTL.
  await page.locator("[data-new-memo-trigger]").click();
  await expect(composer).toBeVisible();
  if (testInfo.project.name.includes("rtl-reduced-transparency")) {
    const composerTransparency = await composer.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backdropFilter: style.backdropFilter, webkitBackdropFilter: style.getPropertyValue("-webkit-backdrop-filter") };
    });
    expect(composerTransparency.backdropFilter === "none" || composerTransparency.webkitBackdropFilter === "none").toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(composer).not.toBeVisible();
  await expect(memoCard).toBeVisible();

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

test("revamped Inbox keeps the sidebar, filters, and accessible empty or notification states", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/inbox");
  const inbox = page.locator("[data-inbox-page]");
  await expect(inbox).toBeVisible();
  await expect(inbox.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(inbox.locator('[data-inbox-count="all"]')).toBeVisible();
  await expect(inbox.locator('[data-inbox-count="unread"]')).toBeVisible();
  await expect(inbox.locator('[data-inbox-count="archived"]')).toBeVisible();
  await expect(inbox.locator('[data-inbox-filter="all"]')).toHaveAttribute("aria-pressed", "true");
  await inbox.locator('[data-inbox-filter="unread"]').click();
  await expect(inbox.locator('[data-inbox-filter="unread"]')).toHaveAttribute("aria-pressed", "true");
  await inbox.locator('[data-inbox-filter="archived"]').click();
  await expect(inbox.locator('[data-inbox-filter="archived"]')).toHaveAttribute("aria-pressed", "true");
  await inbox.locator('[data-inbox-filter="all"]').click();
  await expect(inbox.locator('[data-inbox-filter="all"]')).toHaveAttribute("aria-pressed", "true");
  if (testInfo.project.name.includes("phone")) {
    await page.locator("[data-mobile-navigation-trigger]").click();
    await expect(page.locator(".gc-dashboard-side-navigation")).toBeVisible();
    await expect(page.locator('.gc-dashboard-side-navigation a[href="/inbox"]')).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } else {
    await expect(page.locator(".gc-dashboard-side-navigation")).toBeVisible();
    await expect(page.locator('.gc-dashboard-side-navigation a[href="/inbox"]')).toHaveAttribute("aria-current", "page");
  }
  await expectNoHorizontalOverflow(page);
  const serious = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious.map(({ id, impact }) => ({ id, impact }))).toEqual([]);
  expect(pageErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("authenticated-inbox.png"), fullPage: true });
});

test("Pinned memo disclosure stays keyboard-accessible and restores responsive card layout", async ({ page }, testInfo) => {
  await page.goto("/");
  const language = await page.locator("html").getAttribute("lang");
  const saveLabel = language?.startsWith("ar") ? "حفظ" : "Save";
  const content = `Pinned disclosure acceptance — ${testInfo.project.name}`;

  const compose = page.locator("[data-new-memo-trigger]");
  await compose.focus();
  await page.keyboard.press("Enter");
  await page.locator('.goreecloud-composer .cm-content[contenteditable="true"]').fill(content);
  await page.getByRole("button", { name: saveLabel, exact: true }).click();

  const created = page.getByRole("article").filter({ hasText: content }).first();
  await expect(created).toBeVisible();
  await created.locator('[data-slot="memo-header-actions"] button').last().click();
  await page
    .getByRole("menuitem")
    .filter({ has: page.locator("svg.lucide-bookmark-plus") })
    .click();

  const toggle = page.locator("section[aria-label] h2 button[aria-controls][aria-expanded]").first();
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const panelId = await toggle.getAttribute("aria-controls");
  expect(panelId).toBeTruthy();
  const panel = page.locator(`[id="${panelId}"]`);
  const pinnedCard = panel.getByRole("article").filter({ hasText: content });
  await expect(pinnedCard).toBeVisible();
  const original = await pinnedCard.elementHandle();
  expect(original).not.toBeNull();

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toBeHidden();
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(pinnedCard).toBeVisible();
  expect(await original!.evaluate((element) => element.isConnected)).toBe(true);

  const cardBox = await pinnedCard.boundingBox();
  expect(cardBox?.width ?? 0).toBeGreaterThan(100);
  expect(cardBox?.height ?? 0).toBeGreaterThan(30);
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
});

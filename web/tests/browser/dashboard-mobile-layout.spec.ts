import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("memo dashboard adapts to phone widths and narrow panes", async ({ page }) => {
  await page.setContent(`<style>body{margin:0}</style><main id="pane"><div class="gc-dashboard">
    <section class="gc-dashboard-welcome"><div class="gc-dashboard-welcome-copy">
      <h1>Capture your thoughts, anywhere.</h1><p>Keep your ideas organized.</p>
      <div class="gc-dashboard-features"><span>Fast and simple</span></div>
    </div></section>
    <div class="gc-dashboard-memos">${'<article class="gc-dashboard-memo">A memo</article>'.repeat(3)}</div>
    <div class="gc-dashboard-quick-grid">${'<button class="gc-dashboard-action">New memo</button>'.repeat(4)}</div>
  </div></main>`);
  await page.addStyleTag({ path: resolve(process.cwd(), "src/pages/Home.css") });
  await page.addStyleTag({ path: resolve(process.cwd(), "src/pages/Home.mobile.css") });
  const measure = () =>
    page.evaluate(() => ({
      featureDisplay: getComputedStyle(document.querySelector<HTMLElement>(".gc-dashboard-features")!).display,
      memoColumns: getComputedStyle(document.querySelector<HTMLElement>(".gc-dashboard-memos")!).gridTemplateColumns.trim().split(" ")
        .length,
      actionColumns: getComputedStyle(document.querySelector<HTMLElement>(".gc-dashboard-quick-grid")!)
        .gridTemplateColumns.trim()
        .split(" ").length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));

  for (const width of [360, 390, 432]) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator("#pane").evaluate((element, size) => {
      (element as HTMLElement).style.width = `${size}px`;
    }, width);
    expect(await measure(), `phone width ${width}`).toEqual({
      featureDisplay: "none",
      memoColumns: 1,
      actionColumns: 2,
      overflow: false,
    });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator("#pane").evaluate((element) => {
    (element as HTMLElement).style.width = "420px";
  });
  expect((await measure()).memoColumns).toBe(1);
  await page.locator("#pane").evaluate((element) => {
    (element as HTMLElement).style.width = "1020px";
  });
  expect((await measure()).memoColumns).toBe(3);
});

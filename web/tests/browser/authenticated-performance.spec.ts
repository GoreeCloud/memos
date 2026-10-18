import { Buffer } from "node:buffer";
import { expect, type Locator, type Page, test } from "@playwright/test";

const GLAZE_INTERACTION_P95_BUDGET_MS = 100;
const GLAZE_INTERACTION_P99_BUDGET_MS = 200;
const SAMPLE_COUNT = 30;

const percentile = (values: number[], percentileValue: number): number => {
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(percentileValue * ordered.length) - 1);
  return ordered[index] ?? Number.POSITIVE_INFINITY;
};

const measureClickToPaint = async (page: Page, target: Locator): Promise<number> => {
  await page.evaluate(() => {
    const perfWindow = window as typeof window & { __goreecloudInteractionStart?: number };
    perfWindow.__goreecloudInteractionStart = undefined;
    document.addEventListener(
      "click",
      () => {
        perfWindow.__goreecloudInteractionStart = performance.now();
      },
      { capture: true, once: true },
    );
  });

  await target.click();

  return page.evaluate(async () => {
    const perfWindow = window as typeof window & { __goreecloudInteractionStart?: number };
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    if (typeof perfWindow.__goreecloudInteractionStart !== "number") {
      throw new Error("Interaction start was not captured");
    }
    return performance.now() - perfWindow.__goreecloudInteractionStart;
  });
};

test("bounded Glaze interaction-to-painted-update stays within the approved Development budget", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator('.goreecloud-shell[data-glaze-consumer="GoreeCloud Memos"][data-glaze-version="1.7.0"]')).toBeVisible();

  // The redesigned dashboard has persistent Grid/List controls in place of
  // the former navigation Search dialog. Measure real user-visible layout
  // transitions rather than timing an obsolete trigger or an inert control.
  const layout = page.getByRole("group", { name: "Memo layout" });
  const grid = layout.getByRole("button", { name: "Grid view" });
  const list = layout.getByRole("button", { name: "List view" });
  await expect(grid).toBeVisible();
  await expect(list).toBeVisible();
  await expect(grid).toHaveAttribute("aria-pressed", "true");

  const durations: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const target = index % 2 === 0 ? list : grid;
    durations.push(await measureClickToPaint(page, target));
    await expect(target).toHaveAttribute("aria-pressed", "true");
  }

  const metrics = {
    sourceRevision: process.env.GITHUB_SHA || "local",
    project: testInfo.project.name,
    sampleCount: durations.length,
    p95Ms: percentile(durations, 0.95),
    p99Ms: percentile(durations, 0.99),
    maxMs: Math.max(...durations),
    budgets: {
      p95Ms: GLAZE_INTERACTION_P95_BUDGET_MS,
      p99Ms: GLAZE_INTERACTION_P99_BUDGET_MS,
    },
    scope: "Home grid/list layout transitions; Development evidence only",
  };

  await testInfo.attach("glaze-interaction-performance.json", {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: "application/json",
  });

  console.log(
    `Glaze interaction performance: p95=${metrics.p95Ms.toFixed(2)}ms p99=${metrics.p99Ms.toFixed(2)}ms max=${metrics.maxMs.toFixed(2)}ms`,
  );
  expect(metrics.p95Ms).toBeLessThanOrEqual(GLAZE_INTERACTION_P95_BUDGET_MS);
  expect(metrics.p99Ms).toBeLessThanOrEqual(GLAZE_INTERACTION_P99_BUDGET_MS);
});

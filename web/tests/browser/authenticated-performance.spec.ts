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

  const searchTrigger = page.locator("nav").getByRole("button", { name: "Search", exact: true }).first();
  await expect(searchTrigger).toBeVisible();
  await searchTrigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const textTab = dialog.getByRole("tab", { name: "Text", exact: true });
  const expressionTab = dialog.getByRole("tab", { name: "Expression", exact: true });
  await expect(textTab).toHaveAttribute("aria-selected", "true");

  const durations: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const target = index % 2 === 0 ? expressionTab : textTab;
    durations.push(await measureClickToPaint(page, target));
    await expect(target).toHaveAttribute("aria-selected", "true");
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
    scope: "Search text/expression mode transitions; Development evidence only",
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

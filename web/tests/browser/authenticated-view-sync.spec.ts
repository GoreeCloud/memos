import { expect, test } from "@playwright/test";

test("view preferences synchronize across two authenticated tabs without reloading", async ({ page, context }) => {
  const secondTab = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  secondTab.on("pageerror", (error) => errors.push(error.message));
  try {
    await Promise.all([page.goto("/"), secondTab.goto("/")]);
    await expect(page.locator('.goreecloud-shell[data-glaze-consumer="GoreeCloud Memos"]')).toBeVisible();
    await expect(secondTab.locator('.goreecloud-shell[data-glaze-consumer="GoreeCloud Memos"]')).toBeVisible();

    await page.getByRole("button", { name: "View options", exact: true }).first().click();
    const firstPreview = page.getByRole("switch", { name: "Link preview", exact: true });
    await expect(firstPreview).toBeChecked();

    await secondTab.getByRole("button", { name: "View options", exact: true }).first().click();
    const secondPreview = secondTab.getByRole("switch", { name: "Link preview", exact: true });
    await expect(secondPreview).toBeChecked();
    await secondPreview.click();
    await expect(secondPreview).not.toBeChecked();

    // A real second-window storage event must update the first page's React view context.
    await expect(firstPreview).not.toBeChecked();

    await secondTab.getByRole("button", { name: "Restore View options", exact: true }).click();
    await expect(secondPreview).toBeChecked();
    await expect(firstPreview).toBeChecked();
    expect(errors).toEqual([]);
  } finally {
    await secondTab.close();
  }
});

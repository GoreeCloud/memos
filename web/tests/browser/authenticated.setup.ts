import fs from "node:fs/promises";
import path from "node:path";
import { expect, test as setup } from "@playwright/test";

const authFile = path.join(process.cwd(), "test-results/browser-authenticated/.auth/admin.json");
const username = ["goreecloud", "browser", "admin"].join("-");
const credential = ["rendered", "acceptance", "fixture", "2026"].join("-") + "Aa1!";

setup("provision authenticated GoreeCloud Memos browser state", async ({ page }) => {
  await page.goto("/auth/signup");

  const usernameInput = page.locator('input[autocomplete="username"]');
  const credentialInput = page.locator('input[type="password"]');
  const submit = page.locator('button[type="submit"]');

  await expect(usernameInput).toBeVisible();
  await expect(credentialInput).toBeVisible();
  await expect(submit).toBeVisible();

  await usernameInput.fill(username);
  await credentialInput.fill(credential);
  await submit.click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.goreecloud-shell[data-glaze-consumer="GoreeCloud Memos"]')).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();

  await fs.mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});

import { expect, test } from "@playwright/test";

test("the home page loads and names the project", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Harmattan/);
  await expect(page.getByRole("heading", { level: 1, name: "Harmattan" })).toBeVisible();
});

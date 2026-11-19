import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockAirQuality } from "./mock";

const PAGES = [
  { path: "/", ready: /cities are above the WHO guideline/ },
  { path: "/city/kano", ready: "Day by day" },
  { path: "/compare", ready: "Side by side" },
  { path: "/data", ready: "3,360" },
];

for (const scheme of ["light", "dark"] as const) {
  for (const { path, ready } of PAGES) {
    test(`${path} has no detectable accessibility problems (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await mockAirQuality(page);
      await page.goto(path);
      await expect(page.getByText(ready).first()).toBeVisible();
      await expect(page.locator(".skeleton")).toHaveCount(0);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }
}

test("the skip link is the first stop and lands on the content", async ({ page }) => {
  await mockAirQuality(page);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

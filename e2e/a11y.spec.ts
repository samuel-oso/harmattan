import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockAirQuality } from "./mock";

const PAGES = [
  { path: "/", ready: /cities are above the WHO guideline/ },
  { path: "/city/kano", ready: "Day by day" },
  { path: "/compare", ready: "Side by side" },
  { path: "/data", ready: "3,360" },
];

for (const theme of ["dark", "light"] as const) {
  for (const { path, ready } of PAGES) {
    test(`${path} has no detectable accessibility problems (${theme})`, async ({ page }) => {
      await page.addInitScript((saved) => localStorage.setItem("harmattan:theme", saved), theme);
      await mockAirQuality(page);
      await page.goto(path);
      await expect(page.getByText(ready).first()).toBeVisible();
      await expect(page.locator(".skeleton")).toHaveCount(0);
      const html = page.locator("html");
      if (theme === "light") await expect(html).toHaveAttribute("data-theme", "light");
      else await expect(html).not.toHaveAttribute("data-theme");
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

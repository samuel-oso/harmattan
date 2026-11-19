import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { LATITUDE, mockAirQuality } from "./mock";

test("the overview ranks the cities and leads into a city", async ({ page }) => {
  await mockAirQuality(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/Harmattan/);
  await expect(page.getByText(/3 of 20 cities are above the WHO guideline/)).toBeVisible();

  const rows = page.getByRole("list").last().getByRole("listitem");
  await expect(rows).toHaveCount(20);
  await expect(rows.nth(0)).toContainText("Kano");
  await expect(rows.nth(0)).toContainText("5× guideline or more");
  await expect(rows.nth(1)).toContainText("Lagos");

  await rows.nth(0).getByRole("link", { name: "Kano" }).click();
  await expect(page).toHaveURL(/\/city\/kano$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kano" })).toBeVisible();
});

test("a city page charts the chosen pollutant and range", async ({ page }) => {
  const requests = await mockAirQuality(page);
  await page.goto("/city/lagos");
  await expect(page.getByRole("heading", { name: "Fine particles (PM2.5), last 7 days" })).toBeVisible();
  await expect(page.locator(".recharts-line")).toHaveCount(2);
  await expect(page.getByRole("button", { name: /PM2\.5/ })).toContainText("2× guideline or more");

  await page.getByRole("button", { name: "30 days" }).click();
  await page.getByRole("button", { name: /PM10/ }).click();
  await expect(page.getByRole("heading", { name: "Coarse particles (PM10), last 30 days" })).toBeVisible();
  await expect(page.getByRole("table", { name: /each weekday and hour/ })).toBeVisible();
  // 30 days on screen, plus one so the first 24-hour mean is complete
  expect(requests.map((u) => u.searchParams.get("past_days"))).toEqual(["8", "31"]);

  // the choice is still there after a reload
  await page.reload();
  await expect(page.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Coarse particles (PM10), last 30 days" })).toBeVisible();
});

test("an unknown city gets the not-found page", async ({ page }) => {
  await mockAirQuality(page);
  await page.goto("/city/atlantis");
  await expect(page.getByRole("heading", { name: "That page isn’t here." })).toBeVisible();
});

test("one failed city does not take the others down, and can be tried again", async ({ page }) => {
  let broken = true;
  await mockAirQuality(page, async (url, route) => {
    if (!broken || url.searchParams.get("latitude") !== LATITUDE.abuja) return false;
    await route.fulfill({ status: 400, json: { error: true, reason: "test" } });
    return true;
  });
  await page.goto("/");
  await expect(page.getByText(/2 of 19 cities are above/)).toBeVisible();
  const abuja = page.getByRole("listitem").filter({ hasText: "Abuja" });
  await expect(abuja.getByRole("alert")).toContainText("rejected the request");

  broken = false;
  await abuja.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText(/3 of 20 cities are above/)).toBeVisible();
});

test("a server error is retried on its own before anything is shown as failed", async ({ page }) => {
  let failures = 2;
  const requests = await mockAirQuality(page, async (_, route) => {
    if (failures <= 0) return false;
    failures--;
    await route.fulfill({ status: 503, body: "busy" });
    return true;
  });
  await page.goto("/city/lagos");
  await expect(page.locator(".recharts-line")).toHaveCount(2, { timeout: 15_000 });
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  expect(requests).toHaveLength(3);
});

test("compare holds up to four cities on one chart", async ({ page }) => {
  await mockAirQuality(page);
  await page.goto("/compare");
  const table = page.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(4);
  await expect(page.locator(".recharts-line")).toHaveCount(3);

  await page.getByRole("button", { name: "Kano" }).click();
  await expect(page.locator(".recharts-line")).toHaveCount(4);
  await expect(table.getByRole("row").last()).toContainText("5× guideline or more");
  await expect(page.getByRole("button", { name: "Cairo" })).toBeDisabled();

  await page.getByRole("button", { name: "Lagos" }).click();
  await expect(page.locator(".recharts-line")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Cairo" })).toBeEnabled();
});

test("the data table sorts, filters and exports", async ({ page }) => {
  await mockAirQuality(page);
  await page.goto("/data");
  const count = page.locator("[aria-live] .num").first();
  await expect(count).toHaveText("3,360");

  // 20 cities by 168 hours, but only the rows in view are in the page
  const table = page.getByRole("table", { name: "Hourly readings" });
  await expect(table).toHaveAttribute("aria-rowcount", "3361");
  expect(await table.getByRole("row").count()).toBeLessThan(80);

  await table.getByRole("button", { name: "PM2.5" }).click();
  await expect(table.getByRole("columnheader", { name: "PM2.5" })).toHaveAttribute("aria-sort", "descending");
  await expect(table.getByRole("row").nth(1)).toContainText("Kano");

  await page.getByRole("combobox", { name: "City" }).selectOption("lagos");
  await expect(count).toHaveText("168");
  await page.getByRole("checkbox").check();
  await expect(count).toHaveText("168");
  await page.getByRole("combobox", { name: "Pollutant to filter by" }).selectOption("pm10");
  await expect(count).toHaveText("0");
  await expect(page.getByRole("button", { name: "Download CSV" })).toBeDisabled();
  await page.getByRole("checkbox").uncheck();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download CSV" }).click()]);
  expect(download.suggestedFilename()).toBe("harmattan-lagos-7d.csv");
  const lines = (await readFile(await download.path(), "utf8")).trim().split("\n");
  expect(lines).toHaveLength(169);
  expect(lines[0]).toContain("city,country,time_utc,pm2_5_ug_m3");
  expect(lines[1]).toMatch(/^Lagos,Nigeria,\d{4}-\d\d-\d\dT\d\d:00:00\.000Z,/);
});

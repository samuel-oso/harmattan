import { defineConfig, devices } from "@playwright/test";

// its own port, so it never collides with another project's dev server
const PORT = 4310;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // the tests run against the production build, the way visitors get it
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // never borrow a server that is already on the port: it could be a different project
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

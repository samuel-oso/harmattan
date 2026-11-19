/** @jest-environment node */
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { CITIES } from "@/lib/cities";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/url";

describe("what search engines are told", () => {
  it("lists the three screens and every city once, under the site's address", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toHaveLength(3 + CITIES.length);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain(`${siteUrl}/city/kano`);
    for (const url of urls) expect(url.startsWith(siteUrl)).toBe(true);
  });

  it("keeps them out until the site is launched, and points them at the sitemap after", () => {
    const { rules, sitemap: map } = robots();
    if (site.launched) {
      expect(rules).toEqual({ userAgent: "*", allow: "/" });
      expect(map).toBe(`${siteUrl}/sitemap.xml`);
    } else {
      expect(rules).toEqual({ userAgent: "*", disallow: "/" });
      expect(map).toBeUndefined();
    }
  });
});

import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  if (!site.launched) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${siteUrl}/sitemap.xml` };
}

import type { MetadataRoute } from "next";
import { CITIES } from "@/lib/cities";
import { siteUrl } from "@/lib/url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/compare`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${siteUrl}/data`, changeFrequency: "hourly", priority: 0.6 },
    ...CITIES.map((city) => ({ url: `${siteUrl}/city/${city.slug}`, changeFrequency: "hourly" as const, priority: 0.8 })),
  ];
}

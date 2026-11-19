// where the site lives. on Vercel the production address is given to the build, so nothing has to be typed in;
// NEXT_PUBLIC_SITE_URL overrides it, for a custom domain or another host
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `https://${host}` : "http://localhost:3000")).replace(/\/+$/, "");

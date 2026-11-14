const PRODUCTION_APP_URL = 'https://power-clean-operations.vercel.app';

/**
 * Customer-facing links must never point at an authenticated Vercel preview.
 * A future custom domain can be supplied with NEXT_PUBLIC_APP_URL.
 */
export function getPublicAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return PRODUCTION_APP_URL;

  try {
    const url = new URL(configured);
    const isVercelPreview =
      url.hostname.endsWith('.vercel.app') &&
      url.hostname !== new URL(PRODUCTION_APP_URL).hostname;

    if (url.protocol !== 'https:' || isVercelPreview) return PRODUCTION_APP_URL;
    return url.origin;
  } catch {
    return PRODUCTION_APP_URL;
  }
}


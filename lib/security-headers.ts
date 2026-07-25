/**
 * Globalni HTTP security headeri (next.config headers + middleware).
 * CSP je pragmatičan za Next.js 15 (inline skripte) + YouTube embed u CMS-u
 * i Google Street View / Maps embed za virtuelnu turu.
 */
export function buildSecurityHeaders(): { key: string; value: string }[] {
  const isProd = process.env.NODE_ENV === "production";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://humanreproduction.com https://www.humanreproduction.com",
    // google.com/maps/embed = virtuelna tura (360°); mora biti u iframe-u.
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com https://maps.google.com",
    "media-src 'self' blob: https:",
    isProd ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");

  const headers: { key: string; value: string }[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      // accelerometer/gyroscope: Street View 360° u iframe-u (mobile tilt).
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), " +
        "accelerometer=(self \"https://www.google.com\"), " +
        "gyroscope=(self \"https://www.google.com\")",
    },
    { key: "Content-Security-Policy", value: csp },
    { key: "X-DNS-Prefetch-Control", value: "on" },
  ];

  if (isProd) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

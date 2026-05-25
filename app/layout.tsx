import type { Metadata, Viewport } from "next";
import { Lora, Outfit, Playfair_Display } from "next/font/google";

import { AnalyticsInjector } from "@/components/site/analytics-injector";
import { GlobalBackdrop } from "@/components/site/global-backdrop";
import { HeroVideoWarmup } from "@/components/site/hero-video-warmup";
import { getSiteBranding } from "@/lib/queries/site-globals";
import { getMetadataBase, getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

/** Geometrijski sans — samo header / CTA (ostatak sajta: Lora + Playfair). */
const outfitHeader = Outfit({
  variable: "--font-header-nav",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "Human Reproduction Center",
    template: "%s · Human Reproduction Center",
  },
  description:
    "Centar za humanu reprodukciju — savremena reproduktivna medicina.",
  openGraph: {
    type: "website",
    locale: "sr_ME",
    siteName: "Human Reproduction Center",
    url: getSiteUrl(),
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HRC Budva",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
};

/** iOS / Android: ispravan viewport, pun ekran, boja browser chrome-a */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let branding: Awaited<ReturnType<typeof getSiteBranding>>;
  try {
    branding = await getSiteBranding();
  } catch (e) {
    console.error("[RootLayout getSiteBranding]", e);
    branding = {
      logoUrl: null,
      faviconUrl: null,
      heroBgUrl: null,
      analyticsHeadHtml: "",
      analyticsBodyHtml: "",
    };
  }

  return (
    <html
      lang="me"
      className={`${lora.variable} ${playfair.variable} ${outfitHeader.variable} h-full min-h-dvh`}
      suppressHydrationWarning
    >
      <body className="relative min-h-dvh font-sans antialiased text-site-ink">
        {/* GlobalBackdrop: fiksirana iza svakog sadržaja na svim stranicama */}
        <GlobalBackdrop />
        <HeroVideoWarmup />
        <AnalyticsInjector
          headHtml={branding.analyticsHeadHtml}
          bodyHtml={branding.analyticsBodyHtml}
        />
        {children}
      </body>
    </html>
  );
}

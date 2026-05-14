import type { Metadata } from "next";

import { AnalyticsInjector } from "@/components/site/analytics-injector";
import { getSiteBranding } from "@/lib/queries/site-globals";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Human Reproduction Center",
    template: "%s · Human Reproduction Center",
  },
  description:
    "Centar za humanu reprodukciju — savremena reproduktivna medicina.",
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
    <html lang="me">
      <body className="relative min-h-dvh font-sans antialiased text-slate-900">
        <AnalyticsInjector          headHtml={branding.analyticsHeadHtml}
          bodyHtml={branding.analyticsBodyHtml}
        />
        <div className="relative z-10 min-h-dvh isolate">{children}</div>
      </body>
    </html>
  );
}

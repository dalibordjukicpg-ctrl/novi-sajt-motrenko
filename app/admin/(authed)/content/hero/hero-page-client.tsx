"use client";

import { useState } from "react";

import { HeroAdminPreview } from "@/components/admin/hero-admin-preview";
import { HeroBackgroundField } from "@/components/admin/hero-background-field";
import { TabbedSiteStringsForm } from "@/components/admin/tabbed-site-strings-form";
import type { SiteStringMatrix } from "@/lib/admin/build-site-matrix";
import type { MediaOption } from "@/lib/queries/media-admin";
import type { SiteGlobalsRow } from "@/lib/queries/site-globals";

type Props = {
  matrix: SiteStringMatrix;
  globals: SiteGlobalsRow | null;
  media: MediaOption[];
};

export function HeroPageClient({ matrix, globals, media }: Props) {
  const [heroBgUrl, setHeroBgUrl] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <HeroBackgroundField
        mediaOptions={media}
        initialMediaId={globals?.heroBgMediaId ?? null}
        initialExternalUrl={globals?.heroBgExternalUrl ?? null}
        onPreviewUrlChange={setHeroBgUrl}
      />

      <TabbedSiteStringsForm
        group="hero"
        matrix={matrix}
        preview={({ draft, activeLocale }) => (
          <HeroAdminPreview
            locale={activeLocale}
            draft={draft}
            heroBgUrl={heroBgUrl}
          />
        )}
      />
    </div>
  );
}

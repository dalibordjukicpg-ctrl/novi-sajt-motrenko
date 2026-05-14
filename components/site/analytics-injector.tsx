"use client";

import { useEffect } from "react";

/**
 * Ubacuje sadržaj iz admin podešavanja. <script> tagovi se ponovo izvršavaju
 * kroz dinamičko kreiranje elemenata (npr. GTM snippet).
 */
export function AnalyticsInjector({
  headHtml,
  bodyHtml,
}: {
  headHtml: string;
  bodyHtml: string;
}) {
  useEffect(() => {
    const headTrim = headHtml.trim();
    const bodyTrim = bodyHtml.trim();
    if (!headTrim && !bodyTrim) return;

    const inject = (html: string, target: Document["head"] | Document["body"]) => {
      if (!html) return;
      const tpl = document.createElement("template");
      tpl.innerHTML = html;
      const nodes = Array.from(tpl.content.childNodes);
      for (const node of nodes) {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          (node as Element).tagName.toLowerCase() === "script"
        ) {
          const old = node as HTMLScriptElement;
          const s = document.createElement("script");
          for (const attr of old.attributes) {
            s.setAttribute(attr.name, attr.value);
          }
          s.textContent = old.textContent;
          target.appendChild(s);
        } else {
          target.appendChild(node.cloneNode(true));
        }
      }
    };

    inject(headTrim, document.head);
    inject(bodyTrim, document.body);
  }, [headHtml, bodyHtml]);

  return null;
}

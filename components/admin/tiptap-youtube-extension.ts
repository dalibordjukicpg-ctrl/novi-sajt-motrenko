import { Node, mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/core";

import { canonicalYoutubeWatchUrl } from "@/lib/cms-youtube-html";
import { findYoutubeEmbedInNoisyText, parseYoutubeEmbedUrl } from "@/lib/youtube-hero";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    youtubeEmbed: {
      insertYoutubeEmbed: (options: { src: string }) => ReturnType;
      updateYoutubeEmbed: (options: { src: string }) => ReturnType;
    };
  }
}

function watchUrlFromElement(element: HTMLElement): string | null {
  const data = element.getAttribute("data-youtube-url");
  if (data) return canonicalYoutubeWatchUrl(data) ?? data.trim();
  const iframeSrc = element.querySelector("iframe")?.getAttribute("src");
  if (iframeSrc) return canonicalYoutubeWatchUrl(iframeSrc);
  const text = element.textContent ?? "";
  return canonicalYoutubeWatchUrl(text);
}

export const YoutubeEmbedExtension = Node.create({
  name: "youtubeEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null as string | null,
        parseHTML: (element) => watchUrlFromElement(element as HTMLElement),
        renderHTML: (attributes) => {
          if (!attributes.src) return {};
          return { "data-youtube-url": attributes.src };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-url]',
        getAttrs: (element) => ({
          src: watchUrlFromElement(element as HTMLElement),
        }),
      },
      {
        tag: 'div.wp-youtube-embed',
        getAttrs: (element) => ({
          src: watchUrlFromElement(element as HTMLElement),
        }),
      },
      {
        tag: 'figure.is-provider-youtube',
        getAttrs: (element) => ({
          src: watchUrlFromElement(element as HTMLElement),
        }),
      },
      {
        tag: 'figure.is-type-video',
        getAttrs: (element) => ({
          src: watchUrlFromElement(element as HTMLElement),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = (HTMLAttributes.src as string | null) ?? "";
    const embed = src ? parseYoutubeEmbedUrl(src) : null;
    if (!embed) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          class: "wp-youtube-embed",
          "data-youtube-url": src,
        }),
        ["span", { class: "text-xs text-neutral-500" }, "Neispravan YouTube link"],
      ];
    }
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "wp-youtube-embed",
        "data-youtube-url": src,
      }),
      [
        "iframe",
        {
          src: embed,
          title: "YouTube video",
          loading: "lazy",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowfullscreen: "true",
        },
      ],
    ];
  },

  addCommands() {
    return {
      insertYoutubeEmbed:
        (options: { src: string }) =>
        ({ commands }) => {
          const watch = canonicalYoutubeWatchUrl(options.src);
          if (!watch) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { src: watch },
          });
        },
      updateYoutubeEmbed:
        (options: { src: string }) =>
        ({ commands }) => {
          const watch = canonicalYoutubeWatchUrl(options.src);
          if (!watch) return false;
          return commands.updateAttributes(this.name, { src: watch });
        },
    };
  },
});

export function promptYoutubeUrl(editor: Editor, existing?: string): void {
  const prev = existing ?? "";
  const raw = window.prompt(
    "YouTube link (watch, youtu.be ili embed)",
    prev || "https://www.youtube.com/watch?v=",
  );
  if (raw === null) return;
  const trimmed = raw.trim();
  if (!trimmed) {
    editor.chain().focus().deleteSelection().run();
    return;
  }
  if (!findYoutubeEmbedInNoisyText(trimmed)) {
    window.alert("Unesite ispravan YouTube link.");
    return;
  }
  if (editor.isActive("youtubeEmbed")) {
    editor.chain().focus().updateYoutubeEmbed({ src: trimmed }).run();
    return;
  }
  editor.chain().focus().insertYoutubeEmbed({ src: trimmed }).run();
}

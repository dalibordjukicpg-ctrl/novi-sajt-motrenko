import { Node, mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { YoutubeEmbedNodeView } from "@/components/admin/tiptap-youtube-node-view";
import { canonicalYoutubeWatchUrl } from "@/lib/cms-youtube-html";
import { moveYoutubeEmbed } from "@/lib/tiptap-youtube-move";
import { parseYoutubeEmbedUrl } from "@/lib/youtube-hero";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    youtubeEmbed: {
      insertYoutubeEmbed: (options: { src: string }) => ReturnType;
      updateYoutubeEmbed: (options: { src: string }) => ReturnType;
      deleteYoutubeEmbed: () => ReturnType;
      moveYoutubeEmbedUp: () => ReturnType;
      moveYoutubeEmbedDown: () => ReturnType;
    };
  }
}

function watchUrlFromElement(element: HTMLElement): string | null {
  const data = element.getAttribute("data-youtube-url");
  if (data?.trim()) {
    return canonicalYoutubeWatchUrl(data) ?? null;
  }
  const iframeSrc = element.querySelector("iframe")?.getAttribute("src");
  if (iframeSrc) return canonicalYoutubeWatchUrl(iframeSrc);
  const text = element.textContent ?? "";
  return canonicalYoutubeWatchUrl(text);
}

function deleteActiveYoutubeEmbed(editor: Editor): boolean {
  if (!editor.isActive("youtubeEmbed")) return false;
  return editor.chain().focus().deleteSelection().run();
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
        tag: "div[data-youtube-url]",
        getAttrs: (element) => ({
          src: watchUrlFromElement(element as HTMLElement),
        }),
      },
      {
        tag: "div.wp-youtube-embed",
        getAttrs: (element) => ({
          src: watchUrlFromElement(element as HTMLElement),
        }),
      },
      {
        tag: "figure.is-provider-youtube",
        getAttrs: (element) => ({
          src: watchUrlFromElement(element as HTMLElement),
        }),
      },
      {
        tag: "figure.is-type-video",
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
          class: "wp-youtube-embed wp-youtube-embed--invalid",
          "data-youtube-invalid": "1",
        }),
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

  addNodeView() {
    return ReactNodeViewRenderer(YoutubeEmbedNodeView, {
      stopEvent: ({ event }) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return false;
        if (target.closest("button")) return true;
        if (target.closest("[data-drag-handle]")) return false;
        return false;
      },
    });
  },

  addCommands() {
    return {
      insertYoutubeEmbed:
        (options: { src: string }) =>
        ({ chain }) => {
          const watch = canonicalYoutubeWatchUrl(options.src);
          if (!watch) return false;
          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: { src: watch },
            })
            .run();
        },
      updateYoutubeEmbed:
        (options: { src: string }) =>
        ({ commands }) => {
          const watch = canonicalYoutubeWatchUrl(options.src);
          if (!watch) return false;
          return commands.updateAttributes(this.name, { src: watch });
        },
      deleteYoutubeEmbed:
        () =>
        ({ editor }) =>
          deleteActiveYoutubeEmbed(editor),
      moveYoutubeEmbedUp:
        () =>
        ({ editor }) =>
          moveYoutubeEmbed(editor, "up"),
      moveYoutubeEmbedDown:
        () =>
        ({ editor }) =>
          moveYoutubeEmbed(editor, "down"),
    };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => deleteActiveYoutubeEmbed(this.editor),
      Delete: () => deleteActiveYoutubeEmbed(this.editor),
      "Alt-ArrowUp": () => moveYoutubeEmbed(this.editor, "up"),
      "Alt-ArrowDown": () => moveYoutubeEmbed(this.editor, "down"),
    };
  },
});

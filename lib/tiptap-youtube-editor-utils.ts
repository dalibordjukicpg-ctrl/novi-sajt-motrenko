import type { Editor } from "@tiptap/core";

import { findYoutubeEmbedInNoisyText } from "@/lib/youtube-hero";

export function countYoutubeEmbeds(editor: Editor): number {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "youtubeEmbed") count++;
  });
  return count;
}

export function getYoutubeEmbedIndexAtPos(editor: Editor, targetPos: number): number {
  let idx = 0;
  let found = 0;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "youtubeEmbed") {
      idx++;
      if (pos === targetPos) found = idx;
    }
  });
  return found;
}

export function promptYoutubeUrl(editor: Editor, existing?: string): void {
  const prev = existing ?? "";
  const raw = window.prompt(
    "YouTube link (watch, youtu.be ili embed)\n\nOstavite prazno i potvrdite da obrišete video.",
    prev || "https://www.youtube.com/watch?v=",
  );
  if (raw === null) return;
  const trimmed = raw.trim();
  if (!trimmed) {
    if (editor.isActive("youtubeEmbed")) {
      editor.chain().focus().deleteYoutubeEmbed().run();
    }
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

export function insertYoutubeAtCursor(editor: Editor): void {
  editor.chain().focus().run();
  promptYoutubeUrl(editor);
}

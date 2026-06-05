"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  AdminMediaPicker,
  uploadAdminMediaFile,
} from "@/components/admin/admin-media-picker";
import { YoutubeEmbedExtension } from "@/components/admin/tiptap-youtube-extension";
import { normalizeCmsHtmlForEditor } from "@/lib/cms-youtube-html";
import type { MediaOption } from "@/lib/queries/media-admin";
import {
  countYoutubeEmbeds,
  insertYoutubeAtCursor,
  promptYoutubeUrl,
} from "@/lib/tiptap-youtube-editor-utils";
import { findYoutubeEmbedInNoisyText } from "@/lib/youtube-hero";
import { cn } from "@/lib/utils";

type Props = {
  /** Početni HTML iz baze */
  initialHtml: string;
  /** Sinhronizacija skrivenog polja u formi */
  onHtmlChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** Galerija iz Mediji (admin) */
  mediaOptions?: MediaOption[];
  /** Stranice: prebacivanje vizuelno ↔ HTML source */
  allowHtmlSource?: boolean;
};

export type TiptapEditorHandle = {
  getHtml: () => string;
};

export const TiptapEditor = forwardRef<TiptapEditorHandle, Props>(
  function TiptapEditor(
    {
      initialHtml,
      onHtmlChange,
      placeholder = "Sadržaj stranice…",
      className,
      mediaOptions = [],
      allowHtmlSource = false,
    },
    ref,
  ) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(initialHtml || "");
  const [youtubeCount, setYoutubeCount] = useState(0);
  const [youtubeSelected, setYoutubeSelected] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const syncYoutubeMeta = useCallback((ed: Editor) => {
    setYoutubeCount(countYoutubeEmbeds(ed));
    setYoutubeSelected(ed.isActive("youtubeEmbed"));
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        dropcursor: { color: "#e8682a", width: 3 },
      }),
      Image.configure({
        HTMLAttributes: { class: "max-w-full rounded-lg" },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      YoutubeEmbedExtension,
    ],
    content: normalizeCmsHtmlForEditor(initialHtml),
    immediatelyRender: false,
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
      syncYoutubeMeta(ed);
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    editorProps: {
      attributes: {
        class:
          "prose-article min-h-[220px] px-3 py-2 text-sm text-neutral-900 focus:outline-none",
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
        if (!text || !findYoutubeEmbedInNoisyText(text)) return false;
        const ed = editorRef.current;
        if (!ed) return false;
        event.preventDefault();
        promptYoutubeUrl(ed, text);
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onHtmlChange(ed.getHTML());
      syncYoutubeMeta(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      syncYoutubeMeta(ed);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (sourceMode) return;
    const cur = editor.getHTML();
    const next = normalizeCmsHtmlForEditor(initialHtml);
    if (next !== cur && (next !== "<p></p>" || cur === "")) {
      editor.commands.setContent(next, false);
    }
  }, [initialHtml, editor, sourceMode]);

  useEffect(() => {
    if (!sourceMode) {
      setSourceHtml(initialHtml || "");
    }
  }, [initialHtml, sourceMode]);

  const toggleSourceMode = useCallback(() => {
    if (!editor) return;
    if (sourceMode) {
      editor.commands.setContent(sourceHtml || "", false);
      onHtmlChange(editor.getHTML());
      setSourceMode(false);
      return;
    }
    const html = editor.getHTML();
    setSourceHtml(html);
    onHtmlChange(html);
    setSourceMode(true);
  }, [editor, onHtmlChange, sourceHtml, sourceMode]);

  const onSourceHtmlChange = useCallback(
    (value: string) => {
      setSourceHtml(value);
      onHtmlChange(value);
    },
    [onHtmlChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      getHtml: () =>
        sourceMode ? sourceHtml : (editor?.getHTML() ?? initialHtml ?? ""),
    }),
    [editor, initialHtml, sourceHtml, sourceMode],
  );

  const insertImageUrl = useCallback(
    (url: string) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: url }).run();
    },
    [editor],
  );

  const insertYoutube = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("youtubeEmbed")) {
      const existing = editor.getAttributes("youtubeEmbed").src as string | undefined;
      promptYoutubeUrl(editor, existing);
      return;
    }
    insertYoutubeAtCursor(editor);
  }, [editor]);

  const deleteYoutube = useCallback(() => {
    if (!editor?.isActive("youtubeEmbed")) return;
    if (!window.confirm("Obrisati odabrani YouTube video?")) return;
    editor.chain().focus().deleteYoutubeEmbed().run();
  }, [editor]);

  const moveYoutubeUp = useCallback(() => {
    editor?.chain().focus().moveYoutubeEmbedUp().run();
  }, [editor]);

  const moveYoutubeDown = useCallback(() => {
    editor?.chain().focus().moveYoutubeEmbedDown().run();
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL linka", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const uploadFromComputer = useCallback(() => {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const item = await uploadAdminMediaFile(file);
        insertImageUrl(item.url);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Otpremanje nije uspjelo.");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }, [editor, insertImageUrl]);

  if (!editor) {
    return (
      <div className={cn("rounded-md border border-neutral-200 bg-white", className)}>
        <div className="h-[220px] animate-pulse bg-neutral-50" />
      </div>
    );
  }

  return (
    <>
      <div className={cn("rounded-md border border-neutral-200 bg-white", className)}>
        <div className="flex flex-wrap gap-1 border-b border-neutral-100 bg-neutral-50 px-2 py-1.5">
          {allowHtmlSource ? (
            <button
              type="button"
              onClick={toggleSourceMode}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium",
                sourceMode
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-700 hover:bg-neutral-200",
              )}
            >
              {sourceMode ? "Vizuelno" : "</> HTML"}
            </button>
          ) : null}
          {!sourceMode ? (
            <>
          <ToolbarBtn
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="B"
          />
          <ToolbarBtn
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="I"
          />
          <ToolbarBtn
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            label="H2"
          />
          <ToolbarBtn
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="• Lista"
          />
          <ToolbarBtn
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="1. Lista"
          />
          <button
            type="button"
            onClick={setLink}
            className="rounded px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
          >
            Link
          </button>
          <button
            type="button"
            onClick={insertYoutube}
            title="Kliknite u tekst gdje želite video, pa dodajte link"
            className={cn(
              "rounded px-2 py-1 text-xs font-medium",
              youtubeSelected
                ? "bg-red-600 text-white"
                : "text-neutral-700 hover:bg-neutral-200",
            )}
          >
            YouTube{youtubeCount > 0 ? ` (${youtubeCount})` : ""}
          </button>
          {youtubeSelected ? (
            <>
              <button
                type="button"
                onClick={insertYoutube}
                className="rounded px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
              >
                Uredi link
              </button>
              <button
                type="button"
                onClick={moveYoutubeUp}
                className="rounded px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                title="Pomjeri video gore u tekstu"
              >
                ↑ Gore
              </button>
              <button
                type="button"
                onClick={moveYoutubeDown}
                className="rounded px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                title="Pomjeri video dole u tekstu"
              >
                ↓ Dole
              </button>
              <button
                type="button"
                onClick={deleteYoutube}
                className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Obriši video
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={uploadFromComputer}
            disabled={uploading}
            className="rounded px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
          >
            {uploading ? "Otpremanje…" : "Slika ↑"}
          </button>
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="rounded px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
          >
            Galerija
          </button>
            </>
          ) : null}
        </div>
        {!sourceMode && youtubeCount > 0 ? (
          <p className="border-b border-neutral-100 bg-neutral-50/80 px-3 py-1.5 text-[10px] text-neutral-500">
            {youtubeCount === 1 ? "1 video" : `${youtubeCount} videa`} na stranici.
            Kliknite u tekst između pasusa, pa <strong>YouTube</strong> za novi.
            Uhvatite ⋮⋮ ručku ili koristite ↑ ↓ da pomjerite video u tekstu.
          </p>
        ) : !sourceMode ? (
          <p className="border-b border-neutral-100 bg-neutral-50/80 px-3 py-1.5 text-[10px] text-neutral-500">
            Kliknite u tekst gdje želite video, pa dugme <strong>YouTube</strong>.
          </p>
        ) : null}
        {sourceMode ? (
          <textarea
            value={sourceHtml}
            onChange={(e) => onSourceHtmlChange(e.target.value)}
            spellCheck={false}
            className="block min-h-[220px] w-full resize-y border-0 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-neutral-900 focus:outline-none"
            placeholder="<p>HTML sadržaj…</p>"
          />
        ) : (
          <div className="admin-tiptap-editor">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>

      <AdminMediaPicker
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        mediaOptions={mediaOptions}
        imagesOnly
        title="Umetni sliku u tekst"
        onPick={(item) => insertImageUrl(item.url)}
      />
    </>
  );
  },
);

function ToolbarBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2 py-1 text-xs font-medium",
        active ? "bg-neutral-800 text-white" : "text-neutral-700 hover:bg-neutral-200",
      )}
    >
      {label}
    </button>
  );
}

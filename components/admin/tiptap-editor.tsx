"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

import {
  AdminMediaPicker,
  uploadAdminMediaFile,
} from "@/components/admin/admin-media-picker";
import type { MediaOption } from "@/lib/queries/media-admin";
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
    },
    ref,
  ) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        HTMLAttributes: { class: "max-w-full rounded-lg" },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-article min-h-[220px] px-3 py-2 text-sm text-neutral-900 focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onHtmlChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const cur = editor.getHTML();
    const next = initialHtml || "";
    if (next !== cur && (next !== "<p></p>" || cur === "")) {
      editor.commands.setContent(next, false);
    }
  }, [initialHtml, editor]);

  useImperativeHandle(
    ref,
    () => ({
      getHtml: () => editor?.getHTML() ?? initialHtml ?? "",
    }),
    [editor, initialHtml],
  );

  const insertImageUrl = useCallback(
    (url: string) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: url }).run();
    },
    [editor],
  );

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
        </div>
        <EditorContent editor={editor} />
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

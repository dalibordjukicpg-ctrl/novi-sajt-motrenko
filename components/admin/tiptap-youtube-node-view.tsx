"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import {
  countYoutubeEmbeds,
  getYoutubeEmbedIndexAtPos,
  promptYoutubeUrl,
} from "@/lib/tiptap-youtube-editor-utils";
import { moveYoutubeEmbed } from "@/lib/tiptap-youtube-move";
import { parseYoutubeEmbedUrl } from "@/lib/youtube-hero";

export function YoutubeEmbedNodeView({
  node,
  selected,
  deleteNode,
  editor,
  getPos,
}: NodeViewProps) {
  const src = (node.attrs.src as string | null) ?? "";
  const embed = src ? parseYoutubeEmbedUrl(src) : null;
  const pos = getPos();
  const index =
    typeof pos === "number" ? getYoutubeEmbedIndexAtPos(editor, pos) : null;
  const total = countYoutubeEmbeds(editor);

  const selectNode = () => {
    if (typeof pos !== "number") return;
    editor.chain().focus().setNodeSelection(pos).run();
  };

  const onEdit = () => {
    selectNode();
    promptYoutubeUrl(editor, src || undefined);
  };

  const onDelete = () => {
    if (!window.confirm("Obrisati ovaj YouTube video sa stranice?")) return;
    deleteNode();
  };

  const onMoveUp = () => {
    selectNode();
    moveYoutubeEmbed(editor, "up");
  };

  const onMoveDown = () => {
    selectNode();
    moveYoutubeEmbed(editor, "down");
  };

  return (
    <NodeViewWrapper
      as="div"
      className={[
        "youtube-embed-node",
        selected ? "youtube-embed-node--selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      contentEditable={false}
    >
      <div className="youtube-embed-node__bar">
        <button
          type="button"
          className="youtube-embed-node__drag"
          data-drag-handle
          title="Prevucite video na drugo mjesto u tekstu"
          aria-label="Prevuci video"
        >
          <GripVertical size={16} strokeWidth={2} aria-hidden />
        </button>
        <span className="youtube-embed-node__badge">
          Video {index ?? "?"}
          {total > 0 ? ` / ${total}` : ""}
        </span>
        <div className="youtube-embed-node__actions">
          <button
            type="button"
            onClick={onMoveUp}
            className="youtube-embed-node__btn youtube-embed-node__btn--icon"
            title="Pomjeri gore"
            aria-label="Pomjeri gore"
          >
            <ChevronUp size={14} strokeWidth={2.5} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            className="youtube-embed-node__btn youtube-embed-node__btn--icon"
            title="Pomjeri dole"
            aria-label="Pomjeri dole"
          >
            <ChevronDown size={14} strokeWidth={2.5} aria-hidden />
          </button>
          <button type="button" onClick={onEdit} className="youtube-embed-node__btn">
            Uredi
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="youtube-embed-node__btn youtube-embed-node__btn--danger"
          >
            Obriši
          </button>
        </div>
      </div>
      <div className="youtube-embed-node__frame">
        {embed ? (
          <iframe
            src={embed}
            title="YouTube video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="youtube-embed-node__invalid">
            Neispravan link — kliknite Uredi
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

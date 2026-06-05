import type { Editor } from "@tiptap/core";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";

export function getSelectedYoutubeNode(
  editor: Editor,
): { pos: number; node: ProseNode } | null {
  const { state } = editor;
  const { selection } = state;

  if (
    selection instanceof NodeSelection &&
    selection.node.type.name === "youtubeEmbed"
  ) {
    return { pos: selection.from, node: selection.node };
  }

  if (editor.isActive("youtubeEmbed")) {
    const pos = selection.from;
    const node = state.doc.nodeAt(pos);
    if (node?.type.name === "youtubeEmbed") return { pos, node };
  }

  return null;
}

export function moveYoutubeEmbed(
  editor: Editor,
  direction: "up" | "down",
): boolean {
  const selected = getSelectedYoutubeNode(editor);
  if (!selected) return false;

  const { pos, node } = selected;
  const $pos = editor.state.doc.resolve(pos);
  const index = $pos.index();
  const parent = $pos.parent;
  const swapWith = direction === "up" ? index - 1 : index + 1;

  if (swapWith < 0 || swapWith >= parent.childCount) return false;

  const other = parent.child(swapWith);
  const from = $pos.posAtIndex(Math.min(index, swapWith));
  const to =
    $pos.posAtIndex(Math.max(index, swapWith)) +
    parent.child(Math.max(index, swapWith)).nodeSize;

  const newOrder = direction === "up" ? [node, other] : [other, node];
  const tr = editor.state.tr.replaceWith(from, to, newOrder);
  const newPos = direction === "up" ? from : from + other.nodeSize;
  tr.setSelection(NodeSelection.create(tr.doc, newPos));
  editor.view.dispatch(tr);
  return true;
}

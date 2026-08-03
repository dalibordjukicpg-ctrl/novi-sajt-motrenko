import Image from "@tiptap/extension-image";

import {
  clampImageFocusY,
  IMAGE_FOCUS_Y_ATTR,
  objectPositionFromFocusY,
} from "@/lib/image-focus";

/** TipTap Image sa vertikalnim fokusom (object-position Y) za blog okvir. */
export const ArticleImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      objectPositionY: {
        default: 50,
        parseHTML: (element) => {
          const raw = element.getAttribute(IMAGE_FOCUS_Y_ATTR);
          if (raw != null && raw !== "") {
            return clampImageFocusY(raw);
          }
          const style = element.getAttribute("style") ?? "";
          const m = /object-position:\s*center\s+(\d+(?:\.\d+)?)%/i.exec(style);
          if (m) return clampImageFocusY(m[1]);
          return 50;
        },
        renderHTML: (attributes) => {
          const y = clampImageFocusY(attributes.objectPositionY);
          return {
            [IMAGE_FOCUS_Y_ATTR]: String(y),
            style: `object-position: ${objectPositionFromFocusY(y)}`,
          };
        },
      },
    };
  },
}).configure({
  HTMLAttributes: { class: "max-w-full rounded-lg article-body-image" },
});

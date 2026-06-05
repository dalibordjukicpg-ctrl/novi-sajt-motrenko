import {
  buildCmsYoutubeEmbedHtml,
  ensureYoutubeEmbedsInCmsHtml,
} from "../lib/cms-youtube-html";
import { preparePublicHtml } from "../lib/public-cms-html";

const url1 = "https://www.youtube.com/watch?v=Iu5mktOlaok";
const url2 = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const html = [
  "<h2>ICSI metodom</h2>",
  buildCmsYoutubeEmbedHtml(url1),
  "<p>ICSI tekst</p>",
  "<h2>Šta možemo da očekujemo?</h2>",
  "<p>Uvod</p>",
  buildCmsYoutubeEmbedHtml(url2),
  "<p>Kraj</p>",
].join("");

const saved = ensureYoutubeEmbedsInCmsHtml(html);
const rendered = preparePublicHtml(saved, "me");
const ids = [...rendered.matchAll(/embed\/([a-zA-Z0-9_-]{11})/g)].map((m) => m[1]);
console.log("embed IDs:", ids);
console.log("count:", ids.length, ids.length === 2 ? "OK" : "FAIL");

const invalid = [
  '<div class="wp-youtube-embed wp-youtube-embed--invalid" data-youtube-invalid="1"></div>',
  '<div class="wp-youtube-embed"><span>Neispravan YouTube link</span></div>',
  "<p>Neispravan YouTube link</p>",
];
for (const block of invalid) {
  const out = preparePublicHtml(ensureYoutubeEmbedsInCmsHtml(block), "me");
  console.log("invalid cleaned:", !out.includes("Neispravan") && !out.includes("wp-youtube-embed--invalid"));
}

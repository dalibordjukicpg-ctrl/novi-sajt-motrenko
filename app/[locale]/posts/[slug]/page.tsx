import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDbConnectionUserMessage, isDbConnectionError } from "@/lib/db-errors";
import { isLocale } from "@/lib/i18n";
import { getPublishedPostBySlug } from "@/lib/queries/posts";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  try {
    const post = await getPublishedPostBySlug(raw, slug);
    if (!post) return {};
    const title = post.metaTitle?.trim() || post.title;
    const description =
      post.metaDescription?.trim() || post.excerpt || undefined;
    return { title, description };
  } catch {
    return { title: "Članak" };
  }
}

export default async function PublicPostPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();

  let post: Awaited<ReturnType<typeof getPublishedPostBySlug>>;
  try {
    post = await getPublishedPostBySlug(raw, slug);
  } catch (e) {
    console.error(e);
    return (
      <article className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href={`/${raw}`}
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Nazad
        </Link>
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {isDbConnectionError(e)
            ? getDbConnectionUserMessage(e)
            : "Greška pri učitavanju članka."}
        </p>
      </article>
    );
  }

  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/${raw}`}
        className="text-sm text-neutral-600 hover:text-neutral-900"
      >
        ← Nazad
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-neutral-900">
        {post.title}
      </h1>
      {post.coverUrl ? (
        <div className="relative mt-6 aspect-[21/9] max-h-[min(420px,40vh)] w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      {post.excerpt && (
        <p className="mt-4 text-lg text-neutral-600">{post.excerpt}</p>
      )}
      {post.body && (
        <div className="mt-8 max-w-none whitespace-pre-wrap text-base leading-relaxed text-neutral-800">
          {post.body}
        </div>
      )}
    </article>
  );
}

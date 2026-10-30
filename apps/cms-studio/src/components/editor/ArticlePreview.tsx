import { verticalLabel } from "@/lib/verticals";

interface ArticlePreviewProps {
  authorName: string;
  authorLogin: string;
  authorAvatar?: string;
  selectedVertical: string;
  title: string;
  coverImage: string;
  /** Already-sanitized HTML of the article body */
  html: string;
  wordCount?: number;
  readingTime?: number;
  summary?: string;
  tags?: string[];
}

/** The article as readers will see it — always a light page, in every Studio theme. */
export default function ArticlePreview({
  authorName,
  authorLogin,
  authorAvatar,
  selectedVertical,
  title,
  coverImage,
  html,
  wordCount,
  readingTime,
  summary,
  tags,
}: ArticlePreviewProps) {
  return (
    <article className="article-preview rounded-xl border border-border p-6 shadow-card sm:p-10">
      {coverImage ? (
        // Same sizing as the published post (main-portal blog page), so the preview crops exactly like the live site.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverImage} alt="" className="!mt-0 mb-8 max-h-[480px] w-full rounded-xl object-cover" />
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#4B5563]">
        <span className="rounded-full bg-[#FFF1F2] px-2.5 py-0.5 font-semibold text-[#BE123C]">{verticalLabel(selectedVertical)}</span>
        <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        {readingTime ? <span>· {readingTime} min read</span> : null}
        {wordCount !== undefined ? <span>· {wordCount} words</span> : null}
      </div>

      <h1 className="!mt-0 text-3xl font-extrabold leading-tight tracking-tight text-[#111827] sm:text-[2.6rem]">
        {title.trim() ? title : <span className="italic text-[#6B7280]">Untitled article</span>}
      </h1>

      {summary ? <p className="!text-lg !text-[#4B5563]">{summary}</p> : null}

      <div className="my-6 flex items-center gap-3 border-y border-[#E5E7EB] py-4">
        {authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={authorAvatar} alt="" className="!m-0 h-10 w-10 rounded-full !shadow-none" />
        ) : null}
        <div>
          <div className="text-sm font-semibold text-[#111827]">{authorName}</div>
          <div className="text-xs text-[#4B5563]">@{authorLogin}</div>
        </div>
      </div>

      <div dangerouslySetInnerHTML={{ __html: html }} />

      {tags && tags.length ? (
        <div className="mt-8 flex flex-wrap gap-2 border-t border-[#E5E7EB] pt-5">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-semibold text-[#374151]">
              #{t}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

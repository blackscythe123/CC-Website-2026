"use client";

import { ExternalLink, Lock, Share2, Trash2 } from "lucide-react";
import { publicPostUrl, verticalLabel } from "@/lib/verticals";
import { Badge, Button, VerticalIcon, buttonClasses } from "@/components/ui";

export interface PublishedPost {
  slug: string;
  vertical: string;
  title: string;
  date: string;
  author: string;
  summary: string;
  canDelete: boolean;
}

export default function ArticleRow({ post, onRepurpose, onUnpublish }: { post: PublishedPost; onRepurpose: () => void; onUnpublish: () => void }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4 shadow-card sm:flex-row sm:items-center sm:gap-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={post.vertical === "club" ? "accent" : "info"}>
            <VerticalIcon slug={post.vertical} className="h-3 w-3" />
            {verticalLabel(post.vertical)}
          </Badge>
          <span className="text-[13px] text-muted">
            {post.date || "No date"} · {post.author}
          </span>
        </div>
        <h3 className="mt-1.5 text-[15px] font-bold leading-snug tracking-tight">{post.title}</h3>
        {post.summary ? <p className="mt-1 line-clamp-2 text-sm text-muted">{post.summary}</p> : null}
        <p className="mt-1 truncate font-mono text-xs text-subtle">/{post.slug}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <a href={publicPostUrl(post.vertical, post.slug)} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: "sm", variant: "ghost" })}>
          Read
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
        <Button size="sm" icon={Share2} onClick={onRepurpose} title="Generate posts for X, LinkedIn, Discord and WhatsApp">
          Repurpose
        </Button>
        {post.canDelete ? (
          <Button size="sm" variant="danger" icon={Trash2} onClick={onUnpublish}>
            Unpublish
          </Button>
        ) : (
          <Badge tone="neutral" icon={Lock} title="Only this vertical's head or a superadmin can unpublish it">
            Protected
          </Badge>
        )}
      </div>
    </article>
  );
}

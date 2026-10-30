"use client";

import { useEffect, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button, Drawer, Skeleton, TabPanel, Tabs } from "@/components/ui";
import { useToast } from "@/components/toast/ToastProvider";

export interface RepurposePack {
  canonicalUrl: string;
  slopWarnings: { word: string; index: number }[];
  twitterThread: string[];
  linkedInPost: string;
  discordSnippet: string;
  whatsAppSnippet: string;
}

type Channel = "twitter" | "linkedin" | "discord" | "whatsapp";

function CopyButton({ text, label, size = "sm" }: { text: string; label: string; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the text and copy it manually.");
    }
  };
  return (
    <Button size={size} icon={copied ? Check : Copy} onClick={copy} aria-label={copied ? "Copied" : label}>
      {copied ? "Copied" : label}
    </Button>
  );
}

function Snippet({ text }: { text: string }) {
  return <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface p-4 font-sans text-sm leading-relaxed">{text}</pre>;
}

export default function RepurposeDrawer({
  title,
  loading,
  pack,
  onClose,
}: {
  title: string | null;
  loading: boolean;
  pack: RepurposePack | null;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<Channel>("twitter");
  useEffect(() => setChannel("twitter"), [title]);

  return (
    <Drawer open={Boolean(title)} onClose={onClose} width="lg" title={title ? `Repurpose · ${title}` : ""}>
      <div className="space-y-4 px-5 py-5">
        {loading ? (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !pack ? (
          <p className="text-sm text-danger">Couldn&apos;t generate posts for this article.</p>
        ) : (
          <>
            <div className="text-sm">
              <span className="text-muted">Canonical URL </span>
              <a href={pack.canonicalUrl} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[13px] text-accent hover:underline">
                {pack.canonicalUrl}
              </a>
            </div>

            {pack.slopWarnings?.length ? (
              <div className="flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-sm text-warning">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  <strong>Generic wording found:</strong> {pack.slopWarnings.slice(0, 4).map((w) => `“${w.word}”`).join(", ")}
                  {pack.slopWarnings.length > 4 ? ` and ${pack.slopWarnings.length - 4} more` : ""}. Consider revising the article to sound less like boilerplate.
                </p>
              </div>
            ) : null}

            <Tabs
              ariaLabel="Channel"
              idPrefix="repurpose"
              value={channel}
              onChange={(id) => setChannel(id as Channel)}
              tabs={[
                { id: "twitter", label: `X thread`, count: pack.twitterThread.length },
                { id: "linkedin", label: "LinkedIn" },
                { id: "discord", label: "Discord" },
                { id: "whatsapp", label: "WhatsApp" },
              ]}
            />

            <TabPanel id={channel} idPrefix="repurpose">
              {channel === "twitter" ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <CopyButton text={pack.twitterThread.join("\n\n---\n\n")} label="Copy whole thread" />
                  </div>
                  {pack.twitterThread.map((tweet, i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface p-3.5">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted">
                          Post {i + 1} of {pack.twitterThread.length}
                        </span>
                        <span className={`tabular-nums ${tweet.length > 280 ? "font-bold text-danger" : "text-muted"}`}>{tweet.length}/280</span>
                      </div>
                      <p className="whitespace-pre-line text-sm leading-relaxed">{tweet}</p>
                      <div className="mt-2 flex justify-end">
                        <CopyButton text={tweet} label="Copy" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {channel === "linkedin" ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <CopyButton text={pack.linkedInPost} label="Copy LinkedIn post" />
                  </div>
                  <Snippet text={pack.linkedInPost} />
                </div>
              ) : null}
              {channel === "discord" ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <CopyButton text={pack.discordSnippet} label="Copy Discord post" />
                  </div>
                  <Snippet text={pack.discordSnippet} />
                </div>
              ) : null}
              {channel === "whatsapp" ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <CopyButton text={pack.whatsAppSnippet} label="Copy WhatsApp message" />
                  </div>
                  <Snippet text={pack.whatsAppSnippet} />
                </div>
              ) : null}
            </TabPanel>
          </>
        )}
      </div>
    </Drawer>
  );
}

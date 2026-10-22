"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, Field, Textarea } from "@/components/ui";
import type { ReviewPr } from "@/lib/hooks/useReviewQueue";

export default function RequestChangesDialog({
  pr,
  submitting,
  onCancel,
  onSubmit,
}: {
  pr: ReviewPr | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => setReason(""), [pr?.number]);

  return (
    <Dialog
      open={Boolean(pr)}
      onClose={submitting ? () => {} : onCancel}
      title={pr ? `Request changes on PR #${pr.number}` : ""}
      description={pr ? <>Your feedback is posted on the pull request and shown to @{pr.author} in their editor.</> : undefined}
      footer={
        <>
          <Button onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} disabled={!reason.trim()} onClick={() => onSubmit(reason.trim())}>
            Send feedback
          </Button>
        </>
      }
    >
      <Field label="What should change?" htmlFor="changes-reason" hint="Be specific — point to sections, code samples or images.">
        <Textarea
          id="changes-reason"
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Please add a section on cache invalidation and fix the code sample in step 3."
          data-autofocus
        />
      </Field>
    </Dialog>
  );
}

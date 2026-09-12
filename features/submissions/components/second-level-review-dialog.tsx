"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestSecondLevelReviewAction } from "@/features/submissions/actions/review-fields.actions";
import type { Submission } from "@/features/submissions/types";

interface SecondLevelReviewDialogProps {
  submission: Submission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: (submission: Submission) => void;
}

export function SecondLevelReviewDialog({
  submission,
  open,
  onOpenChange,
  onSubmitted,
}: SecondLevelReviewDialogProps) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!submission || pending) {
      return;
    }

    const formData = new FormData();
    if (note.trim()) {
      formData.set("note", note.trim());
    }
    const files = fileInputRef.current?.files;
    if (files) {
      for (const file of files) {
        formData.append("attachments", file);
      }
    }

    setPending(true);
    try {
      const result = await requestSecondLevelReviewAction(submission.id, formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Second level review requested");
      setNote("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onSubmitted(result.data);
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request 2nd Level Review</DialogTitle>
          <DialogDescription>
            Ask the Account Manager to reconsider{" "}
            <span className="font-medium text-foreground">
              {submission?.candidateName ?? "this candidate"}
            </span>
            . Add context and optional supporting files (PDF, Word, or images).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="second-review-note">Why should we review again?</Label>
            <Textarea
              id="second-review-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Share updated context, skills fit, or client feedback…"
              rows={4}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="second-review-files">Supporting files (optional)</Label>
            <input
              ref={fileInputRef}
              id="second-review-files"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
              disabled={pending}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted-foreground">
              Up to 3 files, 8MB each. Files are appended to the candidate record
              for the review team.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleSubmit()}>
            {pending ? "Submitting…" : "Submit review request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  replyToPartnerQueryAction,
  submitFeedbackAction,
  type FeedbackFormValues,
} from "@/features/feedback/actions/feedback.actions";
import type { PartnerQuery } from "@/features/feedback/types";
import {
  PARTNER_QUERY_STATUS_LABELS,
  PARTNER_QUERY_TYPE_LABELS,
} from "@/features/feedback/types";
import { formatDateTime } from "@/lib/utils";

const formSchema = z.object({
  type: z.enum(["feedback", "suggestion", "account_question"]),
  message: z.string().trim().min(10, "Please enter a little more detail"),
});

interface FeedbackPageClientProps {
  role: "partner" | "account_manager";
  initialQueries: PartnerQuery[];
}

function statusBadgeVariant(
  status: PartnerQuery["status"],
): "warning" | "success" | "secondary" {
  if (status === "open") return "warning";
  if (status === "answered") return "success";
  return "secondary";
}

export function FeedbackPageClient({
  role,
  initialQueries,
}: FeedbackPageClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(formSchema) as Resolver<FeedbackFormValues>,
    defaultValues: {
      type: role === "partner" ? "account_question" : "feedback",
      message: "",
    },
  });

  const queries = useMemo(() => initialQueries, [initialQueries]);

  function onSubmit(values: FeedbackFormValues) {
    startTransition(async () => {
      const result = await submitFeedbackAction(values);
      if (!result.success) {
        toast.error(
          result.errors?.length
            ? `${result.message}: ${result.errors.join("; ")}`
            : result.message,
        );
        return;
      }
      toast.success(
        role === "partner"
          ? "Question submitted — your Account Manager can reply here"
          : "Message sent",
      );
      reset({
        type: role === "partner" ? "account_question" : "feedback",
        message: "",
      });
      router.refresh();
    });
  }

  function onReply(queryId: string) {
    const amComments = (replyDrafts[queryId] ?? "").trim();
    if (amComments.length < 2) {
      toast.error("Please enter a reply");
      return;
    }
    setReplyingId(queryId);
    startTransition(async () => {
      const result = await replyToPartnerQueryAction({ queryId, amComments });
      setReplyingId(null);
      if (!result.success) {
        toast.error(
          result.errors?.length
            ? `${result.message}: ${result.errors.join("; ")}`
            : result.message,
        );
        return;
      }
      toast.success("Reply sent");
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[queryId];
        return next;
      });
      router.refresh();
    });
  }

  const base = role === "partner" ? "/partner" : "/account-manager";
  const roleLabel = role === "partner" ? "Talent Partner" : "Account Manager";

  return (
    <ContentContainer>
      <Breadcrumb
        items={[
          { label: roleLabel, href: base },
          { label: "Feedback" },
        ]}
      />
      <PageHeader
        title="Feedback & Queries"
        description={
          role === "partner"
            ? "Ask an account-related question or share platform feedback. Your Partner ID is shown to Account Managers — commercial name stays private. Replies appear below."
            : "Reply to Partner account questions below, or send platform feedback to the internal team."
        }
      />

      <div className="mx-auto max-w-3xl space-y-8">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#0F172A]">
            {role === "partner" ? "New question or feedback" : "Platform feedback"}
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="feedback-type">Type</Label>
              <Select
                id="feedback-type"
                disabled={pending}
                {...register("type")}
              >
                {role === "partner" ? (
                  <option value="account_question">
                    Account-related question (to Account Manager)
                  </option>
                ) : null}
                <option value="feedback">Feedback</option>
                <option value="suggestion">Suggestion</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Message</Label>
              <Textarea
                id="feedback-message"
                rows={6}
                placeholder={
                  role === "partner"
                    ? "Ask about your account, allocations, payouts, or share a platform issue."
                    : "Tell us what is working, what is broken, or what should be improved."
                }
                disabled={pending}
                {...register("message")}
              />
              {errors.message ? (
                <p className="text-xs text-destructive">
                  {errors.message.message}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending && !replyingId ? "Sending…" : "Send"}
              </Button>
            </div>
          </form>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#0F172A]">
            {role === "partner" ? "Your queries" : "Partner queries"}
          </h2>
          {queries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white px-4 py-8 text-center text-sm text-[#64748B]">
              {role === "partner"
                ? "No queries yet. Submit a question above and replies will show here."
                : "No Partner queries yet."}
            </p>
          ) : (
            <ul className="space-y-3">
              {queries.map((query) => (
                <li
                  key={query.id}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {PARTNER_QUERY_TYPE_LABELS[query.type]}
                    </Badge>
                    <Badge variant={statusBadgeVariant(query.status)}>
                      {PARTNER_QUERY_STATUS_LABELS[query.status]}
                    </Badge>
                    {role === "account_manager" ? (
                      <span className="text-xs font-medium text-[#0F172A]">
                        {query.partnerCode}
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-[#64748B]">
                      {formatDateTime(query.submittedAt)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-[#0F172A]">
                    {query.message}
                  </p>
                  {query.amComments ? (
                    <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
                        Account Manager reply
                        {query.answeredAt
                          ? ` · ${formatDateTime(query.answeredAt)}`
                          : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[#0F172A]">
                        {query.amComments}
                      </p>
                    </div>
                  ) : null}
                  {role === "account_manager" ? (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor={`reply-${query.id}`}>
                        {query.amComments ? "Update reply" : "Reply"}
                      </Label>
                      <Textarea
                        id={`reply-${query.id}`}
                        rows={3}
                        placeholder="Your reply is visible to the Partner."
                        disabled={pending}
                        value={replyDrafts[query.id] ?? ""}
                        onChange={(event) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [query.id]: event.target.value,
                          }))
                        }
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending}
                          onClick={() => onReply(query.id)}
                        >
                          {replyingId === query.id ? "Sending…" : "Send reply"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ContentContainer>
  );
}

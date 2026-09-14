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
  type: z.enum([
    "platform_feedback",
    "job_candidate_query",
    "account_admin_query",
  ]),
  message: z.string().trim().min(10, "Please enter a little more detail"),
});

interface FeedbackPageClientProps {
  role: "partner" | "account_manager";
  initialQueries: PartnerQuery[];
  /** When set, only show this query type (e.g. Ask AM on My Jobs). */
  fixedType?: FeedbackFormValues["type"];
  hideQueryHistory?: boolean;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  pageTitle?: string;
  pageDescription?: string;
}

function statusBadgeVariant(
  status: PartnerQuery["status"],
): "warning" | "success" | "secondary" {
  if (status === "open") return "warning";
  if (status === "answered") return "success";
  return "secondary";
}

function partnerSubmitToast(type: FeedbackFormValues["type"]): string {
  switch (type) {
    case "platform_feedback":
      return "Feedback sent to the platform team";
    case "job_candidate_query":
      return "Query sent to your Account Manager — replies appear below";
    case "account_admin_query":
      return "Query sent to account administration";
    default:
      return "Message sent";
  }
}

function replyLabel(type: PartnerQuery["type"]): string {
  if (type === "job_candidate_query") {
    return "Account Manager reply";
  }
  if (type === "account_admin_query") {
    return "Admin reply";
  }
  return "Reply";
}

export function FeedbackPageClient({
  role,
  initialQueries,
  fixedType,
  hideQueryHistory = false,
  breadcrumbs,
  pageTitle,
  pageDescription,
}: FeedbackPageClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const defaultType =
    fixedType ?? (role === "partner" ? "platform_feedback" : "platform_feedback");

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(formSchema) as Resolver<FeedbackFormValues>,
    defaultValues: {
      type: defaultType,
      message: "",
    },
  });

  const queries = useMemo(() => {
    if (!fixedType) {
      return initialQueries;
    }
    return initialQueries.filter((row) => row.type === fixedType);
  }, [fixedType, initialQueries]);

  function onSubmit(values: FeedbackFormValues) {
    const payload = fixedType ? { ...values, type: fixedType } : values;
    startTransition(async () => {
      const result = await submitFeedbackAction(payload);
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
          ? partnerSubmitToast(payload.type)
          : "Message sent",
      );
      reset({
        type: defaultType,
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

  const resolvedBreadcrumbs =
    breadcrumbs ??
    [
      { label: roleLabel, href: base },
      { label: "Feedback" },
    ];

  const resolvedTitle =
    pageTitle ??
    (fixedType === "job_candidate_query" ? "Ask AM" : "Feedback & Queries");

  const resolvedDescription =
    pageDescription ??
    (role === "partner"
      ? fixedType === "job_candidate_query"
        ? "Ask your Account Manager about a job, allocation, or candidate. Your Partner ID is shown — commercial name stays private."
        : "Share platform feedback or ask account administration about payouts and process. Job-specific questions can also be sent from My Jobs → Ask AM."
      : "Reply to Partner job and candidate questions below, or send platform feedback to the internal team.");

  return (
    <ContentContainer>
      {!hideQueryHistory || fixedType !== "job_candidate_query" ? (
        <Breadcrumb items={resolvedBreadcrumbs} />
      ) : null}
      <PageHeader title={resolvedTitle} description={resolvedDescription} />

      <div className="mx-auto max-w-3xl space-y-8">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#0F172A]">
            {fixedType === "job_candidate_query"
              ? "New question for your Account Manager"
              : role === "partner"
                ? "New message"
                : "Platform feedback"}
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {role === "partner" && !fixedType ? (
              <div className="space-y-2">
                <Label htmlFor="feedback-type">Type</Label>
                <Select
                  id="feedback-type"
                  disabled={pending}
                  {...register("type")}
                >
                  <option value="platform_feedback">
                    Feedback about the platform / process
                  </option>
                  <option value="account_admin_query">
                    Generic query — platform, process, or payouts
                  </option>
                  <option value="job_candidate_query">
                    Account / job / candidate query (to Account Manager)
                  </option>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Message</Label>
              <Textarea
                id="feedback-message"
                rows={6}
                placeholder={
                  fixedType === "job_candidate_query"
                    ? "Ask about a job, candidate status, allocation, or submission."
                    : role === "partner"
                      ? "Describe your feedback or question in detail."
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

        {hideQueryHistory ? null : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              {role === "partner" ? "Your messages" : "Partner queries"}
            </h2>
            {queries.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white px-4 py-8 text-center text-sm text-[#64748B]">
                {role === "partner"
                  ? "No messages yet. Submit above and replies will show here."
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
                          {replyLabel(query.type)}
                          {query.answeredAt
                            ? ` · ${formatDateTime(query.answeredAt)}`
                            : ""}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-[#0F172A]">
                          {query.amComments}
                        </p>
                      </div>
                    ) : null}
                    {role === "account_manager" &&
                    query.type === "job_candidate_query" ? (
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
        )}
      </div>
    </ContentContainer>
  );
}

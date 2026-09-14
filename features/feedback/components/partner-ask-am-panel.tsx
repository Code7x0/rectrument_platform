"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedbackAction } from "@/features/feedback/actions/feedback.actions";
import type { PartnerQuery } from "@/features/feedback/types";
import {
  PARTNER_QUERY_STATUS_LABELS,
  PARTNER_QUERY_TYPE_LABELS,
} from "@/features/feedback/types";
import type { PartnerWorkTask } from "@/features/tasks/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  jobId: z.string().optional(),
  message: z.string().trim().min(10, "Please enter a little more detail"),
});

type AskAmFormValues = z.infer<typeof formSchema>;

interface PartnerAskAmPanelProps {
  tasks: PartnerWorkTask[];
  queries: PartnerQuery[];
}

export function PartnerAskAmPanel({ tasks, queries }: PartnerAskAmPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const amQueries = useMemo(
    () =>
      queries
        .filter((row) => row.type === "job_candidate_query")
        .sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime(),
        ),
    [queries],
  );

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<AskAmFormValues>({
    resolver: zodResolver(formSchema) as Resolver<AskAmFormValues>,
    defaultValues: {
      jobId: "",
      message: "",
    },
  });

  function onSubmit(values: AskAmFormValues) {
    startTransition(async () => {
      const result = await submitFeedbackAction({
        type: "job_candidate_query",
        message: values.message,
        jobId: values.jobId?.trim() || undefined,
      });
      if (!result.success) {
        toast.error(
          result.errors?.length
            ? `${result.message}: ${result.errors.join("; ")}`
            : result.message,
        );
        return;
      }
      toast.success(
        "Query sent to your Account Manager — replies appear below",
      );
      reset({ jobId: "", message: "" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#0F172A]">
          Ask your Account Manager
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="ask-am-job">Related job (optional)</Label>
            <Select id="ask-am-job" disabled={pending} {...register("jobId")}>
              <option value="">General question</option>
              {tasks.map((task) => (
                <option key={task.jobId} value={task.jobId}>
                  {task.jobCode ? `${task.jobCode} · ` : ""}
                  {task.jobTitle}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ask-am-message">Message</Label>
            <Textarea
              id="ask-am-message"
              rows={5}
              placeholder="Ask about a job, candidate status, allocation, or submission."
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
              {pending ? "Sending…" : "Send to Account Manager"}
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#0F172A]">
          Your AM queries
        </h2>
        {amQueries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white px-4 py-8 text-center text-sm text-[#64748B]">
            No queries yet. Ask your Account Manager above.
          </p>
        ) : (
          <ul className="space-y-3">
            {amQueries.map((query) => (
              <li
                key={query.id}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {PARTNER_QUERY_TYPE_LABELS[query.type]}
                  </Badge>
                  <Badge
                    variant={
                      query.status === "answered" ? "success" : "warning"
                    }
                  >
                    {PARTNER_QUERY_STATUS_LABELS[query.status]}
                  </Badge>
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

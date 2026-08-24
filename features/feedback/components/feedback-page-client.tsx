"use client";

import { useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  submitFeedbackAction,
  type FeedbackFormValues,
} from "@/features/feedback/actions/feedback.actions";

const formSchema = z.object({
  type: z.enum(["feedback", "suggestion"]),
  message: z.string().trim().min(10, "Please enter a little more detail"),
});

interface FeedbackPageClientProps {
  role: "partner" | "account_manager";
}

export function FeedbackPageClient({ role }: FeedbackPageClientProps) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(formSchema) as Resolver<FeedbackFormValues>,
    defaultValues: {
      type: "feedback",
      message: "",
    },
  });

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
      toast.success("Feedback sent");
      reset({ type: "feedback", message: "" });
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
        title="Feedback & Suggestions"
        description="Share platform issues, ideas, or workflow suggestions. Your message is emailed to the internal team."
      />

      <div className="mx-auto max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Type</Label>
            <Select id="feedback-type" disabled={pending} {...register("type")}>
              <option value="feedback">Feedback</option>
              <option value="suggestion">Suggestion</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              rows={8}
              placeholder="Tell us what is working, what is broken, or what should be improved."
              disabled={pending}
              {...register("message")}
            />
            {errors.message ? (
              <p className="text-xs text-destructive">{errors.message.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </ContentContainer>
  );
}

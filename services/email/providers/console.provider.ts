import type {
  EmailService,
  EmailTemplateId,
  SendEmailInput,
  SendEmailResult,
} from "../types";
import { DEFAULT_SUBJECTS, renderBody } from "../templates";

/**
 * Development / staging provider — logs instead of sending.
 */
export class ConsoleEmailProvider implements EmailService {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const subject = input.subject ?? DEFAULT_SUBJECTS[input.template];
    const body = renderBody(input.template, input.data);
    const id = `console_${Date.now()}`;

    console.info("[email:console]", {
      id,
      to: input.to,
      template: input.template,
      subject,
      body,
    });

    return { id, provider: "console", queued: true };
  }
}

export type { EmailTemplateId };

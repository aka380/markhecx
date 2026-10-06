import { config } from "../config/env";
import { ApiError } from "../middleware/errors";
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}
/** Explicit test/development capture: no logging, file writes or public inbox endpoint. */
export class CaptureEmailProvider implements EmailProvider {
  readonly messages: EmailMessage[] = [];
  async send(message: EmailMessage) {
    if (config.NODE_ENV === "production")
      throw new Error("Capture email is forbidden in production.");
    this.messages.push(message);
    if (this.messages.length > 20) this.messages.shift();
  }
  clear() {
    this.messages.length = 0;
  }
}
export const testEmail = new CaptureEmailProvider();
export const emailProvider: EmailProvider = {
  async send(message) {
    if (config.NODE_ENV === "test") return testEmail.send(message);
    if (
      config.EMAIL_PROVIDER !== "resend" ||
      !config.RESEND_API_KEY ||
      !config.EMAIL_FROM
    )
      throw new ApiError(
        503,
        "email_unavailable",
        "Password recovery email is unavailable. Please try again later.",
      );
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok)
      throw new ApiError(
        503,
        "email_unavailable",
        "Password recovery email is unavailable. Please try again later.",
      );
  },
};
export function assertEmailAvailable() {
  if (
    config.NODE_ENV !== "test" &&
    (config.EMAIL_PROVIDER !== "resend" ||
      !config.RESEND_API_KEY ||
      !config.EMAIL_FROM)
  )
    throw new ApiError(
      503,
      "email_unavailable",
      "Password recovery email is unavailable. Please try again later.",
    );
}

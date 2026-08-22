import { env } from "../config/env.js";

const BREVO_SEND_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_REQUEST_TIMEOUT_MS = 10_000;

type EmailDeliveryFailureCategory =
  | "api_failure"
  | "malformed_response"
  | "network"
  | "quota"
  | "sender_verification"
  | "timeout";

export class EmailDeliveryError extends Error {
  constructor(
    public readonly category: EmailDeliveryFailureCategory = "api_failure",
    public readonly status: number | undefined = undefined,
  ) {
    super("Failed to send verification email");
    this.name = "EmailDeliveryError";
  }
}

function verificationEmailText(otp: string): string {
  return [
    "Your TheDays email verification code is:",
    "",
    otp,
    "",
    "This code expires in 10 minutes.",
    "If you did not create a TheDays account, you can ignore this email.",
  ].join("\n");
}

function logDeliveryFailure(category: EmailDeliveryFailureCategory, status?: number): void {
  console.error("Brevo email delivery failed", {
    category,
    ...(status === undefined ? {} : { status }),
  });
}

async function classifyBrevoFailure(response: Response): Promise<EmailDeliveryFailureCategory> {
  if (response.status === 402 || response.status === 429) {
    return "quota";
  }

  if (response.status === 400 || response.status === 403) {
    const responseBody = await response.text().catch(() => "");
    const normalizedBody = responseBody.toLowerCase();

    if (
      normalizedBody.includes("sender") &&
      (normalizedBody.includes("verif") || normalizedBody.includes("valid"))
    ) {
      return "sender_verification";
    }
  }

  return "api_failure";
}

function thrownFailureCategory(error: unknown): EmailDeliveryFailureCategory {
  if (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return "timeout";
  }

  return "network";
}

export async function sendVerificationOtp(email: string, otp: string): Promise<void> {
  let response: Response;

  try {
    response = await fetch(BREVO_SEND_EMAIL_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: env.EMAIL_FROM_ADDRESS,
          name: env.EMAIL_FROM_NAME,
        },
        to: [{ email }],
        subject: "Your TheDays verification code",
        textContent: verificationEmailText(otp),
      }),
      signal: AbortSignal.timeout(BREVO_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const category = thrownFailureCategory(error);
    logDeliveryFailure(category);
    throw new EmailDeliveryError(category);
  }

  if (!response.ok) {
    const category = await classifyBrevoFailure(response);
    logDeliveryFailure(category, response.status);
    throw new EmailDeliveryError(category, response.status);
  }

  let responseBody: unknown;

  try {
    responseBody = await response.json();
  } catch {
    logDeliveryFailure("malformed_response", response.status);
    throw new EmailDeliveryError("malformed_response", response.status);
  }

  if (
    typeof responseBody !== "object" ||
    responseBody === null ||
    !("messageId" in responseBody) ||
    typeof responseBody.messageId !== "string" ||
    responseBody.messageId.length === 0
  ) {
    logDeliveryFailure("malformed_response", response.status);
    throw new EmailDeliveryError("malformed_response", response.status);
  }

  console.info("Brevo accepted verification email", { messageId: responseBody.messageId });
}

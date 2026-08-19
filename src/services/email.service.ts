import nodemailer from "nodemailer";

import { env } from "../config/env.js";

export class EmailDeliveryError extends Error {
  constructor() {
    super("Failed to send verification email");
    this.name = "EmailDeliveryError";
  }
}

let transporter: nodemailer.Transporter | undefined;

function getTransporter(): nodemailer.Transporter {
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

export async function sendVerificationOtp(email: string, otp: string): Promise<void> {
  if (env.NODE_ENV === "test") {
    return;
  }

  try {
    await getTransporter().sendMail({
      from: `"TheDays" <${env.EMAIL_USER}>`,
      to: email,
      subject: "Your TheDays verification code",
      text: [
        "Your TheDays email verification code is:",
        "",
        otp,
        "",
        "This code expires in 10 minutes.",
        "If you did not create a TheDays account, you can ignore this email.",
      ].join("\n"),
    });
  } catch {
    throw new EmailDeliveryError();
  }
}

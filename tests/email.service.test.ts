import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmailDeliveryError, sendVerificationOtp } from "../src/services/email.service.js";

const fetchMock = vi.fn<typeof fetch>();
const timeoutSignal = new AbortController().signal;
const timeoutMock = vi.fn((_milliseconds: number): AbortSignal => timeoutSignal);

describe("Brevo verification email delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(AbortSignal, "timeout").mockImplementation(timeoutMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends the expected Brevo request and accepts a 201 with a message ID", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ messageId: "brevo-message-1" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    await sendVerificationOtp("recipient@example.com", "123456");

    expect(timeoutMock).toHaveBeenCalledWith(10_000);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(request).toMatchObject({
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": "test-brevo-api-key",
        "content-type": "application/json",
      },
      signal: timeoutSignal,
    });
    expect(JSON.parse(request!.body as string)).toEqual({
      sender: { email: "thedays-test@example.com", name: "TheDays Test" },
      to: [{ email: "recipient@example.com" }],
      subject: "Your TheDays verification code",
      textContent: [
        "Your TheDays email verification code is:",
        "",
        "123456",
        "",
        "This code expires in 10 minutes.",
        "If you did not create a TheDays account, you can ignore this email.",
      ].join("\n"),
    });
    expect(console.info).toHaveBeenCalledWith("Brevo accepted verification email", {
      messageId: "brevo-message-1",
    });
  });

  it("rejects a successful response without a message ID", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const error = await sendVerificationOtp("recipient@example.com", "123456").catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ category: "malformed_response", status: 201 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("maps a non-2xx Brevo response without retrying", async () => {
    fetchMock.mockResolvedValue(new Response("server error", { status: 500 }));

    const error = await sendVerificationOtp("recipient@example.com", "123456").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect(error).toMatchObject({ category: "api_failure", status: 500 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("classifies quota and sender-verification failures", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("quota exceeded", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Sender must be verified" }), { status: 400 }),
      );

    const quotaError = await sendVerificationOtp("recipient@example.com", "123456").catch(
      (caught: unknown) => caught,
    );
    const senderError = await sendVerificationOtp("recipient@example.com", "123456").catch(
      (caught: unknown) => caught,
    );

    expect(quotaError).toMatchObject({ category: "quota", status: 429 });
    expect(senderError).toMatchObject({ category: "sender_verification", status: 400 });
  });

  it("maps network failures without retrying", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const error = await sendVerificationOtp("recipient@example.com", "123456").catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ category: "network" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("maps request timeouts without retrying", async () => {
    fetchMock.mockRejectedValue(new DOMException("request timed out", "TimeoutError"));

    const error = await sendVerificationOtp("recipient@example.com", "123456").catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ category: "timeout" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("never logs the OTP, API key, or full recipient address on failure", async () => {
    fetchMock.mockResolvedValue(new Response("server error", { status: 500 }));

    await sendVerificationOtp("recipient@example.com", "123456").catch(() => undefined);

    const loggedValues = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(loggedValues).not.toContain("123456");
    expect(loggedValues).not.toContain("test-brevo-api-key");
    expect(loggedValues).not.toContain("recipient@example.com");
  });
});

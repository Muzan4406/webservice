import { createHmac, timingSafeEqual } from "node:crypto";

export const DRIMPAY_LIVE_API_BASE = "https://drimpay.com/api/v2";

export type DrimPayOperator = {
  code: string;
  label: string;
  requiresOtp?: boolean;
};

export type DrimPayCountry = {
  code: string;
  name: string;
  currency: "XOF" | "XAF";
  callingCode: string;
  nationalNumberLength: number;
  operators: DrimPayOperator[];
};

// These are the production corridors and operator slugs published by DrimPay.
// Unsupported or undocumented operator codes are deliberately not exposed.
export const DRIMPAY_COUNTRIES: DrimPayCountry[] = [
  { code: "TG", name: "Togo", currency: "XOF", callingCode: "228", nationalNumberLength: 8, operators: [
    { code: "tmoney", label: "T-Money" },
    { code: "moov", label: "Moov Money" },
  ] },
  { code: "BJ", name: "Bénin", currency: "XOF", callingCode: "229", nationalNumberLength: 10, operators: [
    { code: "moov", label: "Moov Money" },
    { code: "mtn", label: "MTN Mobile Money" },
  ] },
  { code: "CM", name: "Cameroun", currency: "XAF", callingCode: "237", nationalNumberLength: 9, operators: [
    { code: "mtn", label: "MTN MoMo" },
    { code: "orange", label: "Orange Money" },
  ] },
  { code: "BF", name: "Burkina Faso", currency: "XOF", callingCode: "226", nationalNumberLength: 8, operators: [
    { code: "wave", label: "Wave" },
    { code: "moov", label: "Moov Money" },
    { code: "orange", label: "Orange Money", requiresOtp: true },
  ] },
  { code: "ML", name: "Mali", currency: "XOF", callingCode: "223", nationalNumberLength: 8, operators: [
    { code: "moov", label: "Moov Money" },
    { code: "orange", label: "Orange Money", requiresOtp: true },
  ] },
  { code: "SN", name: "Sénégal", currency: "XOF", callingCode: "221", nationalNumberLength: 9, operators: [
    { code: "orange", label: "Orange Money", requiresOtp: true },
    { code: "wave", label: "Wave" },
  ] },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF", callingCode: "225", nationalNumberLength: 10, operators: [
    { code: "moov", label: "Moov Money" },
    { code: "mtn", label: "MTN Mobile Money" },
    { code: "wave", label: "Wave" },
    { code: "orange", label: "Orange Money", requiresOtp: true },
  ] },
  { code: "CG", name: "Congo-Brazzaville", currency: "XAF", callingCode: "242", nationalNumberLength: 9, operators: [
    { code: "mtn", label: "MTN Mobile Money" },
  ] },
];

export class DrimPayError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly outcomeUnknown = false,
  ) {
    super(message);
    this.name = "DrimPayError";
  }
}

export function getDrimPayApiKey(): string {
  const apiKey = process.env.DRIMPAY_API_KEY?.trim();
  if (!apiKey) {
    throw new DrimPayError("Le service de paiement n'est pas configuré.", 503);
  }
  if (!apiKey.startsWith("dp_live_sk_")) {
    throw new DrimPayError("La clé DrimPay configurée n'est pas une clé live valide.", 503);
  }
  return apiKey;
}

export function getDrimPayWebhookSecret(): string {
  const secret = process.env.DRIMPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new DrimPayError("Le webhook de paiement n'est pas configuré.", 503);
  }
  return secret;
}

export function getDrimPayWebhookUrl(): string {
  const configuredBase = process.env.WEBHOOK_BASE_URL?.trim();
  if (!configuredBase) {
    throw new DrimPayError("L'adresse publique du webhook n'est pas configurée.", 503);
  }

  try {
    const base = new URL(configuredBase);
    if (base.protocol !== "https:") throw new Error("HTTPS required");
    return new URL("/webhooks/drimpay", base.origin).toString();
  } catch {
    throw new DrimPayError("WEBHOOK_BASE_URL doit être une adresse HTTPS valide.", 503);
  }
}

export async function drimPayRequest<T>(
  path: string,
  apiKey: string,
  init: { method?: "GET" | "POST"; body?: Record<string, unknown> } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${DRIMPAY_LIVE_API_BASE}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new DrimPayError(
      "La confirmation DrimPay tarde. Vérifiez le statut avant de réessayer.",
      502,
      true,
    );
  }

  const payload = await response.json().catch(() => ({})) as {
    message?: string;
    error?: string;
  };
  if (!response.ok) {
    const message = response.status >= 500
      ? "DrimPay rencontre un problème temporaire."
      : payload.message ?? payload.error ?? "La demande de paiement a été refusée.";
    throw new DrimPayError(message, response.status >= 500 ? 502 : response.status, response.status >= 500);
  }
  return payload as T;
}

export function verifyDrimPayWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  timestampHeader: string | undefined,
  secret: string,
  nowMs = Date.now(),
): boolean {
  if (!signatureHeader || !timestampHeader) return false;
  const match = /^t=(\d+),v1=([a-f0-9]{64})$/i.exec(signatureHeader.trim());
  if (!match || match[1] !== timestampHeader.trim()) return false;

  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(nowMs / 1000) - timestamp) > 300) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${match[1]}.`)
    .update(rawBody)
    .digest();
  const received = Buffer.from(match[2], "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function findDrimPayOperator(countryCode: string, operatorCode: string): DrimPayOperator | undefined {
  return DRIMPAY_COUNTRIES
    .find((country) => country.code === countryCode.toUpperCase())
    ?.operators.find((operator) => operator.code === operatorCode);
}

export function normalizeDrimPayPhone(value: unknown, country: DrimPayCountry): string | null {
  if (typeof value !== "string") return null;
  const nationalNumber = value.trim().replace(/[ .()-]/g, "");
  if (!/^\d+$/.test(nationalNumber) || nationalNumber.length !== country.nationalNumberLength) {
    return null;
  }
  return `+${country.callingCode}${nationalNumber}`;
}

export function normalizeDrimPayStatus(status: string): "pending" | "success" | "failed" | "reversed" {
  if (status === "success") return "success";
  if (status === "reversed") return "reversed";
  if (["failed", "expired", "cancelled"].includes(status)) return "failed";
  return "pending";
}

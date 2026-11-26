export const ASHTECHPAY_API_BASE = "https://ashtechpay.top";

export type AshtechPayOperator = {
  code: string;
  label: string;
};

export type AshtechPayCountry = {
  code: string;
  name: string;
  currency: string;
  callingCode: string;
  nationalNumberLength: number;
  operators: AshtechPayOperator[];
};

export type AshtechPayTransaction = {
  transaction_id?: string;
  reference?: string;
  status?: string;
  amount?: number;
  total_amount?: number;
  currency?: string;
  operator?: string;
  country_code?: string;
  flow?: string;
  wave_url?: string;
  ussd_code?: string | null;
  error?: string;
  message?: string;
};

type PhoneMetadata = {
  callingCode: string;
  nationalNumberLength: number;
};

const PHONE_METADATA: Record<string, PhoneMetadata> = {
  BJ: { callingCode: "229", nationalNumberLength: 8 },
  BF: { callingCode: "226", nationalNumberLength: 8 },
  CM: { callingCode: "237", nationalNumberLength: 9 },
  CI: { callingCode: "225", nationalNumberLength: 10 },
  GA: { callingCode: "241", nationalNumberLength: 8 },
  ML: { callingCode: "223", nationalNumberLength: 8 },
  NE: { callingCode: "227", nationalNumberLength: 8 },
  CD: { callingCode: "243", nationalNumberLength: 9 },
  SN: { callingCode: "221", nationalNumberLength: 9 },
  TG: { callingCode: "228", nationalNumberLength: 8 },
};

export class AshtechPayError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly outcomeUnknown = false,
  ) {
    super(message);
    this.name = "AshtechPayError";
  }
}

export function getAshtechPayApiKey(): string {
  const apiKey = process.env.ASHTECHPAY_API_KEY?.trim();
  if (!apiKey) {
    throw new AshtechPayError("Le service de paiement n'est pas configuré.", 503);
  }
  return apiKey;
}

export function getAshtechPayWebhookUrl(): string | undefined {
  const configuredBase = process.env.WEBHOOK_BASE_URL?.trim();
  if (!configuredBase) return undefined;

  try {
    const base = new URL(configuredBase);
    if (base.protocol !== "https:") throw new Error("HTTPS required");
    return new URL("/webhooks/ashtechpay", base.origin).toString();
  } catch {
    throw new AshtechPayError("WEBHOOK_BASE_URL doit être une adresse HTTPS valide.", 503);
  }
}

export function normalizeAshtechPhone(value: unknown, country: AshtechPayCountry): string | null {
  if (typeof value !== "string") return null;
  const nationalNumber = value.trim().replace(/[ .()-]/g, "");
  if (
    !/^\d+$/.test(nationalNumber) ||
    nationalNumber.length !== country.nationalNumberLength
  ) {
    return null;
  }
  return nationalNumber;
}

export function normalizeAshtechCountries(payload: unknown): AshtechPayCountry[] {
  if (!Array.isArray(payload)) {
    throw new AshtechPayError("Le catalogue de pays Ashtechpay est invalide.", 502);
  }

  const countries: AshtechPayCountry[] = [];
  for (const value of payload) {
    if (!value || typeof value !== "object") continue;
    const country = value as Record<string, unknown>;
    const code = typeof country.code === "string" ? country.code.toUpperCase() : "";
    const metadata = PHONE_METADATA[code];
    const operators = Array.isArray(country.operators)
      ? country.operators.filter((operator): operator is string =>
        typeof operator === "string" && operator.trim().length > 0)
      : [];
    if (
      !metadata ||
      typeof country.name !== "string" ||
      typeof country.currency !== "string" ||
      operators.length === 0
    ) continue;

    countries.push({
      code,
      name: country.name,
      currency: country.currency,
      ...metadata,
      operators: [...new Set(operators)].map((operator) => ({ code: operator, label: operator })),
    });
  }

  return countries;
}

export function normalizeAshtechStatus(status: string): "pending" | "success" | "failed" {
  if (status === "success" || status === "completed") return "success";
  if (status === "failed") return "failed";
  return "pending";
}

export async function ashtechPayRequest<T>(
  path: string,
  apiKey = getAshtechPayApiKey(),
  init: { method?: "GET" | "POST"; body?: Record<string, unknown> } = {},
): Promise<{ status: number; data: T }> {
  let response: Response;
  try {
    response = await fetch(`${ASHTECHPAY_API_BASE}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AshtechPayError(
      "Le service de paiement ne répond pas. Vérifiez son statut avant de recommencer.",
      502,
      init.method === "POST",
    );
  }

  const data = await response.json().catch(() => ({})) as T & {
    error?: string;
    message?: string;
  };

  if (response.ok || (response.status === 400 && data.error === "otp_required")) {
    return { status: response.status, data };
  }

  if (response.status === 401 || response.status === 403) {
    throw new AshtechPayError("La clé Ashtechpay est invalide ou n'a pas accès à cette API.", 503);
  }

  const message = response.status >= 500
    ? "Ashtechpay rencontre un problème temporaire."
    : data.message ?? data.error ?? "La demande de paiement a été refusée.";
  throw new AshtechPayError(
    message,
    response.status === 401 || response.status === 403 ? 503 : response.status,
    response.status >= 500,
  );
}

export function getAshtechPhoneMetadata(countryCode: string): PhoneMetadata | undefined {
  return PHONE_METADATA[countryCode.toUpperCase()];
}

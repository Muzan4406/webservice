import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function generateUserId(id: number): string {
  return `MS-${String(id).padStart(5, "0")}`;
}

export function generateReferralCode(username: string): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${username.slice(0, 4).toUpperCase()}${rand}`;
}

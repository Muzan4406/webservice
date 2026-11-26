export type DatabaseIssueCode =
  | "database_not_configured"
  | "database_unavailable"
  | "database_schema_outdated";

export type DatabaseIssue = {
  code: DatabaseIssueCode;
  message: string;
};

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "28P01",
  "3D000",
]);

export function getDatabaseIssue(
  error: unknown,
  databaseConfigured = Boolean(process.env.PG_URL),
): DatabaseIssue | null {
  if (!databaseConfigured) {
    return {
      code: "database_not_configured",
      message: "La base de données du site n'est pas configurée.",
    };
  }

  const candidate = error && typeof error === "object"
    ? error as { code?: unknown }
    : undefined;
  const code = typeof candidate?.code === "string" ? candidate.code : "";

  if (code === "42703" || code === "42P01") {
    return {
      code: "database_schema_outdated",
      message: "La base de données doit être mise à jour avant d'utiliser cette version du site.",
    };
  }

  if (code.startsWith("08") || CONNECTION_ERROR_CODES.has(code)) {
    return {
      code: "database_unavailable",
      message: "La base de données du site est inaccessible.",
    };
  }

  return null;
}

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

  let current = error;
  let code = "";
  const visited = new Set<object>();
  for (let depth = 0; depth < 8 && current && typeof current === "object"; depth += 1) {
    if (visited.has(current)) break;
    visited.add(current);
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "string") {
      code = candidate.code;
      break;
    }
    current = candidate.cause;
  }

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

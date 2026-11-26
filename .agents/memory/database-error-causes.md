---
name: Nested PostgreSQL errors
description: Correctly classify PostgreSQL failures wrapped by Drizzle query errors.
---

When classifying database errors, inspect a bounded `cause` chain for PostgreSQL SQLSTATE codes. Drizzle can wrap the original driver error, so reading only the top-level `code` can turn a missing table or connection error into a generic database failure.

**Why:** A production readiness check returned only `database_error` even though the underlying query failure could be a schema mismatch or a connection problem.

**How to apply:** Traverse nested causes safely, avoid logging SQL parameters or credentials, and return a concise category plus the specific readiness step that failed.

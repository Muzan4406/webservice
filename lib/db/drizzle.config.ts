import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.PG_URL) {
  throw new Error("PG_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.PG_URL,
  },
});

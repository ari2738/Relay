import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Only `db:push` / `db:studio` actually connect — `db:generate` just diffs
  // the schema against migration history, so a placeholder is fine here.
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
  strict: true,
})

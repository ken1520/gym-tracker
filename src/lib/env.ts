import { z } from "zod";

// Validated lazily so `next build` works without a database present
const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().min(1).default("gym_tracker"),
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(): Env {
  const parsed = envSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid environment configuration (${details}). Copy .env.example to .env.local and set MONGODB_URI`,
    );
  }

  return parsed.data;
}

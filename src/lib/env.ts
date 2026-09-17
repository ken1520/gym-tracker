import { z } from "zod";

// Both schemes are accepted: mongodb:// for the local Docker container,
// mongodb+srv:// for Atlas. Anything else is a typo, and catching it here
// beats an opaque driver error at request time.
const URI_SCHEMES = ["mongodb://", "mongodb+srv://"] as const;

// Validated lazily so `next build` works without a database present
const envSchema = z.object({
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (uri) => URI_SCHEMES.some((scheme) => uri.startsWith(scheme)),
      "MONGODB_URI must start with mongodb:// or mongodb+srv://",
    ),
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

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "host.docker.internal", "mongo"];

// Atlas is always reached over the public internet, so a mongodb+srv:// URI is
// never local. Used to keep the destructive seed away from a remote database.
//
// Parsed rather than pattern-matched: "mongodb://localhost:pass@db.example.com"
// puts a local-looking name in the credentials, and a regex reads it as the host.
export function isLocalMongoUri(uri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    // Comma-separated replica-set hosts and odd password characters do not
    // parse; calling those remote is the safe direction for the seed guard
    return false;
  }

  if (parsed.protocol !== "mongodb:") return false;

  return LOCAL_HOSTS.includes(parsed.hostname.toLowerCase());
}

// Read separately from MONGODB_URI, and just as lazily. Session signing and the
// database fail for unrelated reasons, and folding them into one schema turns a
// missing secret into an "Invalid environment configuration" about Mongo.
//
// Deliberately no built-in fallback: a default secret committed to the repo
// would let anyone holding a copy of it mint a valid admin cookie
const MIN_SECRET_LENGTH = 32;

export function readSessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? "";

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters. ` +
        "Generate one with: openssl rand -base64 32",
    );
  }

  return secret;
}

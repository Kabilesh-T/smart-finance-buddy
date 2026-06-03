// Plaid access tokens look like `access-sandbox-...` / `access-development-...` / `access-production-...`
const TOKEN_PATTERN = /access-(sandbox|development|production)-[a-f0-9-]+/gi;

function redact(value: unknown): unknown {
  if (typeof value === "string") return value.replace(TOKEN_PATTERN, "access-[REDACTED]");
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v);
    return out;
  }
  return value;
}

export const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...(meta ? (redact(meta) as object) : {}) })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...(meta ? (redact(meta) as object) : {}) })),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "error", msg, ...(meta ? (redact(meta) as object) : {}) })),
};

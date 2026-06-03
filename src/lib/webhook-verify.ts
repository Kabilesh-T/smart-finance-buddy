import { createHash } from "node:crypto";
import { importJWK, jwtVerify, decodeProtectedHeader, type JWK } from "jose";
import { plaid } from "./plaid";

type KeyCacheEntry = { jwk: JWK; expiresAt: number };
const keyCache = new Map<string, KeyCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function getKey(kid: string): Promise<JWK> {
  const cached = keyCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) return cached.jwk;

  const { data } = await plaid.webhookVerificationKeyGet({ key_id: kid });
  const jwk = data.key as unknown as JWK;
  keyCache.set(kid, { jwk, expiresAt: Date.now() + CACHE_TTL_MS });
  return jwk;
}

export async function verifyPlaidWebhook(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;

  try {
    const { kid } = decodeProtectedHeader(signatureHeader);
    if (!kid) return false;

    const jwk = await getKey(kid);
    const key = await importJWK(jwk, "ES256");
    const { payload } = await jwtVerify(signatureHeader, key, { algorithms: ["ES256"] });

    const expectedHash = createHash("sha256").update(rawBody).digest("hex");
    const claimedHash = (payload as { request_body_sha256?: string }).request_body_sha256;
    if (claimedHash !== expectedHash) return false;

    const iat = (payload as { iat?: number }).iat;
    if (!iat || Date.now() / 1000 - iat > 5 * 60) return false;

    return true;
  } catch {
    return false;
  }
}

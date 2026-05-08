import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALGO = "aes-256-gcm";

function getMasterKey(): Buffer {
  const raw = process.env.PINHUB_KEY_ENC_SECRET;
  if (!raw) {
    throw new Error(
      "PINHUB_KEY_ENC_SECRET is not configured (32 random bytes, base64-encoded)."
    );
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, "base64");
  } catch {
    throw new Error("PINHUB_KEY_ENC_SECRET must be base64-encoded.");
  }
  if (buf.length !== 32) {
    throw new Error(
      `PINHUB_KEY_ENC_SECRET must decode to exactly 32 bytes (got ${buf.length}).`
    );
  }
  return buf;
}

export interface EncryptedPayload {
  encrypted_key: string;
  iv: string;
  auth_tag: string;
}

export function encryptApiKey(plaintext: string): EncryptedPayload {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted_key: enc.toString("base64"),
    iv: iv.toString("base64"),
    auth_tag: authTag.toString("base64"),
  };
}

export function decryptApiKey(payload: EncryptedPayload): string {
  const key = getMasterKey();
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.auth_tag, "base64");
  const enc = Buffer.from(payload.encrypted_key, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/** Last 4 chars of the key, lightly masked, for UI display. Never the full key. */
export function keyHint(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

export function isCryptoConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

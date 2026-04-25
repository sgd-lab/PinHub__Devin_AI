import CryptoJS from "crypto-js";

const STORAGE_PREFIX = "pinhub_encrypted_";

export function encryptValue(value: string, passphrase: string): string {
  return CryptoJS.AES.encrypt(value, passphrase).toString();
}

export function decryptValue(encrypted: string, passphrase: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, passphrase);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function storeApiKey(
  provider: string,
  key: string,
  passphrase: string
): void {
  if (typeof window === "undefined") return;
  const encrypted = encryptValue(key, passphrase);
  localStorage.setItem(`${STORAGE_PREFIX}${provider}`, encrypted);
}

export function retrieveApiKey(
  provider: string,
  passphrase: string
): string | null {
  if (typeof window === "undefined") return null;
  const encrypted = localStorage.getItem(`${STORAGE_PREFIX}${provider}`);
  if (!encrypted) return null;
  try {
    return decryptValue(encrypted, passphrase);
  } catch {
    return null;
  }
}

export function removeApiKey(provider: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_PREFIX}${provider}`);
}

export function hasApiKey(provider: string): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(`${STORAGE_PREFIX}${provider}`);
}

const PASSPHRASE_KEY = "pinhub_passphrase_hash";

export function setPassphrase(passphrase: string): void {
  if (typeof window === "undefined") return;
  const hash = CryptoJS.SHA256(passphrase).toString();
  localStorage.setItem(PASSPHRASE_KEY, hash);
}

export function hasPassphrase(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(PASSPHRASE_KEY);
}

export function clearAllKeys(): void {
  if (typeof window === "undefined") return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

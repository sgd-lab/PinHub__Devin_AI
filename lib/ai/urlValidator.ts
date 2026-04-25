const ALLOWED_HOSTS = [
  "integrate.api.nvidia.com",
  "api.nvidia.com",
  "openrouter.ai",
  "api.groq.com",
  "api.anthropic.com",
  "api.openai.com",
  "generativelanguage.googleapis.com",
  "api.together.xyz",
  "api.fireworks.ai",
  "api.mistral.ai",
  "api.perplexity.ai",
  "api.deepseek.com",
];

export function validateBaseUrl(baseUrl: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Only HTTPS URLs are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block private/internal IPs
  if (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.") ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    return { valid: false, error: "Private/internal URLs are not allowed" };
  }

  if (!ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith("." + h))) {
    return { valid: false, error: `Host '${hostname}' is not in the allowlist. Allowed: ${ALLOWED_HOSTS.join(", ")}` };
  }

  return { valid: true };
}

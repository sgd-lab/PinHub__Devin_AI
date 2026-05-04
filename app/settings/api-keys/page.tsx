"use client";

import { useState } from "react";
import { Key, Check, Trash2, Star, Globe, ChevronDown, AlertCircle, Loader2, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore, PROVIDER_DEFAULTS, PROVIDER_LABELS, PROVIDER_KEY_PATTERNS } from "@/stores/settingsStore";
import { storeApiKey, removeApiKey, hasApiKey, retrieveApiKey } from "@/lib/encryption/keyStore";
import { testProviderConnection, validateKeyFormat, maskApiKey } from "@/lib/ai/providerAdapter";
import { toast } from "sonner";

const FREE_PROVIDERS = new Set(["gemini", "openrouter"]);

const FREE_TIER_INFO: Record<string, string> = {
  gemini: "Free tier: 60 requests/min, 1500/day. No credit card required.",
  openrouter: "Free models available (e.g., meta-llama/llama-3.1-8b-instruct:free).",
};

/** Order of providers shown in the UI: free first, then popular, then others */
const PROVIDER_ORDER = [
  "gemini", "openrouter",
  "nvidia", "anthropic", "xai", "groq",
  "deepseek", "mistral", "cohere", "qwen",
  "ollama",
];

const PROVIDER_KEY_LINKS: Record<string, string> = {
  gemini: "https://aistudio.google.com/apikey",
  openrouter: "https://openrouter.ai/keys",
  nvidia: "https://build.nvidia.com/",
  groq: "https://console.groq.com/keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  xai: "https://console.x.ai/",
  deepseek: "https://platform.deepseek.com/api_keys",
  mistral: "https://console.mistral.ai/api-keys/",
  cohere: "https://dashboard.cohere.com/api-keys",
  qwen: "https://dashscope.console.aliyun.com/apiKey",
  ollama: "",
};

function filterChatModels(models: string[], provider: string): string[] {
  const lower = (s: string) => s.toLowerCase();

  if (provider === "gemini") {
    return models.filter((m) => {
      const l = lower(m);
      return (l.includes("gemini") && !l.includes("embedding") && !l.includes("imagen") && !l.includes("aqa") && !l.includes("bisector"));
    });
  }

  if (provider === "openrouter") {
    return models.filter((m) => {
      const l = lower(m);
      return !l.includes("embedding") && !l.includes("moderation") && !l.includes("rerank");
    });
  }

  if (provider === "groq") {
    return models.filter((m) => {
      const l = lower(m);
      return !l.includes("whisper") && !l.includes("tts") && !l.includes("embedding");
    });
  }

  if (provider === "nvidia") {
    return models.filter((m) => {
      const l = lower(m);
      return !l.includes("embedding") && !l.includes("rerank") && !l.includes("nemo-retriever");
    });
  }

  return models;
}

export default function ApiKeysPage() {
  const { providers, defaultProvider, setProvider, setProviderModels, setSelectedModel, setDefaultProvider } = useSettingsStore();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testError, setTestError] = useState<Record<string, string>>({});
  const [showModels, setShowModels] = useState<Record<string, boolean>>({});
  const passphrase = "pinhub-default-key";

  const sortedProviders = PROVIDER_ORDER
    .filter((name) => name in PROVIDER_DEFAULTS)
    .map((name) => [name, PROVIDER_DEFAULTS[name]] as const);

  const handleTest = async (name: string) => {
    const key = keys[name]?.trim();
    if (!key) { toast.error("Enter an API key first"); return; }

    // Step 1: Format validation (before any network call)
    const formatCheck = validateKeyFormat(name, key);
    if (!formatCheck.valid) {
      setTestError((prev) => ({ ...prev, [name]: formatCheck.error || "Invalid format" }));
      toast.error(formatCheck.error || "Invalid key format");
      return;
    }

    setTesting(name);
    setTestError((prev) => ({ ...prev, [name]: "" }));

    const p = PROVIDER_DEFAULTS[name];
    if (!p?.base_url) { setTesting(null); return; }

    // Step 2: Live validation — test against the provider's API
    const result = await testProviderConnection(name, key, p.base_url);

    if (result.success) {
      // Only store the key AFTER successful validation
      storeApiKey(name, key, passphrase);
      const chatModels = filterChatModels(result.models || [], name);
      setProvider(name, { api_key_ref: name, enabled: true, validated: true });
      if (chatModels.length > 0) {
        setProviderModels(name, chatModels);
        const currentSelected = providers[name]?.selected_model;
        if (!currentSelected || !chatModels.includes(currentSelected)) {
          const defaultModel = p.default_model || "";
          const bestDefault = chatModels.includes(defaultModel) ? defaultModel : chatModels[0];
          setSelectedModel(name, bestDefault);
        }
      }
      // Clear the raw key from input, show masked version
      setKeys((prev) => ({ ...prev, [name]: "" }));
      const label = PROVIDER_LABELS[name] || name;
      toast.success(`${label} verified — ${chatModels.length} model${chatModels.length !== 1 ? "s" : ""} available`);
    } else {
      // DO NOT save the key on failure
      setTestError((prev) => ({ ...prev, [name]: result.error || "Connection failed" }));
      const label = PROVIDER_LABELS[name] || name;
      toast.error(`${label} key validation failed`);
    }
    setTesting(null);
  };

  const handleRemove = (name: string) => {
    removeApiKey(name);
    setProvider(name, { api_key_ref: "", enabled: false, validated: false });
    setProviderModels(name, []);
    setKeys((prev) => ({ ...prev, [name]: "" }));
    setTestError((prev) => ({ ...prev, [name]: "" }));
    const label = PROVIDER_LABELS[name] || name;
    toast.success(`${label} key removed`);
  };

  /** Get masked version of stored key */
  const getMaskedKey = (name: string): string | null => {
    if (!hasApiKey(name)) return null;
    const raw = retrieveApiKey(name, passphrase);
    if (!raw) return null;
    return maskApiKey(raw);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif text-deep-espresso mb-1">API Keys & Models</h3>
        <p className="text-xs text-charcoal">
          Keys are AES-256 encrypted and stored in your browser only. Each key is validated with a live test before saving.
        </p>
      </div>

      {/* Mandatory validation callout */}
      <div className="bg-dusty-rose/10 border border-dusty-rose/30 rounded-lg p-3 flex items-start gap-2">
        <Shield size={14} className="text-dusty-rose mt-0.5 shrink-0" />
        <div className="text-xs text-deep-espresso">
          <span className="font-medium">Mandatory Live Validation:</span> Every API key is tested against the provider&apos;s API before saving.
          Wrong keys or keys for a different provider are always rejected. The app discovers all available models for your key.
        </div>
      </div>

      {/* Free providers callout */}
      <div className="bg-soft-sage/10 border border-soft-sage/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star size={14} className="text-soft-sage" />
          <span className="text-sm font-medium text-deep-espresso">Recommended — Free Providers</span>
        </div>
        <p className="text-xs text-charcoal">
          Start with <strong>Gemini</strong> or <strong>OpenRouter</strong> — both offer free tiers with no credit card required.
        </p>
      </div>

      <div className="space-y-4">
        {sortedProviders.map(([name, config]) => {
          const isConnected = hasApiKey(name);
          const provider = providers[name];
          const isFree = FREE_PROVIDERS.has(name);
          const freeInfo = FREE_TIER_INFO[name];
          const availableModels = provider?.available_models || [];
          const selectedModel = provider?.selected_model || config.default_model || "";
          const isValidated = provider?.validated;
          const error = testError[name];
          const keyLink = PROVIDER_KEY_LINKS[name];
          const label = PROVIDER_LABELS[name] || name;
          const maskedKey = getMaskedKey(name);
          const keyHint = PROVIDER_KEY_PATTERNS[name]?.hint || "";

          return (
            <div key={name} className={`bg-white/60 border rounded-lg p-4 ${isFree ? "border-soft-sage/40 ring-1 ring-soft-sage/20" : "border-warm-taupe/30"}`}>
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-charcoal" />
                  <span className="text-sm font-medium text-deep-espresso">{label}</span>
                  {isFree && (
                    <span className="text-[10px] bg-soft-sage/20 text-soft-sage px-1.5 py-0.5 rounded-full font-medium">
                      FREE TIER
                    </span>
                  )}
                  {isConnected && isValidated && (
                    <span className="flex items-center gap-1 text-xs text-soft-sage">
                      <Check size={10} />Verified
                    </span>
                  )}
                  {isConnected && !isValidated && (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <AlertCircle size={10} />Unverified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={provider?.enabled || false} onCheckedChange={(checked) => setProvider(name, { enabled: checked })} />
                  {name === defaultProvider && <span className="text-[10px] bg-dusty-rose/20 text-dusty-rose px-2 py-0.5 rounded-full">Default</span>}
                </div>
              </div>

              {/* Free tier info */}
              {freeInfo && (
                <p className="text-xs text-charcoal/70 mb-2 bg-warm-ivory/50 px-3 py-1.5 rounded">{freeInfo}</p>
              )}

              {/* Masked key display */}
              {isConnected && maskedKey && (
                <div className="flex items-center gap-2 text-xs text-charcoal/70 mb-2 bg-warm-ivory/50 px-3 py-1.5 rounded">
                  <Key size={10} className="shrink-0" />
                  <span className="font-mono">{maskedKey}</span>
                  <span className="text-soft-sage">(stored &amp; verified)</span>
                </div>
              )}

              {/* API Key input */}
              <div className="flex gap-2 mb-2">
                <Input
                  type="password"
                  value={keys[name] || ""}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [name]: e.target.value }))}
                  placeholder={isConnected ? `Replace ${label} key...` : `Enter ${label} API key...`}
                  className="bg-warm-ivory border-warm-taupe/40 rounded-lg text-sm"
                />
                <Button
                  onClick={() => handleTest(name)}
                  disabled={testing === name || !keys[name]?.trim()}
                  size="sm"
                  className="bg-deep-espresso text-warm-ivory rounded-lg whitespace-nowrap"
                >
                  {testing === name ? (
                    <><Loader2 size={12} className="animate-spin mr-1" />Testing...</>
                  ) : (
                    "Test & Save"
                  )}
                </Button>
                {isConnected && (
                  <Button onClick={() => handleRemove(name)} size="sm" variant="outline" className="border-red-300 text-red-500 rounded-lg">
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>

              {/* Key format hint */}
              {keyHint && !isConnected && !error && (
                <p className="text-[10px] text-charcoal/50 mb-1">{keyHint}</p>
              )}

              {/* Get key link */}
              {keyLink && !isConnected && (
                <a href={keyLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-dusty-rose hover:underline mb-2">
                  <ExternalLink size={9} />Get a {label} API key
                </a>
              )}

              {/* Error display */}
              {error && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded mb-2">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Validation failed: </span>
                    {error}
                    {keyLink && (
                      <a href={keyLink} target="_blank" rel="noopener noreferrer" className="text-dusty-rose underline ml-1">
                        Get a valid key →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Model selector */}
              <div className="flex items-center justify-between text-xs text-charcoal">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {availableModels.length > 0 ? (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-charcoal/70 shrink-0">Active Model:</span>
                        <button
                          onClick={() => setShowModels((prev) => ({ ...prev, [name]: !prev[name] }))}
                          className="flex items-center gap-1 text-deep-espresso font-medium hover:text-dusty-rose transition-colors truncate"
                        >
                          <span className="truncate">{selectedModel}</span>
                          <ChevronDown size={10} className={`shrink-0 transition-transform ${showModels[name] ? "rotate-180" : ""}`} />
                        </button>
                        <span className="text-charcoal/50 shrink-0">({availableModels.length} available)</span>
                      </div>

                      {showModels[name] && (
                        <div className="mt-1 max-h-48 overflow-y-auto bg-warm-ivory border border-warm-taupe/30 rounded-lg divide-y divide-warm-taupe/10">
                          {availableModels.map((model) => (
                            <button
                              key={model}
                              onClick={() => {
                                setSelectedModel(name, model);
                                setShowModels((prev) => ({ ...prev, [name]: false }));
                                toast.success(`${label}: switched to ${model}`);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-dusty-rose/10 transition-colors ${
                                model === selectedModel ? "bg-dusty-rose/15 text-deep-espresso font-medium" : "text-charcoal"
                              }`}
                            >
                              {model}
                              {model === config.default_model && (
                                <span className="ml-1 text-charcoal/40">(default)</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-charcoal/50">
                      Default Model: {config.default_model}
                      {!isConnected && " — validate key to discover all models"}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  {name !== defaultProvider && isConnected && isValidated && (
                    <button onClick={() => setDefaultProvider(name)} className="text-dusty-rose hover:underline">
                      Set as Default
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Serper Web Search API Key */}
      <SerperKeySection />
    </div>
  );
}

/** Separate component for Serper key to keep main component clean */
function SerperKeySection() {
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);
  const passphrase = "pinhub-default-key";

  const handleSave = async () => {
    if (!key.trim()) { toast.error("Enter an API key first"); return; }
    setTesting(true);
    try {
      // Test serper key with a simple search
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "test", serperApiKey: key.trim() }),
      });
      if (response.ok) {
        storeApiKey("serper", key.trim(), passphrase);
        setKey("");
        toast.success("Serper key verified & saved — Research Enhancer now uses real web search!");
      } else {
        toast.error("Invalid Serper API key. Check your key at serper.dev");
      }
    } catch {
      // Fallback: save without test if search endpoint has issues
      storeApiKey("serper", key.trim(), passphrase);
      setKey("");
      toast.success("Serper key saved");
    }
    setTesting(false);
  };

  return (
    <div className="border-t border-warm-taupe/30 pt-6">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={16} className="text-charcoal" />
        <h3 className="text-lg font-serif text-deep-espresso">Web Search (Research Enhancer)</h3>
      </div>
      <p className="text-xs text-charcoal mb-4">
        Power the Research Enhancer with real Google search data. Without this key, research uses AI knowledge only.
      </p>
      <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Key size={14} className="text-charcoal" />
            <span className="text-sm font-medium text-deep-espresso">Serper.dev</span>
            <span className="text-[10px] bg-soft-sage/20 text-soft-sage px-1.5 py-0.5 rounded-full font-medium">
              FREE TIER
            </span>
            {hasApiKey("serper") && <span className="flex items-center gap-1 text-xs text-soft-sage"><Check size={10} />Connected</span>}
          </div>
        </div>
        <p className="text-xs text-charcoal/70 mb-2 bg-warm-ivory/50 px-3 py-1.5 rounded">
          2,500 free searches/month. No credit card required. Get a key at{" "}
          <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" className="text-dusty-rose underline">serper.dev</a>
        </p>
        <div className="flex gap-2">
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter Serper API key..."
            className="bg-warm-ivory border-warm-taupe/40 rounded-lg text-sm"
          />
          <Button
            onClick={handleSave}
            disabled={testing || !key.trim()}
            size="sm"
            className="bg-deep-espresso text-warm-ivory rounded-lg"
          >
            {testing ? <><Loader2 size={12} className="animate-spin mr-1" />Testing...</> : "Test & Save"}
          </Button>
          {hasApiKey("serper") && (
            <Button
              onClick={() => {
                removeApiKey("serper");
                toast.success("Serper key removed");
              }}
              size="sm"
              variant="outline"
              className="border-red-300 text-red-500 rounded-lg"
            >
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

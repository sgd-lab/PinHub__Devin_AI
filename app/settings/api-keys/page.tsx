"use client";

import { useState } from "react";
import { Key, Check, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore, PROVIDER_DEFAULTS } from "@/stores/settingsStore";
import { storeApiKey, removeApiKey, hasApiKey } from "@/lib/encryption/keyStore";
import { testProviderConnection } from "@/lib/ai/providerAdapter";
import { toast } from "sonner";

const FREE_PROVIDERS = new Set(["gemini", "openrouter"]);

const FREE_TIER_INFO: Record<string, string> = {
  gemini: "Free tier: 60 requests/min, 1500/day. No credit card required. Get a key at ai.google.dev",
  openrouter: "Free models available (e.g., meta-llama/llama-3.1-8b-instruct:free). Sign up at openrouter.ai",
};

const PROVIDER_ORDER = ["gemini", "openrouter", "nvidia", "groq", "anthropic", "ollama"];

export default function ApiKeysPage() {
  const { providers, defaultProvider, setProvider, setDefaultProvider } = useSettingsStore();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const passphrase = "pinhub-default-key";

  const sortedProviders = PROVIDER_ORDER
    .filter((name) => name in PROVIDER_DEFAULTS)
    .map((name) => [name, PROVIDER_DEFAULTS[name]] as const);

  const handleTest = async (name: string) => {
    const key = keys[name];
    if (!key) { toast.error("Enter an API key first"); return; }
    setTesting(name);
    storeApiKey(name, key, passphrase);
    const p = PROVIDER_DEFAULTS[name as keyof typeof PROVIDER_DEFAULTS];
    if (!p?.base_url) { setTesting(null); return; }
    const result = await testProviderConnection(name, key, p.base_url);
    if (result.success) {
      setProvider(name, { api_key_ref: name, enabled: true });
      toast.success(`${name} connected`);
    } else {
      toast.error(`${name} failed: ${result.error}`);
    }
    setTesting(null);
  };

  const handleRemove = (name: string) => {
    removeApiKey(name);
    setProvider(name, { api_key_ref: "", enabled: false });
    setKeys({ ...keys, [name]: "" });
    toast.success(`${name} key removed`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif text-deep-espresso mb-1">API Keys</h3>
        <p className="text-xs text-charcoal">Keys are AES-256 encrypted and stored in your browser only. Never sent to any server.</p>
      </div>

      {/* Free providers callout */}
      <div className="bg-soft-sage/10 border border-soft-sage/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star size={14} className="text-soft-sage" />
          <span className="text-sm font-medium text-deep-espresso">Recommended — Free Providers</span>
        </div>
        <p className="text-xs text-charcoal">
          Start with <strong>Gemini</strong> or <strong>OpenRouter</strong> — both offer free tiers with no credit card required.
          Perfect for getting started and testing your content workflow.
        </p>
      </div>

      <div className="space-y-4">
        {sortedProviders.map(([name, config]) => {
          const isConnected = hasApiKey(name);
          const provider = providers[name];
          const isFree = FREE_PROVIDERS.has(name);
          const freeInfo = FREE_TIER_INFO[name];
          return (
            <div key={name} className={`bg-white/60 border rounded-lg p-4 ${isFree ? "border-soft-sage/40 ring-1 ring-soft-sage/20" : "border-warm-taupe/30"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-charcoal" />
                  <span className="text-sm font-medium text-deep-espresso capitalize">{name}</span>
                  {isFree && (
                    <span className="text-[10px] bg-soft-sage/20 text-soft-sage px-1.5 py-0.5 rounded-full font-medium">
                      FREE TIER
                    </span>
                  )}
                  {isConnected && <span className="flex items-center gap-1 text-xs text-soft-sage"><Check size={10} />Connected</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={provider?.enabled || false} onCheckedChange={(checked) => setProvider(name, { enabled: checked })} />
                  {name === defaultProvider && <span className="text-[10px] bg-dusty-rose/20 text-dusty-rose px-2 py-0.5 rounded-full">Default</span>}
                </div>
              </div>
              {freeInfo && (
                <p className="text-xs text-charcoal/70 mb-2 bg-warm-ivory/50 px-3 py-1.5 rounded">{freeInfo}</p>
              )}
              <div className="flex gap-2 mb-2">
                <Input type="password" value={keys[name] || ""} onChange={(e) => setKeys({ ...keys, [name]: e.target.value })} placeholder={`Enter ${name} API key...`} className="bg-warm-ivory border-warm-taupe/40 rounded-lg text-sm" />
                <Button onClick={() => handleTest(name)} disabled={testing === name} size="sm" className="bg-deep-espresso text-warm-ivory rounded-lg">
                  {testing === name ? "Testing..." : "Save & Test"}
                </Button>
                {isConnected && <Button onClick={() => handleRemove(name)} size="sm" variant="outline" className="border-red-300 text-red-500 rounded-lg"><Trash2 size={12} /></Button>}
              </div>
              <div className="flex items-center justify-between text-xs text-charcoal">
                <span>Model: {config.default_model}</span>
                <div className="flex gap-2">
                  {name !== defaultProvider && isConnected && (
                    <button onClick={() => setDefaultProvider(name)} className="text-dusty-rose hover:underline">Set as Default</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

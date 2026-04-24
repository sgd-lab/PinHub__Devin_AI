"use client";

import { useState } from "react";
import { Key, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore, PROVIDER_DEFAULTS } from "@/stores/settingsStore";
import { storeApiKey, removeApiKey, hasApiKey } from "@/lib/encryption/keyStore";
import { testProviderConnection } from "@/lib/ai/providerAdapter";
import { toast } from "sonner";

export default function ApiKeysPage() {
  const { providers, defaultProvider, setProvider, setDefaultProvider } = useSettingsStore();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const passphrase = "pinhub-default-key";

  const providerList = Object.entries(PROVIDER_DEFAULTS);

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

      <div className="space-y-4">
        {providerList.map(([name, config]) => {
          const isConnected = hasApiKey(name);
          const provider = providers[name];
          return (
            <div key={name} className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-charcoal" />
                  <span className="text-sm font-medium text-deep-espresso capitalize">{name}</span>
                  {isConnected && <span className="flex items-center gap-1 text-xs text-soft-sage"><Check size={10} />Connected</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={provider?.enabled || false} onCheckedChange={(checked) => setProvider(name, { enabled: checked })} />
                  {name === defaultProvider && <span className="text-[10px] bg-dusty-rose/20 text-dusty-rose px-2 py-0.5 rounded-full">Default</span>}
                </div>
              </div>
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/stores/settingsStore";
import { retrieveApiKey } from "@/lib/encryption/keyStore";
import { toast } from "sonner";

export function useApiKeyGate() {
  const router = useRouter();
  const { providers } = useSettingsStore();
  const [checked, setChecked] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const anyKey = Object.entries(providers).some(([name, config]) => {
      if (!config.api_key_ref) return false;
      const key = retrieveApiKey(name, "pinhub-default-key");
      return !!key;
    });
    setHasKey(anyKey);
    setChecked(true);

    if (!anyKey) {
      toast.error("Please configure at least one AI provider API key first");
      router.push("/settings/api-keys");
    }
  }, [providers, router]);

  return { hasKey, checked };
}

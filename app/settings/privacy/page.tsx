"use client";

import { useState } from "react";
import { Shield, Lock, AlertTriangle, Download, Trash2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settingsStore";
import { setPassphrase, hasPassphrase } from "@/lib/encryption/keyStore";
import { db } from "@/lib/db/dexie";
import { toast } from "sonner";

export default function PrivacyPage() {
  const { encryption, setEncryption } = useSettingsStore();
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");

  const handleSetPassphrase = () => {
    if (newPassphrase !== confirmPassphrase) {
      toast.error("Passphrases do not match");
      return;
    }
    if (newPassphrase.length < 8) {
      toast.error("Passphrase must be at least 8 characters");
      return;
    }
    setPassphrase(newPassphrase);
    setEncryption({ passphrase_set: true });
    setNewPassphrase("");
    setConfirmPassphrase("");
    toast.success("Passphrase set — your API keys are now encrypted");
  };

  const handleClearAll = () => {
    if (!confirm("This will delete ALL your data including API keys, brand profiles, and generated content. Are you sure?")) return;
    localStorage.clear();
    indexedDB.deleteDatabase("PinHubDB");
    toast.success("All data cleared. Refreshing...");
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif text-deep-espresso mb-1">Privacy & Security</h3>
        <p className="text-xs text-charcoal">Your data never leaves your browser. API keys are AES-256 encrypted in localStorage.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={14} className="text-deep-espresso" />
            <span className="text-sm font-medium text-deep-espresso">Encryption Passphrase</span>
            {hasPassphrase() && <span className="text-xs text-soft-sage flex items-center gap-1"><Shield size={10} />Set</span>}
          </div>
          <p className="text-xs text-charcoal mb-3">Set a passphrase to encrypt your API keys. You&apos;ll need it each time you open PinHub.</p>
          <div className="space-y-2">
            <Input type="password" value={newPassphrase} onChange={(e) => setNewPassphrase(e.target.value)} placeholder="New passphrase (min 8 chars)" className="bg-warm-ivory border-warm-taupe/40 rounded-lg" />
            <Input type="password" value={confirmPassphrase} onChange={(e) => setConfirmPassphrase(e.target.value)} placeholder="Confirm passphrase" className="bg-warm-ivory border-warm-taupe/40 rounded-lg" />
            <Button onClick={handleSetPassphrase} disabled={!newPassphrase || !confirmPassphrase} className="bg-deep-espresso text-warm-ivory rounded-lg">
              <Key size={12} className="mr-1" />{hasPassphrase() ? "Update Passphrase" : "Set Passphrase"}
            </Button>
          </div>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Remember on This Device</Label>
            <p className="text-xs text-charcoal mt-0.5">Skip passphrase prompt for 30 days</p>
          </div>
          <Switch checked={encryption.remember_device} onCheckedChange={(checked) => setEncryption({ remember_device: checked })} />
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-deep-espresso mb-2 flex items-center gap-2"><Download size={14} />Backup & Restore</h4>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs" onClick={async () => {
              const ls: Record<string, string | null> = {};
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) ls[key] = localStorage.getItem(key);
              }
              const idb: Record<string, unknown[]> = {};
              const tableNames = ["runs", "brands", "brandVersions", "prompts", "promptVersions", "settings", "costLog", "researchCache", "downloadHistory"] as const;
              for (const t of tableNames) {
                idb[t] = await db[t].toArray();
              }
              const backup = { localStorage: ls, indexedDB: idb };
              const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `pinhub-backup-${new Date().toISOString().split("T")[0]}.json`; a.click();
              URL.revokeObjectURL(url);
              toast.success("Backup exported");
            }}>Export Full Backup</Button>
            <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs" onClick={() => {
              const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const text = await file.text();
                try {
                  const data = JSON.parse(text);
                  const lsData = data.localStorage || data;
                  Object.entries(lsData).forEach(([k, v]) => { if (v !== null && typeof v === "string") localStorage.setItem(k, v); });
                  if (data.indexedDB) {
                    const tableNames = ["runs", "brands", "brandVersions", "prompts", "promptVersions", "settings", "costLog", "researchCache", "downloadHistory"] as const;
                    for (const t of tableNames) {
                      if (Array.isArray(data.indexedDB[t]) && data.indexedDB[t].length > 0) {
                        await db[t].bulkPut(data.indexedDB[t]);
                      }
                    }
                  }
                  toast.success("Backup restored. Refreshing...");
                  setTimeout(() => window.location.reload(), 1000);
                } catch { toast.error("Invalid backup file"); }
              };
              input.click();
            }}>Import Backup</Button>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2"><AlertTriangle size={14} />Danger Zone</h4>
          <p className="text-xs text-red-700 mb-3">Permanently delete all data from this browser. This cannot be undone.</p>
          <Button onClick={handleClearAll} variant="outline" className="border-red-300 text-red-600 rounded-lg text-xs"><Trash2 size={12} className="mr-1" />Clear All Data</Button>
        </div>
      </div>
    </div>
  );
}

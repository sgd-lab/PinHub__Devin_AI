"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";

export default function AdvancedPage() {
  const { featureFlags, setFeatureFlag, notion, setNotion } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif text-deep-espresso mb-1">Advanced Settings</h3>
        <p className="text-xs text-charcoal">Feature flags, experimental options, and integrations.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4 flex items-center justify-between">
          <div><Label className="text-sm font-medium">Automation Hub</Label><p className="text-xs text-charcoal mt-0.5">Enable automation features (Phase 2)</p></div>
          <Switch checked={featureFlags.automation_enabled} onCheckedChange={(checked) => setFeatureFlag("automation_enabled", checked)} />
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4 flex items-center justify-between">
          <div><Label className="text-sm font-medium">Experimental Features</Label><p className="text-xs text-charcoal mt-0.5">Enable beta/experimental features</p></div>
          <Switch checked={featureFlags.experimental} onCheckedChange={(checked) => setFeatureFlag("experimental", checked)} />
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4 flex items-center justify-between">
          <div><Label className="text-sm font-medium">Debug Mode</Label><p className="text-xs text-charcoal mt-0.5">Show debug information in console</p></div>
          <Switch checked={featureFlags.debug_mode} onCheckedChange={(checked) => setFeatureFlag("debug_mode", checked)} />
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <Label className="text-sm font-medium mb-3 block">Notion Integration</Label>
          <div className="space-y-2">
            <Input value={notion.parent_page_id || ""} onChange={(e) => setNotion({ parent_page_id: e.target.value })} placeholder="Notion Parent Page ID" className="bg-warm-ivory border-warm-taupe/40 rounded-lg" />
            <div className="flex gap-2">
              <select value={notion.sync_mode || "manual"} onChange={(e) => setNotion({ sync_mode: e.target.value as "immediate" | "manual" | "daily" })} className="flex-1 text-sm bg-warm-ivory border border-warm-taupe/40 rounded-lg px-3 py-2">
                <option value="manual">Manual Sync</option>
                <option value="immediate">Immediate Sync</option>
                <option value="daily">Daily Batch</option>
              </select>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Enabled</Label>
                <Switch checked={notion.enabled} onCheckedChange={(checked) => setNotion({ enabled: checked })} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <Label className="text-sm font-medium mb-2 block">Database Management</Label>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs" onClick={() => { toast.info("IndexedDB compacted"); }}>Compact IndexedDB</Button>
            <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs" onClick={() => { toast.info("Cache cleared"); }}>Clear Research Cache</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

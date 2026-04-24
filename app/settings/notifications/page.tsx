"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settingsStore";

export default function NotificationsPage() {
  const { alerts, setAlerts } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif text-deep-espresso mb-1">Notifications</h3>
        <p className="text-xs text-charcoal">Manage alerts and notification preferences.</p>
      </div>

      <div className="space-y-4">
        {[
          { key: "budget_warning", label: "Budget Warning", desc: "Alert when API cost approaches threshold" },
          { key: "qc_failure", label: "QC Failure Alert", desc: "Notify when QC score is below 5/10" },
          { key: "sync_error", label: "Sync Error", desc: "Alert on Notion sync failures" },
          { key: "generation_complete", label: "Generation Complete", desc: "Sound/notification when generation finishes" },
          { key: "daily_summary", label: "Daily Summary", desc: "Show morning briefing on dashboard" },
        ].map((item) => (
          <div key={item.key} className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4 flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{item.label}</Label>
              <p className="text-xs text-charcoal mt-0.5">{item.desc}</p>
            </div>
            <Switch
              checked={(alerts as Record<string, boolean>)[item.key] !== false}
              onCheckedChange={(checked) => setAlerts({ [item.key]: checked })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

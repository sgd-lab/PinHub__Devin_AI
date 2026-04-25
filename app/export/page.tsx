"use client";

import { useEffect, useState } from "react";
import { Download, FileText, FileSpreadsheet, FileJson, FileType, Filter } from "lucide-react";
import { Label } from "@/components/ui/label";
import { getAllRuns } from "@/lib/db/runRepository";
import { exportRunsToCSV } from "@/lib/exports/csvExporter";
import { exportRunsToJSON } from "@/lib/exports/jsonExporter";
import { exportRunsToMarkdown } from "@/lib/exports/markdownExporter";
import type { RunRecord } from "@/lib/db/dexie";
import { toast } from "sonner";

export default function ExportPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [nicheFilter, setNicheFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getAllRuns().then(setRuns).catch(() => {});
  }, []);

  if (!mounted) return null;

  const filtered = runs.filter((r) => {
    if (nicheFilter && r.niche !== nicheFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (dateRange.start && r.target_date < dateRange.start) return false;
    if (dateRange.end && r.target_date > dateRange.end) return false;
    return true;
  });

  const niches = Array.from(new Set(runs.map((r) => r.niche)));

  const exportFormats = [
    { label: "CSV Spreadsheet", icon: FileSpreadsheet, desc: "All 20 columns, Excel/Sheets compatible", action: () => { exportRunsToCSV(filtered); toast.success("CSV exported"); } },
    { label: "JSON Archive", icon: FileJson, desc: "Full data with metadata, importable", action: () => { exportRunsToJSON(filtered); toast.success("JSON exported"); } },
    { label: "Markdown", icon: FileType, desc: "Human-readable format with brand styling", action: () => { exportRunsToMarkdown(filtered); toast.success("Markdown exported"); } },
    { label: "PDF Report", icon: FileText, desc: "Branded PDF with Warm Ivory background", action: () => toast.info("PDF export — use @react-pdf/renderer in Library view") },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-deep-espresso">Export Center</h2>
        <span className="text-xs text-charcoal">{filtered.length} of {runs.length} records selected</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Filters */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-charcoal uppercase tracking-wider flex items-center gap-1"><Filter size={12} />Filters</h3>
          <div>
            <Label className="text-xs mb-1 block">Niche</Label>
            <select value={nicheFilter} onChange={(e) => setNicheFilter(e.target.value)} className="w-full text-sm bg-warm-ivory border border-warm-taupe/40 rounded-lg px-2 py-1.5">
              <option value="">All Niches</option>
              {niches.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Status</Label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full text-sm bg-warm-ivory border border-warm-taupe/40 rounded-lg px-2 py-1.5">
              <option value="">All Statuses</option>
              {["Draft", "Approved", "Posted", "Archived"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Date Range</Label>
            <div className="flex gap-2">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="flex-1 text-xs bg-warm-ivory border border-warm-taupe/40 rounded-lg px-2 py-1.5" />
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="flex-1 text-xs bg-warm-ivory border border-warm-taupe/40 rounded-lg px-2 py-1.5" />
            </div>
          </div>
        </div>

        {/* Export Formats */}
        <div className="md:col-span-2 space-y-3">
          <h3 className="text-xs font-medium text-charcoal uppercase tracking-wider">Export Formats</h3>
          {exportFormats.map((fmt) => {
            const Icon = fmt.icon;
            return (
              <button key={fmt.label} onClick={fmt.action} disabled={filtered.length === 0} className="w-full flex items-center gap-4 bg-white/60 border border-warm-taupe/30 rounded-lg p-4 hover:bg-cream-hover/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="w-10 h-10 bg-warm-ivory rounded-lg flex items-center justify-center shrink-0"><Icon size={18} className="text-deep-espresso" /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-deep-espresso">{fmt.label}</div>
                  <div className="text-xs text-charcoal">{fmt.desc}</div>
                </div>
                <Download size={16} className="text-charcoal" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

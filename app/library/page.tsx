"use client";

import { useEffect, useState } from "react";
import { Search, Grid3X3, List, LayoutList, Plus, Download, Trash2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLibraryStore } from "@/stores/libraryStore";
import { getAllRuns, deleteRuns } from "@/lib/db/runRepository";
import { exportRunsToCSV } from "@/lib/exports/csvExporter";
import { toast } from "sonner";
import { format } from "date-fns";


export default function LibraryPage() {
  const { runs, setRuns, selectedIds, toggleSelect, clearSelection, filters, setFilter, clearFilters, view, setView } = useLibraryStore();
  const [mounted, setMounted] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    setMounted(true);
    getAllRuns().then(setRuns).catch(() => {});
  }, [setRuns]);

  if (!mounted) return null;

  const filteredRuns = runs.filter((run) => {
    if (filters.search && !JSON.stringify(run).toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.niches.length > 0 && !filters.niches.includes(run.niche)) return false;
    if (filters.status && run.status !== filters.status) return false;
    if (filters.qcPass !== null) {
      const pass = run.qc_results.score >= 7;
      if (filters.qcPass !== pass) return false;
    }
    return true;
  }).sort((a, b) => {
    if (filters.sortBy === "oldest") return a.created_at.localeCompare(b.created_at);
    if (filters.sortBy === "niche") return a.niche.localeCompare(b.niche);
    if (filters.sortBy === "cost") return b.cost_estimate - a.cost_estimate;
    return b.created_at.localeCompare(a.created_at);
  });

  const niches = Array.from(new Set(runs.map((r) => r.niche)));

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await deleteRuns(selectedIds);
    setRuns(runs.filter((r) => !selectedIds.includes(r.id)));
    clearSelection();
    toast.success(`Deleted ${selectedIds.length} records`);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* Filter Sidebar */}
        {showFilters && (
          <div className="w-full sm:w-56 shrink-0 space-y-4">
            <h3 className="text-xs font-medium text-charcoal uppercase tracking-wider">Filters</h3>

            <div>
              <div className="text-xs font-medium text-charcoal mb-1.5">Niche</div>
              <div className="flex flex-wrap gap-1">
                {niches.map((niche) => (
                  <button key={niche} onClick={() => setFilter("niches", filters.niches.includes(niche) ? filters.niches.filter((n: string) => n !== niche) : [...filters.niches, niche])} className={`px-2 py-1 text-[10px] rounded-full ${filters.niches.includes(niche) ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/30 text-charcoal"}`}>
                    {niche}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-charcoal mb-1.5">Status</div>
              <div className="flex flex-col gap-1">
                {["", "Draft", "Approved", "Posted", "Archived"].map((s) => (
                  <button key={s} onClick={() => setFilter("status", s)} className={`px-2 py-1 text-xs rounded text-left ${filters.status === s ? "bg-deep-espresso text-warm-ivory" : "hover:bg-cream-hover"}`}>
                    {s || "All"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-charcoal mb-1.5">QC Pass</div>
              <div className="flex gap-1">
                {[{ label: "All", val: null }, { label: "Pass", val: true }, { label: "Fail", val: false }].map((opt) => (
                  <button key={String(opt.val)} onClick={() => setFilter("qcPass", opt.val)} className={`px-2 py-1 text-xs rounded ${filters.qcPass === opt.val ? "bg-deep-espresso text-warm-ivory" : "bg-warm-ivory border border-warm-taupe/30"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={clearFilters} variant="outline" size="sm" className="w-full border-warm-taupe text-xs">Clear Filters</Button>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Top bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setShowFilters(!showFilters)} className="p-2 rounded-lg hover:bg-cream-hover"><Filter size={16} /></button>
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-taupe" />
              <Input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Search library..." className="pl-8 bg-warm-ivory border-warm-taupe/40 rounded-lg text-sm" />
            </div>
            <div className="flex gap-0.5 bg-warm-ivory border border-warm-taupe/30 rounded-lg p-0.5">
              {([["grid", Grid3X3], ["list", List], ["compact", LayoutList]] as const).map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)} className={`p-1.5 rounded ${view === v ? "bg-deep-espresso text-warm-ivory" : "text-charcoal hover:bg-cream-hover"}`}><Icon size={14} /></button>
              ))}
            </div>
            <select value={filters.sortBy} onChange={(e) => setFilter("sortBy", e.target.value)} className="text-xs bg-warm-ivory border border-warm-taupe/40 rounded-lg px-2 py-1.5">
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
              <option value="niche">Niche</option>
              <option value="cost">Cost</option>
            </select>
            <Button size="sm" className="bg-deep-espresso text-warm-ivory rounded-lg"><Plus size={14} className="mr-1" />New Asset</Button>
          </div>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-cream-hover rounded-lg px-4 py-2">
              <span className="text-xs text-charcoal">{selectedIds.length} selected</span>
              <Button size="sm" variant="outline" className="text-xs border-warm-taupe" onClick={() => exportRunsToCSV(runs.filter(r => selectedIds.includes(r.id)))}><Download size={12} className="mr-1" />Export</Button>
              <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-600" onClick={handleBulkDelete}><Trash2 size={12} className="mr-1" />Delete</Button>
              <button onClick={clearSelection} className="text-xs text-charcoal underline ml-auto">Clear</button>
            </div>
          )}

          {/* Grid/List */}
          {filteredRuns.length === 0 ? (
            <div className="text-center py-16 text-charcoal">
              <p className="text-sm">No content found. Generate your first pin to see it here.</p>
            </div>
          ) : (
            <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-2"}>
              {filteredRuns.map((run) => (
                <div key={run.id} onClick={() => toggleSelect(run.id)} className={`bg-white/60 border rounded-lg p-4 cursor-pointer transition-colors hover:bg-cream-hover/50 ${selectedIds.includes(run.id) ? "border-dusty-rose" : "border-warm-taupe/30"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-deep-espresso truncate flex-1">{run.parsed_fields.title as string || "Untitled"}</h4>
                    <span className={`w-2 h-2 rounded-full shrink-0 ml-2 mt-1 ${run.qc_results.score >= 7 ? "bg-soft-sage" : run.qc_results.score >= 4 ? "bg-muted-gold" : "bg-red-500"}`} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider bg-dusty-rose/10 text-deep-espresso">{run.niche}</Badge>
                    <Badge variant="secondary" className={`text-[10px] ${run.status === "Posted" ? "bg-soft-sage/20" : "bg-warm-taupe/20"}`}>{run.status}</Badge>
                  </div>
                  <p className="text-xs text-charcoal line-clamp-2 mb-2">{(run.parsed_fields.prompt_a as string)?.slice(0, 80) || "No preview"}...</p>
                  <div className="text-[10px] text-warm-taupe">{format(new Date(run.created_at), "MMM d, h:mm a")}</div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-charcoal text-center py-4">{filteredRuns.length} of {runs.length} records</div>
        </div>
      </div>
    </div>
  );
}

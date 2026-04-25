"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Play, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllPrompts } from "@/lib/db/promptRepository";
import type { PromptTemplate } from "@/lib/db/dexie";

export default function PromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getAllPrompts().then(setPrompts).catch(() => {});
  }, []);

  if (!mounted) return null;

  const defaultTemplates = [
    { id: "single-pin-default", name: "Maya Sofia — Single Outfit Collage Pin", version: "v2026.1", description: "Single outfit collage pin with dual image prompts", runCount: 0, healthScore: 100, generators: ["single"] },
    { id: "daily-3-pin-default", name: "Maya Sofia — 3-Pin Daily Producer", version: "v2026.2", description: "3 coordinated pins for a target day", runCount: 0, healthScore: 100, generators: ["daily"] },
    { id: "guide-generator-default", name: "Maya Sofia — Weekly PDF Guide", version: "v2026.3", description: "Weekly PDF guide from pin runs", runCount: 0, healthScore: 100, generators: ["guide"] },
  ];

  const allTemplates = [...defaultTemplates, ...prompts.map((p) => ({
    id: p.id, name: p.name, version: p.version, description: p.description, runCount: p.run_count, healthScore: Math.round(p.average_qc_score * 10), generators: p.compatible_generators,
  }))];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-deep-espresso">Prompt Studio</h2>
          <p className="text-sm text-charcoal mt-1">Manage and customize your prompt templates</p>
        </div>
        <Button onClick={() => router.push(`/prompts/custom-${Date.now()}`)} className="bg-deep-espresso text-warm-ivory rounded-lg"><Plus size={14} className="mr-1" />New Prompt</Button>
      </div>

      <div className="space-y-3">
        {allTemplates.map((t) => (
          <Link key={t.id} href={`/prompts/${t.id}`} className="block bg-white/60 border border-warm-taupe/30 rounded-lg p-4 hover:bg-cream-hover/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-warm-ivory rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={18} strokeWidth={1.5} className="text-deep-espresso" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-deep-espresso">{t.name}</h3>
                  <p className="text-xs text-charcoal mt-0.5">{t.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-warm-taupe">
                    <span>{t.version}</span>
                    <span><Play size={8} className="inline mr-0.5" />{t.runCount} runs</span>
                    <span className={t.healthScore >= 80 ? "text-soft-sage" : t.healthScore >= 50 ? "text-muted-gold" : "text-red-500"}>
                      <Heart size={8} className="inline mr-0.5" />{t.healthScore}% health
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {t.generators.map((g) => (
                  <span key={g} className="text-[10px] px-1.5 py-0.5 bg-warm-ivory rounded text-charcoal capitalize">{g}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

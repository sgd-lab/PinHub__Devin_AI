"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Save, Play, History, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { extractVariables } from "@/lib/prompts/variableResolver";

export default function PromptEditorPage() {
  const params = useParams();
  const promptId = params.id as string;
  const [promptText, setPromptText] = useState("# AHSAN TO PASTE VERBATIM MASTER PROMPT HERE\n\n{brand.name} — {niche.name}\n\n## Session Context\n## Outfit Brief\n## SEO Title\n## SEO Description\n## Version A Prompt\n## Version B Prompt\n## Canva Instructions");
  // sandboxOutput state managed by test sandbox feature

  const variables = extractVariables(promptText);
  const knownVars = ["brand.name", "brand.tagline", "brand.mission", "niche.name", "niche.keywords", "niche.hero_pieces", "niche.hook", "niche.color_story", "model.description", "model.nano_banana", "today.date", "today.day", "target_item", "seasonal_note", "country_set", "palette.names", "voice.power_words", "voice.signature_openers", "seo.hashtags", "monetization_angle", "guide_title", "week_label"];
  const resolved = variables.filter((v) => knownVars.includes(v));
  const unresolved = variables.filter((v) => !knownVars.includes(v));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-deep-espresso">Prompt Editor — {promptId}</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs"><History size={12} className="mr-1" />Versions</Button>
          <Button size="sm" variant="outline" className="border-warm-taupe rounded-lg text-xs"><Play size={12} className="mr-1" />Test in Sandbox</Button>
          <Button size="sm" className="bg-deep-espresso text-warm-ivory rounded-lg text-xs"><Save size={12} className="mr-1" />Save Version</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
            <Label className="text-sm font-medium mb-2 block">Prompt Template</Label>
            <Textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={20} className="bg-warm-ivory border-warm-taupe/40 rounded-lg font-mono text-sm" />
            <div className="flex justify-between mt-2 text-xs text-charcoal">
              <span>{promptText.length} chars</span>
              <span>~{Math.ceil(promptText.length / 4)} tokens estimated</span>
            </div>
          </div>
        </div>

        {/* Variable Inspector */}
        <div className="space-y-4">
          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-deep-espresso mb-3">Variable Inspector</h3>
            <div className="space-y-1.5">
              {resolved.map((v) => (
                <div key={v} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 size={12} className="text-soft-sage" />
                  <code className="text-charcoal">{`{${v}}`}</code>
                </div>
              ))}
              {unresolved.map((v) => (
                <div key={v} className="flex items-center gap-2 text-xs">
                  <AlertCircle size={12} className="text-red-500" />
                  <code className="text-red-600">{`{${v}}`}</code>
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Missing</span>
                </div>
              ))}
              {variables.length === 0 && (
                <p className="text-xs text-warm-taupe">No variables found</p>
              )}
            </div>
          </div>

          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-deep-espresso mb-2">Output Schema</h3>
            <div className="space-y-1 text-xs text-charcoal">
              {["title", "description", "hashtags", "prompt_a", "prompt_b", "canva_instructions"].map((f) => (
                <div key={f} className="flex items-center gap-2 px-2 py-1 bg-warm-ivory rounded">
                  <span className="font-mono">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-deep-espresso mb-2">QC Rules</h3>
            <p className="text-xs text-charcoal">Attach QC rules to validate output fields.</p>
            <Button size="sm" variant="outline" className="mt-2 w-full border-warm-taupe rounded-lg text-xs">Manage Rules</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

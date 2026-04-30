"use client";

import { useState, useRef } from "react";
import { Search, Sparkles, TrendingUp, Compass, Sun, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBrandStore } from "@/stores/brandStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { streamCompletion, estimateCost } from "@/lib/ai/streamHandler";
import { retrieveApiKey } from "@/lib/encryption/keyStore";
import { db } from "@/lib/db/dexie";
import { toast } from "sonner";
import { parseAIError, type AIErrorInfo } from "@/lib/ai/aiErrorHandler";
import { AIErrorCard } from "@/components/ai/AIErrorCard";

interface ResearchResult {
  trendingSubtopics: string[];
  contentAngles: string[];
  seasonalRelevance: string[];
  competitorIdeas: string[];
}

function parseResearchOutput(text: string): ResearchResult {
  const sections: ResearchResult = {
    trendingSubtopics: [],
    contentAngles: [],
    seasonalRelevance: [],
    competitorIdeas: [],
  };

  const sectionMap: Record<string, keyof ResearchResult> = {
    "trending": "trendingSubtopics",
    "subtopic": "trendingSubtopics",
    "content angle": "contentAngles",
    "angle": "contentAngles",
    "seasonal": "seasonalRelevance",
    "relevance": "seasonalRelevance",
    "competitor": "competitorIdeas",
    "idea": "competitorIdeas",
  };

  let currentSection: keyof ResearchResult | null = null;
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#")) {
      const headerLower = trimmed.toLowerCase();
      for (const [key, section] of Object.entries(sectionMap)) {
        if (headerLower.includes(key)) {
          currentSection = section;
          break;
        }
      }
      continue;
    }

    if (currentSection && (trimmed.startsWith("-") || trimmed.startsWith("•") || /^\d+[\.\)]/.test(trimmed))) {
      const clean = trimmed.replace(/^[-•]\s*/, "").replace(/^\d+[\.\)]\s*/, "").trim();
      if (clean) sections[currentSection].push(clean);
    }
  }

  return sections;
}

const SECTION_CONFIG = [
  { key: "trendingSubtopics" as const, label: "Trending Subtopics", icon: TrendingUp, color: "text-dusty-rose", bg: "bg-dusty-rose/10" },
  { key: "contentAngles" as const, label: "Content Angles", icon: Compass, color: "text-soft-sage", bg: "bg-soft-sage/10" },
  { key: "seasonalRelevance" as const, label: "Seasonal Relevance", icon: Sun, color: "text-muted-gold", bg: "bg-muted-gold/10" },
  { key: "competitorIdeas" as const, label: "Competitor Content Ideas", icon: Users, color: "text-deep-espresso", bg: "bg-deep-espresso/10" },
];

export default function ResearchEnhancerPage() {
  const { activeBrand } = useBrandStore();
  const { providers, defaultProvider } = useSettingsStore();
  const [topic, setTopic] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [rawOutput, setRawOutput] = useState("");
  const [results, setResults] = useState<ResearchResult | null>(null);
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);
  const [aiError, setAiError] = useState<AIErrorInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleResearch = async () => {
    if (!topic.trim()) {
      toast.error("Enter a topic or keyword");
      return;
    }

    const provider = providers[selectedProvider];
    if (!provider) {
      toast.error("No provider selected");
      return;
    }

    const apiKey = retrieveApiKey(selectedProvider, "pinhub-default-key");
    if (!apiKey) {
      toast.error("No API key configured. Go to Settings → API Keys.");
      return;
    }

    setStreaming(true);
    setRawOutput("");
    setResults(null);
    setAiError(null);
    abortRef.current = new AbortController();

    const brandContext = activeBrand
      ? `Brand: ${activeBrand.identity.name} (${activeBrand.identity.tagline})\nNiches: ${activeBrand.niches.map(n => n.name).join(", ")}\nVoice: ${activeBrand.voice.power_words.join(", ")}`
      : "No brand context";

    const prompt = `You are a Pinterest content research analyst. Research the following topic for Pinterest content creation.

Topic: ${topic}
${brandContext}

Provide detailed research organized into exactly these 4 sections:

## Trending Subtopics
List 6-8 trending subtopics related to "${topic}" on Pinterest. Include search volume indicators (high/medium/low) where possible.

## Content Angles
List 5-7 unique content angles for creating pins about "${topic}". Each should be a specific, actionable pin idea.

## Seasonal Relevance
List 4-6 seasonal trends and timing insights for "${topic}". Include the best months to post and seasonal hooks.

## Competitor Content Ideas
List 5-7 content ideas inspired by what top Pinterest creators do with "${topic}". Focus on formats, styles, and hooks that perform well.

Use bullet points (- ) for each item. Be specific and actionable.`;

    let fullText = "";
    try {
      await streamCompletion({
        baseUrl: provider.base_url,
        apiKey,
        model: provider.default_model,
        messages: [
          { role: "system", content: "You are a Pinterest content research expert. Provide actionable, data-informed research for content creators." },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        maxTokens: 3000,
        onToken: (token) => {
          fullText += token;
          setRawOutput(fullText);
        },
        onComplete: (text) => {
          setResults(parseResearchOutput(text));
        },
        onError: (err) => {
          throw err;
        },
        onUsage: (usage) => {
          const cost = estimateCost(usage.input_tokens, usage.output_tokens, provider.default_model);
          db.costLog.add({
            id: crypto.randomUUID(),
            date: new Date().toISOString().split("T")[0],
            provider: selectedProvider,
            model: provider.default_model,
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            cost,
            run_id: `research-${crypto.randomUUID()}`,
          });
        },
        signal: abortRef.current.signal,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const errorInfo = parseAIError(err, selectedProvider);
        setAiError(errorInfo);
        toast.error(errorInfo.message);
      }
    } finally {
      setStreaming(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-deep-espresso">Research Enhancer</h2>
        <p className="text-sm text-charcoal mt-1">
          Discover trending subtopics, content angles, and competitor ideas for any Pinterest topic.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Topic or Keyword</Label>
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., quiet luxury workwear, minimalist home office, spring capsule wardrobe"
              className="bg-warm-ivory border-warm-taupe/40 rounded-lg flex-1"
              onKeyDown={(e) => e.key === "Enter" && !streaming && handleResearch()}
            />
            <Button
              onClick={streaming ? handleCancel : handleResearch}
              className={`rounded-lg px-6 ${streaming ? "bg-charcoal" : "bg-deep-espresso"} text-warm-ivory`}
            >
              {streaming ? (
                "Cancel"
              ) : (
                <>
                  <Search size={16} className="mr-2" />
                  Research
                </>
              )}
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-1.5 block">AI Provider</Label>
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(providers).filter(([, p]) => p.enabled || p.api_key_ref).map(([name]) => (
              <button
                key={name}
                onClick={() => setSelectedProvider(name)}
                className={`px-3 py-1.5 text-xs rounded-lg uppercase transition-colors ${
                  selectedProvider === name
                    ? "bg-deep-espresso text-warm-ivory"
                    : "bg-warm-ivory border border-warm-taupe/40 text-charcoal hover:bg-cream-hover"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {activeBrand && (
          <div className="flex items-center gap-2 text-xs text-charcoal">
            <Sparkles size={12} className="text-muted-gold" />
            Research tailored to: <span className="font-medium text-deep-espresso">{activeBrand.identity.name}</span>
          </div>
        )}
      </div>

      {/* Error */}
      {aiError && (
        <AIErrorCard error={aiError} onRetry={handleResearch} onDismiss={() => setAiError(null)} />
      )}

      {/* Streaming Raw Output */}
      {streaming && rawOutput && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-soft-sage rounded-full animate-pulse" />
            <span className="text-xs text-charcoal">Researching...</span>
          </div>
          <div className="text-sm text-charcoal whitespace-pre-wrap max-h-[300px] overflow-y-auto">
            {rawOutput}
          </div>
        </div>
      )}

      {/* Parsed Results */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTION_CONFIG.map(({ key, label, icon: Icon, color, bg }) => {
            const items = results[key];
            if (items.length === 0) return null;
            return (
              <div key={key} className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                    <Icon size={16} className={color} />
                  </div>
                  <h3 className="font-serif text-sm font-semibold text-deep-espresso">{label}</h3>
                  <span className="text-[10px] bg-warm-ivory px-1.5 py-0.5 rounded-full text-charcoal">{items.length}</span>
                </div>
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-charcoal">
                      <span className="w-1.5 h-1.5 rounded-full bg-warm-taupe mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!streaming && !results && !aiError && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-12 text-center">
          <Search size={40} strokeWidth={1} className="text-warm-taupe mx-auto mb-4" />
          <h3 className="font-serif text-lg text-deep-espresso mb-2">Ready to Research</h3>
          <p className="text-sm text-charcoal max-w-md mx-auto">
            Enter a Pinterest topic or keyword above to discover trending subtopics,
            content angles, seasonal relevance, and competitor ideas.
          </p>
        </div>
      )}
    </div>
  );
}

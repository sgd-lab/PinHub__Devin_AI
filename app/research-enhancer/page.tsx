"use client";

import { useState, useRef } from "react";
import { Search, Sparkles, TrendingUp, Compass, Sun, Users, Globe, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBrandStore } from "@/stores/brandStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { streamCompletion, estimateCost } from "@/lib/ai/streamHandler";
import { retrieveApiKey, hasApiKey } from "@/lib/encryption/keyStore";
import { supabase } from "@/lib/db/supabase";
import { toast } from "sonner";
import { parseAIError, type AIErrorInfo } from "@/lib/ai/aiErrorHandler";
import { AIErrorCard } from "@/components/ai/AIErrorCard";
import { useApiKeyGate } from "@/lib/hooks/useApiKeyGate";
import type { SearchResult } from "@/app/api/search/route";

interface ResearchResult {
  trendingSubtopics: string[];
  contentAngles: string[];
  seasonalRelevance: string[];
  competitorIdeas: string[];
}

interface SourceLink {
  title: string;
  link: string;
  snippet: string;
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
  const { hasKey, checked } = useApiKeyGate();
  const [topic, setTopic] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [searching, setSearching] = useState(false);
  const [rawOutput, setRawOutput] = useState("");
  const [results, setResults] = useState<ResearchResult | null>(null);
  const [sources, setSources] = useState<SourceLink[]>([]);
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);
  const [aiError, setAiError] = useState<AIErrorInfo | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasSerperKey = typeof window !== "undefined" && hasApiKey("serper");

  if (!checked || !hasKey) return null;

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
    setSearching(true);
    setRawOutput("");
    setResults(null);
    setSources([]);
    setAiError(null);
    setSearchError(null);
    abortRef.current = new AbortController();

    // Step 1: Real web search (if Serper key is configured)
    let searchResults: SearchResult[] = [];
    const serperKey = retrieveApiKey("serper", "pinhub-default-key");

    if (serperKey) {
      try {
        const searchRes = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: topic, apiKey: serperKey }),
          signal: abortRef.current.signal,
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          searchResults = searchData.results || [];
          setSources(searchResults.map((r: SearchResult) => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet,
          })));
        } else {
          const errData = await searchRes.json();
          setSearchError(errData.error || "Search failed");
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSearchError("Web search failed — falling back to AI-only analysis");
        }
      }
    }

    setSearching(false);

    // Step 2: Build prompt with real search data as context
    const brandContext = activeBrand
      ? `Brand: ${activeBrand.identity.name} (${activeBrand.identity.tagline})\nNiches: ${activeBrand.niches.map(n => n.name).join(", ")}\nVoice: ${activeBrand.voice.power_words.join(", ")}`
      : "No brand context";

    const searchContext = searchResults.length > 0
      ? `\n\n--- REAL WEB SEARCH RESULTS (use these as primary data) ---\n${searchResults.map((r, i) => `[${i + 1}] "${r.title}"\nURL: ${r.link}\nExcerpt: ${r.snippet}`).join("\n\n")}\n--- END SEARCH RESULTS ---`
      : "";

    const dataSourceNote = searchResults.length > 0
      ? "IMPORTANT: Base your analysis primarily on the real web search results provided above. Cite specific findings from the search results. Do NOT make up data."
      : "Note: No web search results available. Provide your best analysis based on your training data, but be clear about what is general knowledge vs. confirmed trends.";

    const prompt = `You are a Pinterest content research analyst. Research the following topic for Pinterest content creation.

Topic: ${topic}
${brandContext}
${searchContext}

${dataSourceNote}

Provide detailed research organized into exactly these 4 sections:

## Trending Subtopics
List 6-8 trending subtopics related to "${topic}" on Pinterest. Include search volume indicators (high/medium/low) where possible. ${searchResults.length > 0 ? "Reference specific findings from the search results." : ""}

## Content Angles
List 5-7 unique content angles for creating pins about "${topic}". Each should be a specific, actionable pin idea.

## Seasonal Relevance
List 4-6 seasonal trends and timing insights for "${topic}". Include the best months to post and seasonal hooks.

## Competitor Content Ideas
List 5-7 content ideas inspired by what top Pinterest creators do with "${topic}". Focus on formats, styles, and hooks that perform well. ${searchResults.length > 0 ? "Reference real examples from the search results where available." : ""}

Use bullet points (- ) for each item. Be specific and actionable.`;

    let fullText = "";
    try {
      await streamCompletion({
        baseUrl: provider.base_url,
        apiKey,
        model: provider.default_model,
        messages: [
          { role: "system", content: "You are a Pinterest content research expert. Provide actionable, data-informed research for content creators. When web search results are provided, base your analysis on that real data and cite specific sources." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
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
          supabase.from("cost_log").insert({
            id: crypto.randomUUID(),
            date: new Date().toISOString().split("T")[0],
            provider: selectedProvider,
            model: provider.default_model,
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            cost,
            run_id: `research-${crypto.randomUUID()}`,
          }).then();
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
    setSearching(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-deep-espresso">Research Enhancer</h2>
        <p className="text-sm text-charcoal mt-1">
          {hasSerperKey
            ? "Real-time web search + AI analysis for Pinterest content research."
            : "AI-powered Pinterest content research. Add a Serper API key in Settings for real web search data."}
        </p>
      </div>

      {/* Serper key warning */}
      {!hasSerperKey && (
        <div className="bg-muted-gold/10 border border-muted-gold/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-muted-gold mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-deep-espresso">No Web Search API Key</p>
            <p className="text-xs text-charcoal mt-1">
              Without a Serper API key, research uses AI knowledge only (not live data).
              Add a free key in <a href="/settings/api-keys" className="text-dusty-rose underline">Settings → API Keys</a> for
              real Google search results. Get one free at <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" className="text-dusty-rose underline">serper.dev</a> (2,500 searches/month).
            </p>
          </div>
        </div>
      )}

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

      {/* Search error (non-fatal) */}
      {searchError && (
        <div className="bg-muted-gold/10 border border-muted-gold/30 rounded-lg p-3 flex items-center gap-2 text-xs text-charcoal">
          <AlertTriangle size={14} className="text-muted-gold flex-shrink-0" />
          {searchError}
        </div>
      )}

      {/* Searching indicator */}
      {searching && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-soft-sage animate-spin" />
            <span className="text-sm text-charcoal">Searching the web for real Pinterest data...</span>
          </div>
        </div>
      )}

      {/* Streaming Raw Output */}
      {streaming && !searching && rawOutput && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-soft-sage rounded-full animate-pulse" />
            <span className="text-xs text-charcoal">
              {sources.length > 0
                ? `Analyzing ${sources.length} search results...`
                : "Generating research insights..."}
            </span>
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

      {/* Sources Panel */}
      {sources.length > 0 && results && (
        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={16} className="text-charcoal" />
            <h3 className="font-serif text-sm font-semibold text-deep-espresso">Sources ({sources.length})</h3>
            <span className="text-[10px] bg-soft-sage/20 text-soft-sage px-1.5 py-0.5 rounded-full font-medium">LIVE DATA</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.slice(0, 10).map((source, i) => (
              <a
                key={i}
                href={source.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-warm-taupe/20 rounded-lg p-3 hover:bg-cream-hover transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <ExternalLink size={12} className="text-charcoal mt-0.5 flex-shrink-0 group-hover:text-dusty-rose" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-deep-espresso truncate">{source.title}</div>
                    <div className="text-[11px] text-charcoal/70 mt-0.5 line-clamp-2">{source.snippet}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
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
            {hasSerperKey
              ? " Results are powered by real Google search data."
              : " Add a Serper API key for real-time web data."}
          </p>
        </div>
      )}
    </div>
  );
}

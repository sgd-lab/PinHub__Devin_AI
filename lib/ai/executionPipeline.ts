import { streamCompletion, estimateTokens, estimateCost } from "./streamHandler";
import { resolveVariables } from "@/lib/prompts/variableResolver";
import { parseOutput } from "@/lib/prompts/outputParser";
import { runQCRules } from "@/lib/qc/ruleRunner";
import { supabase } from "@/lib/db/supabase";
import type { RunRecord, PromptTemplate } from "@/lib/db/dexie";
import type { BrandProfile } from "@/lib/brands/brandSchema";

export type PipelineStage =
  | "assemble"
  | "resolve"
  | "preflight"
  | "dispatch"
  | "stream"
  | "parse"
  | "validate"
  | "store"
  | "sync";

export interface PipelineConfig {
  brand: BrandProfile;
  template: PromptTemplate;
  runtimeInputs: Record<string, string>;
  provider: {
    name: string;
    base_url: string;
    api_key: string;
    model: string;
    fallback_model?: string;
  };
  temperature: number;
  maxTokens: number;
  niche: string;
  targetDate: string;
  board?: string;
  runType: "single" | "daily" | "guide" | "mega";
  holdForReview: boolean;
  onStageChange: (stage: PipelineStage) => void;
  onToken: (token: string) => void;
  onProgress: (percent: number) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export interface PipelineResult {
  runRecord: RunRecord;
  rawResponse: string;
  parsedFields: Record<string, unknown>;
  qcResults: RunRecord["qc_results"];
  usage: { input_tokens: number; output_tokens: number; cost: number };
}

export async function executeGeneration(
  config: PipelineConfig
): Promise<PipelineResult> {
  const {
    brand,
    template,
    runtimeInputs,
    provider,
    temperature,
    maxTokens,
    niche,
    targetDate,
    board,
    runType,
    holdForReview,
    onStageChange,
    onToken,
    onProgress,
    signal,
  } = config;

  // Stage 1: Assemble
  onStageChange("assemble");
  onProgress(10);

  const brandSnapshot = JSON.parse(JSON.stringify(brand));
  let promptText = template.prompt_text;

  // Stage 2: Resolve Variables
  onStageChange("resolve");
  onProgress(20);

  const { resolved, unresolved } = resolveVariables(
    promptText,
    brand,
    runtimeInputs
  );

  if (unresolved.length > 0) {
    throw new Error(`Unresolved variables: ${unresolved.join(", ")}`);
  }

  promptText = resolved;

  // Stage 3: Pre-flight Check
  onStageChange("preflight");
  onProgress(30);

  const estimatedInputTokens = estimateTokens(promptText);
  estimateCost(estimatedInputTokens, maxTokens, provider.model);

  // Stage 4: Dispatch
  onStageChange("dispatch");
  onProgress(40);

  let rawResponse = "";
  let usage = { input_tokens: 0, output_tokens: 0 };

  // Stage 5: Stream
  onStageChange("stream");

  await new Promise<void>((resolvePromise, reject) => {
    streamCompletion({
      baseUrl: provider.base_url,
      apiKey: provider.api_key,
      model: provider.model,
      messages: [
        {
          role: "system",
          content: `You are the AI content engine for ${brand.identity.name}. Follow the brand voice and style guidelines precisely.`,
        },
        { role: "user", content: promptText },
      ],
      temperature,
      maxTokens,
      onToken: (token) => {
        rawResponse += token;
        onToken(token);
        const streamProgress = Math.min(
          80,
          40 + (rawResponse.length / (maxTokens * 4)) * 40
        );
        onProgress(streamProgress);
      },
      onComplete: () => resolvePromise(),
      onError: (err) => reject(err),
      onUsage: (u) => {
        usage = u;
      },
      signal,
    });
  });

  // Stage 6: Parse
  onStageChange("parse");
  onProgress(85);

  const parsedFields = parseOutput(rawResponse, template.output_schema);

  // Stage 7: Validate
  onStageChange("validate");
  onProgress(90);

  const qcResults = runQCRules(parsedFields, template.qc_rules, brand);

  const cost = estimateCost(usage.input_tokens, usage.output_tokens, provider.model);

  // Stage 8: Store
  onStageChange("store");
  onProgress(95);

  const runRecord: RunRecord = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    brand_snapshot: brandSnapshot,
    prompt_template: `${template.name} ${template.version}`,
    runtime_inputs: runtimeInputs,
    raw_response: rawResponse,
    parsed_fields: parsedFields,
    qc_results: qcResults,
    provider: provider.name,
    model: provider.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cost_estimate: cost,
    status: holdForReview ? "Draft" : "Draft",
    board,
    niche,
    target_date: targetDate,
    run_type: runType,
    metadata: {},
  };

  const { error: pinError } = await supabase.from("pins").insert({
    id: runRecord.id,
    created_at: runRecord.created_at,
    updated_at: runRecord.updated_at,
    brand_snapshot: runRecord.brand_snapshot,
    brand_id: (brandSnapshot as Record<string, unknown>).id || null,
    prompt_template: runRecord.prompt_template,
    runtime_inputs: runRecord.runtime_inputs,
    raw_response: runRecord.raw_response,
    title: (parsedFields.title as string) || "",
    description: (parsedFields.description as string) || "",
    hashtags: (parsedFields.hashtags as string[]) || [],
    image_prompt_a: (parsedFields.prompt_a as string) || "",
    image_prompt_b: (parsedFields.prompt_b as string) || "",
    parsed_fields: parsedFields,
    qc_score: qcResults.score,
    qc_results: qcResults,
    provider: provider.name,
    model: provider.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cost_estimate: cost,
    status: runRecord.status,
    board: runRecord.board || "",
    niche: runRecord.niche,
    target_date: runRecord.target_date || null,
    run_type: runRecord.run_type,
    metadata: {},
  });
  if (pinError) {
    if (typeof window !== "undefined") console.warn("Failed to save pin to Supabase:", pinError.message);
  }

  // Log cost
  const { error: costError } = await supabase.from("cost_log").insert({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    provider: provider.name,
    model: provider.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cost,
    run_id: runRecord.id,
  });
  if (costError) {
    if (typeof window !== "undefined") console.warn("Failed to log cost:", costError.message);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pinhub:cost-update"));
  }

  // Stage 9: Sync (placeholder)
  onStageChange("sync");
  onProgress(100);

  return {
    runRecord,
    rawResponse,
    parsedFields,
    qcResults,
    usage: { ...usage, cost },
  };
}

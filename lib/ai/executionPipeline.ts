import { streamCompletion, estimateTokens, estimateCost } from "./streamHandler";
import { resolveVariables } from "@/lib/prompts/variableResolver";
import { parseOutput } from "@/lib/prompts/outputParser";
import { runQCRules } from "@/lib/qc/ruleRunner";
import { db, type RunRecord } from "@/lib/db/dexie";
import type { BrandProfile } from "@/lib/brands/brandSchema";
import type { PromptTemplate } from "@/lib/db/dexie";
import type { AITaskKind } from "./providers/types";
import {
  assembleContextualPrompt,
  type PersonalizationInputs,
  type RunType as PromptRunType,
} from "./contextualPromptAssembler";

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
  /**
   * AI task kind. Drives provider+model selection on the server side.
   * The user's stored, encrypted key is decrypted in the API route — no
   * provider credentials are passed from the client.
   */
  task: AITaskKind;
  temperature: number;
  maxTokens: number;
  niche: string;
  targetDate: string;
  board?: string;
  runType: "single" | "daily" | "guide" | "mega" | "inspiration";
  holdForReview: boolean;
  /**
   * Optional creator personalization. When provided, the system prompt is
   * built by `assembleContextualPrompt` (layered base brand → campaign →
   * output type → emotional modifier + feedback signal). When omitted, the
   * pipeline falls back to the legacy single-line system prompt for
   * backwards compatibility.
   */
  personalization?: PersonalizationInputs | null;
  /**
   * Optional caller intent description used by the campaign layer
   * (e.g. "weekly guide for affiliate angle").
   */
  campaignIntent?: string;
  /**
   * Optional saved user-master prompt for this task. When provided, it is
   * injected as a dedicated CREATOR'S MASTER PROMPT layer in the system
   * prompt above the OUTPUT TYPE.
   */
  customUserPrompt?: string | null;
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
    task,
    temperature,
    maxTokens,
    niche,
    targetDate,
    board,
    runType,
    holdForReview,
    personalization,
    campaignIntent,
    customUserPrompt,
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

  // Build the layered contextual prompt. This becomes the system prompt;
  // the resolved template text is appended to the user prompt so that any
  // legacy variables / sections still reach the model.
  const assembled = assembleContextualPrompt({
    brand,
    runType: runType as PromptRunType,
    runtimeInputs,
    personalization: personalization ?? null,
    outputContract: promptText,
    campaignIntent,
    customUserPrompt: customUserPrompt ?? null,
  });

  const systemContent = assembled.systemPrompt;
  const userContent = `${assembled.userPrompt}\n\n---\n\n${promptText}`;

  // Stage 3: Pre-flight Check
  onStageChange("preflight");
  onProgress(30);

  const estimatedInputTokens = estimateTokens(systemContent + userContent);
  estimateCost(estimatedInputTokens, maxTokens, "default");

  // Stage 4: Dispatch
  onStageChange("dispatch");
  onProgress(40);

  let rawResponse = "";
  let usage = { input_tokens: 0, output_tokens: 0 };
  let resolvedProvider = "auto";
  let resolvedModel = "auto";

  // Stage 5: Stream
  onStageChange("stream");

  await new Promise<void>((resolvePromise, reject) => {
    streamCompletion({
      task,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
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
      onMeta: (m) => {
        resolvedProvider = m.provider;
        resolvedModel = m.model;
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

  const cost = estimateCost(usage.input_tokens, usage.output_tokens, resolvedModel);

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
    provider: resolvedProvider,
    model: resolvedModel,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cost_estimate: cost,
    status: holdForReview ? "Draft" : "Draft",
    board,
    niche,
    target_date: targetDate,
    run_type: runType,
    rating: null,
    metadata: {
      contextual_prompt: {
        used_personalization: assembled.debugSummary.used_personalization,
        used_custom_user_prompt:
          assembled.debugSummary.used_custom_user_prompt,
        rated_outputs_used: assembled.debugSummary.rated_outputs_used,
        layer_lengths: assembled.debugSummary.layer_lengths,
        system_prompt: systemContent,
        user_prompt: userContent,
      },
    },
  };

  await db.runs.add(runRecord);

  // Log cost
  await db.costLog.add({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    provider: resolvedProvider,
    model: resolvedModel,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cost,
    run_id: runRecord.id,
  });

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

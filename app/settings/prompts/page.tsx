"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, RotateCcw, History, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUserStore } from "@/stores/userStore";
import {
  USER_TASK_PROMPT_KINDS,
  USER_TASK_PROMPT_LABELS,
  type UserTaskPromptDTO,
  type UserTaskPromptKind,
} from "@/lib/prompts/types";
import { toast } from "sonner";

const TASK_HINTS: Record<UserTaskPromptKind, string> = {
  single_pin:
    "Used by the Single Pin generator. Include hook, structure, voice cues, and any required sections you want every pin to follow.",
  three_pins:
    "Used by the Daily 3-Pin Producer. Describe the hero/detail/lifestyle pattern, hashtag rules, and tone.",
  guide:
    "Used by the long-form Guide generator. Outline the sections, length, monetization angle handling, and CTA style.",
  inspiration_pin:
    "Used by the Inspiration Pin generator. Define how mood-board prompts should be structured (visual cues, emotion, palette story, prop rules).",
};

const PLACEHOLDER: Record<UserTaskPromptKind, string> = {
  single_pin: `e.g.
Write a single Pinterest pin in my brand voice.
Always include:
- A 90-character magnetic title
- 4 hashtag tags relevant to my niche
- A photo concept and an illustrated concept
Avoid: clichés, generic adjectives, "ultimate guide".`,
  three_pins: `e.g.
Generate 3 coordinated pins for the day in my voice.
Pin 1 = HERO (story-driven hook).
Pin 2 = DETAIL (close-up of one product/element).
Pin 3 = LIFESTYLE (in-context scene).
Each pin: title + description + illustrated and photoreal visual prompts.
Forbidden words: revolutionary, game-changer.`,
  guide: `e.g.
Write a long-form weekly guide structured as:
## Hook (2 sentences)
## This Week's Story
## 5 Pin Concepts (numbered, each with hashtags)
## Hook Lines (7 bullets)
## Call to Action
Tone: warm, specific, never generic.`,
  inspiration_pin: `e.g.
Create one mood-board inspiration pin around an emotional theme.
Output: title, mood description, 3 visual prompt variations, palette story, prop rules.
Avoid: stock-photo language, generic boards.`,
};

export default function PromptsSettingsPage() {
  const { taskPrompts, upsertTaskPrompt, removeTaskPrompt } = useUserStore();
  const [activeTask, setActiveTask] = useState<UserTaskPromptKind>(
    USER_TASK_PROMPT_KINDS[0]
  );
  const [draft, setDraft] = useState<string>("");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const current: UserTaskPromptDTO | undefined = taskPrompts[activeTask];

  useEffect(() => {
    setDraft(current?.prompt_text ?? "");
    setShowHistory(false);
    setShowPreview(false);
  }, [activeTask, current?.prompt_text]);

  const dirty = (current?.prompt_text ?? "") !== draft;

  const handleSave = useCallback(async () => {
    if (!draft.trim()) {
      toast.error("Prompt cannot be empty");
      return;
    }
    setBusy("save");
    try {
      const res = await fetch("/api/prompts/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: activeTask,
          prompt_text: draft,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error || "Failed to save prompt");
        return;
      }
      const j = (await res.json()) as { prompt: UserTaskPromptDTO };
      upsertTaskPrompt(j.prompt);
      toast.success(
        `${USER_TASK_PROMPT_LABELS[activeTask]} prompt saved (v${j.prompt.version})`
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [activeTask, draft, upsertTaskPrompt]);

  const handleResetToDefault = useCallback(async () => {
    if (!current) {
      setDraft("");
      return;
    }
    setBusy("delete");
    try {
      const res = await fetch(
        `/api/prompts/tasks?task=${encodeURIComponent(activeTask)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error || "Failed to reset prompt");
        return;
      }
      removeTaskPrompt(activeTask);
      setDraft("");
      toast.success(
        `${USER_TASK_PROMPT_LABELS[activeTask]} reset to default`
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [activeTask, current, removeTaskPrompt]);

  const handleRestoreVersion = useCallback(
    (text: string) => {
      setDraft(text);
      setShowHistory(false);
      toast.message("Loaded into editor — click Save to keep this version.");
    },
    []
  );

  const previewText = useMemo(() => {
    return [
      "## CREATOR'S MASTER PROMPT (this is what your saved prompt becomes)",
      "",
      draft.trim() ||
        "(empty — generators will use the built-in default for this task)",
      "",
      "Note: at generation time, this is wrapped with your BASE BRAND, CAMPAIGN, OUTPUT TYPE, EMOTIONAL MODIFIER, and FEEDBACK SIGNAL layers — you don't need to repeat brand voice or niche details unless you want to override them.",
    ].join("\n");
  }, [draft]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif text-deep-espresso mb-1">
          Custom Prompts
        </h3>
        <p className="text-xs text-charcoal">
          Save your own master prompt for each generation task. Saved prompts
          are merged with your brand voice, niches, palette, and feedback
          signal at generation time — they replace the built-in default.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {USER_TASK_PROMPT_KINDS.map((k) => {
          const has = !!taskPrompts[k];
          return (
            <button
              key={k}
              onClick={() => setActiveTask(k)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                activeTask === k
                  ? "bg-deep-espresso text-warm-ivory border-deep-espresso"
                  : "bg-warm-ivory text-charcoal border-warm-taupe/40 hover:bg-cream-hover"
              }`}
            >
              {USER_TASK_PROMPT_LABELS[k]}
              {has && (
                <span
                  className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${
                    activeTask === k ? "bg-warm-ivory" : "bg-soft-sage"
                  }`}
                  title="Saved"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-sm font-medium">
              {USER_TASK_PROMPT_LABELS[activeTask]} prompt
            </Label>
            <p className="text-[11px] text-charcoal mt-0.5">
              {TASK_HINTS[activeTask]}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-warm-taupe shrink-0">
            {current ? (
              <span>
                v{current.version}
                {current.updated_at
                  ? ` · ${new Date(current.updated_at).toLocaleString()}`
                  : ""}
              </span>
            ) : (
              <span className="italic">Using built-in default</span>
            )}
          </div>
        </div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={PLACEHOLDER[activeTask]}
          rows={14}
          className="w-full bg-warm-ivory border border-warm-taupe/40 rounded-lg p-3 text-sm font-mono leading-relaxed focus:outline-none focus:border-deep-espresso"
          spellCheck={false}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={busy !== null || !draft.trim() || !dirty}
            size="sm"
            className="bg-deep-espresso text-warm-ivory rounded-lg"
          >
            <Save size={12} className="mr-1.5" />
            {busy === "save" ? "Saving…" : "Save"}
          </Button>
          <Button
            onClick={() => setShowPreview((s) => !s)}
            size="sm"
            variant="outline"
            className="border-warm-taupe rounded-lg"
          >
            <Eye size={12} className="mr-1.5" />
            {showPreview ? "Hide preview" : "Preview merged"}
          </Button>
          <Button
            onClick={() => setShowHistory((s) => !s)}
            disabled={!current || (current.history?.length ?? 0) === 0}
            size="sm"
            variant="outline"
            className="border-warm-taupe rounded-lg"
          >
            <History size={12} className="mr-1.5" />
            History ({current?.history?.length ?? 0})
          </Button>
          <Button
            onClick={handleResetToDefault}
            disabled={busy !== null || !current}
            size="sm"
            variant="outline"
            className="border-warm-taupe rounded-lg text-charcoal"
            title="Delete saved prompt and use the built-in default"
          >
            <RotateCcw size={12} className="mr-1.5" />
            {busy === "delete" ? "Resetting…" : "Reset to default"}
          </Button>
          {dirty && (
            <span className="text-[11px] text-dusty-rose ml-auto">
              Unsaved changes
            </span>
          )}
        </div>

        {showPreview && (
          <div className="rounded-lg border border-warm-taupe/30 bg-warm-ivory/60 p-3">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-deep-espresso">
              <FileText size={12} />
              Merged prompt preview
            </div>
            <pre className="whitespace-pre-wrap text-[12px] text-charcoal leading-relaxed">
              {previewText}
            </pre>
          </div>
        )}

        {showHistory && current && (
          <div className="rounded-lg border border-warm-taupe/30 bg-warm-ivory/60 p-3 space-y-3">
            <div className="text-xs font-medium text-deep-espresso">
              Previous versions
            </div>
            {(current.history ?? []).map((h) => (
              <div
                key={`${h.version}-${h.saved_at}`}
                className="border border-warm-taupe/30 rounded-md p-2 bg-white/70"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-warm-taupe">
                    v{h.version} · {new Date(h.saved_at).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleRestoreVersion(h.prompt_text)}
                    className="text-[11px] text-dusty-rose hover:underline"
                  >
                    Load into editor
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-[12px] text-charcoal max-h-40 overflow-auto">
                  {h.prompt_text}
                </pre>
              </div>
            ))}
            {(current.history ?? []).length === 0 && (
              <p className="text-[11px] text-charcoal italic">
                No previous versions yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

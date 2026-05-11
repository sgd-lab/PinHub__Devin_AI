"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  FileText,
  Save,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  parseGenerationOutput,
  type ParsedPin,
} from "@/lib/parsing/pinSections";
import { FeedToGuideModal } from "./FeedToGuideModal";
import { AddToCalendarModal } from "./AddToCalendarModal";
import { PushToNotionModal } from "./PushToNotionModal";
import { SaveToLibraryModal } from "./SaveToLibraryModal";

interface WorkflowActionsProps {
  /** The raw markdown output of a generation run. */
  output: string;
  /** ID of the run for traceability. Optional. */
  runId: string | null;
  /** Type of run: 'single' | 'daily' | 'inspiration' | 'guide' */
  runType: string | null;
  /** Active niche / brand for guide context. Optional. */
  niche?: string | null;
  /** Which actions to show. Omit a key to hide that button. */
  show?: {
    feedToGuide?: boolean;
    addToCalendar?: boolean;
    pushToNotion?: boolean;
    saveToLibrary?: boolean;
  };
  /** Optional className for the wrapping flex. */
  className?: string;
  /**
   * Override the auto-parsed pins. Useful for surfaces where we already
   * have structured data and don't want to re-parse the raw markdown
   * (e.g. the Guide generator which produces a single long document).
   */
  pinsOverride?: ParsedPin[];
  /** Extra buttons to render alongside the standard ones. */
  extraButtons?: React.ReactNode;
}

export function WorkflowActions({
  output,
  runId,
  runType,
  niche,
  show,
  className,
  pinsOverride,
  extraButtons,
}: WorkflowActionsProps) {
  const cfg = {
    feedToGuide: true,
    addToCalendar: true,
    pushToNotion: true,
    saveToLibrary: true,
    ...show,
  };

  const [feedOpen, setFeedOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [notionOpen, setNotionOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);

  const parsed = useMemo(() => parseGenerationOutput(output), [output]);
  const pins = pinsOverride ?? parsed.pins;
  const hasContent =
    pins.length > 0 && pins.some((p) => p.title || p.description);

  return (
    <>
      <div
        className={
          className ??
          "flex flex-wrap gap-2 pt-2 border-t border-warm-taupe/20"
        }
      >
        {cfg.saveToLibrary && (
          <Button
            size="sm"
            onClick={() => setLibOpen(true)}
            disabled={!hasContent}
            className="bg-deep-espresso text-warm-ivory rounded-lg hover:bg-deep-espresso/90 transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Save size={14} className="mr-1 transition-transform group-hover/button:scale-110" />
            Save to Library
          </Button>
        )}
        {cfg.feedToGuide && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFeedOpen(true)}
            disabled={!hasContent}
            className="border-warm-taupe rounded-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <FileText size={14} className="mr-1 transition-transform group-hover/button:scale-110" />
            Feed to Guide Generator
          </Button>
        )}
        {cfg.addToCalendar && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCalOpen(true)}
            disabled={!hasContent}
            className="border-warm-taupe rounded-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Calendar size={14} className="mr-1 transition-transform group-hover/button:scale-110" />
            {pins.length > 1 ? "Add All to Calendar" : "Add to Calendar"}
          </Button>
        )}
        {cfg.pushToNotion && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNotionOpen(true)}
            disabled={!hasContent}
            className="border-warm-taupe rounded-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Send size={14} className="mr-1 transition-transform group-hover/button:scale-110" />
            {pins.length > 1 ? "Push to Notion" : "Send to Notion"}
          </Button>
        )}
        {extraButtons}
      </div>

      {cfg.feedToGuide && (
        <FeedToGuideModal
          open={feedOpen}
          onOpenChange={setFeedOpen}
          pins={pins}
          runId={runId}
          runType={runType}
          niche={niche ?? null}
        />
      )}
      {cfg.addToCalendar && (
        <AddToCalendarModal
          open={calOpen}
          onOpenChange={setCalOpen}
          pins={pins}
          runId={runId}
          runType={runType}
        />
      )}
      {cfg.pushToNotion && (
        <PushToNotionModal
          open={notionOpen}
          onOpenChange={setNotionOpen}
          pins={pins}
          runId={runId}
          runType={runType}
        />
      )}
      {cfg.saveToLibrary && (
        <SaveToLibraryModal
          open={libOpen}
          onOpenChange={setLibOpen}
          pins={pins}
          runId={runId}
          runType={runType}
        />
      )}
    </>
  );
}

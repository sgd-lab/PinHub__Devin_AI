/**
 * Per-user task prompt types — shared between client + server.
 *
 * `single_pin`     — Single Pin generator
 * `three_pins`     — Daily Three Pins generator
 * `guide`          — Guide generator
 * `inspiration_pin`— Inspiration Pin generator
 *
 * Mirrors the `task` check constraint in
 * supabase/migrations/0005_user_task_prompts.sql.
 */
export type UserTaskPromptKind =
  | "single_pin"
  | "three_pins"
  | "guide"
  | "inspiration_pin";

export const USER_TASK_PROMPT_KINDS: UserTaskPromptKind[] = [
  "single_pin",
  "three_pins",
  "guide",
  "inspiration_pin",
];

export const USER_TASK_PROMPT_LABELS: Record<UserTaskPromptKind, string> = {
  single_pin: "Single Pin",
  three_pins: "Three Pins (Daily)",
  guide: "Guide",
  inspiration_pin: "Inspiration Pin",
};

export interface UserTaskPromptHistoryEntry {
  version: number;
  prompt_text: string;
  saved_at: string;
}

/** Shape returned to the browser — never includes any user secrets. */
export interface UserTaskPromptDTO {
  task: UserTaskPromptKind;
  name: string;
  prompt_text: string;
  version: number;
  history: UserTaskPromptHistoryEntry[];
  is_default_override: boolean;
  updated_at: string | null;
}

export function isUserTaskPromptKind(s: unknown): s is UserTaskPromptKind {
  return (
    typeof s === "string" &&
    (USER_TASK_PROMPT_KINDS as string[]).includes(s)
  );
}

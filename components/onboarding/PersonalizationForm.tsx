"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BrandColor, UserPreferences, UserProfile } from "@/lib/auth/types";

const TONE_PRESETS = [
  "Editorial · warm",
  "Quiet luxury",
  "Playful · punchy",
  "Refined · minimal",
  "Bold · expressive",
  "Soft · feminine",
];

const STYLE_PRESETS = [
  "Minimal",
  "Tailored",
  "Workwear",
  "Weekend",
  "Evening",
  "Old money",
  "Streetwear",
  "Coastal",
  "Romantic",
  "Edgy",
];

const HOOK_PRESETS = [
  "Question",
  "Bold statement",
  "List · 3 items",
  "How-to",
  "Problem · solution",
  "Story · personal",
  "Number · stat",
  "Reframe",
];

const DEFAULT_PALETTE: BrandColor[] = [
  { name: "Ivory", hex: "#F5F0E8" },
  { name: "Taupe", hex: "#C9A99A" },
];

export interface PersonalizationFormValue {
  display_name: string;
  brand_name: string;
  tagline: string;
  main_niche: string;
  sub_niches: string[];
  brand_colors: BrandColor[];
  creator_tone: string;
  favorite_styles: string[];
  preferred_hook_styles: string[];
  audience_address: string;
}

export function emptyPersonalizationValue(
  profile?: UserProfile | null,
  prefs?: UserPreferences | null
): PersonalizationFormValue {
  const subs = profile?.sub_niches ?? [];
  return {
    display_name: profile?.display_name ?? "",
    brand_name: profile?.brand_name ?? "",
    tagline: profile?.tagline ?? "",
    main_niche: profile?.main_niche ?? "",
    sub_niches: [
      subs[0] ?? "",
      subs[1] ?? "",
      subs[2] ?? "",
    ],
    brand_colors:
      profile?.brand_colors && profile.brand_colors.length > 0
        ? profile.brand_colors.slice(0, 6)
        : DEFAULT_PALETTE,
    creator_tone: prefs?.creator_tone ?? "",
    favorite_styles: prefs?.favorite_styles ?? [],
    preferred_hook_styles: prefs?.preferred_hook_styles ?? [],
    audience_address: prefs?.audience_address ?? "you",
  };
}

interface Props {
  value: PersonalizationFormValue;
  onChange: (v: PersonalizationFormValue) => void;
  /** When true, hide the brand name / tagline / display name basics
   *  (rendered separately on the Welcome step). */
  compact?: boolean;
}

export function PersonalizationForm({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <BasicsBlock value={value} onChange={onChange} />
      <NichesBlock value={value} onChange={onChange} />
      <ColorsBlock value={value} onChange={onChange} />
      <ToneBlock value={value} onChange={onChange} />
    </div>
  );
}

function BasicsBlock({ value, onChange }: Props) {
  return (
    <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-medium text-deep-espresso uppercase tracking-wider">
        Basics
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Your name</Label>
          <Input
            value={value.display_name}
            onChange={(e) =>
              onChange({ ...value, display_name: e.target.value })
            }
            placeholder="e.g. Sofia"
            className="bg-warm-ivory border-warm-taupe/40 rounded-lg mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Brand name</Label>
          <Input
            value={value.brand_name}
            onChange={(e) =>
              onChange({ ...value, brand_name: e.target.value })
            }
            placeholder="What should we call your brand?"
            className="bg-warm-ivory border-warm-taupe/40 rounded-lg mt-1"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Tagline</Label>
        <Input
          value={value.tagline}
          onChange={(e) => onChange({ ...value, tagline: e.target.value })}
          placeholder="One line that captures your brand"
          className="bg-warm-ivory border-warm-taupe/40 rounded-lg mt-1"
        />
      </div>
    </div>
  );
}

function NichesBlock({ value, onChange }: Props) {
  const setSub = (i: number, v: string) => {
    const next = [...value.sub_niches];
    next[i] = v;
    onChange({ ...value, sub_niches: next });
  };

  return (
    <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-medium text-deep-espresso uppercase tracking-wider">
        Niches
      </h3>
      <div>
        <Label className="text-xs">Main niche</Label>
        <Input
          value={value.main_niche}
          onChange={(e) =>
            onChange({ ...value, main_niche: e.target.value })
          }
          placeholder="e.g. Quiet luxury fashion"
          className="bg-warm-ivory border-warm-taupe/40 rounded-lg mt-1"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Label className="text-xs">Sub niche {i + 1}</Label>
            <Input
              value={value.sub_niches[i] ?? ""}
              onChange={(e) => setSub(i, e.target.value)}
              placeholder={
                ["Workwear", "Weekend", "Evening"][i] ?? ""
              }
              className="bg-warm-ivory border-warm-taupe/40 rounded-lg mt-1"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-charcoal">
        Your main niche drives your weekly rotation. Sub niches power the
        Pinterest board structure.
      </p>
    </div>
  );
}

function ColorsBlock({ value, onChange }: Props) {
  const colors = value.brand_colors;

  const updateColor = (i: number, patch: Partial<BrandColor>) => {
    const next = colors.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    onChange({ ...value, brand_colors: next });
  };
  const removeColor = (i: number) => {
    onChange({
      ...value,
      brand_colors: colors.filter((_, idx) => idx !== i),
    });
  };
  const addColor = () => {
    if (colors.length >= 6) return;
    onChange({
      ...value,
      brand_colors: [...colors, { name: `Color ${colors.length + 1}`, hex: "#3E2723" }],
    });
  };

  return (
    <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-deep-espresso uppercase tracking-wider">
          Brand colors
        </h3>
        <span className="text-xs text-charcoal">
          {colors.length} / 6
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {colors.map((c, i) => (
          <div
            key={i}
            className="bg-warm-ivory border border-warm-taupe/30 rounded-lg p-3 flex items-center gap-2"
          >
            <input
              type="color"
              value={c.hex}
              onChange={(e) => updateColor(i, { hex: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-warm-taupe/30"
              aria-label={`Pick color for ${c.name}`}
            />
            <div className="flex-1">
              <Input
                value={c.name}
                onChange={(e) => updateColor(i, { name: e.target.value })}
                placeholder="Color name"
                className="bg-white/60 border-warm-taupe/30 rounded text-xs h-7"
              />
              <Input
                value={c.hex}
                onChange={(e) => updateColor(i, { hex: e.target.value })}
                placeholder="#000000"
                className="bg-white/60 border-warm-taupe/30 rounded text-xs h-7 mt-1 font-mono"
              />
            </div>
            <button
              onClick={() => removeColor(i)}
              className="text-warm-taupe hover:text-red-500"
              aria-label={`Remove ${c.name}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {colors.length < 6 && (
          <button
            onClick={addColor}
            className="border border-dashed border-warm-taupe/40 rounded-lg p-3 text-sm text-charcoal hover:bg-cream-hover flex items-center justify-center gap-1"
          >
            <Plus size={14} /> Add color
          </button>
        )}
      </div>
    </div>
  );
}

function ToneBlock({ value, onChange }: Props) {
  const toggle = (
    field: "favorite_styles" | "preferred_hook_styles",
    item: string
  ) => {
    const set = new Set(value[field]);
    if (set.has(item)) set.delete(item);
    else set.add(item);
    onChange({ ...value, [field]: Array.from(set) });
  };

  return (
    <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-medium text-deep-espresso uppercase tracking-wider">
        Voice & tone
      </h3>
      <div>
        <Label className="text-xs">Creator tone</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {TONE_PRESETS.map((t) => {
            const active = value.creator_tone === t;
            return (
              <button
                key={t}
                onClick={() => onChange({ ...value, creator_tone: t })}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? "bg-deep-espresso text-warm-ivory border-deep-espresso"
                    : "bg-warm-ivory text-charcoal border-warm-taupe/40 hover:border-deep-espresso/40"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <Input
          value={value.creator_tone}
          onChange={(e) =>
            onChange({ ...value, creator_tone: e.target.value })
          }
          placeholder="…or write your own"
          className="bg-warm-ivory border-warm-taupe/40 rounded-lg mt-2"
        />
      </div>

      <div>
        <Label className="text-xs">Favorite styles</Label>
        <ChipSelector
          options={STYLE_PRESETS}
          selected={value.favorite_styles}
          onToggle={(s) => toggle("favorite_styles", s)}
        />
      </div>

      <div>
        <Label className="text-xs">Preferred hook styles</Label>
        <ChipSelector
          options={HOOK_PRESETS}
          selected={value.preferred_hook_styles}
          onToggle={(s) => toggle("preferred_hook_styles", s)}
        />
      </div>

      <div>
        <Label className="text-xs">Audience address</Label>
        <Input
          value={value.audience_address}
          onChange={(e) =>
            onChange({ ...value, audience_address: e.target.value })
          }
          placeholder='How do you talk to your audience? e.g. "you", "we", "darling"'
          className="bg-warm-ivory border-warm-taupe/40 rounded-lg mt-1"
        />
      </div>
    </div>
  );
}

function ChipSelector({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (s: string) => void;
}) {
  const set = new Set(selected);
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map((s) => {
        const active = set.has(s);
        return (
          <button
            key={s}
            onClick={() => onToggle(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              active
                ? "bg-dusty-rose/30 text-deep-espresso border-dusty-rose"
                : "bg-warm-ivory text-charcoal border-warm-taupe/40 hover:border-deep-espresso/40"
            }`}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

export function ColorPreviewStrip({ colors }: { colors: BrandColor[] }) {
  return (
    <div className="flex gap-1.5">
      {colors.map((c) => (
        <div
          key={c.hex}
          className="w-7 h-7 rounded-md border border-warm-taupe/30"
          style={{ backgroundColor: c.hex }}
          title={c.name}
        />
      ))}
    </div>
  );
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export { Button };

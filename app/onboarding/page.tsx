"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Palette,
  Sparkles,
  Tag,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";
import { useUserStore } from "@/stores/userStore";
import { useBrandStore } from "@/stores/brandStore";
import { upsertUserProfile } from "@/lib/auth/userProfileRepository";
import { upsertUserPreferences } from "@/lib/auth/userPreferencesRepository";
import { replaceBrandMemoryOfKind } from "@/lib/auth/brandMemoryRepository";
import { buildBrandProfileFromUser } from "@/lib/brands/userBrandAdapter";
import { isSupabaseConfigured } from "@/lib/db/supabase";
import {
  PersonalizationForm,
  emptyPersonalizationValue,
  ColorPreviewStrip,
  type PersonalizationFormValue,
} from "@/components/onboarding/PersonalizationForm";
import { toast } from "sonner";

const STEPS = [
  { id: 0, label: "Welcome", icon: Sparkles },
  { id: 1, label: "Niches", icon: Tag },
  { id: 2, label: "Colors", icon: Palette },
  { id: 3, label: "Voice & tone", icon: Wand2 },
  { id: 4, label: "Review", icon: Check },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const { setOnboardingComplete } = useUIStore();
  const {
    authUser,
    profile,
    preferences,
    loaded,
    setProfile,
    setPreferences,
  } = useUserStore();
  const { setBrands, setActiveBrand } = useBrandStore();

  const [value, setValue] = useState<PersonalizationFormValue>(() =>
    emptyPersonalizationValue(profile, preferences)
  );

  useEffect(() => {
    if (loaded) {
      setValue(emptyPersonalizationValue(profile, preferences));
    }
  }, [loaded, profile, preferences]);

  useEffect(() => {
    if (loaded && !isSupabaseConfigured()) {
      router.replace("/login");
    }
  }, [loaded, router]);

  const handleNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const validateNiches = () =>
    value.main_niche.trim().length > 0 &&
    value.sub_niches.filter((n) => n.trim().length > 0).length === 3;

  const validateColors = () =>
    value.brand_colors.length >= 1 && value.brand_colors.length <= 6;

  const handleComplete = async () => {
    if (!authUser) {
      toast.error("Not signed in");
      return;
    }
    if (!validateNiches()) {
      toast.error("Please fill in your main niche and 3 sub niches");
      setStep(1);
      return;
    }
    if (!validateColors()) {
      toast.error("Please pick between 1 and 6 brand colors");
      setStep(2);
      return;
    }

    setSaving(true);
    try {
      const subs = value.sub_niches
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const updatedProfile = await upsertUserProfile({
        user_id: authUser.id,
        email: authUser.email ?? null,
        display_name: value.display_name.trim() || authUser.name || null,
        brand_name: value.brand_name.trim() || null,
        tagline: value.tagline.trim() || null,
        main_niche: value.main_niche.trim(),
        sub_niches: subs,
        brand_colors: value.brand_colors.filter(
          (c) => c.hex && c.hex.length > 0
        ),
        primary_market: profile?.primary_market ?? "US, CA, UK",
        onboarding_completed: true,
      });

      const updatedPrefs = await upsertUserPreferences({
        user_id: authUser.id,
        creator_tone: value.creator_tone.trim() || null,
        favorite_styles: value.favorite_styles,
        preferred_hook_styles: value.preferred_hook_styles,
        signature_openers: preferences?.signature_openers ?? [],
        power_words: preferences?.power_words ?? [],
        forbidden_words: preferences?.forbidden_words ?? [],
        audience_address: value.audience_address.trim() || "you",
        default_provider: preferences?.default_provider ?? null,
        default_temperature: preferences?.default_temperature ?? 0.7,
      });

      await Promise.all([
        value.creator_tone
          ? replaceBrandMemoryOfKind(authUser.id, "tone", [
              value.creator_tone,
            ])
          : Promise.resolve(),
        replaceBrandMemoryOfKind(
          authUser.id,
          "favorite_style",
          value.favorite_styles
        ),
        replaceBrandMemoryOfKind(
          authUser.id,
          "hook_style",
          value.preferred_hook_styles
        ),
      ]);

      if (updatedProfile) setProfile(updatedProfile);
      if (updatedPrefs) setPreferences(updatedPrefs);

      if (updatedProfile) {
        const synthesized = buildBrandProfileFromUser(
          updatedProfile,
          updatedPrefs ?? null,
          []
        );
        setBrands([synthesized]);
        setActiveBrand(synthesized.id);
      }

      setOnboardingComplete(true);
      toast.success("Brand profile saved — welcome to your atelier");
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      toast.error("Could not save your profile. Try again?");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-warm-ivory flex items-center justify-center text-charcoal">
        Loading…
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-warm-ivory flex items-center justify-center text-charcoal">
        Please sign in first.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-ivory flex">
      <div className="hidden md:flex w-72 bg-warm-ivory border-r border-warm-taupe/30 p-6 flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-deep-espresso rounded-lg flex items-center justify-center">
              <span className="text-warm-ivory font-serif text-sm font-bold">
                P
              </span>
            </div>
            <span className="font-serif text-lg font-semibold text-deep-espresso italic">
              PinHub
            </span>
          </div>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <h3 className="text-xs font-medium text-charcoal uppercase tracking-wider mb-3">
            Onboarding
          </h3>
          <div className="space-y-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isComplete = s.id < step;
              const isCurrent = s.id === step;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded ${
                    isCurrent
                      ? "bg-dusty-rose/10 text-deep-espresso font-medium"
                      : isComplete
                        ? "text-soft-sage"
                        : "text-warm-taupe"
                  }`}
                >
                  {isComplete ? (
                    <Check size={14} className="text-soft-sage" />
                  ) : (
                    <Icon size={14} />
                  )}
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-charcoal">
            Step {step + 1} of {STEPS.length}
          </div>
          <div className="mt-2 h-1.5 bg-warm-taupe/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-dusty-rose rounded-full transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-auto text-[10px] text-warm-taupe uppercase tracking-widest">
          Personalize · save · come back
        </div>
      </div>

      <div className="flex-1 flex justify-center p-8 overflow-y-auto">
        <div className="max-w-2xl w-full">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-4xl text-deep-espresso italic mb-2">
                  Welcome,{" "}
                  {authUser.name?.split(" ")[0] ||
                    authUser.email?.split("@")[0] ||
                    "creator"}
                  .
                </h1>
                <p className="text-charcoal text-lg leading-relaxed">
                  Let&apos;s set up your brand memory. We&apos;ll ask a few
                  questions so PinHub can speak in your voice and stay on your
                  palette across every pin.
                </p>
              </div>
              <ul className="text-sm text-charcoal space-y-2 list-disc pl-5">
                <li>Main niche and 3 sub niches</li>
                <li>Up to 6 brand colors</li>
                <li>Creator tone, favorite styles, hook styles</li>
              </ul>
              <Button
                onClick={handleNext}
                className="bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium"
              >
                Begin <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>
          )}

          {step >= 1 && step <= 3 && (
            <div className="space-y-6">
              <PersonalizationForm value={value} onChange={setValue} />
              <NavRow
                onBack={handleBack}
                onNext={handleNext}
                nextLabel="Continue"
                disabled={
                  step === 1
                    ? !validateNiches()
                    : step === 2
                      ? !validateColors()
                      : false
                }
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl text-deep-espresso italic mb-2">
                  Almost there
                </h1>
                <p className="text-charcoal">
                  Review your brand profile. You can edit any of this later
                  from Settings → Profile & Brand.
                </p>
              </div>

              <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-3">
                <div>
                  <h3 className="font-serif text-xl text-deep-espresso">
                    {value.brand_name || value.display_name || "Your brand"}
                  </h3>
                  {value.tagline && (
                    <p className="text-sm text-charcoal">{value.tagline}</p>
                  )}
                </div>
                <ColorPreviewStrip colors={value.brand_colors} />
                <div className="flex flex-wrap gap-1.5">
                  {[value.main_niche, ...value.sub_niches]
                    .filter(Boolean)
                    .map((n) => (
                      <span
                        key={n}
                        className="rounded-full px-3 py-1 text-xs uppercase tracking-wider bg-dusty-rose/10 text-deep-espresso"
                      >
                        {n}
                      </span>
                    ))}
                </div>
                <div className="text-xs text-charcoal">
                  Tone: {value.creator_tone || "—"} · Audience:{" "}
                  {value.audience_address || "—"}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="border-warm-taupe text-deep-espresso rounded-lg"
                >
                  <ArrowLeft size={14} className="mr-2" /> Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex-1 bg-deep-espresso text-warm-ivory rounded-lg font-medium"
                >
                  {saving
                    ? "Saving…"
                    : "Enter Atelier Workspace"}{" "}
                  {!saving && <ArrowRight size={14} className="ml-2" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel,
  disabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <Button
        onClick={onBack}
        variant="outline"
        className="border-warm-taupe text-deep-espresso rounded-lg"
      >
        <ArrowLeft size={14} className="mr-2" /> Back
      </Button>
      <Button
        onClick={onNext}
        disabled={disabled}
        className="flex-1 bg-deep-espresso text-warm-ivory rounded-lg"
      >
        {nextLabel} <ArrowRight size={14} className="ml-2" />
      </Button>
    </div>
  );
}

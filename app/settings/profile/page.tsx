"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/stores/userStore";
import { useBrandStore } from "@/stores/brandStore";
import { upsertUserProfile } from "@/lib/auth/userProfileRepository";
import { upsertUserPreferences } from "@/lib/auth/userPreferencesRepository";
import { replaceBrandMemoryOfKind } from "@/lib/auth/brandMemoryRepository";
import { buildBrandProfileFromUser } from "@/lib/brands/userBrandAdapter";
import {
  PersonalizationForm,
  emptyPersonalizationValue,
  type PersonalizationFormValue,
} from "@/components/onboarding/PersonalizationForm";
import { toast } from "sonner";

export default function ProfileSettingsPage() {
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded) {
      setValue(emptyPersonalizationValue(profile, preferences));
    }
  }, [loaded, profile, preferences]);

  const handleSave = async () => {
    if (!authUser) {
      toast.error("Not signed in");
      return;
    }
    if (
      !value.main_niche.trim() ||
      value.sub_niches.filter((n) => n.trim()).length !== 3
    ) {
      toast.error("Please keep your main niche and 3 sub niches filled in");
      return;
    }
    if (value.brand_colors.length < 1 || value.brand_colors.length > 6) {
      toast.error("Pick between 1 and 6 brand colors");
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = await upsertUserProfile({
        user_id: authUser.id,
        email: authUser.email ?? null,
        display_name: value.display_name.trim() || authUser.name || null,
        brand_name: value.brand_name.trim() || null,
        tagline: value.tagline.trim() || null,
        main_niche: value.main_niche.trim(),
        sub_niches: value.sub_niches.map((s) => s.trim()).filter(Boolean),
        brand_colors: value.brand_colors.filter(
          (c) => c.hex && c.hex.length > 0
        ),
        primary_market: profile?.primary_market ?? "US, CA, UK",
        onboarding_completed: profile?.onboarding_completed ?? true,
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

      toast.success("Profile saved");
    } catch (e) {
      console.error(e);
      toast.error("Could not save profile. Try again?");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="text-charcoal text-sm">Loading your brand profile…</div>
    );
  }

  if (!authUser) {
    return (
      <div className="text-charcoal text-sm">
        Please sign in to edit your profile.
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-deep-espresso italic">
          Profile & Brand
        </h1>
        <p className="text-sm text-charcoal mt-1">
          Update the brand memory PinHub uses across Prompt Studio, daily
          rotations and exports.
        </p>
      </div>

      <PersonalizationForm value={value} onChange={setValue} />

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-deep-espresso text-warm-ivory rounded-lg"
        >
          <Save size={14} className="mr-2" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/stores/userStore";
import { useBrandStore } from "@/stores/brandStore";
import { buildBrandProfileFromUser } from "@/lib/brands/userBrandAdapter";
import type { UserProfile, UserPreferences } from "@/lib/auth/types";
import {
  PersonalizationForm,
  emptyPersonalizationValue,
  type PersonalizationFormValue,
} from "@/components/onboarding/PersonalizationForm";
import { toast } from "sonner";

/**
 * Create a second (or third, fourth, …) brand without overwriting the
 * primary brand created at onboarding. The primary brand stays in
 * `user_profiles` on Supabase; additional brands live in the client-side
 * brandStore (zustand + localStorage) and become the active brand for
 * all subsequent generations.
 *
 * Reached from the TopBar BrandSwitcher → "+ Add new brand" and from the
 * /brands page → "+ New Brand" button.
 */
export default function NewBrandPage() {
  const router = useRouter();
  const { authUser, profile } = useUserStore();
  const { addBrand, setActiveBrand } = useBrandStore();

  const [value, setValue] = useState<PersonalizationFormValue>(() =>
    emptyPersonalizationValue(null, null)
  );
  const [saving, setSaving] = useState(false);

  const handleCreate = () => {
    if (!authUser) {
      toast.error("Sign in first");
      return;
    }
    const main = value.main_niche.trim();
    const subs = value.sub_niches.map((s) => s.trim()).filter(Boolean);
    if (!main || subs.length < 1) {
      toast.error("Please fill in your main niche and at least one sub niche.");
      return;
    }
    if (value.brand_colors.length < 1) {
      toast.error("Please pick at least one brand color.");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      // We never write this row to Supabase — `user_profiles` is reserved
      // for the primary brand. We just shape a UserProfile-like value so
      // the existing adapter can synthesize a BrandProfile.
      const draftProfile: UserProfile = {
        user_id: authUser.id,
        email: authUser.email ?? null,
        display_name: value.display_name.trim() || null,
        brand_name: value.brand_name.trim() || null,
        tagline: value.tagline.trim() || null,
        main_niche: main,
        sub_niches: subs,
        brand_colors: value.brand_colors,
        primary_market: profile?.primary_market ?? "US, CA, UK",
        onboarding_completed: true,
        created_at: now,
        updated_at: now,
      };
      const draftPrefs: UserPreferences = {
        user_id: authUser.id,
        creator_tone: value.creator_tone.trim() || null,
        favorite_styles: value.favorite_styles,
        preferred_hook_styles: value.preferred_hook_styles,
        signature_openers: [],
        power_words: [],
        forbidden_words: [],
        audience_address: value.audience_address.trim() || "you",
        default_provider: null,
        default_temperature: 0.7,
        selected_outputs: [],
        rejected_outputs: [],
        created_at: now,
        updated_at: now,
      };

      const newBrand = buildBrandProfileFromUser(draftProfile, draftPrefs, []);
      // The adapter ids brands by user_id which would collide with the
      // primary brand. Give every additional brand a unique id so the
      // store can hold both.
      newBrand.id = `user-${authUser.id}-${crypto.randomUUID()}`;
      addBrand(newBrand);
      setActiveBrand(newBrand.id);
      toast.success(`${newBrand.identity.name} is now your active brand`);
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create that brand. Try again?");
    } finally {
      setSaving(false);
    }
  };

  if (!authUser) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-charcoal">
        Please sign in first.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="border-warm-taupe rounded-lg"
          onClick={() => router.back()}
        >
          <ArrowLeft size={14} className="mr-2" /> Back
        </Button>
        <div>
          <h2 className="font-serif text-2xl text-deep-espresso italic">
            Add a new brand
          </h2>
          <p className="text-sm text-charcoal">
            Spin up a second profile — niches, palette, voice. The brand you
            were using before stays untouched.
          </p>
        </div>
      </div>

      <PersonalizationForm value={value} onChange={setValue} />

      <div className="flex justify-end gap-3 pt-2 border-t border-warm-taupe/30">
        <Button
          variant="outline"
          className="border-warm-taupe text-deep-espresso rounded-lg"
          onClick={() => router.push("/brands")}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={saving}
          className="bg-deep-espresso text-warm-ivory rounded-lg font-medium"
        >
          <Plus size={14} className="mr-2" />
          {saving ? "Creating…" : "Create brand"}
          {!saving && <ArrowRight size={14} className="ml-2" />}
        </Button>
      </div>
    </div>
  );
}

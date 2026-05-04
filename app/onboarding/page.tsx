"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Key, Link2, Palette, Check, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUIStore } from "@/stores/uiStore";
import { useBrandStore } from "@/stores/brandStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { loadMayaSofiaDefaults } from "@/lib/brands/brandDefaults";
import { saveBrand } from "@/lib/db/brandRepository";
import { storeApiKey } from "@/lib/encryption/keyStore";
import { testProviderConnection } from "@/lib/ai/providerAdapter";
import { toast } from "sonner";

const steps = [
  { id: 0, label: "Welcome", icon: Sparkles },
  { id: 1, label: "API Keys", icon: Key },
  { id: 2, label: "Notion Connect", icon: Link2 },
  { id: 3, label: "Brand Profile", icon: Palette },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [geminiKey, setGeminiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [geminiStatus, setGeminiStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [openrouterStatus, setOpenrouterStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [nvidiaStatus, setNvidiaStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [notionToken, setNotionToken] = useState("");
  const [notionPageId, setNotionPageId] = useState("");
  const [loadedDefaults, setLoadedDefaults] = useState(false);

  const { setOnboardingComplete, setOnboardingStep, updateOnboardingChecklist } = useUIStore();
  const { addBrand, setActiveBrand } = useBrandStore();
  const { setProvider, setNotion } = useSettingsStore();

  const passphrase = "pinhub-default-key";

  const handleLoadDefaults = async () => {
    const defaults = loadMayaSofiaDefaults();
    await saveBrand(defaults);
    addBrand(defaults);
    setActiveBrand(defaults.id);
    updateOnboardingChecklist("loadBrandDefaults", true);
    setLoadedDefaults(true);
    toast.success("Maya Sofia brand loaded successfully");
    setCurrentStep(1);
    setOnboardingStep(1);
  };

  const handleStartBlank = () => {
    setCurrentStep(1);
    setOnboardingStep(1);
  };

  const handleTestGemini = async () => {
    if (!geminiKey) return;
    setGeminiStatus("testing");
    const result = await testProviderConnection("gemini", geminiKey, "https://generativelanguage.googleapis.com/v1beta/openai");
    if (result.success) {
      storeApiKey("gemini", geminiKey, passphrase);
      setGeminiStatus("success");
      setProvider("gemini", { api_key_ref: "gemini", enabled: true, validated: true });
      toast.success("Gemini connected successfully");
    } else {
      setGeminiStatus("error");
      toast.error(`Gemini connection failed: ${result.error}`);
    }
  };

  const handleTestNvidia = async () => {
    if (!nvidiaKey) return;
    setNvidiaStatus("testing");
    const result = await testProviderConnection("nvidia", nvidiaKey, "https://integrate.api.nvidia.com/v1");
    if (result.success) {
      storeApiKey("nvidia", nvidiaKey, passphrase);
      setNvidiaStatus("success");
      setProvider("nvidia", { api_key_ref: "nvidia", enabled: true, validated: true });
      toast.success("NVIDIA connected successfully");
    } else {
      setNvidiaStatus("error");
      toast.error(`NVIDIA connection failed: ${result.error}`);
    }
  };

  const handleTestOpenRouter = async () => {
    if (!openrouterKey) return;
    setOpenrouterStatus("testing");
    const result = await testProviderConnection("openrouter", openrouterKey, "https://openrouter.ai/api/v1");
    if (result.success) {
      storeApiKey("openrouter", openrouterKey, passphrase);
      setOpenrouterStatus("success");
      setProvider("openrouter", { api_key_ref: "openrouter", enabled: true, validated: true });
      toast.success("OpenRouter connected successfully");
    } else {
      setOpenrouterStatus("error");
      toast.error(`OpenRouter connection failed: ${result.error}`);
    }
  };

  const hasAnyApiKey = geminiStatus === "success" || openrouterStatus === "success" || nvidiaStatus === "success";

  const handleApiKeysNext = () => {
    if (!hasAnyApiKey) {
      toast.error("Please connect at least one AI provider to continue");
      return;
    }
    updateOnboardingChecklist("addApiKeys", true);
    setCurrentStep(2);
    setOnboardingStep(2);
  };

  const handleNotionConnect = () => {
    if (notionToken && notionPageId) {
      setNotion({
        integration_token_ref: "notion",
        parent_page_id: notionPageId,
        enabled: true,
      });
      storeApiKey("notion", notionToken, passphrase);
      updateOnboardingChecklist("connectNotion", true);
      toast.success("Notion connected successfully");
    }
    setCurrentStep(3);
    setOnboardingStep(3);
  };

  const handleSkipNotion = () => {
    setCurrentStep(3);
    setOnboardingStep(3);
  };

  const handleComplete = () => {
    setOnboardingComplete(true);
    setOnboardingStep(4);
    router.push("/dashboard");
    toast.success("Welcome to PinHub — Atelier Workspace!");
  };

  return (
    <div className="min-h-screen bg-warm-ivory flex">
      {/* Left sidebar progress */}
      <div className="w-72 bg-warm-ivory border-r border-warm-taupe/30 p-6 flex flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-deep-espresso rounded-lg flex items-center justify-center">
              <span className="text-warm-ivory font-serif text-sm font-bold">P</span>
            </div>
            <span className="font-serif text-lg font-semibold text-deep-espresso italic">PinHub</span>
          </div>
        </div>

        <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-4">
          <h3 className="text-xs font-medium text-charcoal uppercase tracking-wider mb-3">
            Onboarding
          </h3>
          <div className="space-y-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const isComplete = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded ${
                    isCurrent ? "bg-dusty-rose/10 text-deep-espresso font-medium" :
                    isComplete ? "text-soft-sage" : "text-warm-taupe"
                  }`}
                >
                  {isComplete ? (
                    <Check size={14} className="text-soft-sage" />
                  ) : (
                    <Icon size={14} />
                  )}
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-charcoal">
            Step {currentStep + 1} of 4
          </div>
          <div className="mt-2 h-1.5 bg-warm-taupe/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-dusty-rose rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / 4) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-auto text-[10px] text-warm-taupe uppercase tracking-widest">
          The Parisian Atelier v1.0
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-xl w-full">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <h1 className="font-serif text-4xl text-deep-espresso italic">Welcome to PinHub</h1>
              <p className="text-charcoal text-lg leading-relaxed">
                Experience Pinterest strategy as a craft. Would you like to load your Maya Sofia defaults now?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleLoadDefaults}
                  className="bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium hover:bg-deep-espresso/90"
                >
                  <Sparkles className="mr-2" size={16} />
                  Load Maya Sofia
                </Button>
                <Button
                  onClick={handleStartBlank}
                  variant="outline"
                  className="border-warm-taupe bg-transparent text-deep-espresso px-6 py-3 rounded-lg"
                >
                  Start Blank
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: API Keys */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl text-deep-espresso italic mb-2">Configure Your Atelier</h1>
                <p className="text-charcoal">
                  Connect at least one AI provider to begin. We recommend starting with a <strong>free tier</strong> option.
                </p>
              </div>

              <div className="bg-soft-sage/10 border border-soft-sage/30 rounded-lg p-4 text-sm text-deep-espresso">
                <p className="font-medium mb-1">Recommended: Start free</p>
                <p className="text-xs text-charcoal">Gemini and OpenRouter both offer free tiers — no credit card required. You can add more providers later in Settings.</p>
              </div>

              <div className="space-y-4">
                {/* Gemini - Free Tier */}
                <div className="bg-white/60 border-2 border-soft-sage/40 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Gemini API Key</Label>
                      <span className="text-[10px] bg-soft-sage/20 text-soft-sage px-1.5 py-0.5 rounded font-medium uppercase">Free Tier</span>
                    </div>
                    {geminiStatus === "success" && (
                      <span className="text-xs text-soft-sage flex items-center gap-1">
                        <Check size={12} /> Connected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-charcoal mb-3">60 requests/min, 1,500/day. No credit card required.</p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
                    />
                    <Button
                      onClick={handleTestGemini}
                      disabled={!geminiKey || geminiStatus === "testing"}
                      className="bg-deep-espresso text-warm-ivory rounded-lg"
                    >
                      {geminiStatus === "testing" ? "Testing..." : "Test"}
                    </Button>
                  </div>
                  <a href="https://ai.google.dev" target="_blank" rel="noopener" className="text-xs text-dusty-rose hover:underline mt-2 inline-block">
                    Get a free API key at ai.google.dev
                  </a>
                </div>

                {/* OpenRouter - Free Models */}
                <div className="bg-white/60 border-2 border-soft-sage/40 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">OpenRouter API Key</Label>
                      <span className="text-[10px] bg-soft-sage/20 text-soft-sage px-1.5 py-0.5 rounded font-medium uppercase">Free Models</span>
                    </div>
                    {openrouterStatus === "success" && (
                      <span className="text-xs text-soft-sage flex items-center gap-1">
                        <Check size={12} /> Connected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-charcoal mb-3">Free models available (e.g. meta-llama/llama-3.1-8b-instruct:free).</p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={openrouterKey}
                      onChange={(e) => setOpenrouterKey(e.target.value)}
                      placeholder="sk-or-..."
                      className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
                    />
                    <Button
                      onClick={handleTestOpenRouter}
                      disabled={!openrouterKey || openrouterStatus === "testing"}
                      className="bg-deep-espresso text-warm-ivory rounded-lg"
                    >
                      {openrouterStatus === "testing" ? "Testing..." : "Test"}
                    </Button>
                  </div>
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" className="text-xs text-dusty-rose hover:underline mt-2 inline-block">
                    Get a key at openrouter.ai
                  </a>
                </div>

                {/* NVIDIA - Paid */}
                <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">NVIDIA API Key</Label>
                    {nvidiaStatus === "success" && (
                      <span className="text-xs text-soft-sage flex items-center gap-1">
                        <Check size={12} /> Connected
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={nvidiaKey}
                      onChange={(e) => setNvidiaKey(e.target.value)}
                      placeholder="nvapi-..."
                      className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
                    />
                    <Button
                      onClick={handleTestNvidia}
                      disabled={!nvidiaKey || nvidiaStatus === "testing"}
                      className="bg-deep-espresso text-warm-ivory rounded-lg"
                    >
                      {nvidiaStatus === "testing" ? "Testing..." : "Test"}
                    </Button>
                  </div>
                  <a href="https://build.nvidia.com/" target="_blank" rel="noopener" className="text-xs text-dusty-rose hover:underline mt-2 inline-block">
                    Where to find this
                  </a>
                </div>
              </div>

              {!hasAnyApiKey && (
                <p className="text-xs text-dusty-rose text-center">Connect at least one provider to continue</p>
              )}

              <Button
                onClick={handleApiKeysNext}
                disabled={!hasAnyApiKey}
                className="w-full bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium disabled:opacity-50"
              >
                Continue <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>
          )}

          {/* Step 2: Notion Connect */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl text-deep-espresso italic mb-2">Connect Your Library</h1>
                <p className="text-charcoal">
                  Sync your curated workspace. Your PinHub atelier will automatically organize assets directly from your Notion databases.
                </p>
              </div>

              <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Notion Integration Token</Label>
                  <Input
                    type="password"
                    value={notionToken}
                    onChange={(e) => setNotionToken(e.target.value)}
                    placeholder="secret_..."
                    className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Parent Page ID</Label>
                  <Input
                    value={notionPageId}
                    onChange={(e) => setNotionPageId(e.target.value)}
                    placeholder="Page ID from Notion URL"
                    className="bg-warm-ivory border-warm-taupe/40 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleNotionConnect}
                  className="flex-1 bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium"
                >
                  Connect Notion
                </Button>
                <Button
                  onClick={handleSkipNotion}
                  variant="outline"
                  className="border-warm-taupe bg-transparent text-deep-espresso px-6 py-3 rounded-lg"
                >
                  Skip for now
                </Button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-warm-taupe justify-center">
                <Lock size={10} />
                Secure end-to-end sync
              </div>
            </div>
          )}

          {/* Step 3: Brand Profile */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl text-deep-espresso italic mb-2">Brand Voice Calibration</h1>
                <p className="text-charcoal">
                  {loadedDefaults
                    ? "Your Maya Sofia brand profile has been loaded. Review and customize it, or start creating right away."
                    : "Set up your brand profile to begin. You can always edit this later in Brand Profiles."}
                </p>
              </div>

              {loadedDefaults && (
                <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {["#F5F0E8", "#C9A99A", "#B5C4B1", "#C9B458", "#3E2723"].map((hex) => (
                        <div
                          key={hex}
                          className="w-8 h-8 rounded-lg border border-warm-taupe/20"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-deep-espresso">Maya Sofia</h3>
                    <p className="text-sm text-charcoal">Quiet Luxury, Curated Daily</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["Workwear", "Weekend", "Evening"].map((niche) => (
                      <span
                        key={niche}
                        className="rounded-full px-3 py-1 text-xs uppercase tracking-wider bg-dusty-rose/10 text-deep-espresso"
                      >
                        {niche}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleComplete}
                className="w-full bg-deep-espresso text-warm-ivory px-6 py-3 rounded-lg font-medium"
              >
                Enter Atelier Workspace <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

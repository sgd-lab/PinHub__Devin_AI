"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, Palette, Plus } from "lucide-react";
import { useBrandStore } from "@/stores/brandStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Top-bar brand switcher. Lists every saved brand, highlights the active
 * one with a checkmark, and exposes a "+ Add new brand" entry point so
 * the creator never has to dig through Settings → Profile to spin up a
 * second profile.
 *
 * Brand state lives in {@link useBrandStore} (zustand + localStorage) so
 * switching feels instant; the active brand id is the input for every
 * generator in the app.
 */
export function BrandSwitcher() {
  const router = useRouter();
  const { brands, activeBrand, activeBrandId, setActiveBrand } =
    useBrandStore();

  const activeId = activeBrandId || activeBrand?.id || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Switch brand"
          title={
            activeBrand
              ? `Active brand: ${activeBrand.identity.name}`
              : "No brand selected"
          }
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-deep-espresso border border-warm-taupe/40 rounded-lg hover:bg-cream-hover active:scale-95 transition-all duration-150"
        >
          <Palette size={14} strokeWidth={1.5} />
          <span className="max-w-[120px] truncate">
            {activeBrand?.identity.name || "No Brand"}
          </span>
          <ChevronDown size={14} strokeWidth={1.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-warm-taupe">
          Your brands
        </DropdownMenuLabel>
        {brands.length === 0 && (
          <DropdownMenuItem disabled>No brands configured</DropdownMenuItem>
        )}
        {brands.map((brand) => {
          const isActive = brand.id === activeId;
          return (
            <DropdownMenuItem
              key={brand.id}
              onClick={() => setActiveBrand(brand.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <div
                  className="w-3 h-3 rounded-full shrink-0 ring-1 ring-warm-taupe/20"
                  style={{
                    backgroundColor:
                      brand.visual_system.palette[0]?.hex || "#C9A99A",
                  }}
                />
                <span className="truncate flex-1">{brand.identity.name}</span>
                {isActive && (
                  <Check
                    size={14}
                    className="text-soft-sage shrink-0"
                    aria-label="Active"
                  />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/brands/new")}
          className="cursor-pointer"
        >
          <Plus size={14} className="mr-2 text-dusty-rose" />
          Add new brand
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

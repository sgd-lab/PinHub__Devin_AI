"use client";

import { ChevronDown, Palette } from "lucide-react";
import { useBrandStore } from "@/stores/brandStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BrandSwitcher() {
  const { brands, activeBrand, setActiveBrand } = useBrandStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-deep-espresso border border-warm-taupe/40 rounded-lg hover:bg-cream-hover transition-colors">
          <Palette size={14} strokeWidth={1.5} />
          <span className="max-w-[120px] truncate">
            {activeBrand?.identity.name || "No Brand"}
          </span>
          <ChevronDown size={14} strokeWidth={1.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {brands.map((brand) => (
          <DropdownMenuItem
            key={brand.id}
            onClick={() => setActiveBrand(brand.id)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: brand.visual_system.palette[0]?.hex || "#C9A99A",
                }}
              />
              <span>{brand.identity.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
        {brands.length === 0 && (
          <DropdownMenuItem disabled>No brands configured</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

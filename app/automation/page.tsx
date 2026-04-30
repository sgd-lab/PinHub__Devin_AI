"use client";

import { Zap, Clock, Play, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AutomationPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-deep-espresso">Automation Hub</h2>
          <p className="text-sm text-charcoal mt-1">Schedule and automate your content workflow</p>
        </div>
        <span className="text-[10px] bg-muted-gold/20 text-muted-gold px-3 py-1 rounded-full uppercase tracking-wider font-medium">Coming Soon</span>
      </div>

      <div className="bg-white/60 border border-warm-taupe/30 rounded-lg p-8 text-center">
        <div className="w-20 h-20 bg-muted-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Zap size={32} className="text-muted-gold" />
        </div>
        <h3 className="font-serif text-xl text-deep-espresso mb-2">Automation Hub — Coming Soon</h3>
        <p className="text-sm text-charcoal max-w-md mx-auto mb-6">
          Automated scheduling, batch generation, and workflow triggers are planned for the next release.
          Currently available: manual generation via the Generate pages.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
          <div className="bg-warm-ivory rounded-lg p-4 text-left">
            <Clock size={16} className="text-muted-gold mb-2" />
            <h4 className="text-sm font-medium text-deep-espresso mb-1">Scheduled Runs</h4>
            <p className="text-xs text-charcoal">Auto-generate at 6 AM daily</p>
          </div>
          <div className="bg-warm-ivory rounded-lg p-4 text-left">
            <Calendar size={16} className="text-muted-gold mb-2" />
            <h4 className="text-sm font-medium text-deep-espresso mb-1">Calendar Fill</h4>
            <p className="text-xs text-charcoal">Auto-fill empty calendar days</p>
          </div>
          <div className="bg-warm-ivory rounded-lg p-4 text-left">
            <Play size={16} className="text-muted-gold mb-2" />
            <h4 className="text-sm font-medium text-deep-espresso mb-1">Notion Auto-Sync</h4>
            <p className="text-xs text-charcoal">Push to Notion on generation</p>
          </div>
        </div>

        <Link href="/dashboard">
          <Button variant="outline" className="border-warm-taupe rounded-lg text-sm">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

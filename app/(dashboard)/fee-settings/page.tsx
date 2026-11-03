import { Percent, Sparkles } from "lucide-react";
import FeeSettingsTab from "../coupons/components/fee-settings-tab";

export default function FeeSettingsPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white via-white to-amber-50 px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-amber-100/60 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-sm ring-4 ring-amber-100">
            <Percent className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              <Sparkles className="h-3.5 w-3.5" /> Pricing configuration
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
              GST &amp; Platform Fees
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
              Configure GST and platform-fee rates for Bidding and Book Now categories.
            </p>
          </div>
        </div>
      </header>
      <FeeSettingsTab />
    </div>
  );
}

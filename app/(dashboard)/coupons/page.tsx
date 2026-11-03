"use client";

import { CircleHelp, Layers3, Package, Sparkles, Ticket, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CouponsTab from "./components/coupons-tab";
import CategoriesTab from "./components/categories-tab";
import ServicesTab from "./components/services-tab";
import PackagesTab from "./components/packages-tab";
import HelpSupportTab from "./components/help-support-tab";

const tabClass =
  "inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium text-gray-600 transition-colors hover:bg-white hover:text-gray-900 data-[state=active]:bg-white data-[state=active]:text-amber-800 data-[state=active]:shadow-sm [&_svg]:h-4 [&_svg]:w-4";

export default function CouponsPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white via-white to-amber-50 px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-amber-100/60 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-sm ring-4 ring-amber-100">
            <Ticket className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              <Sparkles className="h-3.5 w-3.5" /> Promotions &amp; app content
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Coupon Management</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
              Create and manage offers, service catalogs, packages, and customer support content from one workspace.
            </p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="coupons" className="space-y-5">
        <div className="sticky top-0 z-10 -mx-4 overflow-x-auto border-y border-gray-200/80 bg-gray-50/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:overflow-visible sm:border-0 sm:bg-transparent sm:p-0">
          <TabsList aria-label="Coupon management sections" className="h-auto w-max min-w-max justify-start gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm sm:min-w-0">
            <TabsTrigger className={tabClass} value="coupons"><Ticket />Coupons</TabsTrigger>
            <TabsTrigger className={tabClass} value="categories"><Layers3 />Categories</TabsTrigger>
            <TabsTrigger className={tabClass} value="services"><Wrench />Services</TabsTrigger>
            <TabsTrigger className={tabClass} value="packages"><Package />Packages / SKUs</TabsTrigger>
            <TabsTrigger className={tabClass} value="help-support"><CircleHelp />Help &amp; Support</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="coupons" className="mt-0"><CouponsTab /></TabsContent>
        <TabsContent value="categories" className="mt-0"><CategoriesTab /></TabsContent>
        <TabsContent value="services" className="mt-0"><ServicesTab /></TabsContent>
        <TabsContent value="packages" className="mt-0"><PackagesTab /></TabsContent>
        <TabsContent value="help-support" className="mt-0"><HelpSupportTab /></TabsContent>
      </Tabs>
    </div>
  );
}

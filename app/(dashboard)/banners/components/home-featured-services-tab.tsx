"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listOperationalSkus,
  listServiceContent,
  listSkuContent,
  updateSkuContent,
  type OperationalSku,
  type ServiceContent,
  type SkuContent,
} from "@/lib/api/coupon-management";
import { Notice, PanelHeader, StatusBadge } from "../../coupons/components/shared";

export default function HomeFeaturedServicesTab() {
  const [packages, setPackages] = useState<SkuContent[]>([]);
  const [services, setServices] = useState<ServiceContent[]>([]);
  const [operational, setOperational] = useState<OperationalSku[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [packageRows, serviceRows, operationalRows] = await Promise.all([
        listSkuContent(),
        listServiceContent(),
        listOperationalSkus(),
      ]);
      setPackages(packageRows.filter((row) => row.isActive));
      setServices(serviceRows);
      setOperational(operationalRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const serviceNames = useMemo(
    () => new Map(services.map((service) => [service.categorySlug, service.title])),
    [services],
  );
  const priceByKey = useMemo(
    () => new Map(operational.map((sku) => [`${sku.categorySlug}::${sku.slug}`, sku])),
    [operational],
  );
  const ordered = useMemo(
    () => [...packages].sort((a, b) =>
      Number(b.isFeaturedOnHome) - Number(a.isFeaturedOnHome) ||
      (a.featuredSortOrder ?? 0) - (b.featuredSortOrder ?? 0) ||
      a.displayName.localeCompare(b.displayName),
    ),
    [packages],
  );
  const categories = useMemo(
    () => [...new Set(packages.map((row) => row.categorySlug))].sort((a, b) =>
      (serviceNames.get(a) || a).localeCompare(serviceNames.get(b) || b),
    ),
    [packages, serviceNames],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ordered.filter((row) => {
      if (category !== "all" && row.categorySlug !== category) return false;
      if (!query) return true;
      return [
        row.displayName,
        row.skuSlug,
        row.categorySlug,
        serviceNames.get(row.categorySlug) || "",
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [category, ordered, search, serviceNames]);
  const toggleFeatured = async (row: SkuContent) => {
    setSavingId(row._id);
    setError(null);
    try {
      await updateSkuContent(row._id, {
        isFeaturedOnHome: !row.isFeaturedOnHome,
        featuredSortOrder: row.featuredSortOrder ?? 0,
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to update featured service");
    } finally {
      setSavingId(null);
    }
  };
  const updateOrder = async (row: SkuContent, value: string) => {
    const featuredSortOrder = Number(value);
    if (!Number.isInteger(featuredSortOrder)) return;
    setSavingId(row._id);
    setError(null);
    try {
      await updateSkuContent(row._id, { featuredSortOrder });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to update display order");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section>
      <PanelHeader
        title="Featured services"
        description="Choose which live Book Now packages appear in the customer home Featured Services section and set their order."
        action={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>}
      />
      {error ? <Notice error>{error}</Notice> : null}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            aria-label="Search featured services and packages"
            className="pl-9"
            placeholder="Search services or packages…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          aria-label="Filter featured services by category"
          className="h-10 min-w-[220px] rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((slug) => (
            <option key={slug} value={slug}>{serviceNames.get(slug) || slug}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>{["Feature", "Service", "Package", "Current price", "Featured order", "Status"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((row) => {
              const sku = priceByKey.get(`${row.categorySlug}::${row.skuSlug}`);
              const price = sku?.pricing?.isOfferActive ? sku.pricing.offerPrice : sku?.basePrice;
              return (
                <tr key={row._id}>
                  <td className="px-4 py-3">
                    <Button size="sm" variant={row.isFeaturedOnHome ? "default" : "outline"} disabled={savingId === row._id} onClick={() => void toggleFeatured(row)}>
                      <Star className="mr-1 h-4 w-4" />{row.isFeaturedOnHome ? "Featured" : "Add"}
                    </Button>
                  </td>
                  <td className="px-4 py-3">{serviceNames.get(row.categorySlug) || row.categorySlug}</td>
                  <td className="px-4 py-3 font-medium">{row.displayName}</td>
                  <td className="px-4 py-3">{typeof price === "number" ? `₹${price}` : "—"}</td>
                  <td className="px-4 py-3"><input aria-label={`Featured order for ${row.displayName}`} className="w-24 rounded-md border px-2 py-1" type="number" defaultValue={row.featuredSortOrder ?? 0} disabled={!row.isFeaturedOnHome || savingId === row._id} onBlur={(event) => void updateOrder(row, event.target.value)} /></td>
                  <td className="px-4 py-3"><StatusBadge active={row.isActive} /></td>
                </tr>
              );
            })}
            {!filtered.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">{loading ? "Loading…" : ordered.length ? "No packages match your search and category filters." : "No active packages available."}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-500">If no packages are selected, the app automatically displays Book Now packages with active price offers.</p>
    </section>
  );
}

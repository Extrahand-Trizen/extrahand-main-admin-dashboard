"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCustomerHomePromotion,
  listCoupons,
  listCustomerHomeCouponOffers,
  listCustomerHomePromotions,
  updateCoupon,
  updateCustomerHomePromotion,
  type CustomerHomeCouponOffer,
  type CustomerHomePromotion,
  type Coupon,
} from "@/lib/api/coupon-management";
import { Field, FormDialog, Notice, PanelHeader, StatusBadge, fieldClass } from "./shared";

type PromotionForm = {
  tag: string;
  title: string;
  subtitle: string;
  actionType: CustomerHomePromotion["actionType"];
  actionValue: string;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const emptyForm = (): PromotionForm => ({
  tag: "",
  title: "",
  subtitle: "",
  actionType: "none",
  actionValue: "",
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
  isActive: true,
});

function localDate(value: string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function dateToIso(value: string, isEndDate = false) {
  if (!value) return null;
  const time = isEndDate ? "T23:59:59.999Z" : "T00:00:00.000Z";
  return new Date(`${value}${time}`).toISOString();
}

export default function HomePromotionsTab() {
  const [rows, setRows] = useState<CustomerHomePromotion[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponOffers, setCouponOffers] = useState<CustomerHomeCouponOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomerHomePromotion | null>(null);
  const [form, setForm] = useState<PromotionForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingCouponCode, setSavingCouponCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [promotionRows, couponRows, allCoupons] = await Promise.all([
        listCustomerHomePromotions(),
        listCustomerHomeCouponOffers(),
        listCoupons(),
      ]);
      setRows(promotionRows);
      setCouponOffers(couponRows);
      setCoupons(allCoupons);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load home promotions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
  };
  const openReferAndEarn = () => {
    setEditing(null);
    setForm({
      ...emptyForm(),
      tag: "Refer & Earn",
      title: "Invite friends and earn rewards",
      subtitle: "Share your referral code and earn rewards when friends join.",
      actionType: "route",
      actionValue: "ReferralScreen",
      sortOrder: String(rows.length),
    });
    setFormError(null);
  };
  const openEdit = (row: CustomerHomePromotion) => {
    setEditing(row);
    setForm({
      tag: row.tag,
      title: row.title,
      subtitle: row.subtitle,
      actionType: row.actionType,
      actionValue: row.actionValue || "",
      sortOrder: String(row.sortOrder ?? 0),
      startsAt: localDate(row.startsAt),
      endsAt: localDate(row.endsAt),
      isActive: row.isActive,
    });
    setFormError(null);
  };
  const closeForm = () => {
    setForm(null);
    setEditing(null);
    setFormError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    if (form.actionType !== "none" && !form.actionValue.trim()) {
      setFormError("Enter a destination for this promotion");
      return;
    }
    if (form.startsAt && form.endsAt && form.endsAt < form.startsAt) {
      setFormError("End date must be on or after the start date");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        tag: form.tag.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        actionType: form.actionType,
        actionValue: form.actionValue.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        startsAt: dateToIso(form.startsAt),
        endsAt: dateToIso(form.endsAt, true),
        isActive: form.isActive,
      };
      if (editing) await updateCustomerHomePromotion(editing._id, payload);
      else await createCustomerHomePromotion(payload);
      closeForm();
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: CustomerHomePromotion) => {
    setError(null);
    try {
      await updateCustomerHomePromotion(row._id, { isActive: !row.isActive });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status update failed");
    }
  };
  const toggleCouponInOffers = async (coupon: Coupon) => {
    setSavingCouponCode(coupon.code);
    setError(null);
    try {
      await updateCoupon(coupon._id, { showOnHomeOffers: coupon.showOnHomeOffers === false });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Coupon Offers visibility update failed");
    } finally {
      setSavingCouponCode(null);
    }
  };

  const now = Date.now();
  const homeOfferCandidates = coupons.filter((coupon) =>
    coupon.isActive &&
    (coupon.applicableFlows || []).includes("BOOK_NOW") &&
    coupon.applicableLocations === "ALL_LOCATIONS" &&
    coupon.redemptionScope !== "GLOBAL_SINGLE_USE" &&
    new Date(coupon.startDate).getTime() <= now &&
    (!coupon.expiryDate || new Date(coupon.expiryDate).getTime() >= now),
  );
  const liveOfferCodes = new Set(couponOffers.map((offer) => offer.code));

  return (
    <section>
      <PanelHeader
        title="Home promotions"
        description="Manage the custom cards shown alongside live coupon offers in the customer home Offers section."
        action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button><Button variant="outline" onClick={openReferAndEarn}><Plus />Add Refer &amp; Earn</Button><Button onClick={openNew}><Plus />Add promotion</Button></div>}
      />
      {error ? <Notice error>{error}</Notice> : null}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-900">Customer coupon offers ({homeOfferCandidates.length})</h3>
          <p className="mt-1 text-sm text-gray-500">
            Remove or restore coupons in the customer app&apos;s Offers carousel without affecting coupon redemption at checkout.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>{["Coupon", "Discount", "Minimum booking", "Eligibility", "Customer Offers", "Action"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {homeOfferCandidates.map((coupon) => {
                const isVisible = coupon.showOnHomeOffers !== false;
                const isCurrentlyShown = isVisible && liveOfferCodes.has(coupon.code);
                return (
                <tr key={coupon._id}>
                  <td className="px-4 py-3 font-semibold">{coupon.code}</td>
                  <td className="px-4 py-3">{coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}% off` : `₹${coupon.discountValue} off`}</td>
                  <td className="px-4 py-3">{coupon.minOrderAmount > 0 ? `₹${coupon.minOrderAmount}` : "No minimum"}</td>
                  <td className="px-4 py-3">{coupon.applicableTo === "SELECTED_SERVICES" ? "Selected services" : "All services"}{coupon.firstBookingOnly ? " · First booking" : ""}</td>
                  <td className="px-4 py-3"><StatusBadge active={isVisible} />{isVisible && !isCurrentlyShown ? <span className="ml-2 text-xs text-gray-500">Not in current feed</span> : null}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant={isVisible ? "secondary" : "default"} disabled={savingCouponCode === coupon.code} onClick={() => void toggleCouponInOffers(coupon)}>
                      {isVisible ? "Remove from Offers" : "Show in Offers"}
                    </Button>
                  </td>
                </tr>
                );
              })}
              {!homeOfferCandidates.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{loading ? "Loading…" : "No active Book Now coupons are eligible for customer Offers."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>{["Order", "Tag", "Title", "Destination", "Schedule", "Status", "Actions"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row._id}>
                <td className="px-4 py-3">{row.sortOrder}</td>
                <td className="px-4 py-3 font-semibold">{row.tag}</td>
                <td className="px-4 py-3"><div className="font-medium">{row.title}</div><div className="text-xs text-gray-500">{row.subtitle}</div></td>
                <td className="px-4 py-3">{row.actionType === "none" ? "No action" : `${row.actionType}: ${row.actionValue}`}</td>
                <td className="px-4 py-3 text-xs">{row.startsAt ? localDate(row.startsAt) : "Anytime"} – {row.endsAt ? localDate(row.endsAt) : "No end date"}</td>
                <td className="px-4 py-3"><StatusBadge active={row.isActive} /></td>
                <td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button><Button size="sm" variant={row.isActive ? "secondary" : "default"} onClick={() => void toggle(row)}>{row.isActive ? "Deactivate" : "Activate"}</Button></div></td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">{loading ? "Loading…" : "No home promotions configured."}</td></tr> : null}
          </tbody>
        </table>
      </div>
      {form ? (
        <FormDialog title={editing ? "Edit home promotion" : "Add home promotion"} onClose={closeForm} onSubmit={submit} saving={saving} error={formError} submitLabel={editing ? "Save changes" : "Add promotion"}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tag"><Input required maxLength={40} value={form.tag} onChange={(event) => setForm((current) => current ? { ...current, tag: event.target.value } : current)} /></Field>
            <Field label="Display order"><Input type="number" value={form.sortOrder} onChange={(event) => setForm((current) => current ? { ...current, sortOrder: event.target.value } : current)} /></Field>
            <Field label="Title"><Input required maxLength={100} value={form.title} onChange={(event) => setForm((current) => current ? { ...current, title: event.target.value } : current)} /></Field>
            <Field label="Subtitle"><Input required maxLength={160} value={form.subtitle} onChange={(event) => setForm((current) => current ? { ...current, subtitle: event.target.value } : current)} /></Field>
            <Field label="Tap action">
              <select className={fieldClass} value={form.actionType} onChange={(event) => setForm((current) => current ? { ...current, actionType: event.target.value as PromotionForm["actionType"] } : current)}>
                <option value="none">No action</option><option value="route">App screen</option><option value="category">Book Now category</option><option value="services_hub">Services hub</option><option value="url">External URL</option>
              </select>
            </Field>
            <Field label="Action value"><Input disabled={form.actionType === "none"} placeholder={form.actionType === "services_hub" ? "book_now" : "Screen name, category slug, or URL"} value={form.actionValue} onChange={(event) => setForm((current) => current ? { ...current, actionValue: event.target.value } : current)} /></Field>
            <Field label="Start date (optional)"><Input type="date" value={form.startsAt} onChange={(event) => setForm((current) => current ? { ...current, startsAt: event.target.value } : current)} /></Field>
            <Field label="End date (optional)"><Input type="date" value={form.endsAt} onChange={(event) => setForm((current) => current ? { ...current, endsAt: event.target.value } : current)} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-600" checked={form.isActive} onChange={(event) => setForm((current) => current ? { ...current, isActive: event.target.checked } : current)} />Active</label>
        </FormDialog>
      ) : null}
    </section>
  );
}

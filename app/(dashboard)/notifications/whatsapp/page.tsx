"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CheckCircle2,
  History,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  Store,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/useAuth";
import { getActiveLocationCatalog, type ManagedLocation } from "@/lib/api/locations";
import {
  countWhatsAppAudience,
  listWhatsAppPartnerCategories,
  listApprovedWhatsAppTemplates,
  sendWhatsAppCampaign,
  type WhatsAppApplication,
  type WhatsAppTemplate,
} from "@/lib/api/whatsapp-notifications";

const APP_OPTIONS: Array<{
  value: WhatsAppApplication;
  label: string;
  Icon: typeof Users;
}> = [
  { value: "customer_app", label: "Customer App", Icon: Users },
  { value: "helper_app", label: "Partner App", Icon: BriefcaseBusiness },
  { value: "seller_app", label: "Seller App", Icon: Store },
];

const HISTORY_QUERY_KEY = ["whatsapp-campaign-history"];

function templateVariableIndexes(template?: WhatsAppTemplate): number[] {
  if (!template?.preview) return [];
  const content = [
    template.preview.headerText,
    template.preview.bodyText,
    template.preview.footerText,
    ...(template.preview.buttons || []).map((button) => button.url || ""),
    ...(template.preview.carouselCards || []).map((card) => card.bodyText),
  ].join("\n");
  const indexes = new Set<number>();
  for (const match of content.matchAll(/\{\{(\d+)\}\}/g)) {
    const index = Number(match[1]);
    if (Number.isSafeInteger(index) && index > 0) indexes.add(index);
  }
  return [...indexes].sort((first, second) => first - second);
}

function appName(app: WhatsAppApplication | null): string {
  return APP_OPTIONS.find((option) => option.value === app)?.label || "Select an app";
}

function getCityWorkAreaMatches(city: ManagedLocation): string[] {
  const matches = new Set<string>();
  const addLocation = (location: ManagedLocation) => {
    if (location.enabled === false) return;
    if (location.id.trim()) matches.add(location.id.trim());
    if (location.name.trim()) matches.add(location.name.trim());
    location.areas?.forEach(addLocation);
    location.zones?.forEach(addLocation);
  };
  addLocation(city);
  return [...matches];
}

export default function SendWhatsAppNotificationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSuperAdmin, user, loading: authLoading } = useAuth();
  const isOperationsAdmin = ["operations_admin", "operation_admin", "operations"].includes(user?.role || "");
  const canAccess = isSuperAdmin || isOperationsAdmin;
  const canLoad = canAccess && !authLoading;

  const [app, setApp] = useState<WhatsAppApplication | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ["approved-whatsapp-templates"],
    queryFn: listApprovedWhatsAppTemplates,
    enabled: canLoad,
    retry: 1,
  });
  const categoriesQuery = useQuery({
    queryKey: ["whatsapp-categories"],
    queryFn: listWhatsAppPartnerCategories,
    enabled: canLoad,
    retry: 1,
  });
  const citiesQuery = useQuery({
    queryKey: ["whatsapp-cities"],
    queryFn: async () => {
      const response = await getActiveLocationCatalog();
      if (!response?.success || !Array.isArray(response.data?.cities)) {
        throw new Error("Failed to load cities from the active location catalog");
      }
      return response;
    },
    enabled: canLoad,
    retry: 1,
  });

  const selectedTemplate = templatesQuery.data?.data?.find((template) => template.id === templateId);
  const variableIndexes = useMemo(
    () => templateVariableIndexes(selectedTemplate),
    [selectedTemplate],
  );
  const selectedCityWorkAreas = useMemo(() => {
    const selectedCityNames = new Set(cities.map((city) => city.toLowerCase()));
    return [...new Set(
      (citiesQuery.data?.data.cities || [])
        .filter((city) => selectedCityNames.has(city.name.trim().toLowerCase()))
        .flatMap(getCityWorkAreaMatches),
    )];
  }, [cities, citiesQuery.data]);
  const audienceQuery = useQuery({
    queryKey: ["whatsapp-audience", app, [...categories].sort(), [...cities].sort(), selectedCityWorkAreas],
    queryFn: () =>
      countWhatsAppAudience({
        app: app!,
        categories: app === "helper_app" ? categories : [],
        cities: app === "helper_app" || app === "customer_app" ? cities : [],
        workAreas: app === "helper_app" ? selectedCityWorkAreas : [],
      }),
    enabled:
      canLoad &&
      Boolean(app) &&
      (app !== "helper_app" ||
        (categories.length > 0 && cities.length > 0 && selectedCityWorkAreas.length > 0)),
    retry: 1,
  });
  const recipientCount = audienceQuery.data?.data?.count ?? 0;

  const sendMutation = useMutation({
    mutationFn: sendWhatsAppCampaign,
    onSuccess: (result) => {
      toast.success(
        `WhatsApp campaign started for ${result.data.recipientCount.toLocaleString("en-IN")} recipients`,
        { action: { label: "View history", onClick: () => router.push("/notifications/whatsapp/history") } },
      );
      setConfirmSendOpen(false);
      setVariables({});
      queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-audience"] });
    },
    onError: (error: Error) => {
      setConfirmSendOpen(false);
      toast.error(error.message || "Failed to start WhatsApp campaign");
    },
  });

  if (!authLoading && !canAccess) {
    router.replace("/dashboard");
    return null;
  }
  if (authLoading || !canAccess) {
    return <div className="p-8 text-sm text-gray-500">Checking access...</div>;
  }

  const chooseApp = (nextApp: WhatsAppApplication) => {
    setApp(nextApp);
    if (nextApp !== "helper_app") {
      setCategories([]);
    }
    if (nextApp === "seller_app") {
      setCities([]);
    }
  };

  const toggleSelection = (
    current: string[],
    value: string,
    update: (next: string[]) => void,
  ) => {
    update(current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!app) {
      toast.error("Select an app");
      return;
    }
    if (app === "helper_app" && (!categories.length || !cities.length || !selectedCityWorkAreas.length)) {
      toast.error("Select at least one partner category and a city with work areas");
      return;
    }
    if (!templateId || !selectedTemplate) {
      toast.error("Select an approved WhatsApp template");
      return;
    }
    if (variableIndexes.some((index) => !variables[String(index)]?.trim())) {
      toast.error("Enter a value for every template variable");
      return;
    }
    if (!recipientCount || audienceQuery.isError) {
      toast.error("There are no eligible recipients or the audience count is unavailable");
      return;
    }
    setConfirmSendOpen(true);
  };

  const sendCampaign = () => {
    if (!app || !selectedTemplate) return;
    sendMutation.mutate({
      app,
      categories: app === "helper_app" ? categories : [],
      cities: app === "helper_app" || app === "customer_app" ? cities : [],
      workAreas: app === "helper_app" ? selectedCityWorkAreas : [],
      templateId: selectedTemplate.id,
      variables: Object.fromEntries(
        variableIndexes.map((index) => [String(index), variables[String(index)].trim()]),
      ),
    });
  };

  const categoryOptions = (categoriesQuery.data?.data || [])
    .map((category) => category.name.trim())
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second));
  const cityOptions = (citiesQuery.data?.data.cities || [])
    .map((city) => city.name || "")
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name, index, list) => list.findIndex((entry) => entry.toLowerCase() === name.toLowerCase()) === index)
    .sort((first, second) => first.localeCompare(second));
  const templateStep = app === "helper_app" || app === "customer_app" ? 3 : 2;
  const variablesStep = templateStep + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Send WhatsApp Notification</h1>
          <p className="mt-2 text-sm text-gray-600">
            Send an approved Dialog template to eligible Customer, Partner or Seller App users.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/notifications/whatsapp/history">
            <History />
            View history
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              New WhatsApp Notification
            </CardTitle>
            <CardDescription>
              Select an audience → choose an approved template → enter its variables → send.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <section className="space-y-3">
                <Label>1. Application</Label>
                <div role="radiogroup" aria-label="Application" className="grid gap-3 sm:grid-cols-3">
                  {APP_OPTIONS.map(({ value, label, Icon }) => {
                    const selected = app === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => chooseApp(value)}
                        className={`flex items-center gap-3 rounded-lg border p-4 text-left text-sm font-medium transition-colors ${
                          selected
                            ? "border-yellow-500 bg-yellow-50 text-yellow-800 ring-1 ring-yellow-500"
                            : "border-gray-200 text-gray-700 hover:border-yellow-300 hover:bg-yellow-50/50"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${selected ? "text-yellow-600" : "text-gray-400"}`} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {(app === "helper_app" || app === "customer_app") && (
                <section className="space-y-4 border-t pt-5">
                  <div>
                    <Label>
                      {app === "helper_app" ? "2. Partner filters" : "2. Customer city filter (optional)"}
                    </Label>
                    {app === "helper_app" ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Partners must match a selected category and have work areas in a selected city.
                        Profile address is not used. Only approved partners are included.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        Select a city to notify only customers whose profile city matches. Leave unselected to include customers in all cities.
                      </p>
                    )}
                  </div>
                  <div className={`grid gap-4 ${app === "helper_app" ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                    {app === "helper_app" && (
                      <fieldset className="space-y-2">
                        <legend className="text-sm font-medium text-gray-800">Categories</legend>
                        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                          {categoriesQuery.isLoading ? (
                            <p className="p-2 text-sm text-gray-500">Loading categories...</p>
                          ) : categoriesQuery.isError ? (
                            <p className="p-2 text-sm text-red-600">
                              Couldn&apos;t load categories: {categoriesQuery.error.message}
                            </p>
                          ) : categoryOptions.length === 0 ? (
                            <p className="p-2 text-sm text-gray-500">No categories available.</p>
                          ) : (
                            categoryOptions.map((category) => (
                              <label key={category} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                                <input
                                  type="checkbox"
                                  checked={categories.includes(category)}
                                  onChange={() => toggleSelection(categories, category, setCategories)}
                                  className="h-4 w-4 accent-yellow-600"
                                />
                                {category}
                              </label>
                            ))
                          )}
                        </div>
                      </fieldset>
                    )}
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium text-gray-800">Cities</legend>
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                        {citiesQuery.isLoading ? (
                          <p className="p-2 text-sm text-gray-500">Loading cities...</p>
                        ) : citiesQuery.isError ? (
                          <p className="p-2 text-sm text-red-600">
                            Couldn&apos;t load cities: {citiesQuery.error.message}
                          </p>
                        ) : cityOptions.length === 0 ? (
                          <p className="p-2 text-sm text-gray-500">No cities available.</p>
                        ) : (
                          cityOptions.map((city) => (
                            <label key={city} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={cities.includes(city)}
                                onChange={() => toggleSelection(cities, city, setCities)}
                                className="h-4 w-4 accent-yellow-600"
                              />
                              {city}
                            </label>
                          ))
                        )}
                      </div>
                    </fieldset>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cities.map((city) => <Badge key={city} variant="outline"><MapPin className="mr-1 h-3 w-3" />{city}</Badge>)}
                    {categories.map((category) => <Badge key={category} variant="secondary">{category}</Badge>)}
                  </div>
                </section>
              )}

              <section className="space-y-3 border-t pt-5">
                <Label htmlFor="whatsapp-template">{templateStep}. Approved WhatsApp template</Label>
                {templatesQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading templates from Dialog...
                  </div>
                ) : templatesQuery.isError ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <span>
                      {templatesQuery.error instanceof Error
                        ? templatesQuery.error.message
                        : "Couldn&apos;t load approved templates from Dialog."}
                    </span>
                    <Button type="button" size="sm" variant="outline" onClick={() => templatesQuery.refetch()}>
                      Retry
                    </Button>
                  </div>
                ) : (templatesQuery.data?.data || []).length === 0 ? (
                  <p className="rounded-lg border p-3 text-sm text-gray-500">No approved templates are available.</p>
                ) : (
                  <Select
                    value={templateId}
                    onValueChange={(value) => {
                      setTemplateId(value);
                      setVariables({});
                    }}
                  >
                    <SelectTrigger id="whatsapp-template" aria-label="WhatsApp template">
                      <SelectValue placeholder="Select an approved template" />
                    </SelectTrigger>
                    <SelectContent>
                      {(templatesQuery.data?.data || []).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.metaTemplateName} · {template.category} · {template.language}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </section>

              {selectedTemplate && (
                <section className="space-y-4 border-t pt-5">
                  <div>
                    <Label>{variablesStep}. Template variables</Label>
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the value for each placeholder used by this template.
                    </p>
                  </div>
                  {variableIndexes.length === 0 ? (
                    <p className="text-sm text-gray-600">This template has no variables.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {variableIndexes.map((index) => (
                        <div key={index} className="space-y-2">
                          <Label htmlFor={`template-variable-${index}`}>Variable {"{{"}{index}{"}}"}</Label>
                          <Input
                            id={`template-variable-${index}`}
                            value={variables[String(index)] || ""}
                            maxLength={1024}
                            onChange={(event) =>
                              setVariables((current) => ({ ...current, [String(index)]: event.target.value }))
                            }
                            placeholder={`Value for {{${index}}}`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  {audienceQuery.isFetching ? "Counting eligible recipients..." : `${recipientCount.toLocaleString("en-IN")} eligible recipients`}
                </p>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={
                    sendMutation.isPending ||
                    !app ||
                    !selectedTemplate ||
                    audienceQuery.isFetching ||
                    recipientCount === 0
                  }
                >
                  {sendMutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                  Send WhatsApp Notification
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Review &amp; Send
              </CardTitle>
              <CardDescription>Verify the audience and selected template.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Application</p>
                <p className="font-medium text-gray-900">{appName(app)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total eligible recipients</p>
                <p className="text-xl font-semibold text-gray-900">
                  {audienceQuery.isFetching ? "…" : recipientCount.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Selected cities</p>
                <p className="text-gray-800">{cities.length ? cities.join(", ") : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Selected categories</p>
                <p className="text-gray-800">{categories.length ? categories.join(", ") : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Selected template</p>
                <p className="font-medium text-gray-900">{selectedTemplate?.metaTemplateName || "—"}</p>
                {selectedTemplate && <Badge className="mt-1 bg-green-600">Approved · {selectedTemplate.category}</Badge>}
              </div>
              {audienceQuery.isError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  Couldn&apos;t calculate recipients.{" "}
                  <button type="button" className="font-semibold underline" onClick={() => audienceQuery.refetch()}>
                    Retry
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Preview</CardTitle>
              <CardDescription>
                Template content is synced from the approved version in Trizen Dialog.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedTemplate ? (
                <p className="text-sm text-gray-500">Select a template to preview its message.</p>
              ) : (
                <div className="rounded-xl border bg-[#f7f3eb] p-3">
                  <div className="rounded-lg bg-white p-4 shadow-sm">
                    <p className="mb-3 text-xs font-semibold text-green-700">
                      {selectedTemplate.metaTemplateName}
                    </p>
                    {selectedTemplate.preview?.headerText && (
                      <p className="mb-2 font-semibold text-gray-900">{selectedTemplate.preview.headerText}</p>
                    )}
                    <p className="whitespace-pre-wrap text-sm text-gray-800">
                      {selectedTemplate.preview?.bodyText || "No text preview available."}
                    </p>
                    {selectedTemplate.preview?.footerText && (
                      <p className="mt-3 text-xs text-gray-500">{selectedTemplate.preview.footerText}</p>
                    )}
                    {(selectedTemplate.preview?.buttons || []).map((button, index) => (
                      <p key={`${button.text}-${index}`} className="mt-3 border-t pt-2 text-center text-sm text-blue-600">
                        {button.text}
                      </p>
                    ))}
                  </div>
                  <p className="mt-2 text-right text-[11px] text-gray-500">
                    {selectedTemplate.language} · {selectedTemplate.category}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmSendOpen} onOpenChange={(open) => !sendMutation.isPending && setConfirmSendOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this WhatsApp notification?</AlertDialogTitle>
            <AlertDialogDescription>
              The approved template <strong>{selectedTemplate?.metaTemplateName}</strong> will be queued for{" "}
              <strong>{recipientCount.toLocaleString("en-IN")} {appName(app)} users</strong>.
              {app === "helper_app" && ` Matching categories: ${categories.join(", ")}. Cities: ${cities.join(", ")}.`}
            {app === "customer_app" && cities.length > 0 && ` Customers in: ${cities.join(", ")}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                sendCampaign();
              }}
              disabled={sendMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendMutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              Send WhatsApp Notification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CustomerActivityCustomer,
  CustomerActivityPeriod,
  CustomerActivitySort,
  getWorkCreationDateFilter,
  listCustomerActivity,
} from "@/lib/api/customer-activity";
import { listTasks } from "@/lib/api/tasks";
import { formatDate } from "@/lib/utils";
import { Task } from "@/types";

const CUSTOMER_PAGE_SIZE = 10;
const WORK_PAGE_SIZE = 5;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getStatusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "bg-green-100 text-green-800";
  if (normalized === "cancelled") return "bg-red-100 text-red-800";
  if (normalized === "open") return "bg-blue-100 text-blue-800";
  return "bg-amber-100 text-amber-800";
}

function CustomerWorks({
  customer,
  period,
}: {
  customer: CustomerActivityCustomer;
  period: CustomerActivityPeriod;
}) {
  const [page, setPage] = useState(1);
  const dateFilter = useMemo(() => getWorkCreationDateFilter(period), [period]);
  const worksQuery = useQuery({
    queryKey: ["customer-activity-works", customer.profileId, period, page],
    queryFn: async () => {
      const response = await listTasks({
        ...dateFilter,
        customerId: [customer.profileId, customer.userId].join(","),
        page,
        limit: WORK_PAGE_SIZE,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.error || "Failed to load customer works.");
      }
      return response;
    },
  });

  if (worksQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-2 py-4 text-sm text-red-700 sm:flex-row sm:items-center">
        <p>{getErrorMessage(worksQuery.error)}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void worksQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (worksQuery.isLoading || !worksQuery.data) {
    return (
      <div className="space-y-2 py-4" aria-label="Loading customer works">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-8 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  const works = worksQuery.data.data || [];
  const pagination = worksQuery.data.pagination;

  if (works.length === 0) {
    return (
      <p className="py-4 text-sm text-gray-500">
        No works posted during this time period.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Work title</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Posted date</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {works.map((work: Task) => {
              const taskId = work.taskId || "";
              const detailsHref = `/tasks/${encodeURIComponent(taskId)}`;
              return (
                <tr key={taskId} className="bg-white">
                  <td className="px-3 py-3 font-medium text-gray-900">
                    <Link
                      href={detailsHref}
                      className="hover:text-amber-700 hover:underline"
                    >
                      {work.title || "Untitled work"}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {work.category || "Uncategorized"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                    {work.createdAt ? formatDate(work.createdAt) : "N/A"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClass(work.status || "")}`}
                    >
                      {(work.status || "Unknown").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={detailsHref}
                      className="font-medium text-amber-700 hover:underline"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || worksQuery.isFetching}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages || worksQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerRow({
  customer,
  period,
}: {
  customer: CustomerActivityCustomer;
  period: CustomerActivityPeriod;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_8rem_12rem_auto] sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
            {(customer.name.trim()[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <Link
              href={`/users/${encodeURIComponent(customer.userId)}`}
              className="block truncate font-semibold text-gray-900 hover:text-amber-700 hover:underline"
            >
              {customer.name}
            </Link>
            <p className="truncate text-sm text-gray-500">
              {customer.phone || customer.email || "No contact information"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm sm:block">
          <span className="text-gray-500 sm:hidden">Works posted</span>
          <span className="font-semibold text-gray-900">
            {customer.workCount}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm sm:block">
          <span className="text-gray-500 sm:hidden">Last work posted</span>
          <span className="text-gray-700">
            {customer.lastWorkPostedAt
              ? formatDate(customer.lastWorkPostedAt)
              : "—"}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} works posted by ${customer.name}`}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="sm:hidden">{expanded ? "Hide works" : "View works"}</span>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-4 sm:px-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">
            Works posted by {customer.name}
          </h3>
          <CustomerWorks customer={customer} period={period} />
        </div>
      )}
    </div>
  );
}

export default function CustomerActivityPage() {
  const [period, setPeriod] = useState<CustomerActivityPeriod>("30d");
  const [sort, setSort] = useState<CustomerActivitySort>("most_works");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const activityQuery = useQuery({
    queryKey: ["customer-activity", period, sort, search, page],
    queryFn: async () => {
      const response = await listCustomerActivity({
        page,
        limit: CUSTOMER_PAGE_SIZE,
        period,
        sort,
        search,
      });
      if (
        !response.success ||
        !Array.isArray(response.data) ||
        !response.pagination ||
        !response.summary
      ) {
        throw new Error(response.error || "The customer activity response was incomplete.");
      }
      return response;
    },
  });

  const summary = activityQuery.data?.summary;
  const customers = activityQuery.data?.data || [];
  const pagination = activityQuery.data?.pagination;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Activity</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review customer work posting activity and open existing customer or work details.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,2fr)_minmax(12rem,1fr)_minmax(12rem,1fr)]">
          <div className="relative">
            <label htmlFor="customer-activity-search" className="mb-1.5 block text-sm font-medium text-gray-700">
              Search Customer
            </label>
            <Search className="absolute left-3 top-[2.55rem] h-4 w-4 text-gray-400" />
            <Input
              id="customer-activity-search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              placeholder="Name, phone number, or email"
              className="pl-9"
            />
          </div>
          <div>
            <label htmlFor="customer-activity-period" className="mb-1.5 block text-sm font-medium text-gray-700">
              Time Period
            </label>
            <Select
              value={period}
              onValueChange={(value) => {
                setPeriod(value as CustomerActivityPeriod);
                setPage(1);
              }}
            >
              <SelectTrigger id="customer-activity-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="customer-activity-sort" className="mb-1.5 block text-sm font-medium text-gray-700">
              Sort By
            </label>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value as CustomerActivitySort);
                setPage(1);
              }}
            >
              <SelectTrigger id="customer-activity-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most_works">Most Works Posted</SelectItem>
                <SelectItem value="fewest_works">Fewest Works Posted</SelectItem>
                <SelectItem value="recently_posted">Most Recently Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Customer activity summary">
        <SummaryCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          label="Total Customers"
          value={summary?.totalCustomers}
          loading={activityQuery.isLoading}
        />
        <SummaryCard
          icon={<Wrench className="h-5 w-5 text-green-600" />}
          label="Total Works Posted"
          value={summary?.totalWorksPosted}
          loading={activityQuery.isLoading}
        />
        <SummaryCard
          icon={<Activity className="h-5 w-5 text-amber-600" />}
          label="Average Works per Customer"
          value={
            summary?.averageWorksPerCustomer === undefined
              ? undefined
              : summary.averageWorksPerCustomer.toFixed(2)
          }
          loading={activityQuery.isLoading}
        />
      </section>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-lg">Customer List</CardTitle>
            <p className="mt-1 text-sm text-gray-500">
              {pagination
                ? `${pagination.total} ${pagination.total === 1 ? "customer" : "customers"}`
                : "Customers matching your filters"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activityQuery.isLoading ? (
            Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-lg border border-gray-100 bg-gray-50"
              />
            ))
          ) : activityQuery.isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              <p>{getErrorMessage(activityQuery.error)}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void activityQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-gray-400" />
              <h2 className="mt-3 font-semibold text-gray-900">No customers found</h2>
              <p className="mt-1 text-sm text-gray-500">
                Try a different search or time period.
              </p>
            </div>
          ) : (
            customers.map((customer) => (
              <CustomerRow
                key={customer.profileId}
                customer={customer}
                period={period}
              />
            ))
          )}

          {pagination && pagination.pages > 1 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total}
              </p>
              <div className="flex gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || activityQuery.isFetching}
                  onClick={() => setPage((current) => current - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.pages || activityQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-50">
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-6 w-20 animate-pulse rounded bg-gray-100" />
          ) : (
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {value ?? 0}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

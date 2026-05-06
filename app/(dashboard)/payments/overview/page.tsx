"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, IndianRupee, RefreshCcw, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPaymentsOverview } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";

export default function PaymentsOverviewPage() {
  const { hasPermission } = usePermissions();
  const { data } = useQuery({
    queryKey: ["payments-overview"],
    queryFn: () => getPaymentsOverview(),
    enabled: hasPermission("payment.view"),
    retry: false,
  });

  if (!hasPermission("payment.view")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You do not have permission to view payments.</p>
      </div>
    );
  }

  const metrics = data?.data?.metrics;
  const alerts = data?.data?.alerts || [];
  const successRate = metrics ? Math.round((metrics.successRate || 0) * 100) : 0;
  const statCards = [
    {
      title: "Total Pay-ins",
      value: `₹${metrics?.totalPayins ?? "0.00"}`,
      subtitle: `${metrics?.capturedCount ?? 0} captured`,
      icon: CreditCard,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total Payouts",
      value: `₹${metrics?.totalPayouts ?? "0.00"}`,
      subtitle: "Released to performers",
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Total Refunds",
      value: `₹${metrics?.totalRefunds ?? "0.00"}`,
      subtitle: "Refunded to Customers",
      icon: RefreshCcw,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Payment Success Rate",
      value: `${successRate}%`,
      subtitle: `${metrics?.failedCount ?? 0} failed`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments Overview</h1>
        <p className="mt-2 text-sm text-gray-600">Financial health snapshot from payment systems</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="transition-all duration-200 hover:shadow-md hover:border-amber-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
                <div className={`${card.bg} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-500">No active payment alerts.</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.type}
                className="flex items-center justify-between rounded-md border border-amber-100 bg-amber-50/40 px-3 py-2"
              >
                <span className="text-sm text-gray-700 capitalize">
                  {alert.type.replace(/_/g, " ")}
                </span>
                <span className="text-sm font-semibold text-amber-700">{alert.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

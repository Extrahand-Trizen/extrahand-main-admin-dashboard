'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  IndianRupee,
  User,
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Edit,
  UserCheck,
  Phone,
  ShieldCheck,
  Tag,
  CreditCard,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { formatDate, formatCurrency, formatDateTime } from '@/lib/utils';
import { getQcommerceOrder, updateQcommerceOrderStatus } from '@/lib/api/qcommerce';
import { QcommerceOrder, QcommerceOrderStatus } from '@/types';
import AssignOrderHelperModal from '@/components/qcommerce/AssignOrderHelperModal';
import { toast } from 'sonner';

export default function QcommerceOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params.orderId as string;
  const isValidOrderId = Boolean(orderId && orderId !== 'undefined' && orderId !== 'null');

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [stageDialog, setStageDialog] = useState<{
    open: boolean;
    status: QcommerceOrderStatus;
  }>({
    open: false,
    status: 'open',
  });

  const {
    data: orderData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['qcommerce-order', orderId],
    queryFn: () => getQcommerceOrder(orderId),
    enabled: isValidOrderId,
    refetchOnMount: true,
    staleTime: 0,
  });

  const order = orderData?.data;

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: QcommerceOrderStatus) =>
      updateQcommerceOrderStatus(order?.id || order?._id || orderId, newStatus),
    onSuccess: (res, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['qcommerce-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['qcommerce-orders'] });
      toast.success(`Order status updated to ${newStatus}`);
      setStageDialog({ open: false, status: newStatus });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update order status');
    },
  });

  const handleOpenStageDialog = () => {
    if (!order) return;
    setStageDialog({
      open: true,
      status: order.status,
    });
  };

  const confirmStageUpdate = () => {
    updateStatusMutation.mutate(stageDialog.status);
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            open
          </span>
        );
      case 'assigned':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            assigned
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            cancelled
          </span>
        );
      default:
        return (
          <Badge variant="outline" className="capitalize">
            {status || 'Unknown'}
          </Badge>
        );
    }
  };

  if (!isValidOrderId) {
    return (
      <div className="space-y-6">
        <Link href="/qcommerce-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Qcommerce Orders
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              Invalid order ID. Please open order details from the list again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Link href="/qcommerce-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Qcommerce Orders
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              Failed to load order details. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const helperName = order.assignedTo?.name || order.assignedHelperName;
  const opsName = order.opsAdmin?.name || order.opsAdminName || 'Durgamshiva';
  const formattedAmount = formatCurrency(
    typeof order.amount === 'number' ? order.amount : (order.amountPaise || 0) / 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/qcommerce-orders">
            <Button variant="ghost" size="sm" className="h-9 px-3">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {order.orderNumber} - {order.shopName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Order ID: {order.id || order._id || order.orderNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenStageDialog}>
            <Edit className="mr-2 h-4 w-4" />
            Move Stage
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => setAssignModalOpen(true)}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            {helperName ? 'Reassign Helper' : 'Assign Helper'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Details Card */}
          <Card className="border border-gray-200/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-gray-900">Order Details</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Complete quick commerce order information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-800">
                  Quick commerce order from <span className="font-semibold">{order.shopName}</span> with{' '}
                  {order.items?.length || 0} items for customer{' '}
                  <span className="font-semibold">{order.address?.name || 'Customer'}</span>.
                </p>
              </div>

              {/* Status, Category, Subcategory, Budget, Deadline */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Status
                  </p>
                  <div>{renderStatusBadge(order.status)}</div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Category
                  </p>
                  {order.shopCategory ? (
                    <Badge variant="outline" className="font-medium bg-gray-50 text-gray-800">
                      {order.shopCategory}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Subcategory
                  </p>
                  {order.shopSubcategory ? (
                    <Badge variant="outline" className="font-medium bg-gray-50 text-gray-700">
                      {order.shopSubcategory}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Amount
                  </p>
                  <p className="text-base font-bold text-gray-900">{formattedAmount}</p>
                </div>
              </div>

              {/* Deadline & Scheduled Info */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Deadline
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  {order.deadline ? (
                    <span>On {formatDate(order.deadline)}</span>
                  ) : (
                    <span className="text-gray-500 italic">Immediate / ASAP</span>
                  )}
                </div>
              </div>

              {/* Shop Details */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Shop Information
                </p>
                <div className="flex items-start gap-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80 text-sm">
                  <Store className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{order.shopName}</p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {order.shopCategory} {order.shopSubcategory ? `• ${order.shopSubcategory}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Address Details */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Delivery Location
                </p>
                <div className="flex items-start gap-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80 text-sm">
                  <MapPin className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      {order.address?.name || 'Customer'}{' '}
                      {order.address?.phone ? `(${order.address.phone})` : ''}
                    </p>
                    <p className="text-gray-700 text-xs leading-relaxed">
                      {[
                        order.address?.line1,
                        order.address?.line2,
                        order.address?.city,
                        order.address?.state,
                        order.address?.pinCode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {order.deliveryInstructions && order.deliveryInstructions.length > 0 && (
                      <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded-md border border-amber-200">
                        <span className="font-semibold">Instructions:</span>{' '}
                        {order.deliveryInstructions.join(' • ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created: {formatDateTime(order.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last Updated: {formatDateTime(order.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ordered Items Table */}
          <Card className="border border-gray-200/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">Ordered Items</CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Items included in this quick commerce package
                  </CardDescription>
                </div>
                <Badge variant="secondary">{order.items?.length || 0} items</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                      <TableHead className="py-3 px-4 font-semibold text-gray-700">Item</TableHead>
                      <TableHead className="py-3 px-3 text-center font-semibold text-gray-700">
                        Unit
                      </TableHead>
                      <TableHead className="py-3 px-3 text-center font-semibold text-gray-700">
                        Qty
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right font-semibold text-gray-700">
                        Unit Price
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right font-semibold text-gray-700">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => {
                        const unitPrice =
                          typeof item.unitPrice === 'number'
                            ? item.unitPrice
                            : (item.unitPricePaise || 0) / 100;
                        const lineTotal =
                          typeof item.lineTotal === 'number'
                            ? item.lineTotal
                            : (item.lineTotalPaise || 0) / 100 || unitPrice * (item.quantity || 1);

                        return (
                          <TableRow key={index} className="hover:bg-gray-50/40">
                            <TableCell className="py-3 px-4 font-medium text-gray-900">
                              {item.name}
                            </TableCell>
                            <TableCell className="py-3 px-3 text-center text-xs text-gray-500">
                              {item.unit || 'pcs'}
                            </TableCell>
                            <TableCell className="py-3 px-3 text-center font-semibold text-gray-800">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right text-gray-600">
                              {formatCurrency(unitPrice)}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right font-bold text-gray-900">
                              {formatCurrency(lineTotal)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-gray-500 text-sm">
                          No items listed for this order
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Widgets (Right 1 col) */}
        <div className="space-y-6">
          {/* Quick Info Card */}
          <Card className="border border-gray-200/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-gray-900">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Customer</p>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="font-semibold text-blue-600 hover:underline cursor-pointer text-sm">
                    {order.address?.name || order.userId || 'Customer'}
                  </span>
                </div>
                {order.address?.phone && (
                  <p className="text-xs text-gray-500 ml-6 mt-0.5">{order.address.phone}</p>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500">Shop</p>
                <div className="flex items-center gap-2 mt-1">
                  <Store className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="font-semibold text-gray-900 text-sm">{order.shopName}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500">Budget / Total</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formattedAmount}</p>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500">Assigned Helper</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {helperName || <span className="text-gray-400 italic">Unassigned</span>}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-600 text-xs h-7 px-2 hover:bg-amber-50"
                    onClick={() => setAssignModalOpen(true)}
                  >
                    {helperName ? 'Change' : 'Assign'}
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500">Ops Admin</p>
                <div className="flex items-center gap-2 mt-1">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-sm font-medium text-gray-800">{opsName}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Status Card */}
          <Card className="border border-gray-200/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-900">
                  Order Status
                </CardTitle>
                {renderStatusBadge(order.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">
                Update the live state of this quick commerce order across all portals.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={order.status === 'open' ? 'default' : 'outline'}
                  className={order.status === 'open' ? 'bg-blue-600 text-white' : ''}
                  disabled={updateStatusMutation.isPending || order.status === 'open'}
                  onClick={() => updateStatusMutation.mutate('open')}
                >
                  Set Open
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'assigned' ? 'default' : 'outline'}
                  className={order.status === 'assigned' ? 'bg-amber-600 text-white' : ''}
                  disabled={updateStatusMutation.isPending || order.status === 'assigned'}
                  onClick={() => updateStatusMutation.mutate('assigned')}
                >
                  Set Assigned
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'completed' ? 'default' : 'outline'}
                  className={order.status === 'completed' ? 'bg-emerald-600 text-white' : ''}
                  disabled={updateStatusMutation.isPending || order.status === 'completed'}
                  onClick={() => updateStatusMutation.mutate('completed')}
                >
                  Set Completed
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'cancelled' ? 'default' : 'outline'}
                  className={
                    order.status === 'cancelled'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-600 hover:bg-rose-50'
                  }
                  disabled={updateStatusMutation.isPending || order.status === 'cancelled'}
                  onClick={() => updateStatusMutation.mutate('cancelled')}
                >
                  Set Cancelled
                </Button>
              </div>

              {/* Bill Summary */}
              <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Items Total:</span>
                  <span>
                    {formatCurrency(
                      (order.itemTotalPaise || 0) / 100 || (order.amountPaise || 0) / 100
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>{formatCurrency((order.deliveryFeePaise || 0) / 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Handling Fee:</span>
                  <span>{formatCurrency((order.handlingFeePaise || 0) / 100)}</span>
                </div>
                {Boolean(order.couponDiscountPaise) && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span>-{formatCurrency((order.couponDiscountPaise || 0) / 100)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold text-gray-900 text-sm">
                  <span>Grand Total:</span>
                  <span>{formattedAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Move Stage Dialog */}
      <Dialog
        open={stageDialog.open}
        onOpenChange={(open) => setStageDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Order Stage</DialogTitle>
            <DialogDescription>
              Update the current workflow status of order{' '}
              <span className="font-semibold text-gray-900">{order.orderNumber}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="stageSelect">Order Status</Label>
              <Select
                value={stageDialog.status}
                onValueChange={(val) =>
                  setStageDialog((prev) => ({
                    ...prev,
                    status: val as QcommerceOrderStatus,
                  }))
                }
              >
                <SelectTrigger id="stageSelect">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open (Unassigned / Pending Pickup)</SelectItem>
                  <SelectItem value="assigned">Assigned (Helper Assigned)</SelectItem>
                  <SelectItem value="completed">Completed (Delivered)</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStageDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStageUpdate}
              disabled={updateStatusMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Helper Modal */}
      <AssignOrderHelperModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        order={order}
        onAssigned={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['qcommerce-orders'] });
        }}
      />
    </div>
  );
}

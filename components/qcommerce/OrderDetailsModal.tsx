'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  MapPin,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Package,
  CreditCard,
  Phone,
  CheckCircle2,
  XCircle,
  Clock3,
  UserCheck,
} from 'lucide-react';
import { QcommerceOrder, QcommerceOrderStatus } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { updateQcommerceOrderStatus } from '@/lib/api/qcommerce';
import { toast } from 'sonner';

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: QcommerceOrder | null;
  onAssignHelperClick: (order: QcommerceOrder) => void;
  onOrderUpdated: () => void;
}

export default function OrderDetailsModal({
  open,
  onOpenChange,
  order,
  onAssignHelperClick,
  onOrderUpdated,
}: OrderDetailsModalProps) {
  const [updating, setUpdating] = useState(false);

  if (!order) return null;

  const handleStatusChange = async (newStatus: QcommerceOrderStatus) => {
    setUpdating(true);
    try {
      await updateQcommerceOrderStatus(order.id || order._id || order.orderNumber, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      onOrderUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Clock3 className="h-3.5 w-3.5" />
            open
          </span>
        );
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <UserCheck className="h-3.5 w-3.5" />
            assigned
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3.5 w-3.5" />
            cancelled
          </span>
        );
      default:
        return (
          <Badge variant="outline" className="capitalize">
            {status}
          </Badge>
        );
    }
  };

  const formattedAmount = formatCurrency(
    typeof order.amount === 'number' ? order.amount : (order.amountPaise || 0) / 100
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {order.orderNumber}
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Placed on {formatDate(order.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(order.status)}
              <span className="text-xl font-bold text-gray-900">{formattedAmount}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Shop & Ops Admin Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Store className="h-4 w-4 text-amber-600" />
                Shop Information
              </div>
              <p className="text-base font-medium text-gray-900">{order.shopName}</p>
              <div className="flex flex-wrap gap-1.5 text-xs text-gray-600">
                {order.shopCategory && (
                  <Badge variant="outline" className="bg-white">
                    {order.shopCategory}
                  </Badge>
                )}
                {order.shopSubcategory && (
                  <Badge variant="outline" className="bg-white">
                    {order.shopSubcategory}
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Operations Admin & Deadline
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Ops Admin:</span>
                <span className="font-medium text-gray-900">
                  {order.opsAdminName || order.opsAdmin?.name || 'Durgamshiva'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Deadline:</span>
                <span className="font-semibold text-amber-700">
                  {order.deadline ? formatDate(order.deadline) : 'ASAP'}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Helper Card */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-800">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-amber-800 font-medium">Assigned Delivery Partner</p>
                <p className="text-sm font-semibold text-gray-900">
                  {order.assignedTo?.name || order.assignedHelperName || (
                    <span className="text-gray-400 italic">No helper assigned yet</span>
                  )}
                </p>
                {order.assignedTo?.phone && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" /> {order.assignedTo.phone}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant={order.assignedTo?.name ? 'outline' : 'default'}
              className={order.assignedTo?.name ? '' : 'bg-amber-600 hover:bg-amber-700 text-white'}
              onClick={() => {
                onOpenChange(false);
                onAssignHelperClick(order);
              }}
            >
              {order.assignedTo?.name ? 'Reassign Helper' : 'Assign Helper Now'}
            </Button>
          </div>

          {/* Customer & Delivery Address */}
          <div className="p-4 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <MapPin className="h-4 w-4 text-red-500" />
              Delivery Address & Customer
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pt-1">
              <div>
                <p className="text-xs text-gray-500">Customer Name</p>
                <p className="font-medium text-gray-900">{order.address?.name || 'Customer'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contact Number</p>
                <p className="font-medium text-gray-900">{order.address?.phone || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-gray-700">
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
              </div>
              {order.deliveryInstructions && order.deliveryInstructions.length > 0 && (
                <div className="sm:col-span-2 bg-yellow-50/70 p-2.5 rounded-lg border border-yellow-200">
                  <p className="text-xs font-semibold text-yellow-800">Delivery Instructions:</p>
                  <p className="text-xs text-yellow-900 mt-0.5">
                    {order.deliveryInstructions.join(' • ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Package className="h-4 w-4 text-gray-600" />
                Ordered Items ({order.items?.length || 0})
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b text-xs font-medium text-gray-500">
                  <tr>
                    <th className="py-2.5 px-4">Item</th>
                    <th className="py-2.5 px-3 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
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
                        <tr key={index} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900">{item.name}</p>
                          </td>
                          <td className="py-3 px-3 text-center text-gray-500 text-xs">
                            {item.unit || 'pcs'}
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-gray-800">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-600">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-900">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-500 text-sm">
                        No items details available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill Summary & Status Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="p-4 rounded-xl border border-gray-200 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Update Order Status
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  size="sm"
                  variant={order.status === 'open' ? 'default' : 'outline'}
                  className={order.status === 'open' ? 'bg-blue-600 text-white' : ''}
                  disabled={updating || order.status === 'open'}
                  onClick={() => handleStatusChange('open')}
                >
                  Set Open
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'assigned' ? 'default' : 'outline'}
                  className={order.status === 'assigned' ? 'bg-amber-600 text-white' : ''}
                  disabled={updating || order.status === 'assigned'}
                  onClick={() => handleStatusChange('assigned')}
                >
                  Set Assigned
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'completed' ? 'default' : 'outline'}
                  className={order.status === 'completed' ? 'bg-emerald-600 text-white' : ''}
                  disabled={updating || order.status === 'completed'}
                  onClick={() => handleStatusChange('completed')}
                >
                  Set Completed
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'cancelled' ? 'default' : 'outline'}
                  className={order.status === 'cancelled' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'}
                  disabled={updating || order.status === 'cancelled'}
                  onClick={() => handleStatusChange('cancelled')}
                >
                  Set Cancelled
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Items Total:</span>
                <span>{formatCurrency((order.itemTotalPaise || 0) / 100 || (order.amountPaise || 0) / 100)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee:</span>
                <span>{formatCurrency((order.deliveryFeePaise || 0) / 100)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Handling Fee:</span>
                <span>{formatCurrency((order.handlingFeePaise || 0) / 100)}</span>
              </div>
              {Boolean(order.couponDiscountPaise) && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span>-{formatCurrency((order.couponDiscountPaise || 0) / 100)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
                <span>Grand Total:</span>
                <span>{formattedAmount}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

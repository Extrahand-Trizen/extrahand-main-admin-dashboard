'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Store,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  listQcommerceOrders,
  getQcommerceCategories,
  getQcommerceSubcategories,
  getQcommerceShops,
} from '@/lib/api/qcommerce';
import { QcommerceOrder } from '@/types';
import AssignOrderHelperModal from '@/components/qcommerce/AssignOrderHelperModal';

export default function QcommerceOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('all');
  const [deadlineSortOrder, setDeadlineSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<QcommerceOrder | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('qcommerce_orders_filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.search !== undefined) setSearch(parsed.search);
        if (parsed.statusFilter !== undefined) setStatusFilter(parsed.statusFilter);
        if (parsed.shopFilter !== undefined) setShopFilter(parsed.shopFilter);
        if (parsed.categoryFilter !== undefined) setCategoryFilter(parsed.categoryFilter);
        if (parsed.subcategoryFilter !== undefined) setSubcategoryFilter(parsed.subcategoryFilter);
        if (parsed.assignedToFilter !== undefined) setAssignedToFilter(parsed.assignedToFilter);
        if (parsed.deadlineSortOrder !== undefined) setDeadlineSortOrder(parsed.deadlineSortOrder);
        if (parsed.page !== undefined) setPage(parsed.page);
        if (parsed.limit !== undefined) setLimit(parsed.limit);
      }
    } catch (e) {
      console.error('Error loading filters from sessionStorage', e);
    }
    setIsLoaded(true);
  }, []);

  // Save filters on state changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      sessionStorage.setItem(
        'qcommerce_orders_filters',
        JSON.stringify({
          search,
          statusFilter,
          shopFilter,
          categoryFilter,
          subcategoryFilter,
          assignedToFilter,
          deadlineSortOrder,
          page,
          limit,
        })
      );
    } catch (e) {
      console.error('Error saving filters to sessionStorage', e);
    }
  }, [
    search,
    statusFilter,
    shopFilter,
    categoryFilter,
    subcategoryFilter,
    assignedToFilter,
    deadlineSortOrder,
    page,
    limit,
    isLoaded,
  ]);

  // Fetch filter options: Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['qcommerce-categories'],
    queryFn: getQcommerceCategories,
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesData?.data || [];

  // Fetch filter options: Subcategories
  const { data: subcategoriesData } = useQuery({
    queryKey: ['qcommerce-subcategories', categoryFilter],
    queryFn: () =>
      getQcommerceSubcategories(categoryFilter !== 'all' ? categoryFilter : undefined),
    staleTime: 5 * 60 * 1000,
  });
  const subcategories = subcategoriesData?.data || [];

  // Fetch filter options: Shops
  const { data: shopsData } = useQuery({
    queryKey: ['qcommerce-shops'],
    queryFn: getQcommerceShops,
    staleTime: 5 * 60 * 1000,
  });
  const shops = shopsData?.data || [];

  // Fetch Orders
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'qcommerce-orders',
      search,
      statusFilter,
      shopFilter,
      categoryFilter,
      subcategoryFilter,
      assignedToFilter,
      deadlineSortOrder,
      page,
      limit,
    ],
    queryFn: () =>
      listQcommerceOrders({
        search: search || undefined,
        status: statusFilter,
        shop: shopFilter,
        category: categoryFilter,
        subcategory: subcategoryFilter,
        assignedTo: assignedToFilter,
        deadlineSortOrder,
        page,
        limit,
      }),
    enabled: isLoaded,
    retry: false,
  });

  const orders = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  };

  const handleOpenAssignModal = (order: QcommerceOrder) => {
    setSelectedOrderForAssign(order);
    setAssignModalOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['qcommerce-orders'] });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
            open
          </span>
        );
      case 'assigned':
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
            assigned
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-100">
            cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Qcommerce orders
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and monitor quick commerce orders across all shops
        </p>
      </div>

      {/* Filters Card */}
      <Card className="border border-gray-200/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Search, Status, Shop, Shop category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-xs font-medium text-gray-500">
                Search
              </Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="Search orders"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-medium text-gray-500">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status" className="h-10 w-full bg-white">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shop" className="text-xs font-medium text-gray-500">
                Shop
              </Label>
              <Select
                value={shopFilter}
                onValueChange={(val) => {
                  setShopFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger id="shop" className="h-10 w-full bg-white">
                  <SelectValue placeholder="All shops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All shops</SelectItem>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id || shop.shopName} value={shop.shopName}>
                      {shop.shopName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-medium text-gray-500">
                Shop category
              </Label>
              <Select
                value={categoryFilter}
                onValueChange={(val) => {
                  setCategoryFilter(val);
                  setSubcategoryFilter('all');
                  setPage(1);
                }}
              >
                <SelectTrigger id="category" className="h-10 w-full bg-white">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id || cat.slug} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Shop subcategory, Assigned to, Deadline order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="subcategory" className="text-xs font-medium text-gray-500">
                Shop subcategory
              </Label>
              <Select
                value={subcategoryFilter}
                onValueChange={(val) => {
                  setSubcategoryFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger id="subcategory" className="h-10 w-full bg-white">
                  <SelectValue placeholder="All subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subcategories</SelectItem>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id || sub.slug} value={sub.name}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignedTo" className="text-xs font-medium text-gray-500">
                Assigned to
              </Label>
              <Select
                value={assignedToFilter}
                onValueChange={(val) => {
                  setAssignedToFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger id="assignedTo" className="h-10 w-full bg-white">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unassigned">Unassigned (Assign Helper)</SelectItem>
                  <SelectItem value="Ravi Teja">Ravi Teja</SelectItem>
                  <SelectItem value="Sri Charan">Sri Charan</SelectItem>
                  <SelectItem value="Durgamshiva">Durgamshiva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadlineOrder" className="text-xs font-medium text-gray-500">
                Deadline order
              </Label>
              <Select
                value={deadlineSortOrder}
                onValueChange={(val) => {
                  setDeadlineSortOrder(val as 'desc' | 'asc');
                  setPage(1);
                }}
              >
                <SelectTrigger id="deadlineOrder" className="h-10 w-full bg-white">
                  <SelectValue placeholder="Latest to oldest" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Latest to oldest</SelectItem>
                  <SelectItem value="asc">Oldest to latest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List Card */}
      <Card className="border border-gray-200/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900">Orders list</CardTitle>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {pagination.total} {pagination.total === 1 ? 'order' : 'orders'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !data || error || orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Store className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="font-medium text-gray-700">No Qcommerce orders found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try adjusting your search criteria or filter selections
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                      <TableHead className="font-semibold text-gray-700 py-3.5 px-4">
                        Order
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3.5 px-4">
                        Shop
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3.5 px-4">
                        Category
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3.5 px-4">
                        Subcategory
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3.5 px-4">
                        Amount
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3.5 px-4">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3.5 px-4">
                        Assigned to
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3.5 px-4">
                        Ops admin
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3.5 px-4">
                        Deadline
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3.5 px-4 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100">
                    {orders.map((order) => {
                      const helperName =
                        order.assignedTo?.name || order.assignedHelperName;
                      const opsName =
                        order.opsAdmin?.name || order.opsAdminName || 'Durgamshiva';
                      const formattedAmount = formatCurrency(
                        typeof order.amount === 'number'
                          ? order.amount
                          : (order.amountPaise || 0) / 100
                      );

                      return (
                        <TableRow
                          key={order.id || order.orderNumber}
                          className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                          onClick={() => {
                            const targetId = order.id || order._id || order.orderNumber;
                            router.push(`/qcommerce-orders/${targetId}`);
                          }}
                        >
                          <TableCell className="font-bold text-gray-900 py-4 px-4">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell className="text-gray-800 py-4 px-4 font-normal">
                            {order.shopName}
                          </TableCell>
                          <TableCell className="text-gray-700 py-4 px-4 font-normal text-sm">
                            {order.shopCategory ? (
                              <span className="text-gray-800">{order.shopCategory}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-700 py-4 px-4 font-normal text-sm">
                            {order.shopSubcategory ? (
                              <span className="text-gray-600">{order.shopSubcategory}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-normal text-gray-800 py-4 px-4">
                            {formattedAmount}
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            {renderStatusBadge(order.status)}
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            {helperName ? (
                              <span className="text-gray-900 font-normal">{helperName}</span>
                            ) : order.status === 'cancelled' ? (
                              <span className="text-gray-400 font-normal">—</span>
                            ) : (
                              <button
                                type="button"
                                className="text-amber-600 font-medium italic hover:text-amber-700 hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAssignModal(order);
                                }}
                              >
                                Assign Helper
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-700 py-4 px-4 font-normal">
                            {opsName}
                          </TableCell>
                          <TableCell className="text-gray-600 py-4 px-4 font-normal text-sm">
                            {order.deadline ? formatDate(order.deadline) : '—'}
                          </TableCell>
                          <TableCell className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-4 text-xs font-medium text-gray-700 rounded-md border-gray-300 hover:bg-gray-50"
                              onClick={() => {
                                const targetId = order.id || order._id || order.orderNumber;
                                router.push(`/qcommerce-orders/${targetId}`);
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">Rows per page</p>
                  <Select
                    value={limit.toString()}
                    onValueChange={(value) => {
                      setLimit(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={limit.toString()} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, pagination.total)} of {pagination.total}{' '}
                    {pagination.total === 1 ? 'order' : 'orders'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm text-gray-600 px-2 font-medium">
                      Page {page} of {pagination.pages || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.pages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(pagination.pages)}
                      disabled={page >= pagination.pages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Helper Assignment Modal */}
      <AssignOrderHelperModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        order={selectedOrderForAssign}
        onAssigned={handleRefresh}
      />
    </div>
  );
}

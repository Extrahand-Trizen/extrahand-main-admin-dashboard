'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, RefreshCw, Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { listPricingCategories, updateCategoryMinOrderValue, type PricingCategory } from '@/lib/api/location-pricing';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';

export default function CategoryMinimumsPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['location-pricing-categories'],
    queryFn: listPricingCategories,
  });

  const categories: PricingCategory[] = data?.data || [];

  const updateMutation = useMutation({
    mutationFn: async ({ categoryId, minOrderValue }: { categoryId: string; minOrderValue: number }) => {
      return await updateCategoryMinOrderValue(categoryId, minOrderValue);
    },
    onSuccess: () => {
      toast.success('Category minimum order value updated successfully');
      queryClient.invalidateQueries({ queryKey: ['location-pricing-categories'] });
      setEditingId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update category minimum order value');
    },
  });

  const handleStartEdit = (category: PricingCategory) => {
    setEditingId(category.id);
    const minVal = category.minOrderValue ?? (category.subcategories?.[0]?.minOrderValue ?? 0);
    setEditValue(String(minVal));
  };

  const handleSave = (categoryId: string) => {
    const val = Number(editValue);
    if (!Number.isFinite(val) || val < 0) {
      toast.error('Minimum order value must be a non-negative number');
      return;
    }
    updateMutation.mutate({ categoryId, minOrderValue: val });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-6 w-6 text-amber-600" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Category Minimum Pricing</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configure mandatory minimum order values per service category for Book Now checkout.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || isRefetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Service Categories & Order Minimums</CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Configure the minimum subtotal required for each category. All services under a category contribute to its minimum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">No categories found.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="w-56">Category</TableHead>
                    <TableHead>Included Services</TableHead>
                    <TableHead className="w-44">Category Code</TableHead>
                    <TableHead className="text-right w-44">Configured Minimum</TableHead>
                    <TableHead className="w-28 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => {
                    const isEditing = editingId === category.id;
                    const minVal = category.minOrderValue ?? (category.subcategories?.[0]?.minOrderValue ?? 0);
                    const servicesText = category.subcategories?.map((s) => s.name).join(', ') || category.name;

                    return (
                      <TableRow key={category.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-semibold text-gray-900">{category.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          <span className="line-clamp-2" title={servicesText}>
                            {servicesText}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">{category.id}</TableCell>
                        <TableCell className="text-right font-medium">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-gray-500 text-sm">₹</span>
                              <Input
                                type="number"
                                min={0}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-24 h-8 text-right text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSave(category.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                            </div>
                          ) : minVal > 0 ? (
                            <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200 text-sm font-semibold">
                              {formatCurrency(minVal)}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs italic">No minimum (₹0)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleSave(category.id)}
                                disabled={updateMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5 text-gray-600 hover:text-gray-900"
                              onClick={() => handleStartEdit(category)}
                              disabled={!isSuperAdmin}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

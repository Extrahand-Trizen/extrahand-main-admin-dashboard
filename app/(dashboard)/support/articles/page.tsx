"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listArticles, deleteArticle } from "@/lib/api/support";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { SupportArticle } from "@/types";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/LoadingSkeleton";

export default function SupportArticlesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedArticle, setSelectedArticle] = useState<SupportArticle | null>(
    null,
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    reason: string;
  }>({
    open: false,
    reason: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["articles", search, categoryFilter, page, limit],
    queryFn: () =>
      listArticles({
        search: search || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        page,
        limit,
      }),
    enabled: hasPermission("content.list"),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: ({
      articleId,
      reason,
    }: {
      articleId: string;
      reason: string;
    }) => deleteArticle(articleId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Article deleted successfully");
      setDeleteDialog({ open: false, reason: "" });
      setSelectedArticle(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete article");
    },
  });

  const handleDelete = (article: SupportArticle) => {
    setSelectedArticle(article);
    setDeleteDialog({ open: true, reason: "" });
  };

  const confirmDelete = () => {
    if (!selectedArticle || !deleteDialog.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    deleteMutation.mutate({
      articleId: selectedArticle._id,
      reason: deleteDialog.reason,
    });
  };

  const articles = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  };

  // Extract unique categories from articles
  const categories = Array.from(
    new Set(
      articles
        .map((article: SupportArticle) => article.category)
        .filter(Boolean),
    ),
  );

  if (!hasPermission("content.list")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          You don't have permission to view articles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Articles</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage knowledge base articles
          </p>
        </div>
        {hasPermission("content.create") && (
          <Button onClick={() => router.push("/support/articles/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Article
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search articles..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Articles List</CardTitle>
            <Badge variant="secondary">
              {pagination.total}{" "}
              {pagination.total === 1 ? "article" : "articles"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Failed to load articles. Please try again.
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No articles found
            </div>
          ) : (
            <>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">
                        Article
                      </TableHead>
                      <TableHead className="sm:hidden">Details</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Category
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Views
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Status
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Created
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map((article) => (
                      <TableRow key={article._id}>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-700">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate">
                                  {article.title}
                                </div>
                                <div className="text-sm text-gray-500 truncate line-clamp-1">
                                  {article.description}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:hidden">
                              <Badge variant="outline">
                                {article.category}
                              </Badge>
                              {!article.isPublished && (
                                <Badge variant="secondary">Draft</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{article.category}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-600">
                          {article.views} views
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {article.isPublished ? (
                            <Badge variant="success">Published</Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {formatDate(article.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/support/articles/${article._id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              {hasPermission("content.update") && (
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/support/articles/${article._id}/edit`}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {hasPermission("content.delete") && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(article)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, pagination.total)} of{" "}
                    {pagination.total} articles
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm text-gray-600 px-2">
                      Page {page} of {pagination.pages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.pages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(pagination.pages)}
                      disabled={page >= pagination.pages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              {selectedArticle && (
                <>
                  Are you sure you want to delete "{selectedArticle.title}"?
                  This action cannot be undone.
                  <span className="block mt-2 text-red-600">
                    This action requires a reason.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Reason *</Label>
            <Textarea
              id="delete-reason"
              placeholder="Enter the reason for deleting this article..."
              value={deleteDialog.reason}
              onChange={(e) =>
                setDeleteDialog({ ...deleteDialog, reason: e.target.value })
              }
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, reason: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!deleteDialog.reason.trim()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

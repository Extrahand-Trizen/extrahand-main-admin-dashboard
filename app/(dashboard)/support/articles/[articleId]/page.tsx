"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, FileText, Calendar, Eye, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getArticle } from "@/lib/api/support";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Label } from "@/components/ui/label";

export default function ArticleViewPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const articleId = params.articleId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => getArticle(articleId),
    enabled: !!articleId && hasPermission("content.view"),
  });

  const article = data?.data;

  if (!hasPermission("content.view")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          You don't have permission to view articles.
        </p>
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

  if (error || !article) {
    return (
      <div className="space-y-6">
        <Link href="/support/articles">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Articles
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              Failed to load article. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/support/articles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {article.title}
            </h1>
            <p className="mt-1 text-sm text-gray-600">{article.description}</p>
          </div>
        </div>
        {hasPermission("content.update") && (
          <Button variant="outline" asChild>
            <Link href={`/support/articles/${articleId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Article Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Article Content</CardTitle>
                <div className="flex items-center gap-2">
                  {article.isPublished ? (
                    <Badge variant="success">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                  <Badge variant="outline">{article.category}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {article.imageUrl && (
                <div className="mb-6">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              )}
              <div className="prose max-w-none">
                <div
                  className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Article Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Article Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Author
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {article.author}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Category
                </Label>
                <div className="mt-1">
                  <Badge variant="outline">{article.category}</Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Views
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {article.views} views
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Created
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {formatDateTime(article.createdAt)}
                  </span>
                </div>
              </div>
              {article.updatedAt && (
                <div>
                  <Label className="text-xs font-medium text-gray-500">
                    Last Updated
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {formatDateTime(article.updatedAt)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

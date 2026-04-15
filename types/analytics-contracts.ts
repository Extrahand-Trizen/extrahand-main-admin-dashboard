export type AnalyticsRange = '7d' | '30d' | '90d';

export interface PosterAnalytics {
  requesterId: string;
  range: string;
  profile: {
    name: string;
    isVerified: boolean;
    isAadhaarVerified: boolean;
    isPANVerified: boolean;
    isBankVerified: boolean;
  };
  metrics: {
    postedTasks: number;
    totalBids: number;
    genuineTaskCount: number;
    categories: Array<{
      category: string;
      count: number;
    }>;
  };
  generatedAt: string;
}

export interface PosterVerificationComparison {
  range: string;
  verified: {
    posterCount: number;
    taskCount: number;
    bidCount: number;
    avgTasksPerPoster: number;
    avgBidsPerTask: number;
  };
  unverified: {
    posterCount: number;
    taskCount: number;
    bidCount: number;
    avgTasksPerPoster: number;
    avgBidsPerTask: number;
  };
  generatedAt: string;
}

export interface TaskCategoryBreakdown {
  range: string;
  categories: Array<{
    category: string;
    count: number;
    subcategories: Array<{
      subcategory: string;
      count: number;
    }>;
  }>;
  generatedAt: string;
}


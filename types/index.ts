// User Types
export interface User {
  userId: string;
  uid?: string; // Firebase UID
  email: string;
  name: string;
  phone?: string;
  role: 'Helper' | 'Customer' | 'unknown';
  roles?: ('Helper' | 'Customer')[];
  userType?: 'individual' | 'business';
  status: 'active' | 'suspended' | 'banned' | 'inactive';
  isVerified: boolean;
  isEmailVerified?: boolean;
  isActive?: boolean;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  
  // Profile Details
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
    addressDetails?: {
      doorNo?: string;
      area?: string;
      city?: string;
      state?: string;
      pinCode?: string;
      country?: string;
    };
    isPublic?: boolean;
  };
  savedAddresses?: Array<{
    _id?: string;
    label: 'Home' | 'Work' | 'Other';
    address: string;
    coordinates: [number, number];
    city?: string;
    state?: string;
    country?: string;
    addressDetails?: {
      doorNo?: string;
      landmark?: string;
      area?: string;
      pinCode?: string;
    };
    name?: string;
    phone?: string;
    isDefault?: boolean;
    createdAt?: string;
  }>;
  
  // Skills
  skills?: {
    primaryCategory?: string;
    list?: Array<{
      name: string;
      category?: string;
      yearsOfExperience?: number;
      certified?: boolean;
      certificates?: Array<{
        title: string;
        issuedBy: string;
        issuedDate: string;
        documentUrl: string;
      }>;
      verified?: boolean;
    }>;
    updatedAt?: string;
  };
  
  // Statistics
  rating?: number;
  totalReviews?: number;
  totalTasks?: number;
  completedTasks?: number;
  postedTasks?: number;
  earnedAmount?: number;
  
  // Verification Details
  isAadhaarVerified?: boolean;
  aadhaarVerifiedAt?: string;
  maskedAadhaar?: string;
  aadhaarKyc?: {
    id?: string;
    verificationId?: string | null;
    sessionType?: string | null;
    status?: boolean | string | null;
    internalStatus?: string | null;
    visibleStatus?: string | null;
    failureReason?: string | null;
    visibleFailureAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    documents?: Array<{ label: string; url: string }>;
    imageUrls?: string[];
  } | null;
  isPANVerified?: boolean;
  panVerifiedAt?: string;
  maskedPan?: string;
  isBankVerified?: boolean;
  bankVerifiedAt?: string;
  maskedBankAccount?: string;
  bankAccount?: {
    accountHolderName?: string;
    bankName?: string;
    ifsc?: string;
  };
  isFaceVerified?: boolean;
  phoneVerified?: boolean;
  isAdminVerified?: boolean;
  verificationTier?: number; // 0-3
  verificationBadge?: 'none' | 'basic' | 'verified' | 'trusted';
  lastVerifiedAt?: string;
  
  // Role Verifications
  roleVerifications?: {
    Helper?: {
      canAcceptTasks?: boolean;
      verifiedAt?: string;
      requirements?: {
        aadhaar?: boolean;
        pan?: boolean;
        bank?: boolean;
        skills?: boolean;
        emergency?: boolean;
      };
    };
    Customer?: {
      canPostTasks?: boolean;
      verifiedAt?: string;
      requirements?: {
        aadhaar?: boolean;
        paymentMethod?: boolean;
        businessPAN?: boolean;
        businessBank?: boolean;
      };
    };
  };
  
  // Business Profile
  business?: {
    name: string;
    type?: 'Private Limited' | 'LLP' | 'Partnership' | 'Sole Proprietorship' | 'Other';
    category?: string;
    description?: string;
    contactPerson?: string;
    contactPersonDesignation?: string;
    businessEmail?: string;
    businessPhone?: string;
    registeredAddress?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
    };
    pan?: {
      maskedPAN?: string;
      isPANVerified?: boolean;
      verifiedAt?: string;
    };
    bankAccount?: {
      maskedAccount?: string;
      isBankVerified?: boolean;
      verifiedAt?: string;
    };
    gstNumber?: string;
    registrationNumber?: string;
  };
  
  // Onboarding
  onboardingStatus?: {
    isCompleted: boolean;
    completedSteps: {
      location: boolean;
      roles: boolean;
      profile: boolean;
    };
    completedAt?: string;
    lastStep?: 'location' | 'roles' | 'profile';
  };
}

// Task Types
export interface Task {
  taskId: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  taskCallStatus?:
    | 'not_updated'
    | 'genuine'
    | 'not_genuine'
    | 'call_not_lifted'
    | 'follow_up';
  taskCallFollowUpDate?: string | null;
  taskCallUpdatedAt?: string | null;
  customerId: string;
  budget: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { userId: string; name: string } | null;
  scheduledDate?: string;
  dateOption?: string;
  timeSlot?: string;
}

export interface TaskApplication {
  applicationId: string;
  taskId: string;
  helperId: string;
  status: 'pending' | 'accepted' | 'rejected';
  proposedAmount?: number;
  message?: string;
  createdAt: string;
}

export interface PaymentOverview {
  metrics: {
    totalPayins: string | null;
    totalRefunds: string | null;
    totalPayouts: string | null;
    capturedCount: number;
    failedCount: number;
    successRate: number;
  };
  alerts: Array<{
    type: string;
    count: number;
    windowHours?: number;
  }>;
}

export interface PaymentTransaction {
  escrowId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  taskId: string;
  posterUid: string;
  performerUid: string;
  status: string;
  paymentStatus: string | null;
  amountInRupees: string | null;
  createdAt: string;
  links?: {
    customerUserId?: string;
    helperUserId?: string;
    taskId?: string;
    customerName?: string;
    taskTitle?: string;
    helperName?: string;
  };
}

export interface PaymentPayout {
  payoutId: string;
  performerUid: string;
  taskId?: string;
  CustomerUid?: string;
  amount: string;
  netAmount: string;
  status: string;
  source?: string;
  type?: string;
  createdAt: string;
}

export interface PaymentRefund {
  refundId: string;
  paymentId: string;
  taskId?: string;
  CustomerUid?: string;
  performerUid?: string;
  refundAmount: string;
  status: string;
  createdAt: string;
}

export interface PaymentLedgerEntry {
  transactionId: string;
  type: string;
  amount: string;
  taskId?: string;
  CustomerUid?: string;
  performerUid?: string;
  createdAt: string;
}

// Support Types
export interface SupportTicket {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'closed';
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportArticle {
  _id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  imageUrl?: string;
  views: number;
  isPublished: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
}

// Admin Types
export interface AdminUser {
  userId: string;
  email: string;
  name: string;
  dashboardType: string;
  role: string;
  isSuperAdmin: boolean;
  permissions: string[];
}

export interface AdminNotification {
  id: string;
  type:
    | 'aadhaar_verification_failed'
    | 'aadhaar_verification_under_review'
    | 'task_posted';
  title: string;
  message: string;
  linkUrl?: string;
  /** Firebase uid for Aadhaar KYC — used when linkUrl is missing (legacy notifications). */
  kycUserId?: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string | null;
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: AdminUser;
    tokens: AuthTokens;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AnalyticsOverview {
  Customers: {
    totalRegistered: number;
  };
  Helpers: {
    totalRegistered: number;
    aadhaarVerified?: number;
    categoryCounts?: Array<{
      category: string;
      helperCount: number;
    }>;
    categorySummary?: {
      totalHelpers: number;
      categorizedHelpers: number;
      uncategorizedHelpers: number;
    };
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
  };
  generatedAt: string;
  partial?: {
    taskServiceUnavailable?: boolean;
  };
}
export type {
  AnalyticsRange,
  CustomerAnalytics,
  CustomerVerificationComparison,
  TaskCategoryBreakdown,
  TaskCategoryPerformance,
  TaskCancellationAnalytics,
  UserAnalytics,
} from './analytics-contracts';

// Filter Types
export interface UserFilters {
  search?: string;
  status?: string;
  role?: string;
  category?: string;
  area?: string;
  isAadhaarVerified?: boolean;
  isCertified?: boolean;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
}

export interface TaskFilters {
  search?: string;
  status?: string;
  category?: string;
  followUpStatus?: string;
  customerId?: string;
  assigneeId?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export interface TicketFilters {
  status?: string;
  page?: number;
  limit?: number;
}

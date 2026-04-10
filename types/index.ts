// User Types
export interface User {
  userId: string;
  uid?: string; // Firebase UID
  email: string;
  name: string;
  phone?: string;
  role: 'tasker' | 'poster' | 'unknown';
  roles?: ('tasker' | 'poster')[];
  userType?: 'individual' | 'business';
  status: 'active' | 'suspended' | 'banned' | 'inactive';
  isVerified: boolean;
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
    tasker?: {
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
    poster?: {
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
  posterId: string;
  budget: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskApplication {
  applicationId: string;
  taskId: string;
  taskerId: string;
  status: 'pending' | 'accepted' | 'rejected';
  proposedAmount?: number;
  message?: string;
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
  posters: {
    totalRegistered: number;
  };
  taskers: {
    totalRegistered: number;
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

// Filter Types
export interface UserFilters {
  search?: string;
  status?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export interface TaskFilters {
  search?: string;
  status?: string;
  category?: string;
  posterId?: string;
  page?: number;
  limit?: number;
}

export interface TicketFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export type MasterCategory = 'MTN Fixed' | 'MTN GSM';
export type ProductStatus = 'active' | 'limited' | 'outofstock';
export type ClientProductStatus = 'active' | 'pending' | 'suspended' | 'cancelled';
export type TransactionType = 'credit' | 'debit';
export type UserRole = 'admin' | 'reseller';
export type ResellerGroup = 1 | 2;

// Broadband.is API response types
export interface BroadbandApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Pro-rata billing calculation
export interface ProRataBilling {
  originalPrice: number;
  proRataPrice: number;
  discountPercentage: number;
  daysRemaining: number;
}

// Dashboard configuration for drag and drop
export interface DashboardWidget {
  id: string;
  type: string; // 'stat-card', 'product-table', 'client-list', etc.
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config?: Record<string, any>;
}

export interface DashboardConfig {
  layouts: {
    desktop: DashboardWidget[];
    tablet: DashboardWidget[];
    mobile: DashboardWidget[];
  };
  resellerId: number;
}

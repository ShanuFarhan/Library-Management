export interface DashboardStats {
  totalBooks: number;
  totalUsers: number;
  totalBorrowedBooks: number;
  totalAvailableBooks: number;
  overdueBooks: number;
  totalFines: number;
  recentTransactions: number;
  activeUsers: number;
}

export interface AdminDashboardData {
  stats: DashboardStats;
  recentTransactions: any[];
  popularBooks: any[];
  overdueTransactions: any[];
}

export interface UserDashboardData {
  currentlyBorrowed: any[];
  recentlyAdded: any[];
  recommendations: any[];
  userStats: {
    totalBorrowed: number;
    currentlyBorrowed: number;
    overdue: number;
    remainingBorrowLimit: number;
  };
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  userId: string;
}

export enum NotificationType {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info'
}

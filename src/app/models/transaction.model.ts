export interface Transaction {
  id: string;
  userId: string;
  bookId: string;
  type: TransactionType;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: TransactionStatus;
  fine?: number;
  notes?: string;
}

export enum TransactionType {
  BORROW = 'borrow',
  RETURN = 'return'
}

export enum TransactionStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
  LOST = 'lost'
}

export interface BorrowBookRequest {
  userId: string;
  bookId: string;
  dueDate?: Date;
}

export interface ReturnBookRequest {
  transactionId: string;
  returnDate: Date;
  notes?: string;
}

export interface TransactionSummary {
  totalBorrowed: number;
  totalReturned: number;
  currentlyBorrowed: number;
  overdue: number;
  totalFines: number;
}

export interface UserTransactionHistory {
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  transactions: Transaction[];
  summary: TransactionSummary;
}

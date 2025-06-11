import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  BorrowBookRequest,
  ReturnBookRequest,
  Transaction,
  TransactionStatus,
  TransactionSummary,
  TransactionType
} from '../models';
import { AuthService } from './auth.service';
import { BookService } from './book.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public transactions$ = this.transactionsSubject.asObservable();

  // Mock transactions database
  private transactions: Transaction[] = [];

  // Default transactions for initial setup
  private defaultTransactions: Transaction[] = [
    {
      id: '1',
      userId: '2',
      bookId: '1',
      type: TransactionType.BORROW,
      borrowDate: new Date('2024-01-10'),
      dueDate: new Date('2024-02-10'),
      status: TransactionStatus.ACTIVE,
      fine: 0
    },
    {
      id: '2',
      userId: '2',
      bookId: '3',
      type: TransactionType.BORROW,
      borrowDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      status: TransactionStatus.ACTIVE,
      fine: 0
    }
  ];

  constructor(
    private bookService: BookService,
    private authService: AuthService
  ) {
    // Load transactions from localStorage or use defaults
    this.loadTransactionsFromStorage();
    this.transactionsSubject.next(this.transactions);
  }

  private loadTransactionsFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const transactionsData = localStorage.getItem('library_transactions');
      if (transactionsData) {
        try {
          const parsedTransactions = JSON.parse(transactionsData);
          // Convert date strings back to Date objects
          this.transactions = parsedTransactions.map((transaction: any) => ({
            ...transaction,
            borrowDate: new Date(transaction.borrowDate),
            dueDate: new Date(transaction.dueDate),
            returnDate: transaction.returnDate ? new Date(transaction.returnDate) : undefined
          }));
        } catch (error) {
          console.error('Error parsing transactions from localStorage:', error);
          this.transactions = [...this.defaultTransactions];
          this.saveTransactionsToStorage();
        }
      } else {
        // First time setup - use default transactions
        this.transactions = [...this.defaultTransactions];
        this.saveTransactionsToStorage();
      }
    } else {
      this.transactions = [...this.defaultTransactions];
    }
  }

  private saveTransactionsToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('library_transactions', JSON.stringify(this.transactions));
      } catch (error) {
        console.error('Error saving transactions to localStorage:', error);
      }
    }
  }

  // Borrow a book
  borrowBook(request: BorrowBookRequest): Observable<{ success: boolean; message: string; transaction?: Transaction }> {
    return of(null).pipe(
      delay(1000),
      map(() => {
        // Check if user exists and is active
        const users = this.authService.getAllUsers();
        const user = users.find(u => u.id === request.userId);
        if (!user || !user.isActive) {
          return { success: false, message: 'User not found or inactive' };
        }

        // Check user's current borrowed books count
        const userActiveTransactions = this.transactions.filter(t =>
          t.userId === request.userId && t.status === TransactionStatus.ACTIVE
        );

        if (userActiveTransactions.length >= user.borrowLimit) {
          return { success: false, message: `Borrow limit reached (${user.borrowLimit} books)` };
        }

        // Check if book is available
        // Note: In a real app, we'd get this from BookService
        // For now, we'll simulate the check
        const dueDate = request.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

        const newTransaction: Transaction = {
          id: (this.transactions.length + 1).toString(),
          userId: request.userId,
          bookId: request.bookId,
          type: TransactionType.BORROW,
          borrowDate: new Date(),
          dueDate: dueDate,
          status: TransactionStatus.ACTIVE,
          fine: 0
        };

        this.transactions.push(newTransaction);
        this.saveTransactionsToStorage(); // Persist to localStorage
        this.transactionsSubject.next(this.transactions);

        // Update book availability
        this.bookService.updateBookAvailability(request.bookId, -1).subscribe();

        return {
          success: true,
          message: 'Book borrowed successfully',
          transaction: newTransaction
        };
      })
    );
  }

  // Return a book
  returnBook(request: ReturnBookRequest): Observable<{ success: boolean; message: string; fine?: number }> {
    return of(null).pipe(
      delay(800),
      map(() => {
        const transaction = this.transactions.find(t => t.id === request.transactionId);
        if (!transaction) {
          return { success: false, message: 'Transaction not found' };
        }

        if (transaction.status !== TransactionStatus.ACTIVE) {
          return { success: false, message: 'Book already returned' };
        }

        // Calculate fine if overdue
        const returnDate = request.returnDate;
        let fine = 0;
        if (returnDate > transaction.dueDate) {
          const daysOverdue = Math.ceil((returnDate.getTime() - transaction.dueDate.getTime()) / (1000 * 60 * 60 * 24));
          fine = daysOverdue * 1; // $1 per day fine
        }

        // Update transaction
        transaction.returnDate = returnDate;
        transaction.status = TransactionStatus.RETURNED;
        transaction.fine = fine;
        transaction.notes = request.notes;

        this.saveTransactionsToStorage(); // Persist to localStorage
        this.transactionsSubject.next(this.transactions);

        // Update book availability
        this.bookService.updateBookAvailability(transaction.bookId, 1).subscribe();

        return {
          success: true,
          message: fine > 0 ? `Book returned with fine: $${fine}` : 'Book returned successfully',
          fine: fine
        };
      })
    );
  }

  // Get user's borrowed books
  getUserBorrowedBooks(userId: string): Observable<Transaction[]> {
    return of(this.transactions.filter(t =>
      t.userId === userId && t.status === TransactionStatus.ACTIVE
    )).pipe(delay(300));
  }

  // Get user's transaction history
  getUserTransactionHistory(userId: string): Observable<Transaction[]> {
    return of(this.transactions.filter(t => t.userId === userId)).pipe(delay(300));
  }

  // Get all transactions (admin only)
  getAllTransactions(): Observable<Transaction[]> {
    return of(this.transactions).pipe(delay(500));
  }

  // Get overdue transactions
  getOverdueTransactions(): Observable<Transaction[]> {
    const now = new Date();
    return of(this.transactions.filter(t =>
      t.status === TransactionStatus.ACTIVE && t.dueDate < now
    )).pipe(delay(400));
  }

  // Get transaction statistics
  getTransactionStats(): Observable<TransactionSummary> {
    return of(null).pipe(
      delay(300),
      map(() => {
        const totalBorrowed = this.transactions.filter(t => t.type === TransactionType.BORROW).length;
        const totalReturned = this.transactions.filter(t => t.status === TransactionStatus.RETURNED).length;
        const currentlyBorrowed = this.transactions.filter(t => t.status === TransactionStatus.ACTIVE).length;
        const overdue = this.transactions.filter(t =>
          t.status === TransactionStatus.ACTIVE && t.dueDate < new Date()
        ).length;
        const totalFines = this.transactions.reduce((sum, t) => sum + (t.fine || 0), 0);

        return {
          totalBorrowed,
          totalReturned,
          currentlyBorrowed,
          overdue,
          totalFines
        };
      })
    );
  }

  // Get recent transactions
  getRecentTransactions(limit: number = 10): Observable<Transaction[]> {
    return of(this.transactions
      .sort((a, b) => b.borrowDate.getTime() - a.borrowDate.getTime())
      .slice(0, limit)
    ).pipe(delay(300));
  }

  // Check if user can borrow more books
  canUserBorrowMore(userId: string): Observable<{ canBorrow: boolean; reason?: string }> {
    return of(null).pipe(
      delay(200),
      map(() => {
        const users = this.authService.getAllUsers();
        const user = users.find(u => u.id === userId);

        if (!user) {
          return { canBorrow: false, reason: 'User not found' };
        }

        if (!user.isActive) {
          return { canBorrow: false, reason: 'User account is inactive' };
        }

        const activeTransactions = this.transactions.filter(t =>
          t.userId === userId && t.status === TransactionStatus.ACTIVE
        );

        if (activeTransactions.length >= user.borrowLimit) {
          return { canBorrow: false, reason: `Borrow limit reached (${user.borrowLimit} books)` };
        }

        // Check for overdue books
        const overdueTransactions = activeTransactions.filter(t => t.dueDate < new Date());
        if (overdueTransactions.length > 0) {
          return { canBorrow: false, reason: 'You have overdue books. Please return them first.' };
        }

        return { canBorrow: true };
      })
    );
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';

import { Book, DashboardStats, Transaction, User } from '../../models';
import { AuthService } from '../../services/auth.service';
import { BookService } from '../../services/book.service';
import { TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatToolbarModule,
    MatMenuModule,
    RouterModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  isAdmin = false;
  isLoading = true;

  // Admin Dashboard Data
  adminStats: DashboardStats | null = null;
  recentTransactions: Transaction[] = [];
  popularBooks: Book[] = [];

  // User Dashboard Data
  userBorrowedBooks: Transaction[] = [];
  recentlyAddedBooks: Book[] = [];
  userStats = {
    totalBorrowed: 0,
    currentlyBorrowed: 0,
    overdue: 0,
    remainingBorrowLimit: 0
  };

  // Table columns
  transactionColumns = ['book', 'borrowDate', 'dueDate', 'status'];
  bookColumns = ['title', 'author', 'genre', 'availability'];

  constructor(
    private authService: AuthService,
    private bookService: BookService,
    private transactionService: TransactionService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.isAdmin();

    if (this.currentUser) {
      this.loadDashboardData();
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    if (this.isAdmin) {
      this.loadAdminDashboard();
    } else {
      this.loadUserDashboard();
    }
  }

  private loadAdminDashboard(): void {
    forkJoin({
      books: this.bookService.getAllBooks(),
      transactions: this.transactionService.getAllTransactions(),
      bookStats: this.bookService.getBookStats(),
      transactionStats: this.transactionService.getTransactionStats()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Get users separately since getAllUsers() returns array directly, not Observable
          const users = this.authService.getAllUsers();
          this.calculateAdminStats({ ...data, users });
          this.recentTransactions = data.transactions.slice(0, 5);
          this.popularBooks = data.books.slice(0, 5);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading admin dashboard:', error);
          this.isLoading = false;
        }
      });
  }

  private loadUserDashboard(): void {
    if (!this.currentUser) return;

    forkJoin({
      borrowedBooks: this.transactionService.getUserBorrowedBooks(this.currentUser.id),
      recentBooks: this.bookService.getAvailableBooks(),
      transactionHistory: this.transactionService.getUserTransactionHistory(this.currentUser.id)
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.userBorrowedBooks = data.borrowedBooks;
          this.recentlyAddedBooks = data.recentBooks.slice(0, 6);
          this.calculateUserStats(data.transactionHistory);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading user dashboard:', error);
          this.isLoading = false;
        }
      });
  }

  private calculateAdminStats(data: any): void {
    // Ensure data exists and has the expected structure
    const books = data?.books || [];
    const users = data?.users || [];
    const transactions = data?.transactions || [];
    const bookStats = data?.bookStats || { availableCopies: 0 };
    const transactionStats = data?.transactionStats || { currentlyBorrowed: 0, totalFines: 0 };

    const activeBooks = books.filter((book: Book) => book.isActive);
    const activeUsers = users.filter((user: User) => user.isActive);
    const overdueTransactions = transactions.filter((t: Transaction) =>
      t.status === 'active' && new Date(t.dueDate) < new Date()
    );

    this.adminStats = {
      totalBooks: activeBooks.length,
      totalUsers: activeUsers.length,
      totalBorrowedBooks: transactionStats.currentlyBorrowed,
      totalAvailableBooks: bookStats.availableCopies,
      overdueBooks: overdueTransactions.length,
      totalFines: transactionStats.totalFines,
      recentTransactions: transactions.length,
      activeUsers: activeUsers.length
    };
  }

  private calculateUserStats(transactions: Transaction[]): void {
    const now = new Date();
    const activeTransactions = transactions.filter(t => t.status === 'active');
    const overdueTransactions = activeTransactions.filter(t => new Date(t.dueDate) < now);

    this.userStats = {
      totalBorrowed: transactions.length,
      currentlyBorrowed: activeTransactions.length,
      overdue: overdueTransactions.length,
      remainingBorrowLimit: (this.currentUser?.borrowLimit || 0) - activeTransactions.length
    };
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateToBooks(): void {
    if (this.isAdmin) {
      this.router.navigate(['/admin/books']);
    } else {
      this.router.navigate(['/user/catalog']);
    }
  }

  navigateToUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  navigateToBorrowed(): void {
    this.router.navigate(['/user/borrowed']);
  }
}

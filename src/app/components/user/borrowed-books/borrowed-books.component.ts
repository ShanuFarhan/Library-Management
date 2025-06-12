import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';

import { Book, Transaction, User } from '../../../models';
import { AuthService } from '../../../services/auth.service';
import { BookService } from '../../../services/book.service';
import { TransactionService } from '../../../services/transaction.service';

@Component({
  selector: 'app-borrowed-books',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule,
    MatToolbarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule
  ],
  templateUrl: './borrowed-books.component.html',
  styleUrl: './borrowed-books.component.scss'
})
export class BorrowedBooksComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  currentlyBorrowedBooks: Transaction[] = [];
  transactionHistory: Transaction[] = [];
  books: Book[] = [];
  isLoading = false;
  isReturning = false;

  // Table columns
  currentBooksColumns = ['book', 'borrowDate', 'dueDate', 'daysLeft', 'status', 'actions'];
  historyColumns = ['book', 'borrowDate', 'dueDate', 'returnDate', 'status', 'fine'];

  constructor(
    private transactionService: TransactionService,
    private bookService: BookService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.loadData();
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.isLoading = true;
    forkJoin({
      currentBooks: this.transactionService.getUserBorrowedBooks(this.currentUser!.id),
      history: this.transactionService.getUserTransactionHistory(this.currentUser!.id),
      books: this.bookService.getAllBooks()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.currentlyBorrowedBooks = data.currentBooks;
          this.transactionHistory = data.history;
          this.books = data.books;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading borrowed books:', error);
          this.snackBar.open('Error loading borrowed books', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  returnBook(transaction: Transaction): void {
    if (this.isReturning) return;

    const book = this.getBookById(transaction.bookId);
    const bookTitle = book ? book.title : `Book ID: ${transaction.bookId}`;

    if (confirm(`Are you sure you want to return "${bookTitle}"?`)) {
      this.isReturning = true;
      const returnRequest = {
        transactionId: transaction.id,
        returnDate: new Date()
      };

      this.transactionService.returnBook(returnRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.currentlyBorrowedBooks = this.currentlyBorrowedBooks.filter(
                t => t.id !== transaction.id
              );

              const returnedTransaction: Transaction = {
                ...transaction,
                status: 'returned' as any,
                returnDate: new Date()
              };
              this.transactionHistory.unshift(returnedTransaction);

              this.snackBar.open(
                `Successfully returned "${bookTitle}"!`,
                'Close',
                { duration: 3000 }
              );
            } else {
              this.snackBar.open(
                response.message || 'Error returning book',
                'Close',
                { duration: 3000 }
              );
            }
            this.isReturning = false;
          },
          error: (error) => {
            console.error('Error returning book:', error);
            this.snackBar.open('Error returning book', 'Close', { duration: 3000 });
            this.isReturning = false;
          }
        });
    }
  }

  getBookById(bookId: string): Book | undefined {
    return this.books.find(book => book.id === bookId);
  }

  getBookTitle(bookId: string): string {
    const book = this.getBookById(bookId);
    return book ? book.title : `Book ID: ${bookId}`;
  }

  getDaysLeft(dueDate: Date): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isOverdue(dueDate: Date): boolean {
    return this.getDaysLeft(dueDate) < 0;
  }

  getStatusClass(transaction: Transaction): string {
    if (transaction.status === 'returned') return 'returned';
    if (this.isOverdue(transaction.dueDate)) return 'overdue';
    return 'active';
  }

  getStatusText(transaction: Transaction): string {
    if (transaction.status === 'returned') return 'Returned';
    if (this.isOverdue(transaction.dueDate)) return 'Overdue';
    return 'Active';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  goToCatalog(): void {
    this.router.navigate(['/user/catalog']);
  }

  refreshData(): void {
    this.loadData();
  }

  getTotalFines(): number {
    return this.transactionHistory
      .filter(t => t.fine && t.fine > 0)
      .reduce((total, t) => total + (t.fine || 0), 0);
  }

  getOverdueCount(): number {
    return this.currentlyBorrowedBooks.filter(t => this.isOverdue(t.dueDate)).length;
  }
}

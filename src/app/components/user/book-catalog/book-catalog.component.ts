import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';

import { Book, BookGenre, Transaction, User } from '../../../models';
import { AuthService } from '../../../services/auth.service';
import { BookService } from '../../../services/book.service';
import { TransactionService } from '../../../services/transaction.service';

@Component({
  selector: 'app-book-catalog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatPaginatorModule
  ],
  templateUrl: './book-catalog.component.html',
  styleUrl: './book-catalog.component.scss'
})
export class BookCatalogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  books: Book[] = [];
  filteredBooks: Book[] = [];
  paginatedBooks: Book[] = [];
  currentUser: User | null = null;
  userBorrowedBooks: Transaction[] = [];
  isLoading = false;
  isBorrowing = false;
  searchForm: FormGroup;
  genres = Object.values(BookGenre);
  pageSize = 12;
  pageIndex = 0;
  totalBooks = 0;

  constructor(
    private bookService: BookService,
    private transactionService: TransactionService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.searchForm = this.createSearchForm();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.loadData();
      this.setupSearchForm();
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createSearchForm(): FormGroup {
    return this.fb.group({
      title: [''],
      author: [''],
      genre: [''],
      availability: ['all']
    });
  }

  private setupSearchForm(): void {
    this.searchForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterBooks();
        this.updatePagination();
      });
  }

  private loadData(): void {
    this.isLoading = true;
    forkJoin({
      books: this.bookService.getAvailableBooks(),
      userTransactions: this.transactionService.getUserBorrowedBooks(this.currentUser!.id)
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.books = data.books.filter(book => book.isActive);
          this.userBorrowedBooks = data.userTransactions;
          this.filteredBooks = this.books;
          this.updatePagination();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading books:', error);
          this.snackBar.open('Error loading books', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  private filterBooks(): void {
    const filters = this.searchForm.value;
    this.filteredBooks = this.books.filter(book => {
      const matchesTitle = !filters.title ||
        book.title.toLowerCase().includes(filters.title.toLowerCase());
      const matchesAuthor = !filters.author ||
        book.author.toLowerCase().includes(filters.author.toLowerCase());
      const matchesGenre = !filters.genre || book.genre === filters.genre;
      const matchesAvailability = filters.availability === 'all' ||
        (filters.availability === 'available' && book.availableCopies > 0) ||
        (filters.availability === 'unavailable' && book.availableCopies === 0);

      return matchesTitle && matchesAuthor && matchesGenre && matchesAvailability;
    });
  }

  private updatePagination(): void {
    this.totalBooks = this.filteredBooks.length;
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedBooks = this.filteredBooks.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagination();
  }

  borrowBook(book: Book): void {
    if (!this.currentUser || this.isBorrowing) return;
    const currentlyBorrowed = this.userBorrowedBooks.length;
    if (currentlyBorrowed >= this.currentUser.borrowLimit) {
      this.snackBar.open(
        `You have reached your borrow limit of ${this.currentUser.borrowLimit} books`,
        'Close',
        { duration: 4000 }
      );
      return;
    }

    if (book.availableCopies <= 0) {
      this.snackBar.open('This book is currently unavailable', 'Close', { duration: 3000 });
      return;
    }
    const alreadyBorrowed = this.userBorrowedBooks.some(t => t.bookId === book.id);
    if (alreadyBorrowed) {
      this.snackBar.open('You have already borrowed this book', 'Close', { duration: 3000 });
      return;
    }

    this.isBorrowing = true;
    const borrowRequest = {
      userId: this.currentUser.id,
      bookId: book.id
    };

    this.transactionService.borrowBook(borrowRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.transaction) {
            const bookIndex = this.books.findIndex(b => b.id === book.id);
            if (bookIndex !== -1) {
              this.books[bookIndex].availableCopies--;
            }
            this.userBorrowedBooks.push(response.transaction);
            this.filterBooks();
            this.updatePagination();

            this.snackBar.open(
              `Successfully borrowed "${book.title}"!`,
              'Close',
              { duration: 3000 }
            );
          } else {
            this.snackBar.open(
              response.message || 'Error borrowing book',
              'Close',
              { duration: 3000 }
            );
          }
          this.isBorrowing = false;
        },
        error: (error) => {
          console.error('Error borrowing book:', error);
          this.snackBar.open('Error borrowing book', 'Close', { duration: 3000 });
          this.isBorrowing = false;
        }
      });
  }

  isBookBorrowed(book: Book): boolean {
    return this.userBorrowedBooks.some(t => t.bookId === book.id);
  }

  canBorrowBook(book: Book): boolean {
    if (!this.currentUser) return false;

    const currentlyBorrowed = this.userBorrowedBooks.length;
    const hasReachedLimit = currentlyBorrowed >= this.currentUser.borrowLimit;
    const bookUnavailable = book.availableCopies <= 0;
    const alreadyBorrowed = this.isBookBorrowed(book);

    return !hasReachedLimit && !bookUnavailable && !alreadyBorrowed;
  }

  getBorrowButtonText(book: Book): string {
    if (!this.currentUser) return 'Login Required';

    const currentlyBorrowed = this.userBorrowedBooks.length;
    if (currentlyBorrowed >= this.currentUser.borrowLimit) {
      return 'Limit Reached';
    }
    if (book.availableCopies <= 0) {
      return 'Unavailable';
    }
    if (this.isBookBorrowed(book)) {
      return 'Already Borrowed';
    }
    return 'Borrow Book';
  }

  clearSearch(): void {
    this.searchForm.reset({
      title: '',
      author: '',
      genre: '',
      availability: 'all'
    });
    this.pageIndex = 0;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  goToBorrowedBooks(): void {
    this.router.navigate(['/user/borrowed']);
  }

  refreshData(): void {
    this.loadData();
  }
}

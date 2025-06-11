import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Book, BookGenre, CreateBookRequest, UpdateBookRequest } from '../../../models';
import { BookService } from '../../../services/book.service';

@Component({
  selector: 'app-book-management',
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
    MatPaginatorModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatToolbarModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './book-management.component.html',
  styleUrl: './book-management.component.scss'
})
export class BookManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  books: Book[] = [];
  filteredBooks: Book[] = [];
  isLoading = false;
  isAddingBook = false;
  editingBook: Book | null = null;

  // Forms
  bookForm: FormGroup;
  searchForm: FormGroup;

  // Table configuration
  displayedColumns = ['title', 'author', 'genre', 'isbn', 'totalCopies', 'availableCopies', 'status', 'actions'];

  // Genre options
  genres = Object.values(BookGenre);

  constructor(
    private bookService: BookService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.bookForm = this.createBookForm();
    this.searchForm = this.createSearchForm();
  }

  ngOnInit(): void {
    this.loadBooks();
    this.setupSearchForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createBookForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      author: ['', [Validators.required, Validators.minLength(2)]],
      isbn: ['', [Validators.required, Validators.pattern(/^[\d-]+$/)]],
      genre: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      totalCopies: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      publishedDate: ['', Validators.required]
    });
  }

  private createSearchForm(): FormGroup {
    return this.fb.group({
      title: [''],
      author: [''],
      genre: [''],
      status: ['all']
    });
  }

  private setupSearchForm(): void {
    this.searchForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterBooks();
      });
  }

  private loadBooks(): void {
    this.isLoading = true;
    this.bookService.getAllBooks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (books) => {
          this.books = books;
          this.filteredBooks = books;
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
      const matchesStatus = filters.status === 'all' ||
        (filters.status === 'active' && book.isActive) ||
        (filters.status === 'inactive' && !book.isActive) ||
        (filters.status === 'available' && book.availableCopies > 0) ||
        (filters.status === 'unavailable' && book.availableCopies === 0);

      return matchesTitle && matchesAuthor && matchesGenre && matchesStatus;
    });
  }

  showAddForm(): void {
    this.isAddingBook = true;
    this.editingBook = null;
    this.bookForm.reset();
  }

  hideAddForm(): void {
    this.isAddingBook = false;
    this.editingBook = null;
    this.bookForm.reset();
  }

  editBook(book: Book): void {
    this.editingBook = book;
    this.isAddingBook = true;
    this.bookForm.patchValue({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre,
      description: book.description,
      totalCopies: book.totalCopies,
      publishedDate: book.publishedDate
    });
  }

  onSubmit(): void {
    if (this.bookForm.valid) {
      const formData = this.bookForm.value;

      if (this.editingBook) {
        this.updateBook(formData);
      } else {
        this.addBook(formData);
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private addBook(bookData: CreateBookRequest): void {
    this.isLoading = true;
    this.bookService.addBook(bookData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newBook) => {
          this.books.push(newBook);
          this.filterBooks();
          this.hideAddForm();
          this.snackBar.open('Book added successfully!', 'Close', { duration: 3000 });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error adding book:', error);
          this.snackBar.open('Error adding book', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  private updateBook(bookData: UpdateBookRequest): void {
    if (!this.editingBook) return;

    this.isLoading = true;
    this.bookService.updateBook(this.editingBook.id, bookData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedBook) => {
          if (updatedBook) {
            const index = this.books.findIndex(b => b.id === updatedBook.id);
            if (index !== -1) {
              this.books[index] = updatedBook;
              this.filterBooks();
            }
          }
          this.hideAddForm();
          this.snackBar.open('Book updated successfully!', 'Close', { duration: 3000 });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error updating book:', error);
          this.snackBar.open('Error updating book', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  deleteBook(book: Book): void {
    if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
      this.isLoading = true;
      this.bookService.deleteBook(book.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (success) => {
            if (success) {
              const index = this.books.findIndex(b => b.id === book.id);
              if (index !== -1) {
                this.books[index].isActive = false;
                this.filterBooks();
              }
              this.snackBar.open('Book deleted successfully!', 'Close', { duration: 3000 });
            }
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error deleting book:', error);
            this.snackBar.open('Error deleting book', 'Close', { duration: 3000 });
            this.isLoading = false;
          }
        });
    }
  }

  toggleBookStatus(book: Book): void {
    const newStatus = !book.isActive;
    this.bookService.updateBook(book.id, { isActive: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedBook) => {
          if (updatedBook) {
            const index = this.books.findIndex(b => b.id === updatedBook.id);
            if (index !== -1) {
              this.books[index] = updatedBook;
              this.filterBooks();
            }
          }
          this.snackBar.open(
            `Book ${newStatus ? 'activated' : 'deactivated'} successfully!`,
            'Close',
            { duration: 3000 }
          );
        },
        error: (error) => {
          console.error('Error updating book status:', error);
          this.snackBar.open('Error updating book status', 'Close', { duration: 3000 });
        }
      });
  }

  clearSearch(): void {
    this.searchForm.reset({
      title: '',
      author: '',
      genre: '',
      status: 'all'
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.bookForm.controls).forEach(key => {
      const control = this.bookForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.bookForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (control?.hasError('minlength')) {
      return `${fieldName} must be at least ${control.errors?.['minlength'].requiredLength} characters`;
    }
    if (control?.hasError('pattern')) {
      return `${fieldName} format is invalid`;
    }
    if (control?.hasError('min')) {
      return `${fieldName} must be at least ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `${fieldName} must be at most ${control.errors?.['max'].max}`;
    }
    return '';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}

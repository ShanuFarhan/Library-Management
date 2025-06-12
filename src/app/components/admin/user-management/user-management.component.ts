import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
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
  selector: 'app-user-management',
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
    MatTableModule,
    MatToolbarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTabsModule
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  users: User[] = [];
  filteredUsers: User[] = [];
  selectedUser: User | null = null;
  userTransactions: Transaction[] = [];
  userBooks: Book[] = [];
  isLoading = false;
  isLoadingTransactions = false;
  searchForm: FormGroup;
  editUserForm: FormGroup;
  displayedColumns = ['fullName', 'email', 'role', 'borrowedBooks', 'borrowLimit', 'status', 'actions'];
  transactionColumns = ['bookTitle', 'borrowDate', 'dueDate', 'returnDate', 'status', 'fine'];

  constructor(
    private authService: AuthService,
    private transactionService: TransactionService,
    private bookService: BookService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.searchForm = this.createSearchForm();
    this.editUserForm = this.createEditUserForm();
  }

  ngOnInit(): void {
    this.loadUsers();
    this.setupSearchForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createSearchForm(): FormGroup {
    return this.fb.group({
      name: [''],
      email: [''],
      role: [''],
      status: ['all']
    });
  }

  private createEditUserForm(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      borrowLimit: [3, [Validators.required, Validators.min(0), Validators.max(10)]],
      isActive: [true]
    });
  }

  private setupSearchForm(): void {
    this.searchForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterUsers();
      });
  }

  private loadUsers(): void {
    this.isLoading = true;
    try {
      this.users = this.authService.getAllUsers();
      this.filteredUsers = this.users;
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading users:', error);
      this.snackBar.open('Error loading users', 'Close', { duration: 3000 });
      this.isLoading = false;
    }
  }

  private filterUsers(): void {
    const filters = this.searchForm.value;
    this.filteredUsers = this.users.filter(user => {
      const matchesName = !filters.name ||
        user.fullName.toLowerCase().includes(filters.name.toLowerCase());
      const matchesEmail = !filters.email ||
        user.email.toLowerCase().includes(filters.email.toLowerCase());
      const matchesRole = !filters.role || user.role === filters.role;
      const matchesStatus = filters.status === 'all' ||
        (filters.status === 'active' && user.isActive) ||
        (filters.status === 'inactive' && !user.isActive);

      return matchesName && matchesEmail && matchesRole && matchesStatus;
    });
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.editUserForm.patchValue({
      fullName: user.fullName,
      email: user.email,
      borrowLimit: user.borrowLimit,
      isActive: user.isActive
    });
    this.loadUserTransactions(user.id);
  }

  private loadUserTransactions(userId: string): void {
    this.isLoadingTransactions = true;
    forkJoin({
      transactions: this.transactionService.getUserTransactionHistory(userId),
      books: this.bookService.getAllBooks()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.userTransactions = data.transactions;
          this.userBooks = data.books;
          this.isLoadingTransactions = false;
        },
        error: (error) => {
          console.error('Error loading user transactions:', error);
          this.snackBar.open('Error loading user transactions', 'Close', { duration: 3000 });
          this.isLoadingTransactions = false;
        }
      });
  }

  updateUser(): void {
    if (this.editUserForm.valid && this.selectedUser) {
      const formData = this.editUserForm.value;
      this.authService.updateUser(this.selectedUser.id, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (success) => {
            if (success) {
              // Update local user data
              const userIndex = this.users.findIndex(u => u.id === this.selectedUser!.id);
              if (userIndex !== -1) {
                this.users[userIndex] = { ...this.users[userIndex], ...formData };
                this.filterUsers();
              }
              this.snackBar.open('User updated successfully!', 'Close', { duration: 3000 });
            }
          },
          error: (error) => {
            console.error('Error updating user:', error);
            this.snackBar.open('Error updating user', 'Close', { duration: 3000 });
          }
        });
    }
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.isActive;
    this.authService.updateUser(user.id, { isActive: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            const userIndex = this.users.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
              this.users[userIndex].isActive = newStatus;
              this.filterUsers();
            }
            this.snackBar.open(
              `User ${newStatus ? 'activated' : 'deactivated'} successfully!`,
              'Close',
              { duration: 3000 }
            );
          }
        },
        error: (error) => {
          console.error('Error updating user status:', error);
          this.snackBar.open('Error updating user status', 'Close', { duration: 3000 });
        }
      });
  }

  getBookTitle(bookId: string): string {
    const book = this.userBooks.find(b => b.id === bookId);
    return book ? book.title : `Book ID: ${bookId}`;
  }

  getCurrentlyBorrowedCount(user: User): number {
    return this.userTransactions.filter(t =>
      t.userId === user.id && t.status === 'active'
    ).length;
  }

  clearSearch(): void {
    this.searchForm.reset({
      name: '',
      email: '',
      role: '',
      status: 'all'
    });
  }

  clearSelection(): void {
    this.selectedUser = null;
    this.userTransactions = [];
    this.userBooks = [];
    this.editUserForm.reset();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.editUserForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email';
    }
    if (control?.hasError('minlength')) {
      return `${fieldName} must be at least ${control.errors?.['minlength'].requiredLength} characters`;
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

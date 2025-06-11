import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { CreateUserRequest, LoginCredentials, LoginResponse, User, UserRole } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  // Mock users database
  private users: User[] = [
    {
      id: '1',
      fullName: 'Admin User',
      email: 'admin@library.com',
      password: 'password',
      role: UserRole.ADMIN,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      isActive: true,
      borrowedBooks: [],
      borrowLimit: 0
    },
    {
      id: '2',
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'password',
      role: UserRole.USER,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
      isActive: true,
      borrowedBooks: [],
      borrowLimit: 3
    }
  ];

  constructor() {
    // Check if user is already logged in (from localStorage)
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
      }
    }
  }

  private saveUserToStorage(user: User): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  }

  private removeUserFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return of(null).pipe(
      delay(1000), // Simulate API call delay
      map(() => {
        const user = this.users.find(u =>
          u.email === credentials.email &&
          u.password === credentials.password &&
          u.isActive
        );

        if (user) {
          // Remove password from user object before storing
          const userWithoutPassword = { ...user };
          delete (userWithoutPassword as any).password;

          this.currentUserSubject.next(userWithoutPassword);
          this.isLoggedInSubject.next(true);
          this.saveUserToStorage(userWithoutPassword);

          return {
            success: true,
            message: 'Login successful',
            user: userWithoutPassword,
            token: this.generateMockToken()
          };
        } else {
          return {
            success: false,
            message: 'Invalid email or password'
          };
        }
      })
    );
  }

  register(userData: CreateUserRequest): Observable<LoginResponse> {
    return of(null).pipe(
      delay(1000),
      map(() => {
        // Check if email already exists
        const existingUser = this.users.find(u => u.email === userData.email);
        if (existingUser) {
          return {
            success: false,
            message: 'Email already exists'
          };
        }

        // Create new user
        const newUser: User = {
          id: (this.users.length + 1).toString(),
          fullName: userData.fullName,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          borrowedBooks: [],
          borrowLimit: userData.role === UserRole.USER ? 3 : 0
        };

        this.users.push(newUser);

        // Auto-login after registration
        const userWithoutPassword = { ...newUser };
        delete (userWithoutPassword as any).password;

        this.currentUserSubject.next(userWithoutPassword);
        this.isLoggedInSubject.next(true);
        this.saveUserToStorage(userWithoutPassword);

        return {
          success: true,
          message: 'Registration successful',
          user: userWithoutPassword,
          token: this.generateMockToken()
        };
      })
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
    this.removeUserFromStorage();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  isUser(): boolean {
    return this.hasRole(UserRole.USER);
  }

  private generateMockToken(): string {
    return 'mock-jwt-token-' + Date.now();
  }

  // Get all users (admin only)
  getAllUsers(): User[] {
    return this.users.map(user => {
      const userCopy = { ...user };
      delete (userCopy as any).password;
      return userCopy;
    });
  }

  // Update user (admin only)
  updateUser(userId: string, updates: Partial<User>): Observable<boolean> {
    return of(null).pipe(
      delay(500),
      map(() => {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          this.users[userIndex] = { ...this.users[userIndex], ...updates, updatedAt: new Date() };
          return true;
        }
        return false;
      })
    );
  }
}

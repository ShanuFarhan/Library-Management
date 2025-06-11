import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { userGuard } from './guards/user.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin/books',
    loadComponent: () => import('./components/admin/book-management/book-management.component').then(m => m.BookManagementComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./components/admin/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'user/catalog',
    loadComponent: () => import('./components/user/book-catalog/book-catalog.component').then(m => m.BookCatalogComponent),
    canActivate: [authGuard, userGuard]
  },
  {
    path: 'user/borrowed',
    loadComponent: () => import('./components/user/borrowed-books/borrowed-books.component').then(m => m.BorrowedBooksComponent),
    canActivate: [authGuard, userGuard]
  },
  { path: '**', redirectTo: '/login' }
];

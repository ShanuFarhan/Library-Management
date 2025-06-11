export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  borrowedBooks: string[]; // Array of book IDs
  borrowLimit: number;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
  borrowLimit?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

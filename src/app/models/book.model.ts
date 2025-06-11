export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string;
  description: string;
  totalCopies: number;
  availableCopies: number;
  publishedDate: Date;
  addedDate: Date;
  updatedDate: Date;
  isActive: boolean;
}

export interface CreateBookRequest {
  title: string;
  author: string;
  isbn: string;
  genre: string;
  description: string;
  totalCopies: number;
  publishedDate: Date;
}

export interface UpdateBookRequest {
  title?: string;
  author?: string;
  isbn?: string;
  genre?: string;
  description?: string;
  totalCopies?: number;
  availableCopies?: number;
  isActive?: boolean;
}

export interface BookSearchCriteria {
  title?: string;
  author?: string;
  genre?: string;
  isAvailable?: boolean;
}

export enum BookGenre {
  FICTION = 'Fiction',
  NON_FICTION = 'Non-Fiction',
  SCIENCE = 'Science',
  TECHNOLOGY = 'Technology',
  HISTORY = 'History',
  BIOGRAPHY = 'Biography',
  MYSTERY = 'Mystery',
  ROMANCE = 'Romance',
  FANTASY = 'Fantasy',
  HORROR = 'Horror',
  CHILDREN = 'Children',
  EDUCATION = 'Education'
}

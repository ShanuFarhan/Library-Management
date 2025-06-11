import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Book, BookGenre, BookSearchCriteria, CreateBookRequest, UpdateBookRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private booksSubject = new BehaviorSubject<Book[]>([]);
  public books$ = this.booksSubject.asObservable();

  // Mock books database
  private books: Book[] = [
    {
      id: '1',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: '978-0-7432-7356-5',
      genre: BookGenre.FICTION,
      description: 'A classic American novel set in the Jazz Age.',
      totalCopies: 5,
      availableCopies: 3,
      publishedDate: new Date('1925-04-10'),
      addedDate: new Date('2024-01-01'),
      updatedDate: new Date(),
      isActive: true
    },
    {
      id: '2',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      isbn: '978-0-06-112008-4',
      genre: BookGenre.FICTION,
      description: 'A gripping tale of racial injustice and childhood innocence.',
      totalCopies: 4,
      availableCopies: 2,
      publishedDate: new Date('1960-07-11'),
      addedDate: new Date('2024-01-02'),
      updatedDate: new Date(),
      isActive: true
    },
    {
      id: '3',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '978-0-13-235088-4',
      genre: BookGenre.TECHNOLOGY,
      description: 'A handbook of agile software craftsmanship.',
      totalCopies: 3,
      availableCopies: 1,
      publishedDate: new Date('2008-08-01'),
      addedDate: new Date('2024-01-03'),
      updatedDate: new Date(),
      isActive: true
    },
    {
      id: '4',
      title: 'The Hobbit',
      author: 'J.R.R. Tolkien',
      isbn: '978-0-547-92822-7',
      genre: BookGenre.FANTASY,
      description: 'A fantasy adventure about a hobbit\'s unexpected journey.',
      totalCopies: 6,
      availableCopies: 4,
      publishedDate: new Date('1937-09-21'),
      addedDate: new Date('2024-01-04'),
      updatedDate: new Date(),
      isActive: true
    },
    {
      id: '5',
      title: 'Sapiens',
      author: 'Yuval Noah Harari',
      isbn: '978-0-06-231609-7',
      genre: BookGenre.HISTORY,
      description: 'A brief history of humankind.',
      totalCopies: 4,
      availableCopies: 0,
      publishedDate: new Date('2011-01-01'),
      addedDate: new Date('2024-01-05'),
      updatedDate: new Date(),
      isActive: true
    }
  ];

  constructor() {
    this.booksSubject.next(this.books);
  }

  // Get all books
  getAllBooks(): Observable<Book[]> {
    return of(this.books).pipe(delay(500));
  }

  // Get available books only
  getAvailableBooks(): Observable<Book[]> {
    return of(this.books.filter(book => book.isActive && book.availableCopies > 0)).pipe(delay(500));
  }

  // Get book by ID
  getBookById(id: string): Observable<Book | undefined> {
    return of(this.books.find(book => book.id === id)).pipe(delay(300));
  }

  // Search books
  searchBooks(criteria: BookSearchCriteria): Observable<Book[]> {
    return of(null).pipe(
      delay(500),
      map(() => {
        let filteredBooks = this.books.filter(book => book.isActive);

        if (criteria.title) {
          filteredBooks = filteredBooks.filter(book =>
            book.title.toLowerCase().includes(criteria.title!.toLowerCase())
          );
        }

        if (criteria.author) {
          filteredBooks = filteredBooks.filter(book =>
            book.author.toLowerCase().includes(criteria.author!.toLowerCase())
          );
        }

        if (criteria.genre) {
          filteredBooks = filteredBooks.filter(book =>
            book.genre.toLowerCase().includes(criteria.genre!.toLowerCase())
          );
        }

        if (criteria.isAvailable !== undefined) {
          filteredBooks = filteredBooks.filter(book =>
            criteria.isAvailable ? book.availableCopies > 0 : book.availableCopies === 0
          );
        }

        return filteredBooks;
      })
    );
  }

  // Add new book (admin only)
  addBook(bookData: CreateBookRequest): Observable<Book> {
    return of(null).pipe(
      delay(1000),
      map(() => {
        const newBook: Book = {
          id: (this.books.length + 1).toString(),
          title: bookData.title,
          author: bookData.author,
          isbn: bookData.isbn,
          genre: bookData.genre,
          description: bookData.description,
          totalCopies: bookData.totalCopies,
          availableCopies: bookData.totalCopies,
          publishedDate: bookData.publishedDate,
          addedDate: new Date(),
          updatedDate: new Date(),
          isActive: true
        };

        this.books.push(newBook);
        this.booksSubject.next(this.books);
        return newBook;
      })
    );
  }

  // Update book (admin only)
  updateBook(id: string, updates: UpdateBookRequest): Observable<Book | null> {
    return of(null).pipe(
      delay(800),
      map(() => {
        const bookIndex = this.books.findIndex(book => book.id === id);
        if (bookIndex !== -1) {
          // If totalCopies is being updated, adjust availableCopies accordingly
          if (updates.totalCopies !== undefined) {
            const currentBook = this.books[bookIndex];
            const borrowedCopies = currentBook.totalCopies - currentBook.availableCopies;
            const newAvailableCopies = Math.max(0, updates.totalCopies - borrowedCopies);
            updates = { ...updates, availableCopies: newAvailableCopies };
          }

          this.books[bookIndex] = {
            ...this.books[bookIndex],
            ...updates,
            updatedDate: new Date()
          };
          this.booksSubject.next(this.books);
          return this.books[bookIndex];
        }
        return null;
      })
    );
  }

  // Delete book (admin only)
  deleteBook(id: string): Observable<boolean> {
    return of(null).pipe(
      delay(500),
      map(() => {
        const bookIndex = this.books.findIndex(book => book.id === id);
        if (bookIndex !== -1) {
          // Soft delete - just mark as inactive
          this.books[bookIndex].isActive = false;
          this.books[bookIndex].updatedDate = new Date();
          this.booksSubject.next(this.books);
          return true;
        }
        return false;
      })
    );
  }

  // Update book availability (used when borrowing/returning)
  updateBookAvailability(bookId: string, change: number): Observable<boolean> {
    return of(null).pipe(
      delay(200),
      map(() => {
        const book = this.books.find(b => b.id === bookId);
        if (book) {
          const newAvailableCopies = book.availableCopies + change;
          if (newAvailableCopies >= 0 && newAvailableCopies <= book.totalCopies) {
            book.availableCopies = newAvailableCopies;
            book.updatedDate = new Date();
            this.booksSubject.next(this.books);
            return true;
          }
        }
        return false;
      })
    );
  }

  // Get book statistics
  getBookStats(): Observable<any> {
    return of(null).pipe(
      delay(300),
      map(() => {
        const totalBooks = this.books.filter(b => b.isActive).length;
        const totalCopies = this.books.filter(b => b.isActive).reduce((sum, book) => sum + book.totalCopies, 0);
        const availableCopies = this.books.filter(b => b.isActive).reduce((sum, book) => sum + book.availableCopies, 0);
        const borrowedCopies = totalCopies - availableCopies;

        return {
          totalBooks,
          totalCopies,
          availableCopies,
          borrowedCopies,
          genres: this.getGenreDistribution()
        };
      })
    );
  }

  private getGenreDistribution(): any {
    const genreCount: { [key: string]: number } = {};
    this.books.filter(b => b.isActive).forEach(book => {
      genreCount[book.genre] = (genreCount[book.genre] || 0) + 1;
    });
    return genreCount;
  }

  // Get all available genres
  getGenres(): string[] {
    return Object.values(BookGenre);
  }
}

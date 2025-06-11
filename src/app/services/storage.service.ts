import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  // Storage keys
  private readonly STORAGE_KEYS = {
    USERS: 'library_users',
    BOOKS: 'library_books',
    TRANSACTIONS: 'library_transactions',
    CURRENT_USER: 'currentUser'
  };

  constructor() { }

  // Clear all library data from localStorage
  clearAllData(): void {
    if (typeof localStorage !== 'undefined') {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('All library data cleared from localStorage');
    }
  }

  // Reset to default data (useful for development/testing)
  resetToDefaults(): void {
    this.clearAllData();
    // The services will automatically load default data on next initialization
    window.location.reload();
  }

  // Get storage usage info
  getStorageInfo(): { [key: string]: any } {
    const info: { [key: string]: any } = {};
    
    if (typeof localStorage !== 'undefined') {
      Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
        const data = localStorage.getItem(key);
        info[name] = {
          exists: !!data,
          size: data ? data.length : 0,
          itemCount: data ? this.getItemCount(data) : 0
        };
      });
    }
    
    return info;
  }

  private getItemCount(jsonString: string): number {
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed.length : 1;
    } catch {
      return 0;
    }
  }

  // Export all data as JSON (for backup)
  exportData(): string {
    const exportData: { [key: string]: any } = {};
    
    if (typeof localStorage !== 'undefined') {
      Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            exportData[name] = JSON.parse(data);
          } catch (error) {
            console.error(`Error parsing ${name} data:`, error);
          }
        }
      });
    }
    
    return JSON.stringify(exportData, null, 2);
  }

  // Import data from JSON (for restore)
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (typeof localStorage !== 'undefined') {
        Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
          if (data[name]) {
            localStorage.setItem(key, JSON.stringify(data[name]));
          }
        });
      }
      
      console.log('Data imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

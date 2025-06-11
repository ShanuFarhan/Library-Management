import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StorageService } from '../../../services/storage.service';

@Component({
  selector: 'app-data-management',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatSnackBarModule
  ],
  templateUrl: './data-management.component.html',
  styleUrls: ['./data-management.component.scss']
})
export class DataManagementComponent implements OnInit {
  storageInfo: { [key: string]: any } = {};

  constructor(
    private storageService: StorageService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadStorageInfo();
  }

  loadStorageInfo(): void {
    this.storageInfo = this.storageService.getStorageInfo();
  }

  clearAllData(): void {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      this.storageService.clearAllData();
      this.loadStorageInfo();
      this.snackBar.open('All data cleared successfully', 'Close', { duration: 3000 });
    }
  }

  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset to default data? This will reload the page.')) {
      this.storageService.resetToDefaults();
    }
  }

  exportData(): void {
    try {
      const data = this.storageService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `library-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      this.snackBar.open('Data exported successfully', 'Close', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error exporting data', 'Close', { duration: 3000 });
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (this.storageService.importData(content)) {
            this.snackBar.open('Data imported successfully. Please refresh the page.', 'Close', { duration: 5000 });
            this.loadStorageInfo();
          } else {
            this.snackBar.open('Error importing data', 'Close', { duration: 3000 });
          }
        } catch (error) {
          this.snackBar.open('Error reading file', 'Close', { duration: 3000 });
        }
      };
      reader.readAsText(file);
    }
  }
}
